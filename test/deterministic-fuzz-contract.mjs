import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canonicalize,
  compileSleeve,
  computeRuntimeHash,
  TRACE_STAGE_ORDER,
} from '../dist/index.js';
import {
  DIAGNOSTIC_REGISTRY,
  validateDiagnosticAgainstRegistry,
} from '../dist/diagnostic-registry.js';
import {
  TRACE_EVENT_REGISTRY,
  validateTraceEventAgainstRegistry,
} from '../dist/trace-event-registry.js';
import {
  structurallyValidateCompileResult,
  structurallyValidateRuntimeSpec,
  structurallyValidateTrace,
} from '../dist/schema-validation.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const evidenceDir = resolve(root, '..', '..', 'recovery', 'umg-vnext-phase-d2');

const FUZZ_SEEDS = [
  0xd2000001,
  0xd2000002,
  0xd2000003,
  0xd2000004,
  0xd2000005,
  0xd2000006,
  0xd2000007,
  0xd2000008,
  0xd2000009,
  0xd200000a,
  0xd200000b,
  0xd200000c,
  0xd200000d,
  0xd200000e,
  0xd200000f,
  0xd2000010,
  0xd2000011,
  0xd2000012,
  0xd2000013,
  0xd2000014,
  0xd2000015,
  0xd2000016,
  0xd2000017,
  0xd2000018,
  0xd2000019,
];

const CASES_PER_SEED = 200;
const VALID_CASES_PER_SEED = 80;
const STRUCTURAL_CASES_PER_SEED = 55;
const SEMANTIC_CASES_PER_SEED = 45;
const RESOLUTION_CASES_PER_SEED = 15;
const RAW_TYPE_CASES_PER_SEED = 5;
const FIVE_REPLAY_CASES_PER_SEED = 10;

const EXPECTED_HASHES = {
  normal: 'c3e18535479cf39938c8e7993db73f4c1b5135529ba20d9d8a2ccadf298498fd',
  secondaryB: '0b65ac8d7955628c5544cc93704d3acffc7036c2e9d52dffba8c24e1bd26d7cd',
};

const MOLT_TYPES = [
  'trigger',
  'directive',
  'instruction',
  'subject',
  'primary',
  'philosophy',
  'blueprint',
];
const REQUIRED_LANE_TYPES = ['trigger', 'directive', 'instruction', 'subject', 'primary'];
const BUNDLE_TYPES = ['instruction', 'subject', 'primary', 'philosophy', 'blueprint'];
const SCOPED_TYPES = ['instruction', 'philosophy', 'blueprint'];
const FAMILY_SALTS = {
  valid: 0x7a11d200,
  structural_invalid: 0x7a11d201,
  semantic_invalid: 0x7a11d202,
  resolution_invalid: 0x7a11d203,
  raw_type: 0x7a11d204,
  variant: 0x7a11d205,
};

const results = {
  seedCount: FUZZ_SEEDS.length,
  totalCases: 0,
  validCases: 0,
  structuralInvalidCases: 0,
  semanticInvalidCases: 0,
  resolutionInvalidCases: 0,
  rawTypeCases: 0,
  exactReplayChecks: 0,
  fiveReplaySampleChecks: 0,
  selectionPermutationChecks: 0,
  objectKeyPermutationChecks: 0,
  invariancePairs: 0,
  sensitivityPairs: 0,
  unexpectedThrows: 0,
  contractViolations: 0,
  failures: 0,
  hashFailures: 0,
  registryDiagnosticViolations: 0,
  registryTraceViolations: 0,
  partialRuntimeLeaks: 0,
  wrongTraceBoundary: 0,
  missingErrorDiagnostic: 0,
  defects: [],
  protectedHashes: EXPECTED_HASHES,
};

const distribution = {
  diagnosticCodes: {},
  traceEventTypes: {},
  statuses: {},
  terminalStages: {},
  families: {},
};
let currentContext = null;

function hex(seed) {
  return `0x${(seed >>> 0).toString(16).padStart(8, '0')}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stableCaseSeed(seed, caseIndex, family) {
  return (
    seed ^
    Math.imul(caseIndex + 1, 0x9e3779b9) ^
    FAMILY_SALTS[family]
  ) >>> 0;
}

function makePrng(seed) {
  let state = seed >>> 0;
  return {
    seed,
    nextUint() {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state;
    },
    int(maxExclusive) {
      assert.ok(maxExclusive > 0, 'maxExclusive must be positive');
      return this.nextUint() % maxExclusive;
    },
    bool() {
      return (this.nextUint() & 1) === 1;
    },
    pick(values) {
      return values[this.int(values.length)];
    },
    shuffle(values) {
      const out = values.slice();
      for (let index = out.length - 1; index > 0; index -= 1) {
        const swapIndex = this.int(index + 1);
        [out[index], out[swapIndex]] = [out[swapIndex], out[index]];
      }
      return out;
    },
  };
}

function bump(map, key) {
  map[key] = (map[key] ?? 0) + 1;
}

function safeJson(value) {
  if (value === undefined) return { nonJsonValue: 'undefined' };
  if (typeof value === 'function') return { nonJsonValue: 'function' };
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return {
      nonSerializable: true,
      description: Object.prototype.toString.call(value),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function diagnosticCodes(result) {
  return result?.diagnostics?.map((diagnostic) => diagnostic.code) ?? [];
}

function traceEventTypes(result) {
  return result?.trace?.events?.map((event) => event.type) ?? [];
}

function preserveFailure(context, error, result) {
  mkdirSync(evidenceDir, { recursive: true });
  const packet = {
    seed: context.seedHex,
    caseIndex: context.caseIndex,
    family: context.family,
    generationParameters: context.generationParameters,
    generatedSleeve: safeJson(context.sleeve),
    generatedSelection: safeJson(context.selection),
    rawSleeve: context.rawSleeveDescription,
    rawSelection: context.rawSelectionDescription,
    expectedInvariant: context.expectedInvariant,
    actualResult: result ? safeJson(result) : null,
    diagnosticCodes: diagnosticCodes(result),
    traceEventTypes: traceEventTypes(result),
    stackTrace: error?.stack ?? String(error),
  };
  writeFileSync(resolve(evidenceDir, 'FAILURE_CASE.json'), `${JSON.stringify(packet, null, 2)}\n`);
  writeFileSync(
    resolve(evidenceDir, 'FAILURE_REPORT.md'),
    [
      '# compiler-vnext D2 deterministic fuzz failure',
      '',
      `seed: ${packet.seed}`,
      `caseIndex: ${packet.caseIndex}`,
      `family: ${packet.family}`,
      `expectedInvariant: ${packet.expectedInvariant}`,
      '',
      'diagnosticCodes:',
      ...packet.diagnosticCodes.map((code) => `- ${code}`),
      '',
      'traceEventTypes:',
      ...packet.traceEventTypes.map((type) => `- ${type}`),
      '',
      'stackTrace:',
      '```',
      packet.stackTrace,
      '```',
      '',
    ].join('\n'),
  );
  if (error && typeof error === 'object') error.d2Preserved = true;
}

function fail(context, message, details = {}) {
  results.contractViolations += 1;
  results.failures += 1;
  const error = new Error(`${message}: ${JSON.stringify(details)}`);
  preserveFailure(context, error, details.result);
  throw error;
}

function compileSafely(sleeve, selection, context) {
  try {
    return compileSleeve(sleeve, selection);
  } catch (error) {
    results.unexpectedThrows += 1;
    results.failures += 1;
    preserveFailure(context, error, null);
    throw error;
  }
}

function observeResult(result, family) {
  bump(distribution.statuses, result.status);
  bump(distribution.families, family);
  if (result.trace) bump(distribution.terminalStages, result.trace.terminalStage);
  for (const diagnostic of result.diagnostics ?? []) bump(distribution.diagnosticCodes, diagnostic.code);
  for (const event of result.trace?.events ?? []) bump(distribution.traceEventTypes, event.type);
}

function compileWithReplay(sleeve, selection, context, repetitions = 2, observe = true) {
  const first = compileSafely(sleeve, selection, context);
  for (let index = 1; index < repetitions; index += 1) {
    const replay = compileSafely(sleeve, selection, context);
    assert.deepEqual(replay, first, 'CompileResult replay must be deeply equal for exact same input.');
  }
  results.exactReplayChecks += 1;
  if (repetitions >= 5) results.fiveReplaySampleChecks += 1;
  if (observe) observeResult(first, context.family);
  return first;
}

function assertDiagnosticRegistry(diagnostics, context) {
  for (const diagnostic of diagnostics) {
    if (!Object.hasOwn(DIAGNOSTIC_REGISTRY, diagnostic.code)) {
      results.registryDiagnosticViolations += 1;
      fail(context, 'Diagnostic code is not registered', { diagnostic });
    }
    const issues = validateDiagnosticAgainstRegistry(diagnostic);
    if (issues.length > 0) {
      results.registryDiagnosticViolations += 1;
      fail(context, 'Diagnostic violates registry contract', { diagnostic, issues });
    }
  }
}

function assertTraceRegistry(trace, context) {
  if (!trace) return;
  let previousStageOrder = -1;
  trace.events.forEach((event, index) => {
    if (event.seq !== index + 1) {
      results.registryTraceViolations += 1;
      fail(context, 'Trace seq is not contiguous', { event, index, result: { trace } });
    }
    if (!Object.hasOwn(TRACE_EVENT_REGISTRY, event.type)) {
      results.registryTraceViolations += 1;
      fail(context, 'Trace event type is not registered', { event, result: { trace } });
    }
    const issues = validateTraceEventAgainstRegistry(event);
    if (issues.length > 0) {
      results.registryTraceViolations += 1;
      fail(context, 'Trace event violates registry contract', { event, issues, result: { trace } });
    }
    const stageOrder = TRACE_STAGE_ORDER[event.stage];
    if (stageOrder < previousStageOrder) {
      results.registryTraceViolations += 1;
      fail(context, 'Trace stage ordering is not monotonic', { event, previousStageOrder, result: { trace } });
    }
    previousStageOrder = stageOrder;
  });
}

function assertRegisteredOutput(result, context) {
  assertDiagnosticRegistry(result.diagnostics ?? [], context);
  assertDiagnosticRegistry(result.trace?.diagnostics ?? [], context);
  assertDiagnosticRegistry(result.runtime?.diagnostics ?? [], context);
  assertTraceRegistry(result.trace, context);
}

function assertSchemaOk(validation, label, context) {
  if (!validation.ok) {
    fail(context, `${label} schema validation failed`, { diagnostics: validation.diagnostics });
  }
}

function assertSuccessInvariants(sleeve, selection, result, context) {
  assert.equal(result.status, 'success');
  assert.equal(result.hasErrors, false);
  assert.ok(result.runtime);
  assert.ok(result.trace);
  assert.deepEqual(result.trace.diagnostics, result.diagnostics);
  assert.deepEqual(result.runtime.diagnostics, result.diagnostics);
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.level === 'error'), false);
  assert.equal(result.runtime.runtimeHash, computeRuntimeHash(result.runtime));
  assertSchemaOk(structurallyValidateRuntimeSpec(result.runtime), 'RuntimeSpec', context);
  assertSchemaOk(structurallyValidateTrace(result.trace), 'Trace', context);
  assertSchemaOk(structurallyValidateCompileResult(result), 'CompileResult', context);

  const canonicalStackIds = sleeve.neoStacks.map((stack) => stack.id).sort();
  const canonicalBlockIds = sleeve.neoBlocks.map((block) => block.id).sort();
  assert.deepEqual(Object.keys(result.trace.finalNeoStackStates).sort(), canonicalStackIds);
  assert.deepEqual(Object.keys(result.trace.finalNeoBlockStates).sort(), canonicalBlockIds);

  for (const stackId of result.runtime.activeNeoStackIds) {
    assert.equal(result.trace.finalNeoStackStates[stackId], 'active', `runtime active NeoStack ${stackId}`);
  }
  for (const neoBlock of result.runtime.resolvedNeoBlocks) {
    assert.equal(result.trace.finalNeoBlockStates[neoBlock.id], 'active', `runtime active NeoBlock ${neoBlock.id}`);
  }

  assert.deepEqual(result.runtime.resetPlan.neoStackIds, result.runtime.activeNeoStackIds);
  assert.deepEqual(
    result.runtime.resetPlan.neoBlockIds,
    result.runtime.resolvedNeoBlocks.map((block) => block.id),
  );
  assert.equal(result.runtime.resetPlan.targetState, 'ready');

  const resetEvent = result.trace.events.find((event) => event.type === 'POST_RUN_RESET_DECLARED');
  const runtimeEvent = result.trace.events.find((event) => event.type === 'RUNTIME_COMPILED');
  assert.ok(resetEvent);
  assert.ok(runtimeEvent);
  assert.deepEqual(resetEvent.data, result.runtime.resetPlan);
  assert.equal(runtimeEvent.data.runtimeHash, result.runtime.runtimeHash);
}

function assertFailureEnvelope(result, terminalStage, context) {
  assert.equal(result.status, 'failure');
  assert.equal(result.hasErrors, true);
  if (result.runtime !== null) {
    results.partialRuntimeLeaks += 1;
    fail(context, 'Failure leaked a partial RuntimeSpec', { result });
  }
  if (!result.diagnostics.some((diagnostic) => diagnostic.level === 'error')) {
    results.missingErrorDiagnostic += 1;
    fail(context, 'Failure did not include an error diagnostic', { result });
  }
  if (terminalStage === null) {
    if (result.trace !== null) {
      results.wrongTraceBoundary += 1;
      fail(context, 'Structural/raw failure crossed the trace boundary', { result });
    }
  } else {
    if (!result.trace || result.trace.terminalStage !== terminalStage) {
      results.wrongTraceBoundary += 1;
      fail(context, 'Failure had the wrong trace terminal boundary', { expected: terminalStage, result });
    }
    assert.deepEqual(result.trace.diagnostics, result.diagnostics);
  }
}

function assertSemanticFailure(result, context) {
  assertFailureEnvelope(result, 'semantic', context);
  for (const event of result.trace.events) {
    if (TRACE_STAGE_ORDER[event.stage] > TRACE_STAGE_ORDER.semantic) {
      fail(context, 'Semantic failure emitted post-semantic event', { event, result });
    }
  }
}

function assertResolutionFailure(result, context) {
  assertFailureEnvelope(result, 'resolution', context);
  assert.equal(result.trace.events.some((event) => event.type === 'RUNTIME_COMPILED'), false);
  assert.equal(result.trace.events.some((event) => event.type === 'POST_RUN_RESET_DECLARED'), false);
  for (const [index, diagnostic] of result.diagnostics.entries()) {
    if (diagnostic.stage !== 'resolution') continue;
    const expectedType = diagnostic.level === 'error' ? 'RESOLUTION_ERROR' : 'RESOLUTION_WARNING';
    const linked = result.trace.events.find(
      (event) =>
        event.type === expectedType &&
        event.data.diagnosticIndex === index &&
        event.data.code === diagnostic.code,
    );
    assert.ok(linked, `missing ${expectedType} event for ${diagnostic.code}`);
  }
}

function makeRows(blockIds, prng, maxRows = 3) {
  if (blockIds.length === 0) return [];
  const rows = new Map();
  const rowCount = Math.min(maxRows, blockIds.length);
  blockIds.forEach((blockId, index) => {
    const desiredRow = rowCount === 1 ? 1 : 1 + ((index + prng.int(rowCount)) % rowCount);
    const current = rows.get(desiredRow) ?? [];
    current.push(blockId);
    rows.set(desiredRow, current);
  });
  return [...rows.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, ids], index) => ({ row: index + 1, blockIds: ids }));
}

function selectSubset(values, prng, maxCount = values.length) {
  const shuffled = prng.shuffle(values);
  const count = values.length === 0 ? 0 : prng.int(Math.min(maxCount, values.length) + 1);
  return shuffled.slice(0, count);
}

function generatedCompiledAt(seed, caseIndex) {
  const seedValue = seed >>> 0;
  const day = String(1 + (caseIndex % 28)).padStart(2, '0');
  const hour = String((caseIndex * 7 + seedValue) % 24).padStart(2, '0');
  const minute = String((caseIndex * 13 + seedValue) % 60).padStart(2, '0');
  const second = String((caseIndex * 17 + seedValue) % 60).padStart(2, '0');
  return `2026-09-${day}T${hour}:${minute}:${second}.000Z`;
}

function blockContent(type, id) {
  return `${type} content for ${id}.`;
}

function typePrefix(type) {
  return {
    trigger: 'T',
    directive: 'D',
    instruction: 'I',
    subject: 'S',
    primary: 'P',
    philosophy: 'PH',
    blueprint: 'BP',
  }[type];
}

function addMoltBlock(state, owner, type, suffix) {
  const id = `${typePrefix(type)}.${state.prefix}.${owner.short}.${suffix}`;
  const block = {
    id,
    type,
    content: blockContent(type, id),
    title: `${type} ${suffix}`,
    provenance: {
      sourceId: `D2.${state.prefix}`,
      sourceVersion: 'v0.1',
    },
  };
  state.moltBlocks.push(block);
  owner.local[type].push(id);
  owner.moltBlockIds.push(id);
  return id;
}

function buildGeneratedSleeve(prng, seed, caseIndex, options = {}) {
  const prefix = `${(seed >>> 0).toString(16).toUpperCase()}.${caseIndex}`;
  const forceChain = options.forceChain ?? false;
  const minStacks = options.minStacks ?? 1;
  const stackCount = Math.max(
    minStacks,
    forceChain ? 3 : 1 + prng.int(options.maxStacks ?? 5),
  );
  const state = {
    prefix,
    moltBlocks: [],
    neoBlocks: [],
    neoStacks: [],
    owners: [],
  };

  const stackMetas = [];
  stackMetas.push({ id: `NS.${prefix}.0`, short: 'ST0', parentId: null, depth: 0, blockIds: [] });
  for (let index = 1; index < stackCount; index += 1) {
    const candidates = stackMetas.filter((stack) => stack.depth < 3);
    const parent = forceChain && index < 3 ? stackMetas[index - 1] : prng.pick(candidates);
    stackMetas.push({
      id: `NS.${prefix}.${index}`,
      short: `ST${index}`,
      parentId: parent.id,
      depth: parent.depth + 1,
      blockIds: [],
    });
  }

  for (const [stackIndex, stack] of stackMetas.entries()) {
    const minBlocksPerStack = options.minBlocksPerStack ?? 1;
    const maxBlocksPerStack = Math.max(minBlocksPerStack, options.maxBlocksPerStack ?? 2);
    const blockCount = minBlocksPerStack + prng.int(maxBlocksPerStack - minBlocksPerStack + 1);
    for (let localIndex = 0; localIndex < blockCount; localIndex += 1) {
      const blockNumber = state.owners.length;
      const owner = {
        id: `NB.${prefix}.${blockNumber}`,
        short: `B${blockNumber}`,
        stackId: stack.id,
        local: Object.fromEntries(MOLT_TYPES.map((type) => [type, []])),
        moltBlockIds: [],
        secondaryDirectives: [],
        bundles: [],
        merges: [],
      };
      const defaultTriggerId = addMoltBlock(state, owner, 'trigger', 'DEFAULT');
      const primeDirectiveId = addMoltBlock(state, owner, 'directive', 'PRIME');
      const instructionCount = 1 + prng.int(3);
      const subjectCount = 1 + prng.int(2);
      const philosophyCount = prng.int(3);
      const blueprintCount = prng.int(3);
      for (let index = 0; index < instructionCount; index += 1) addMoltBlock(state, owner, 'instruction', `BASE${index}`);
      for (let index = 0; index < subjectCount; index += 1) addMoltBlock(state, owner, 'subject', `BASE${index}`);
      addMoltBlock(state, owner, 'primary', 'BASE0');
      for (let index = 0; index < philosophyCount; index += 1) addMoltBlock(state, owner, 'philosophy', `BASE${index}`);
      for (let index = 0; index < blueprintCount; index += 1) addMoltBlock(state, owner, 'blueprint', `BASE${index}`);

      const secondaryCount = options.forceSecondary && blockNumber === 0 ? 2 : prng.int(3);
      for (let index = 0; index < secondaryCount; index += 1) {
        const triggerBlockId = addMoltBlock(state, owner, 'trigger', `SEC${index}`);
        const directiveBlockId = addMoltBlock(state, owner, 'directive', `SEC${index}`);
        owner.secondaryDirectives.push({
          id: `SD.${prefix}.${blockNumber}.${index}`,
          directiveBlockId,
          triggerBlockId,
          bundles: {},
        });
      }

      const mergeCount = prng.int(2);
      for (let index = 0; index < mergeCount; index += 1) {
        const mergeType = prng.pick(['instruction', 'subject', 'primary', 'philosophy', 'blueprint']);
        const sourceA = addMoltBlock(state, owner, mergeType, `MRG${index}.SRC0`);
        const sourceB = addMoltBlock(state, owner, mergeType, `MRG${index}.SRC1`);
        const resultBlockId = addMoltBlock(state, owner, mergeType, `MRG${index}.RESULT`);
        owner.merges.push({
          id: `MRG.${prefix}.${blockNumber}.${index}`,
          sourceBlockIds: [sourceA, sourceB],
          resultBlockId,
        });
      }

      const bundleCount = owner.secondaryDirectives.length === 0 ? prng.int(2) : prng.int(4);
      for (let index = 0; index < bundleCount; index += 1) {
        const moltType = prng.pick(BUNDLE_TYPES);
        const bundleOnlyId = addMoltBlock(state, owner, moltType, `BND${index}`);
        const candidates = prng.shuffle([...owner.local[moltType]]);
        const rows = makeRows([bundleOnlyId, ...candidates.filter((id) => id !== bundleOnlyId).slice(0, prng.int(2))], prng, 2);
        owner.bundles.push({
          id: `BND.${prefix}.${blockNumber}.${index}`,
          name: `Bundle ${index}`,
          moltType,
          rows,
        });
      }
      const bundlesByType = new Map();
      for (const bundle of owner.bundles) {
        const current = bundlesByType.get(bundle.moltType) ?? [];
        current.push(bundle);
        bundlesByType.set(bundle.moltType, current);
      }
      for (const secondary of owner.secondaryDirectives) {
        for (const [moltType, bundles] of bundlesByType.entries()) {
          if (prng.bool()) secondary.bundles[moltType] = prng.pick(bundles).id;
        }
        if (Object.keys(secondary.bundles).length === 0) delete secondary.bundles;
      }

      const baseGeometry = {
        trigger: makeRows(owner.local.trigger, prng, 2),
        directive: [{ row: 1, blockIds: [primeDirectiveId] }],
        instruction: makeRows(owner.local.instruction, prng, 3),
        subject: makeRows(owner.local.subject, prng, 2),
        primary: makeRows(owner.local.primary, prng, 1),
      };
      for (const type of ['philosophy', 'blueprint']) {
        if (owner.local[type].length > 0) baseGeometry[type] = makeRows(owner.local[type], prng, 2);
      }

      const neoBlock = {
        id: owner.id,
        name: `D2 NeoBlock ${blockNumber}`,
        description: `Generated D2 NeoBlock ${blockNumber}.`,
        tags: [`seed-${seed >>> 0}`, `case-${caseIndex}`, `stack-${stackIndex}`],
        moltBlockIds: owner.moltBlockIds,
        primeDirectiveId,
        ...(owner.secondaryDirectives.length ? { secondaryDirectives: owner.secondaryDirectives } : {}),
        baseGeometry,
        ...(owner.bundles.length ? { bundles: owner.bundles } : {}),
        ...(owner.merges.length ? { merges: owner.merges } : {}),
      };
      state.neoBlocks.push(neoBlock);
      state.owners.push(owner);
      stack.blockIds.push(owner.id);
    }
  }

  for (const stack of stackMetas) {
    const childIds = stackMetas.filter((candidate) => candidate.parentId === stack.id).map((child) => child.id);
    const neoStack = {
      id: stack.id,
      name: `D2 NeoStack ${stack.short}`,
      skill: `Generated D2 skill capsule for ${stack.short}.`,
      tags: [`depth-${stack.depth}`],
      neoBlockRows: makeRows(stack.blockIds, prng, 2).map((row) => ({
        row: row.row,
        neoBlockIds: row.blockIds,
      })),
      ...(childIds.length
        ? {
            childStackRows: makeRows(childIds, prng, 2).map((row) => ({
              row: row.row,
              neoStackIds: row.blockIds,
            })),
          }
        : {}),
    };
    state.neoStacks.push(neoStack);
  }

  const mergeResultIds = new Set(state.owners.flatMap((owner) => owner.merges.map((merge) => merge.resultBlockId)));
  const scopedCandidates = state.moltBlocks.filter(
    (block) => SCOPED_TYPES.includes(block.type) && !mergeResultIds.has(block.id),
  );
  const scopedMolt = [];
  const scopedCount = scopedCandidates.length === 0 ? 0 : prng.int(7);
  for (let index = 0; index < scopedCount; index += 1) {
    const block = prng.pick(scopedCandidates);
    scopedMolt.push({
      id: `ATT.${prefix}.SCOPE.${index}`,
      blockId: block.id,
      scope: prng.bool()
        ? { kind: 'sleeve' }
        : { kind: 'neostack', neoStackId: prng.pick(stackMetas).id },
    });
  }

  const overlays = [];
  const overlayCount = prng.int(4);
  for (let overlayIndex = 0; overlayIndex < overlayCount; overlayIndex += 1) {
    const attachmentCount = 1 + prng.int(2);
    const attachments = [];
    for (let attachmentIndex = 0; attachmentIndex < attachmentCount; attachmentIndex += 1) {
      const block = prng.pick(scopedCandidates);
      attachments.push({
        id: `ATT.${prefix}.OV${overlayIndex}.${attachmentIndex}`,
        blockId: block.id,
        scope: prng.bool()
          ? { kind: 'sleeve' }
          : { kind: 'neostack', neoStackId: prng.pick(stackMetas).id },
      });
    }
    overlays.push({
      id: `OV.${prefix}.${overlayIndex}`,
      name: `Overlay ${overlayIndex}`,
      attachments,
    });
  }

  const governance = [];
  const governanceCount = prng.int(4);
  for (let index = 0; index < governanceCount; index += 1) {
    const useStack = prng.bool();
    const rule = {
      id: `GOV.${prefix}.${index}`,
      name: `Governance ${index}`,
      description: `Generated D2 governance ${index}.`,
    };
    if (useStack) rule.offNeoStackIds = [prng.pick(stackMetas).id];
    if (!useStack || prng.bool()) rule.offNeoBlockIds = [prng.pick(state.owners).id];
    governance.push(rule);
  }

  const sleeve = {
    schemaVersion: 'umg.compiler-vnext.sleeve.v0.1',
    id: `SLV.${prefix}`,
    name: `D2 Generated Sleeve ${prefix}`,
    description: 'Generated deterministic D2 fuzz sleeve.',
    controllerNeoStackId: stackMetas[0].id,
    moltBlocks: state.moltBlocks,
    neoBlocks: state.neoBlocks,
    neoStacks: state.neoStacks,
    ...(scopedMolt.length ? { scopedMolt } : {}),
    ...(overlays.length ? { overlays } : {}),
    ...(governance.length ? { governance } : {}),
  };

  return buildFixtureMeta({ sleeve, owners: state.owners, stackMetas, seed, caseIndex });
}

function buildFixtureMeta({ sleeve, owners, stackMetas, seed, caseIndex }) {
  const parentByStackId = new Map();
  const childrenByStackId = new Map();
  for (const stack of stackMetas) {
    childrenByStackId.set(stack.id, stackMetas.filter((candidate) => candidate.parentId === stack.id).map((candidate) => candidate.id));
    if (stack.parentId) parentByStackId.set(stack.id, stack.parentId);
  }
  const ownerByBlockId = new Map(owners.map((owner) => [owner.id, owner]));
  const stackByBlockId = new Map(owners.map((owner) => [owner.id, owner.stackId]));
  const blocksByStackId = new Map();
  for (const owner of owners) {
    const current = blocksByStackId.get(owner.stackId) ?? [];
    current.push(owner.id);
    blocksByStackId.set(owner.stackId, current);
  }
  return {
    sleeve,
    owners,
    ownerByBlockId,
    parentByStackId,
    childrenByStackId,
    stackByBlockId,
    blocksByStackId,
    stackIds: stackMetas.map((stack) => stack.id),
    blockIds: owners.map((owner) => owner.id),
    generationParameters: {
      seed: hex(seed),
      caseIndex,
      neoStacks: stackMetas.length,
      neoBlocks: owners.length,
      moltBlocks: sleeve.moltBlocks.length,
      scopedAttachments: sleeve.scopedMolt?.length ?? 0,
      overlays: sleeve.overlays?.length ?? 0,
      governanceRules: sleeve.governance?.length ?? 0,
    },
  };
}

function ancestorPath(stackId, fixture) {
  const path = [];
  let current = stackId;
  while (current) {
    path.push(current);
    current = fixture.parentByStackId.get(current);
  }
  return path.reverse();
}

function treeOrderedSelectedStacks(fixture, selected) {
  const ordered = [];
  const visit = (stackId) => {
    if (selected.has(stackId)) ordered.push(stackId);
    for (const childId of fixture.childrenByStackId.get(stackId) ?? []) visit(childId);
  };
  visit(fixture.sleeve.controllerNeoStackId);
  return ordered;
}

function buildValidSelection(fixture, prng, seed, caseIndex) {
  const selectedStacks = new Set([fixture.sleeve.controllerNeoStackId]);
  for (const stackId of fixture.stackIds.slice(1)) {
    const parentId = fixture.parentByStackId.get(stackId);
    if (parentId && selectedStacks.has(parentId) && prng.int(3) !== 0) selectedStacks.add(stackId);
  }
  const activeNeoStackIds = prng.shuffle(treeOrderedSelectedStacks(fixture, selectedStacks));

  const activeNeoBlockIds = [];
  for (const stackId of selectedStacks) {
    const blockIds = fixture.blocksByStackId.get(stackId) ?? [];
    const count = Math.max(1, Math.min(blockIds.length, 1 + prng.int(Math.min(2, blockIds.length))));
    activeNeoBlockIds.push(...prng.shuffle(blockIds).slice(0, count));
  }

  const triggerState = {};
  for (const owner of fixture.owners) {
    for (const triggerId of owner.local.trigger) triggerState[triggerId] = prng.bool();
  }
  for (const blockId of activeNeoBlockIds) {
    const owner = fixture.ownerByBlockId.get(blockId);
    for (const triggerId of owner.local.trigger) triggerState[triggerId] = false;
    if (owner.secondaryDirectives.length > 0 && prng.bool()) {
      const secondary = prng.pick(owner.secondaryDirectives);
      triggerState[secondary.triggerBlockId] = true;
      triggerState[owner.local.trigger[0]] = prng.bool();
    } else {
      triggerState[owner.local.trigger[0]] = true;
    }
  }

  const activeOverlayIds = selectSubset((fixture.sleeve.overlays ?? []).map((overlay) => overlay.id), prng, 3);
  const safeGovernance = (fixture.sleeve.governance ?? []).filter((rule) => {
    const offStacks = rule.offNeoStackIds ?? [];
    const offBlocks = rule.offNeoBlockIds ?? [];
    return (
      offStacks.every((id) => !selectedStacks.has(id)) &&
      offBlocks.every((id) => !activeNeoBlockIds.includes(id))
    );
  });
  const activeGovernanceRuleIds = selectSubset(safeGovernance.map((rule) => rule.id), prng, 2);
  const disabledNeoStackIds = selectSubset(
    fixture.stackIds.filter((id) => !selectedStacks.has(id)),
    prng,
    2,
  );
  const disabledNeoBlockIds = selectSubset(
    fixture.blockIds.filter((id) => !activeNeoBlockIds.includes(id)),
    prng,
    3,
  );

  const selection = {
    schemaVersion: 'umg.compiler-vnext.selection.v0.1',
    compiledAt: generatedCompiledAt(seed, caseIndex),
    activeNeoStackIds,
    activeNeoBlockIds: prng.shuffle(activeNeoBlockIds),
    triggerState,
    ...(activeOverlayIds.length ? { activeOverlayIds } : {}),
    ...(activeGovernanceRuleIds.length ? { activeGovernanceRuleIds } : {}),
    ...(disabledNeoStackIds.length ? { disabledNeoStackIds } : {}),
    ...(disabledNeoBlockIds.length ? { disabledNeoBlockIds } : {}),
    ...(prng.int(4) === 0
      ? {
          routeRationale: {
            source: 'd2-fuzz',
            seed: hex(seed),
            caseIndex,
            activeStacks: activeNeoStackIds.length,
          },
        }
      : {}),
  };
  return selection;
}

function makeValidFixtureAndSelection(prng, seed, caseIndex, options = {}) {
  const fixture = buildGeneratedSleeve(prng, seed, caseIndex, options);
  const selection = buildValidSelection(fixture, prng, seed, caseIndex);
  return { ...fixture, selection };
}

function contextFor(seed, caseIndex, family, generationParameters, sleeve, selection, expectedInvariant) {
  return {
    seed,
    seedHex: hex(seed),
    caseIndex,
    family,
    generationParameters,
    sleeve,
    selection,
    expectedInvariant,
  };
}

function runtimeProjection(result) {
  assert.equal(result.status, 'success');
  return {
    runtime: {
      activeNeoStackIds: result.runtime.activeNeoStackIds,
      resolvedNeoBlocks: result.runtime.resolvedNeoBlocks,
      promptParts: result.runtime.promptParts,
      resetPlan: result.runtime.resetPlan,
      runtimeHash: result.runtime.runtimeHash,
    },
    finalNeoStackStates: result.trace.finalNeoStackStates,
    finalNeoBlockStates: result.trace.finalNeoBlockStates,
  };
}

function permuteObjectKeys(value, prng) {
  if (Array.isArray(value)) return value.map((item) => permuteObjectKeys(item, prng));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, nested] of prng.shuffle(Object.entries(value))) {
      out[key] = permuteObjectKeys(nested, prng);
    }
    return out;
  }
  return value;
}

function permuteSelectionMembership(selection, prng) {
  const out = clone(selection);
  for (const field of [
    'activeNeoStackIds',
    'activeNeoBlockIds',
    'activeOverlayIds',
    'activeGovernanceRuleIds',
    'disabledNeoStackIds',
    'disabledNeoBlockIds',
  ]) {
    if (Array.isArray(out[field]) && out[field].length > 1) out[field] = prng.shuffle(out[field]);
  }
  return out;
}

function runMetadataHashInvariance(sleeve, selection, baseResult, context, prng) {
  const variants = [];
  const compiledAtSelection = clone(selection);
  compiledAtSelection.compiledAt = generatedCompiledAt(context.seed ^ 0x55555555, context.caseIndex + 1000);
  variants.push(['compiledAt', sleeve, compiledAtSelection]);

  const sleeveName = clone(sleeve);
  sleeveName.name = `${sleeve.name} metadata`;
  variants.push(['sleeveName', sleeveName, selection]);

  const blockName = clone(sleeve);
  blockName.neoBlocks[0].name = `${blockName.neoBlocks[0].name} metadata`;
  variants.push(['resolvedNeoBlock.name', blockName, selection]);

  const titles = clone(sleeve);
  for (const block of titles.moltBlocks) block.title = `Metadata title ${block.id}`;
  variants.push(['titles', titles, selection]);

  const routeRationale = clone(selection);
  routeRationale.routeRationale = { d2: 'metadata-only', shuffled: prng.shuffle(['a', 'b', 'c']) };
  variants.push(['routeRationale', sleeve, routeRationale]);

  for (const [name, variantSleeve, variantSelection] of variants) {
    const variantContext = { ...context, family: 'variant', expectedInvariant: `hash invariant for ${name}` };
    const variant = compileWithReplay(variantSleeve, variantSelection, variantContext, 2, false);
    assertSuccessInvariants(variantSleeve, variantSelection, variant, variantContext);
    assert.equal(variant.runtime.runtimeHash, baseResult.runtime.runtimeHash, `hash invariant for ${name}`);
    results.invariancePairs += 1;
  }
}

function runHashSensitivity(sleeve, selection, baseResult, context) {
  const variants = [];
  const contentSleeve = clone(sleeve);
  const activePartId = baseResult.runtime.promptParts[0]?.id;
  const contentBlock = contentSleeve.moltBlocks.find((block) => block.id === activePartId);
  if (contentBlock) {
    contentBlock.content = `${contentBlock.content} semantic delta`;
    variants.push(['molt content', contentSleeve, selection]);
  }

  const coordinateSleeve = clone(sleeve);
  const activeNeoBlockId = baseResult.runtime.resolvedNeoBlocks.find((block) =>
    block.lanes.some((lane) => lane.rows.some((row) => row.blocks.length > 1)),
  )?.id;
  if (activeNeoBlockId) {
    const neoBlock = coordinateSleeve.neoBlocks.find((block) => block.id === activeNeoBlockId);
    const lane = Object.values(neoBlock.baseGeometry).find((rows) => rows.some((row) => row.blockIds.length > 1));
    const row = lane?.find((candidate) => candidate.blockIds.length > 1);
    if (row) {
      row.blockIds = row.blockIds.slice().reverse();
      variants.push(['prompt structural coordinate', coordinateSleeve, selection]);
    }
  }

  const overlayIds = sleeve.overlays?.map((overlay) => overlay.id) ?? [];
  if (overlayIds.length > 0) {
    const overlaySelection = clone(selection);
    overlaySelection.activeOverlayIds = overlayIds.filter((id) => !(selection.activeOverlayIds ?? []).includes(id)).slice(0, 1);
    if (overlaySelection.activeOverlayIds.length > 0) variants.push(['MOLT provenance via overlay', sleeve, overlaySelection]);
  }

  const alternateBlockSelection = clone(selection);
  const selectedBlocks = new Set(selection.activeNeoBlockIds);
  const selectedStacks = new Set(selection.activeNeoStackIds);
  const stackRows = sleeve.neoStacks.filter((stack) => selectedStacks.has(stack.id));
  let swapped = false;
  for (const stack of stackRows) {
    const candidate = stack.neoBlockRows.flatMap((row) => row.neoBlockIds).find((id) => !selectedBlocks.has(id));
    if (candidate) {
      alternateBlockSelection.activeNeoBlockIds = alternateBlockSelection.activeNeoBlockIds.slice(1).concat(candidate);
      const neoBlock = sleeve.neoBlocks.find((block) => block.id === candidate);
      for (const id of neoBlock.moltBlockIds) {
        const block = sleeve.moltBlocks.find((molt) => molt.id === id);
        if (block?.type === 'trigger') alternateBlockSelection.triggerState[id] = false;
      }
      const triggerId = neoBlock.moltBlockIds.find((id) => sleeve.moltBlocks.find((molt) => molt.id === id)?.type === 'trigger');
      alternateBlockSelection.triggerState[triggerId] = true;
      swapped = true;
      break;
    }
  }
  if (swapped) variants.push(['resolved block identity and resetPlan', sleeve, alternateBlockSelection]);

  for (const [name, variantSleeve, variantSelection] of variants) {
    const variantContext = { ...context, family: 'variant', expectedInvariant: `hash sensitivity for ${name}` };
    const variant = compileWithReplay(variantSleeve, variantSelection, variantContext, 2, false);
    if (variant.status !== 'success') continue;
    const semanticDiffers = canonicalize(runtimeProjection(variant)) !== canonicalize(runtimeProjection(baseResult));
    if (semanticDiffers) {
      assert.notEqual(variant.runtime.runtimeHash, baseResult.runtime.runtimeHash, `hash sensitivity for ${name}`);
      results.sensitivityPairs += 1;
    }
  }
}

function runValidCase(seed, caseIndex) {
  const prng = makePrng(stableCaseSeed(seed, caseIndex, 'valid'));
  const generated = makeValidFixtureAndSelection(prng, seed, caseIndex, {
    maxStacks: caseIndex % 17 === 0 ? 8 : 5,
    maxBlocksPerStack: caseIndex % 19 === 0 ? 4 : 2,
  });
  const context = contextFor(
    seed,
    caseIndex,
    'valid',
    generated.generationParameters,
    generated.sleeve,
    generated.selection,
    'valid generated Sleeve and Selection compile successfully and satisfy all D2 success invariants',
  );
  currentContext = context;

  results.totalCases += 1;
  results.validCases += 1;
  const repetitions = caseIndex < FIVE_REPLAY_CASES_PER_SEED ? 5 : 2;
  const result = compileWithReplay(generated.sleeve, generated.selection, context, repetitions);
  assertRegisteredOutput(result, context);
  assertSuccessInvariants(generated.sleeve, generated.selection, result, context);

  if (caseIndex % 8 === 0) {
    const permutedSelection = permuteSelectionMembership(generated.selection, prng);
    const permuted = compileWithReplay(generated.sleeve, permutedSelection, {
      ...context,
      family: 'variant',
      expectedInvariant: 'selection membership arrays are order-insensitive for executable projection',
    }, 2, false);
    assert.deepEqual(runtimeProjection(permuted), runtimeProjection(result));
    results.selectionPermutationChecks += 1;
  }

  if (caseIndex % 8 === 1) {
    const objectPermuted = compileWithReplay(permuteObjectKeys(generated.sleeve, prng), permuteObjectKeys(generated.selection, prng), {
      ...context,
      family: 'variant',
      expectedInvariant: 'object key insertion order is not semantic',
    }, 2, false);
    assert.deepEqual(objectPermuted, result);
    results.objectKeyPermutationChecks += 1;
  }

  if (caseIndex % 16 === 2) runMetadataHashInvariance(generated.sleeve, generated.selection, result, context, prng);
  if (caseIndex % 16 === 3) runHashSensitivity(generated.sleeve, generated.selection, result, context);
}

function firstNeoBlock(sleeve) {
  return sleeve.neoBlocks[0];
}

function firstOwner(generated) {
  return generated.ownerByBlockId.get(generated.blockIds[0]);
}

function ensureSecondary(generated, neoBlock = firstNeoBlock(generated.sleeve)) {
  if (!neoBlock.secondaryDirectives) neoBlock.secondaryDirectives = [];
  if (neoBlock.secondaryDirectives.length > 0) return neoBlock.secondaryDirectives[0];
  const owner = generated.ownerByBlockId.get(neoBlock.id);
  const triggerId = `${typePrefix('trigger')}.${generated.sleeve.id}.MUT.SEC`.replace('SLV.', '');
  const directiveId = `${typePrefix('directive')}.${generated.sleeve.id}.MUT.SEC`.replace('SLV.', '');
  generated.sleeve.moltBlocks.push({ id: triggerId, type: 'trigger', content: 'mutation trigger' });
  generated.sleeve.moltBlocks.push({ id: directiveId, type: 'directive', content: 'mutation directive' });
  neoBlock.moltBlockIds.push(triggerId, directiveId);
  neoBlock.baseGeometry.trigger[0].blockIds.push(triggerId);
  owner.local.trigger.push(triggerId);
  owner.local.directive.push(directiveId);
  const secondary = { id: `SD.${generated.sleeve.id}.MUT`.replace('SLV.', ''), directiveBlockId: directiveId, triggerBlockId: triggerId };
  neoBlock.secondaryDirectives.push(secondary);
  return secondary;
}

function addGlobalMolt(sleeve, type, suffix) {
  const id = `${typePrefix(type)}.${sleeve.id}.${suffix}`.replace('SLV.', '');
  sleeve.moltBlocks.push({ id, type, content: `mutation ${type}` });
  return id;
}

function addLocalMolt(generated, neoBlock, type, suffix) {
  const id = addGlobalMolt(generated.sleeve, type, suffix);
  neoBlock.moltBlockIds.push(id);
  return id;
}

const structuralMutators = [
  {
    name: 'unknown top-level property',
    mutate(generated) {
      generated.sleeve.unknownD2 = true;
    },
  },
  {
    name: 'unknown nested property',
    mutate(generated) {
      firstNeoBlock(generated.sleeve).unknownNestedD2 = true;
    },
  },
  {
    name: 'missing required field',
    mutate(generated) {
      delete generated.sleeve.name;
    },
  },
  {
    name: 'wrong scalar type',
    mutate(generated) {
      generated.sleeve.id = 42;
    },
  },
  {
    name: 'wrong array type',
    mutate(generated) {
      generated.sleeve.moltBlocks = {};
    },
  },
  {
    name: 'wrong object type',
    mutate(generated) {
      generated.selection.triggerState = [];
    },
  },
  {
    name: 'empty string minLength',
    mutate(generated) {
      generated.sleeve.neoBlocks[0].name = '';
    },
  },
  {
    name: 'empty required array',
    mutate(generated) {
      generated.sleeve.neoStacks = [];
    },
  },
  {
    name: 'duplicate unique array member',
    mutate(generated) {
      generated.selection.activeNeoStackIds.push(generated.selection.activeNeoStackIds[0]);
    },
  },
  {
    name: 'invalid enum',
    mutate(generated) {
      generated.sleeve.moltBlocks[0].type = 'not-a-molt-type';
    },
  },
  {
    name: 'invalid schema const',
    mutate(generated) {
      generated.selection.schemaVersion = 'umg.compiler-vnext.selection.v0.2';
    },
  },
  {
    name: 'row below minimum',
    mutate(generated) {
      firstNeoBlock(generated.sleeve).baseGeometry.instruction[0].row = 0;
    },
  },
  {
    name: 'invalid date-time format',
    mutate(generated) {
      generated.selection.compiledAt = 'not-a-date';
    },
  },
  {
    name: 'malformed scope union',
    mutate(generated) {
      const scopedId = generated.sleeve.moltBlocks.find((block) => SCOPED_TYPES.includes(block.type)).id;
      generated.sleeve.scopedMolt = [{ id: `ATT.${generated.sleeve.id}.BAD`.replace('SLV.', ''), blockId: scopedId, scope: { kind: 'bogus' } }];
    },
  },
  {
    name: 'duplicate merge source',
    mutate(generated) {
      const neoBlock = firstNeoBlock(generated.sleeve);
      if (!neoBlock.merges?.length) {
        const a = addLocalMolt(generated, neoBlock, 'instruction', 'STRUCT.SRC');
        const r = addLocalMolt(generated, neoBlock, 'instruction', 'STRUCT.RESULT');
        neoBlock.baseGeometry.instruction[0].blockIds.push(a, r);
        neoBlock.merges = [{ id: `MRG.${generated.sleeve.id}.STRUCT`.replace('SLV.', ''), sourceBlockIds: [a, a], resultBlockId: r }];
      } else {
        neoBlock.merges[0].sourceBlockIds = [neoBlock.merges[0].sourceBlockIds[0], neoBlock.merges[0].sourceBlockIds[0]];
      }
    },
  },
];

function runStructuralInvalidCase(seed, caseIndex, mutationIndex) {
  const prng = makePrng(stableCaseSeed(seed, caseIndex, 'structural_invalid'));
  const generated = makeValidFixtureAndSelection(prng, seed, caseIndex);
  const mutation = structuralMutators[mutationIndex % structuralMutators.length];
  mutation.mutate(generated);
  const context = contextFor(
    seed,
    caseIndex,
    'structural_invalid',
    { ...generated.generationParameters, mutation: mutation.name },
    generated.sleeve,
    generated.selection,
    'structural mutation fails without raw throw, runtime, or trace',
  );
  currentContext = context;
  results.totalCases += 1;
  results.structuralInvalidCases += 1;
  const result = compileWithReplay(generated.sleeve, generated.selection, context);
  assertRegisteredOutput(result, context);
  assertFailureEnvelope(result, null, context);
}

function ensureTwoStackPlacement(generated) {
  if (generated.sleeve.neoStacks.length > 1) return;
  const stackId = `NS.${generated.sleeve.id}.MUT`.replace('SLV.', '');
  generated.sleeve.neoStacks.push({
    id: stackId,
    name: 'Mutation Stack',
    skill: 'Mutation stack.',
    neoBlockRows: [{ row: 1, neoBlockIds: [generated.blockIds[0]] }],
  });
  generated.sleeve.neoStacks[0].childStackRows = [{ row: 1, neoStackIds: [stackId] }];
}

function ensureSecondParent(generated) {
  const root = generated.sleeve.neoStacks[0];
  if (generated.sleeve.neoStacks.length < 2) ensureTwoStackPlacement(generated);
  const child = generated.sleeve.neoStacks[1];
  const extraParentId = `NS.${generated.sleeve.id}.PARENT2`.replace('SLV.', '');
  generated.sleeve.neoStacks.push({
    id: extraParentId,
    name: 'Second Parent',
    skill: 'Second parent.',
    neoBlockRows: [{ row: 1, neoBlockIds: [generated.blockIds[0]] }],
    childStackRows: [{ row: 1, neoStackIds: [child.id] }],
  });
  root.childStackRows = root.childStackRows ?? [];
  root.childStackRows.push({ row: root.childStackRows.length + 1, neoStackIds: [extraParentId] });
}

function ensureBundleOfType(generated, neoBlock, moltType) {
  neoBlock.bundles = neoBlock.bundles ?? [];
  let bundle = neoBlock.bundles.find((candidate) => candidate.moltType === moltType);
  if (bundle) return bundle;
  const id = addLocalMolt(generated, neoBlock, moltType, `MUT.BND.${moltType}`);
  neoBlock.baseGeometry[moltType] = neoBlock.baseGeometry[moltType] ?? [{ row: 1, blockIds: [] }];
  neoBlock.baseGeometry[moltType][0].blockIds.push(id);
  bundle = {
    id: `BND.${generated.sleeve.id}.MUT.${moltType}`.replace('SLV.', ''),
    moltType,
    rows: [{ row: 1, blockIds: [id] }],
  };
  neoBlock.bundles.push(bundle);
  return bundle;
}

function ensureMerge(generated, neoBlock = firstNeoBlock(generated.sleeve)) {
  if (neoBlock.merges?.length) return neoBlock.merges[0];
  const sourceA = addLocalMolt(generated, neoBlock, 'instruction', 'MUT.MRG.SRC0');
  const sourceB = addLocalMolt(generated, neoBlock, 'instruction', 'MUT.MRG.SRC1');
  const resultBlockId = addLocalMolt(generated, neoBlock, 'instruction', 'MUT.MRG.RESULT');
  neoBlock.baseGeometry.instruction[0].blockIds.push(sourceA, sourceB, resultBlockId);
  neoBlock.merges = [{
    id: `MRG.${generated.sleeve.id}.MUT`.replace('SLV.', ''),
    sourceBlockIds: [sourceA, sourceB],
    resultBlockId,
  }];
  return neoBlock.merges[0];
}

const semanticMutators = [
  {
    name: 'duplicate global id',
    mutate(generated) {
      generated.sleeve.moltBlocks[0].id = generated.sleeve.neoBlocks[0].id;
    },
  },
  {
    name: 'unknown local MOLT reference',
    mutate(generated) {
      firstNeoBlock(generated.sleeve).moltBlockIds.push('MOLT.UNKNOWN.D2');
    },
  },
  {
    name: 'Prime not local',
    mutate(generated) {
      const directiveId = addGlobalMolt(generated.sleeve, 'directive', 'PRIME.NOTLOCAL');
      firstNeoBlock(generated.sleeve).primeDirectiveId = directiveId;
    },
  },
  {
    name: 'Prime wrong type',
    mutate(generated) {
      firstNeoBlock(generated.sleeve).primeDirectiveId = firstOwner(generated).local.trigger[0];
    },
  },
  {
    name: 'Prime also Secondary',
    mutate(generated) {
      const neoBlock = firstNeoBlock(generated.sleeve);
      const secondary = ensureSecondary(generated, neoBlock);
      secondary.directiveBlockId = neoBlock.primeDirectiveId;
    },
  },
  {
    name: 'Trigger bound to multiple Secondaries',
    mutate(generated) {
      const neoBlock = firstNeoBlock(generated.sleeve);
      const secondary = ensureSecondary(generated, neoBlock);
      const directiveId = addLocalMolt(generated, neoBlock, 'directive', 'MUT.SEC.DUP');
      neoBlock.secondaryDirectives.push({
        id: `${secondary.id}.DUP`,
        directiveBlockId: directiveId,
        triggerBlockId: secondary.triggerBlockId,
      });
    },
  },
  {
    name: 'Secondary wrong Directive',
    mutate(generated) {
      const secondary = ensureSecondary(generated);
      secondary.directiveBlockId = firstOwner(generated).local.instruction[0];
    },
  },
  {
    name: 'Secondary wrong Trigger',
    mutate(generated) {
      const secondary = ensureSecondary(generated);
      secondary.triggerBlockId = firstOwner(generated).local.directive[0];
    },
  },
  {
    name: 'noncontiguous geometry',
    mutate(generated) {
      firstNeoBlock(generated.sleeve).baseGeometry.instruction[0].row = 2;
    },
  },
  {
    name: 'duplicate geometry members',
    mutate(generated) {
      const lane = firstNeoBlock(generated.sleeve).baseGeometry.instruction;
      lane.push({ row: lane.length + 1, blockIds: [lane[0].blockIds[0]] });
    },
  },
  {
    name: 'nonlocal geometry member',
    mutate(generated) {
      const id = addGlobalMolt(generated.sleeve, 'instruction', 'NONLOCAL');
      firstNeoBlock(generated.sleeve).baseGeometry.instruction[0].blockIds.push(id);
    },
  },
  {
    name: 'wrong lane member type',
    mutate(generated) {
      firstNeoBlock(generated.sleeve).baseGeometry.instruction[0].blockIds.push(firstOwner(generated).local.subject[0]);
    },
  },
  {
    name: 'missing required MOLT',
    mutate(generated) {
      const neoBlock = firstNeoBlock(generated.sleeve);
      neoBlock.moltBlockIds = neoBlock.moltBlockIds.filter((id) => id !== firstOwner(generated).local.primary[0]);
    },
  },
  {
    name: 'orphan Directive',
    mutate(generated) {
      addLocalMolt(generated, firstNeoBlock(generated.sleeve), 'directive', 'ORPHAN');
    },
  },
  {
    name: 'NeoBlock zero placements',
    mutate(generated) {
      for (const stack of generated.sleeve.neoStacks) {
        for (const row of stack.neoBlockRows) row.neoBlockIds = row.neoBlockIds.filter((id) => id !== generated.blockIds[0]);
        stack.neoBlockRows = stack.neoBlockRows
          .filter((row) => row.neoBlockIds.length > 0)
          .map((row, index) => ({ ...row, row: index + 1 }));
      }
    },
  },
  {
    name: 'NeoBlock multiple placements',
    mutate(generated) {
      const targetBlockId = generated.blockIds[0];
      const owner = generated.ownerByBlockId.get(targetBlockId);
      let otherStack = generated.sleeve.neoStacks.find((stack) => stack.id !== owner.stackId);
      if (!otherStack) {
        ensureTwoStackPlacement(generated);
        otherStack = generated.sleeve.neoStacks.find((stack) => stack.id !== owner.stackId);
      }
      otherStack.neoBlockRows[0].neoBlockIds.push(targetBlockId);
    },
  },
  {
    name: 'unknown child NeoStack',
    mutate(generated) {
      generated.sleeve.neoStacks[0].childStackRows = [{ row: 1, neoStackIds: ['NS.UNKNOWN.D2'] }];
    },
  },
  {
    name: 'multiple parents',
    mutate(generated) {
      ensureSecondParent(generated);
    },
  },
  {
    name: 'NeoStack cycle',
    mutate(generated) {
      const root = generated.sleeve.neoStacks[0];
      const child = generated.sleeve.neoStacks[1] ?? generated.sleeve.neoStacks[0];
      child.childStackRows = [{ row: 1, neoStackIds: [root.id] }];
    },
  },
  {
    name: 'orphan NeoStack',
    mutate(generated) {
      generated.sleeve.neoStacks.push({
        id: `NS.${generated.sleeve.id}.ORPHAN`.replace('SLV.', ''),
        name: 'Orphan',
        skill: 'Orphan stack.',
        neoBlockRows: [{ row: 1, neoBlockIds: [generated.blockIds[0]] }],
      });
    },
  },
  {
    name: 'unknown Controller',
    mutate(generated) {
      generated.sleeve.controllerNeoStackId = 'NS.UNKNOWN.CONTROLLER';
    },
  },
  {
    name: 'invalid Bundle reference',
    mutate(generated) {
      const secondary = ensureSecondary(generated);
      secondary.bundles = { instruction: 'BND.UNKNOWN.D2' };
    },
  },
  {
    name: 'Bundle type mismatch',
    mutate(generated) {
      const neoBlock = firstNeoBlock(generated.sleeve);
      const secondary = ensureSecondary(generated, neoBlock);
      const bundle = ensureBundleOfType(generated, neoBlock, 'philosophy');
      secondary.bundles = { instruction: bundle.id };
    },
  },
  {
    name: 'Merge result equals source',
    mutate(generated) {
      const merge = ensureMerge(generated);
      merge.resultBlockId = merge.sourceBlockIds[0];
    },
  },
  {
    name: 'unknown Merge source',
    mutate(generated) {
      const merge = ensureMerge(generated);
      merge.sourceBlockIds[0] = 'I.UNKNOWN.MERGE.SOURCE';
    },
  },
  {
    name: 'unknown Merge result',
    mutate(generated) {
      const merge = ensureMerge(generated);
      merge.resultBlockId = 'I.UNKNOWN.MERGE.RESULT';
    },
  },
  {
    name: 'authority escalation',
    mutate(generated) {
      const neoBlock = firstNeoBlock(generated.sleeve);
      const sourceA = addLocalMolt(generated, neoBlock, 'blueprint', 'AUTH.SRC0');
      const sourceB = addLocalMolt(generated, neoBlock, 'blueprint', 'AUTH.SRC1');
      const resultBlockId = addLocalMolt(generated, neoBlock, 'directive', 'AUTH.RESULT');
      neoBlock.baseGeometry.blueprint = neoBlock.baseGeometry.blueprint ?? [{ row: 1, blockIds: [] }];
      neoBlock.baseGeometry.blueprint[0].blockIds.push(sourceA, sourceB);
      neoBlock.merges = neoBlock.merges ?? [];
      neoBlock.merges.push({
        id: `MRG.${generated.sleeve.id}.AUTH`.replace('SLV.', ''),
        sourceBlockIds: [sourceA, sourceB],
        resultBlockId,
      });
    },
  },
  {
    name: 'Merge result unplaced',
    mutate(generated) {
      const neoBlock = firstNeoBlock(generated.sleeve);
      const sourceA = addLocalMolt(generated, neoBlock, 'instruction', 'UNPLACED.SRC0');
      const sourceB = addLocalMolt(generated, neoBlock, 'instruction', 'UNPLACED.SRC1');
      const resultBlockId = addLocalMolt(generated, neoBlock, 'instruction', 'UNPLACED.RESULT');
      neoBlock.baseGeometry.instruction[0].blockIds.push(sourceA, sourceB);
      neoBlock.merges = neoBlock.merges ?? [];
      neoBlock.merges.push({
        id: `MRG.${generated.sleeve.id}.UNPLACED`.replace('SLV.', ''),
        sourceBlockIds: [sourceA, sourceB],
        resultBlockId,
      });
    },
  },
  {
    name: 'Merge chain',
    mutate(generated) {
      const neoBlock = firstNeoBlock(generated.sleeve);
      const first = ensureMerge(generated, neoBlock);
      const resultBlockId = addLocalMolt(generated, neoBlock, 'instruction', 'CHAIN.RESULT');
      neoBlock.baseGeometry.instruction[0].blockIds.push(resultBlockId);
      neoBlock.merges.push({
        id: `${first.id}.CHAIN`,
        sourceBlockIds: [first.resultBlockId, first.sourceBlockIds[0]],
        resultBlockId,
      });
    },
  },
  {
    name: 'Merge cycle',
    mutate(generated) {
      const neoBlock = firstNeoBlock(generated.sleeve);
      const sourceA = addLocalMolt(generated, neoBlock, 'instruction', 'CYCLE.A');
      const sourceB = addLocalMolt(generated, neoBlock, 'instruction', 'CYCLE.B');
      neoBlock.baseGeometry.instruction[0].blockIds.push(sourceA, sourceB);
      neoBlock.merges = [{
        id: `MRG.${generated.sleeve.id}.CYCLE.A`.replace('SLV.', ''),
        sourceBlockIds: [sourceB, firstOwner(generated).local.instruction[0]],
        resultBlockId: sourceA,
      }, {
        id: `MRG.${generated.sleeve.id}.CYCLE.B`.replace('SLV.', ''),
        sourceBlockIds: [sourceA, firstOwner(generated).local.instruction[0]],
        resultBlockId: sourceB,
      }];
    },
  },
  {
    name: 'unsupported Merge scoped placement',
    mutate(generated) {
      const merge = ensureMerge(generated);
      generated.sleeve.scopedMolt = [{
        id: `ATT.${generated.sleeve.id}.MERGE`.replace('SLV.', ''),
        blockId: merge.resultBlockId,
        scope: { kind: 'sleeve' },
      }];
    },
  },
  {
    name: 'Governance no targets',
    mutate(generated) {
      generated.sleeve.governance = [{ id: `GOV.${generated.sleeve.id}.EMPTY`.replace('SLV.', ''), name: 'Empty', description: 'Empty.' }];
    },
  },
  {
    name: 'Governance unknown targets',
    mutate(generated) {
      generated.sleeve.governance = [{
        id: `GOV.${generated.sleeve.id}.UNKNOWN`.replace('SLV.', ''),
        name: 'Unknown',
        description: 'Unknown.',
        offNeoStackIds: ['NS.UNKNOWN.GOV'],
      }];
    },
  },
  {
    name: 'Scoped MOLT unknown target',
    mutate(generated) {
      const scopedId = generated.sleeve.moltBlocks.find((block) => SCOPED_TYPES.includes(block.type)).id;
      generated.sleeve.scopedMolt = [{
        id: `ATT.${generated.sleeve.id}.UNKNOWNSTACK`.replace('SLV.', ''),
        blockId: scopedId,
        scope: { kind: 'neostack', neoStackId: 'NS.UNKNOWN.SCOPE' },
      }];
    },
  },
  {
    name: 'Scoped MOLT unsupported type',
    mutate(generated) {
      generated.sleeve.scopedMolt = [{
        id: `ATT.${generated.sleeve.id}.TRIGGER`.replace('SLV.', ''),
        blockId: firstOwner(generated).local.trigger[0],
        scope: { kind: 'sleeve' },
      }];
    },
  },
];

function runSemanticInvalidCase(seed, caseIndex, mutationIndex) {
  const prng = makePrng(stableCaseSeed(seed, caseIndex, 'semantic_invalid'));
  const generated = makeValidFixtureAndSelection(prng, seed, caseIndex, {
    minStacks: 2,
    minBlocksPerStack: 2,
    forceSecondary: true,
  });
  const mutation = semanticMutators[mutationIndex % semanticMutators.length];
  mutation.mutate(generated);
  const context = contextFor(
    seed,
    caseIndex,
    'semantic_invalid',
    { ...generated.generationParameters, mutation: mutation.name },
    generated.sleeve,
    generated.selection,
    'semantic mutation fails at semantic boundary with registered diagnostics and no output events',
  );
  currentContext = context;
  results.totalCases += 1;
  results.semanticInvalidCases += 1;
  const result = compileWithReplay(generated.sleeve, generated.selection, context);
  assertRegisteredOutput(result, context);
  assertSemanticFailure(result, context);
}

function firstNonRootStack(fixture) {
  return fixture.stackIds.find((id) => id !== fixture.sleeve.controllerNeoStackId) ?? fixture.sleeve.controllerNeoStackId;
}

function firstBlockInStack(fixture, stackId) {
  return fixture.blocksByStackId.get(stackId)?.[0] ?? fixture.blockIds[0];
}

const resolutionMutators = [
  {
    name: 'selected NeoStack missing ancestor',
    mutate(generated) {
      const deepStack = generated.stackIds.find((id) => ancestorPath(id, generated).length >= 3) ?? firstNonRootStack(generated);
      const path = ancestorPath(deepStack, generated);
      generated.selection.activeNeoStackIds = [path[0], deepStack];
      generated.selection.activeNeoBlockIds = [firstBlockInStack(generated, deepStack)];
    },
  },
  {
    name: 'selected disabled NeoStack',
    mutate(generated) {
      const stackId = firstNonRootStack(generated);
      generated.selection.activeNeoStackIds = ancestorPath(stackId, generated);
      generated.selection.activeNeoBlockIds = [firstBlockInStack(generated, stackId)];
      generated.selection.disabledNeoStackIds = [stackId];
    },
  },
  {
    name: 'selected Governance-OFF NeoStack',
    mutate(generated) {
      const stackId = firstNonRootStack(generated);
      const ruleId = `GOV.${generated.sleeve.id}.RES.STACK`.replace('SLV.', '');
      generated.sleeve.governance = [{ id: ruleId, name: 'Off Stack', description: 'Off stack.', offNeoStackIds: [stackId] }];
      generated.selection.activeNeoStackIds = ancestorPath(stackId, generated);
      generated.selection.activeNeoBlockIds = [firstBlockInStack(generated, stackId)];
      generated.selection.activeGovernanceRuleIds = [ruleId];
    },
  },
  {
    name: 'selected NeoBlock with container not selected',
    mutate(generated) {
      const stackId = firstNonRootStack(generated);
      generated.selection.activeNeoStackIds = [generated.sleeve.controllerNeoStackId];
      generated.selection.activeNeoBlockIds = [firstBlockInStack(generated, stackId)];
    },
  },
  {
    name: 'selected NeoBlock with container not executable',
    mutate(generated) {
      const stackId = firstNonRootStack(generated);
      generated.selection.activeNeoStackIds = ancestorPath(stackId, generated);
      generated.selection.activeNeoBlockIds = [firstBlockInStack(generated, stackId)];
      generated.selection.disabledNeoStackIds = [stackId];
    },
  },
  {
    name: 'selected disabled NeoBlock',
    mutate(generated) {
      const stackId = firstNonRootStack(generated);
      const blockId = firstBlockInStack(generated, stackId);
      generated.selection.activeNeoStackIds = ancestorPath(stackId, generated);
      generated.selection.activeNeoBlockIds = [blockId];
      generated.selection.disabledNeoBlockIds = [blockId];
    },
  },
  {
    name: 'selected Governance-OFF NeoBlock',
    mutate(generated) {
      const stackId = firstNonRootStack(generated);
      const blockId = firstBlockInStack(generated, stackId);
      const ruleId = `GOV.${generated.sleeve.id}.RES.BLOCK`.replace('SLV.', '');
      generated.sleeve.governance = [{ id: ruleId, name: 'Off Block', description: 'Off block.', offNeoBlockIds: [blockId] }];
      generated.selection.activeNeoStackIds = ancestorPath(stackId, generated);
      generated.selection.activeNeoBlockIds = [blockId];
      generated.selection.activeGovernanceRuleIds = [ruleId];
    },
  },
  {
    name: 'no active Trigger for selected NeoBlock',
    mutate(generated) {
      const blockId = generated.selection.activeNeoBlockIds[0];
      const owner = generated.ownerByBlockId.get(blockId);
      for (const triggerId of owner.local.trigger) generated.selection.triggerState[triggerId] = false;
    },
  },
  {
    name: 'multiple matching Secondary Directives',
    mutate(generated) {
      const blockId = generated.selection.activeNeoBlockIds[0];
      const neoBlock = generated.sleeve.neoBlocks.find((candidate) => candidate.id === blockId);
      const first = ensureSecondary(generated, neoBlock);
      const secondDirectiveId = addLocalMolt(generated, neoBlock, 'directive', 'RES.SECONDARY');
      const secondTriggerId = addLocalMolt(generated, neoBlock, 'trigger', 'RES.TRIGGER');
      neoBlock.baseGeometry.trigger[0].blockIds.push(secondTriggerId);
      neoBlock.secondaryDirectives.push({
        id: `${first.id}.RES`,
        directiveBlockId: secondDirectiveId,
        triggerBlockId: secondTriggerId,
      });
      generated.selection.triggerState[first.triggerBlockId] = true;
      generated.selection.triggerState[secondTriggerId] = true;
    },
  },
];

function runResolutionInvalidCase(seed, caseIndex, mutationIndex) {
  const prng = makePrng(stableCaseSeed(seed, caseIndex, 'resolution_invalid'));
  const generated = makeValidFixtureAndSelection(prng, seed, caseIndex, {
    minStacks: 3,
    forceChain: true,
    forceSecondary: true,
  });
  const mutation = resolutionMutators[mutationIndex % resolutionMutators.length];
  mutation.mutate(generated);
  const context = contextFor(
    seed,
    caseIndex,
    'resolution_invalid',
    { ...generated.generationParameters, mutation: mutation.name },
    generated.sleeve,
    generated.selection,
    'resolution mutation fails at resolution boundary with no RuntimeSpec or post-run output',
  );
  currentContext = context;
  results.totalCases += 1;
  results.resolutionInvalidCases += 1;
  const result = compileWithReplay(generated.sleeve, generated.selection, context);
  assertRegisteredOutput(result, context);
  assertResolutionFailure(result, context);
}

function rawInputPair(prng, seed, caseIndex) {
  const generated = makeValidFixtureAndSelection(prng, seed, caseIndex);
  const weirdPrototype = Object.create({ inheritedD2: true });
  weirdPrototype.schemaVersion = 'umg.compiler-vnext.sleeve.v0.1';
  const proxy = new Proxy({}, {
    get(target, property, receiver) {
      return Reflect.get(target, property, receiver);
    },
    ownKeys(target) {
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, property) {
      return Reflect.getOwnPropertyDescriptor(target, property);
    },
  });
  const rawValues = [
    null,
    undefined,
    true,
    42,
    'not a document',
    [],
    {},
    [[['nested']]],
    weirdPrototype,
    proxy,
  ];
  const raw = rawValues[(caseIndex + prng.int(rawValues.length)) % rawValues.length];
  if (prng.bool()) {
    return {
      sleeve: raw,
      selection: generated.selection,
      sleeveDescription: Object.prototype.toString.call(raw),
      selectionDescription: 'valid generated selection',
    };
  }
  return {
    sleeve: generated.sleeve,
    selection: raw,
    sleeveDescription: 'valid generated sleeve',
    selectionDescription: Object.prototype.toString.call(raw),
  };
}

function runRawTypeCase(seed, caseIndex) {
  const prng = makePrng(stableCaseSeed(seed, caseIndex, 'raw_type'));
  const pair = rawInputPair(prng, seed, caseIndex);
  const context = contextFor(
    seed,
    caseIndex,
    'raw_type',
    {
      seed: hex(seed),
      caseIndex,
      rawSleeveDescription: pair.sleeveDescription,
      rawSelectionDescription: pair.selectionDescription,
    },
    pair.sleeve,
    pair.selection,
    'raw bounded public input types produce structured failures without raw exceptions',
  );
  currentContext = context;
  context.rawSleeveDescription = pair.sleeveDescription;
  context.rawSelectionDescription = pair.selectionDescription;
  results.totalCases += 1;
  results.rawTypeCases += 1;
  const result = compileWithReplay(pair.sleeve, pair.selection, context);
  assertRegisteredOutput(result, context);
  assertFailureEnvelope(result, null, context);
}

function runCaseProtected(fn, seed, caseIndex, family) {
  try {
    fn();
  } catch (error) {
    if (!error?.d2Preserved) {
      results.failures += 1;
    }
    if (!error?.d2Preserved || !existsSync(resolve(evidenceDir, 'FAILURE_CASE.json'))) {
      preserveFailure(currentContext ?? {
        seed,
        seedHex: hex(seed),
        caseIndex,
        family,
        generationParameters: { seed: hex(seed), caseIndex },
        expectedInvariant: 'case-level D2 invariant',
      }, error, null);
    }
    throw error;
  } finally {
    currentContext = null;
  }
}

function writePassEvidence(summary) {
  mkdirSync(evidenceDir, { recursive: true });
  const seeds = FUZZ_SEEDS.map((seed) => ({ decimal: seed >>> 0, hex: hex(seed) }));
  writeFileSync(resolve(evidenceDir, 'FUZZ_SEEDS.json'), `${JSON.stringify(seeds, null, 2)}\n`);
  writeFileSync(resolve(evidenceDir, 'FUZZ_RESULTS.json'), `${JSON.stringify(summary.fuzzResults, null, 2)}\n`);
  writeFileSync(resolve(evidenceDir, 'FUZZ_DISTRIBUTION.json'), `${JSON.stringify(summary.distribution, null, 2)}\n`);
  writeFileSync(
    resolve(evidenceDir, 'DETERMINISTIC_FUZZ_REPORT.md'),
    [
      '# compiler-vnext D2 deterministic fuzz report',
      '',
      'status: PASS',
      `seed_count: ${summary.fuzzResults.seedCount}`,
      `total_cases: ${summary.fuzzResults.totalCases}`,
      `valid_cases: ${summary.fuzzResults.validCases}`,
      `structural_invalid: ${summary.fuzzResults.structuralInvalidCases}`,
      `semantic_invalid: ${summary.fuzzResults.semanticInvalidCases}`,
      `resolution_invalid: ${summary.fuzzResults.resolutionInvalidCases}`,
      `raw_type_cases: ${summary.fuzzResults.rawTypeCases}`,
      `exact_replay_checks: ${summary.fuzzResults.exactReplayChecks}`,
      `five_replay_samples: ${summary.fuzzResults.fiveReplaySampleChecks}`,
      `invariance_pairs: ${summary.fuzzResults.invariancePairs}`,
      `sensitivity_pairs: ${summary.fuzzResults.sensitivityPairs}`,
      `unexpected_throws: ${summary.fuzzResults.unexpectedThrows}`,
      `contract_violations: ${summary.fuzzResults.contractViolations}`,
      '',
      'seeds:',
      ...seeds.map((seed) => `- ${seed.hex}`),
      '',
    ].join('\n'),
  );
}

for (const seed of FUZZ_SEEDS) {
  for (let caseIndex = 0; caseIndex < CASES_PER_SEED; caseIndex += 1) {
    runCaseProtected(() => {
      if (caseIndex < VALID_CASES_PER_SEED) {
        runValidCase(seed, caseIndex);
        return;
      }
      if (caseIndex < VALID_CASES_PER_SEED + STRUCTURAL_CASES_PER_SEED) {
        runStructuralInvalidCase(seed, caseIndex, caseIndex - VALID_CASES_PER_SEED);
        return;
      }
      if (caseIndex < VALID_CASES_PER_SEED + STRUCTURAL_CASES_PER_SEED + SEMANTIC_CASES_PER_SEED) {
        runSemanticInvalidCase(seed, caseIndex, caseIndex - VALID_CASES_PER_SEED - STRUCTURAL_CASES_PER_SEED);
        return;
      }
      if (
        caseIndex <
        VALID_CASES_PER_SEED + STRUCTURAL_CASES_PER_SEED + SEMANTIC_CASES_PER_SEED + RESOLUTION_CASES_PER_SEED
      ) {
        runResolutionInvalidCase(
          seed,
          caseIndex,
          caseIndex - VALID_CASES_PER_SEED - STRUCTURAL_CASES_PER_SEED - SEMANTIC_CASES_PER_SEED,
        );
        return;
      }
      runRawTypeCase(seed, caseIndex);
    }, seed, caseIndex, 'case');
  }
}

assert.equal(results.seedCount, 25);
assert.equal(results.totalCases, FUZZ_SEEDS.length * CASES_PER_SEED);
assert.equal(results.validCases, FUZZ_SEEDS.length * VALID_CASES_PER_SEED);
assert.equal(results.structuralInvalidCases, FUZZ_SEEDS.length * STRUCTURAL_CASES_PER_SEED);
assert.equal(results.semanticInvalidCases, FUZZ_SEEDS.length * SEMANTIC_CASES_PER_SEED);
assert.equal(results.resolutionInvalidCases, FUZZ_SEEDS.length * RESOLUTION_CASES_PER_SEED);
assert.equal(results.rawTypeCases, FUZZ_SEEDS.length * RAW_TYPE_CASES_PER_SEED);
assert.ok(results.totalCases >= 5000);
assert.ok(results.validCases >= 2000);
assert.ok(
  results.structuralInvalidCases + results.semanticInvalidCases + results.resolutionInvalidCases + results.rawTypeCases >= 3000,
);
assert.ok(results.fiveReplaySampleChecks >= 250);
assert.equal(results.unexpectedThrows, 0);
assert.equal(results.contractViolations, 0);
assert.equal(results.failures, 0);
assert.equal(results.hashFailures, 0);
assert.equal(results.registryDiagnosticViolations, 0);
assert.equal(results.registryTraceViolations, 0);
assert.equal(results.partialRuntimeLeaks, 0);
assert.equal(results.wrongTraceBoundary, 0);
assert.equal(results.missingErrorDiagnostic, 0);

const summary = {
  fuzzSeeds: FUZZ_SEEDS.map(hex),
  fuzzResults: results,
  distribution,
};

writePassEvidence(summary);

console.log('UMG compiler-vnext deterministic fuzz contract: PASS');
console.log(JSON.stringify(summary, null, 2));
