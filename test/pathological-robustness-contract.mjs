import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MOLT_TYPES,
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
const evidenceDir = resolve(root, '..', '..', 'recovery', 'umg-vnext-phase-d3');

const EXPECTED_HASHES = {
  normal: 'c3e18535479cf39938c8e7993db73f4c1b5135529ba20d9d8a2ccadf298498fd',
  secondaryB: '0b65ac8d7955628c5544cc93704d3acffc7036c2e9d52dffba8c24e1bd26d7cd',
};

const CASES = [];
const CASE_INDEX = [];
const FAMILY_COUNTS = new Map();
const OBSERVED = {
  successCases: 0,
  semanticFailureCases: 0,
  resolutionFailureCases: 0,
  unexpectedThrows: 0,
  contractViolations: 0,
  partialRuntimeLeaks: 0,
  stateLeaks: 0,
  defects: [],
  traceEventCounts: [],
  diagnosticCodes: {},
  traceEventTypes: {},
  terminalStages: {},
  statusCounts: {},
  maxTopologyDepth: 0,
  maxPeerWidth: 0,
  maxContentChars: 0,
};

const STAGE_TO_STATUS = {
  post_run: 'success',
  semantic: 'failure',
  resolution: 'failure',
};

const LANE_ORDER = [
  'trigger',
  'directive',
  'instruction',
  'subject',
  'primary',
  'philosophy',
  'blueprint',
];

function json(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function bump(map, key) {
  map[key] = (map[key] ?? 0) + 1;
}

function safeJson(value) {
  if (value === undefined) return { nonJsonValue: 'undefined' };
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
    caseId: context.id,
    family: context.family,
    description: context.description,
    sleeve: safeJson(context.sleeve),
    selection: safeJson(context.selection),
    expectedInvariant: context.expectedInvariant,
    expectedStage: context.expectedStage,
    actualOutput: result ? safeJson(result) : null,
    diagnostics: result?.diagnostics ?? [],
    traceEventTypes: traceEventTypes(result),
    runtimeHash: result?.runtime?.runtimeHash ?? null,
    exceptionStack: error?.stack ?? String(error),
  };
  writeFileSync(resolve(evidenceDir, 'FAILURE_CASE.json'), `${JSON.stringify(packet, null, 2)}\n`);
  writeFileSync(
    resolve(evidenceDir, 'FAILURE_REPORT.md'),
    [
      '# compiler-vnext D3 pathological robustness failure',
      '',
      `case id: ${packet.caseId}`,
      `family: ${packet.family}`,
      `expected invariant: ${packet.expectedInvariant}`,
      `expected stage: ${packet.expectedStage}`,
      `runtimeHash: ${packet.runtimeHash ?? 'null'}`,
      '',
      'diagnostics:',
      ...diagnosticCodes(result).map((code) => `- ${code}`),
      '',
      'Trace event types:',
      ...packet.traceEventTypes.map((type) => `- ${type}`),
      '',
      'exception stack:',
      '```',
      packet.exceptionStack,
      '```',
      '',
    ].join('\n'),
  );
  writeFileSync(resolve(evidenceDir, 'status.txt'), 'BLOCKED\n');
  if (error && typeof error === 'object') error.d3Preserved = true;
}

function fail(context, message, details = {}) {
  OBSERVED.contractViolations += 1;
  const error = new Error(`${message}: ${JSON.stringify(safeJson(details))}`);
  preserveFailure(context, error, details.result);
  throw error;
}

function failStateLeak(context, message, details = {}) {
  OBSERVED.stateLeaks += 1;
  fail(context, message, details);
}

function compileSafely(sleeve, selection, context) {
  try {
    return compileSleeve(sleeve, selection);
  } catch (error) {
    OBSERVED.unexpectedThrows += 1;
    preserveFailure(context, error, null);
    throw error;
  }
}

function assertSchemaOk(validation, label, context) {
  if (!validation.ok) {
    fail(context, `${label} schema validation failed`, { diagnostics: validation.diagnostics });
  }
}

function assertDiagnosticRegistry(diagnostics, context) {
  for (const diagnostic of diagnostics) {
    if (!Object.hasOwn(DIAGNOSTIC_REGISTRY, diagnostic.code)) {
      fail(context, 'Diagnostic code is not registered', { diagnostic });
    }
    const issues = validateDiagnosticAgainstRegistry(diagnostic);
    if (issues.length > 0) {
      fail(context, 'Diagnostic violates registry contract', { diagnostic, issues });
    }
  }
}

function assertTraceRegistry(trace, context) {
  if (!trace) return;
  let previousStageOrder = -1;
  trace.events.forEach((event, index) => {
    assert.equal(event.seq, index + 1, `Trace seq gap at ${context.id}`);
    if (!Object.hasOwn(TRACE_EVENT_REGISTRY, event.type)) {
      fail(context, 'Trace event type is not registered', { event, result: { trace } });
    }
    const issues = validateTraceEventAgainstRegistry(event);
    if (issues.length > 0) {
      fail(context, 'Trace event violates registry contract', { event, issues, result: { trace } });
    }
    const stageOrder = TRACE_STAGE_ORDER[event.stage];
    assert.ok(stageOrder >= previousStageOrder, `Trace stage order regressed at ${context.id}`);
    previousStageOrder = stageOrder;
  });
}

function assertRegisteredOutput(result, context) {
  assertDiagnosticRegistry(result.diagnostics ?? [], context);
  assertDiagnosticRegistry(result.trace?.diagnostics ?? [], context);
  assertDiagnosticRegistry(result.runtime?.diagnostics ?? [], context);
  assertTraceRegistry(result.trace, context);
}

function assertNoPriorityKeys(value, context, path = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoPriorityKeys(item, context, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    assert.equal(key.toLowerCase().includes('priority'), false, `Priority key surfaced at ${path}.${key}`);
    assertNoPriorityKeys(nested, context, `${path}.${key}`);
  }
}

function promptProjectionFromResolved(runtime) {
  const projected = [];
  for (const neoBlock of runtime.resolvedNeoBlocks) {
    neoBlock.lanes.forEach((lane) => {
      const laneOrder = LANE_ORDER.indexOf(lane.moltType) + 1;
      lane.scoped.forEach((block, index) => {
        projected.push({
          id: block.id,
          type: block.type,
          sourceMode: block.sourceMode,
          sourceId: block.sourceId,
          sourceScope: block.sourceScope,
          overlayId: block.overlayId,
          mergeId: block.mergeId,
          neoBlockId: neoBlock.id,
          laneOrder,
          scopeLayer: block.sourceScope?.kind === 'neostack' ? 1 : 0,
          row: 0,
          column: index + 1,
        });
      });
      lane.rows.forEach((row) => {
        row.blocks.forEach((block, index) => {
          projected.push({
            id: block.id,
            type: block.type,
            sourceMode: block.sourceMode,
            sourceId: block.sourceId,
            sourceScope: block.sourceScope,
            overlayId: block.overlayId,
            mergeId: block.mergeId,
            neoBlockId: neoBlock.id,
            laneOrder,
            scopeLayer: 100,
            row: row.row,
            column: index + 1,
          });
        });
      });
    });
  }
  return projected;
}

function promptProjection(runtime) {
  return runtime.promptParts.map((part) => ({
    id: part.id,
    type: part.type,
    sourceMode: part.sourceMode,
    sourceId: part.sourceId,
    sourceScope: part.sourceScope,
    overlayId: part.overlayId,
    mergeId: part.mergeId,
    neoBlockId: part.neoBlockId,
    laneOrder: part.laneOrder,
    scopeLayer: part.scopeLayer,
    row: part.row,
    column: part.column,
  }));
}

function assertPromptFlattening(result, context) {
  assert.deepEqual(promptProjection(result.runtime), promptProjectionFromResolved(result.runtime));
}

function assertSuccessInvariants(sleeve, selection, result, context) {
  assert.equal(result.status, 'success');
  assert.equal(result.hasErrors, false);
  assert.ok(result.runtime);
  assert.ok(result.trace);
  assert.equal(result.trace.terminalStage, 'post_run');
  assert.deepEqual(result.trace.diagnostics, result.diagnostics);
  assert.deepEqual(result.runtime.diagnostics, result.diagnostics);
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.level === 'error'), false);
  assert.equal(result.runtime.runtimeHash, computeRuntimeHash(result.runtime));
  assertSchemaOk(structurallyValidateRuntimeSpec(result.runtime), 'RuntimeSpec', context);
  assertSchemaOk(structurallyValidateTrace(result.trace), 'Trace', context);
  assertSchemaOk(structurallyValidateCompileResult(result), 'CompileResult', context);
  assert.deepEqual(Object.keys(result.trace.finalNeoStackStates).sort(), sleeve.neoStacks.map((stack) => stack.id).sort());
  assert.deepEqual(Object.keys(result.trace.finalNeoBlockStates).sort(), sleeve.neoBlocks.map((block) => block.id).sort());
  assert.deepEqual(result.runtime.resetPlan.neoStackIds, result.runtime.activeNeoStackIds);
  assert.deepEqual(result.runtime.resetPlan.neoBlockIds, result.runtime.resolvedNeoBlocks.map((block) => block.id));
  assert.equal(result.runtime.resetPlan.targetState, 'ready');
  assert.equal(result.runtime.compiledAt, selection.compiledAt);
  assertPromptFlattening(result, context);
  assertNoPriorityKeys(result, context);
}

function assertFailureEnvelope(result, terminalStage, context) {
  assert.equal(result.status, 'failure');
  assert.equal(result.hasErrors, true);
  if (result.runtime !== null) {
    OBSERVED.partialRuntimeLeaks += 1;
    fail(context, 'Failure leaked a partial RuntimeSpec', { result });
  }
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.level === 'error'));
  assertSchemaOk(structurallyValidateCompileResult(result), 'CompileResult', context);
  assert.ok(result.trace);
  assert.equal(result.trace.terminalStage, terminalStage);
  assert.deepEqual(result.trace.diagnostics, result.diagnostics);
  assertSchemaOk(structurallyValidateTrace(result.trace), 'Trace', context);
  assert.equal(result.trace.events.some((event) => event.type === 'RUNTIME_COMPILED'), false);
  assert.equal(result.trace.events.some((event) => event.type === 'POST_RUN_RESET_DECLARED'), false);
  if (terminalStage === 'semantic') {
    assert.equal(result.trace.events.some((event) => TRACE_STAGE_ORDER[event.stage] > TRACE_STAGE_ORDER.semantic), false);
  }
  if (terminalStage === 'resolution') {
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
  assertNoPriorityKeys(result, context);
}

function compileWithReplay(sleeve, selection, context, repetitions = 3) {
  const first = compileSafely(sleeve, selection, context);
  for (let index = 1; index < repetitions; index += 1) {
    const replay = compileSafely(sleeve, selection, context);
    assert.deepEqual(replay, first, `Exact replay must be deterministic for ${context.id}`);
  }
  return first;
}

function lane(runtime, neoBlockId, moltType) {
  const block = runtime.resolvedNeoBlocks.find((candidate) => candidate.id === neoBlockId);
  assert.ok(block, `missing resolved NeoBlock ${neoBlockId}`);
  const resolvedLane = block.lanes.find((candidate) => candidate.moltType === moltType);
  assert.ok(resolvedLane, `missing ${moltType} lane for ${neoBlockId}`);
  return resolvedLane;
}

function rowIds(runtime, neoBlockId, moltType) {
  return lane(runtime, neoBlockId, moltType).rows.map((row) => row.blocks.map((block) => block.id));
}

function scoped(runtime, neoBlockId, moltType) {
  return lane(runtime, neoBlockId, moltType).scoped;
}

function promptParts(runtime, predicate = () => true) {
  return runtime.promptParts.filter(predicate);
}

function traceEvents(result, type, predicate = () => true) {
  return result.trace?.events.filter((event) => event.type === type && predicate(event)) ?? [];
}

function findNeoBlock(sleeve, id) {
  const item = sleeve.neoBlocks.find((block) => block.id === id);
  assert.ok(item, `missing NeoBlock ${id}`);
  return item;
}

function findNeoStack(sleeve, id) {
  const item = sleeve.neoStacks.find((stack) => stack.id === id);
  assert.ok(item, `missing NeoStack ${id}`);
  return item;
}

function findMerge(sleeve, neoBlockId, mergeId) {
  const item = findNeoBlock(sleeve, neoBlockId).merges.find((merge) => merge.id === mergeId);
  assert.ok(item, `missing Merge ${mergeId}`);
  return item;
}

function makeSelection({ activeNeoStackIds, activeNeoBlockIds, triggerState, compiledAt, ...rest }) {
  return {
    schemaVersion: 'umg.compiler-vnext.selection.v0.1',
    compiledAt: compiledAt ?? '2026-08-16T00:00:00.000Z',
    activeNeoStackIds,
    activeNeoBlockIds,
    triggerState,
    ...rest,
  };
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

function blockId(prefix, type, suffix) {
  return `${typePrefix(type)}.${prefix}.${suffix}`;
}

function makeMolt(prefix, type, suffix, content = `${type} content for ${suffix}.`) {
  return {
    id: blockId(prefix, type, suffix),
    type,
    content,
    title: `${type} ${suffix}`,
  };
}

function makeBasicNeoBlock(prefix, suffix, extras = {}) {
  const t = makeMolt(prefix, 'trigger', `${suffix}.DEFAULT`, extras.triggerContent);
  const d = makeMolt(prefix, 'directive', `${suffix}.PRIME`, extras.directiveContent);
  const i = makeMolt(prefix, 'instruction', `${suffix}.STEP`, extras.instructionContent);
  const s = makeMolt(prefix, 'subject', `${suffix}.SUBJECT`, extras.subjectContent);
  const p = makeMolt(prefix, 'primary', `${suffix}.PRIMARY`, extras.primaryContent);
  return {
    moltBlocks: [t, d, i, s, p],
    neoBlock: {
      id: `NB.${prefix}.${suffix}`,
      name: `NeoBlock ${suffix}`,
      moltBlockIds: [t.id, d.id, i.id, s.id, p.id],
      primeDirectiveId: d.id,
      baseGeometry: {
        trigger: [{ row: 1, blockIds: [t.id] }],
        directive: [{ row: 1, blockIds: [d.id] }],
        instruction: [{ row: 1, blockIds: [i.id] }],
        subject: [{ row: 1, blockIds: [s.id] }],
        primary: [{ row: 1, blockIds: [p.id] }],
      },
    },
    triggerId: t.id,
  };
}

function rowsFromIds(ids, width = ids.length) {
  const rows = [];
  for (let index = 0; index < ids.length; index += width) {
    rows.push({ row: rows.length + 1, blockIds: ids.slice(index, index + width) });
  }
  return rows;
}

function stackRowsFromIds(ids, width = ids.length) {
  return rowsFromIds(ids, width).map((row) => ({
    row: row.row,
    neoStackIds: row.blockIds,
  }));
}

function blockRowsFromIds(ids, width = ids.length) {
  return rowsFromIds(ids, width).map((row) => ({
    row: row.row,
    neoBlockIds: row.blockIds,
  }));
}

function buildTopologySleeve({ id, childMap, blockRowMap = {}, stackIds }) {
  const moltBlocks = [];
  const neoBlocks = [];
  const neoStacks = [];
  const triggerState = {};
  const blockByStack = {};

  for (const stackId of stackIds) {
    const short = stackId.replace(/^NS\./, '').replaceAll('.', '_');
    const made = makeBasicNeoBlock(id, short);
    moltBlocks.push(...made.moltBlocks);
    neoBlocks.push(made.neoBlock);
    triggerState[made.triggerId] = true;
    blockByStack[stackId] = made.neoBlock.id;
  }

  for (const stackId of stackIds) {
    const childRows = childMap.get(stackId) ?? [];
    const neoStack = {
      id: stackId,
      name: `Stack ${stackId}`,
      skill: `Pathological topology stack ${stackId}.`,
      neoBlockRows: blockRowsFromIds([blockByStack[stackId]], blockRowMap[stackId] ?? 1),
    };
    if (childRows.length > 0) neoStack.childStackRows = childRows;
    neoStacks.push(neoStack);
  }

  return {
    sleeve: {
      schemaVersion: 'umg.compiler-vnext.sleeve.v0.1',
      id: `SLV.${id}`,
      name: `Pathological topology ${id}`,
      controllerNeoStackId: stackIds[0],
      moltBlocks,
      neoBlocks,
      neoStacks,
    },
    triggerState,
    blockByStack,
  };
}

function buildChainTopology(depth, id) {
  const stackIds = Array.from({ length: depth }, (_, index) => `NS.${id}.${String(index).padStart(2, '0')}`);
  const childMap = new Map();
  for (let index = 0; index < stackIds.length - 1; index += 1) {
    childMap.set(stackIds[index], [{ row: 1, neoStackIds: [stackIds[index + 1]] }]);
  }
  return { ...buildTopologySleeve({ id, childMap, stackIds }), stackIds };
}

function buildWidthTopology(width, id, authoredOrder = 'normal') {
  const rootId = `NS.${id}.ROOT`;
  const children = Array.from({ length: width }, (_, index) => `NS.${id}.PEER.${String(index).padStart(2, '0')}`);
  const orderedChildren = authoredOrder === 'reverse' ? children.slice().reverse() : children;
  const stackIds = [rootId, ...children];
  const childMap = new Map([[rootId, [{ row: 1, neoStackIds: orderedChildren }]]]);
  return { ...buildTopologySleeve({ id, childMap, stackIds }), rootId, children, orderedChildren, stackIds };
}

function traverseStackIds(sleeve) {
  const byId = new Map(sleeve.neoStacks.map((stack) => [stack.id, stack]));
  const out = [];
  function visit(stackId) {
    out.push(stackId);
    const stack = byId.get(stackId);
    for (const row of stack.childStackRows ?? []) {
      for (const childId of row.neoStackIds) visit(childId);
    }
  }
  visit(sleeve.controllerNeoStackId);
  return out;
}

function expectedBlockTraversal(sleeve) {
  const stackOrder = traverseStackIds(sleeve);
  const stackById = new Map(sleeve.neoStacks.map((stack) => [stack.id, stack]));
  const out = [];
  for (const stackId of stackOrder) {
    const stack = stackById.get(stackId);
    for (const row of stack.neoBlockRows) {
      out.push(...row.neoBlockIds);
    }
  }
  return out;
}

function assertTopology(result, sleeve, expectedStackIds, context) {
  assert.deepEqual(result.runtime.activeNeoStackIds, expectedStackIds);
  assert.deepEqual(result.runtime.resolvedNeoBlocks.map((block) => block.id), expectedBlockTraversal(sleeve));
  const stackById = new Map(sleeve.neoStacks.map((stack) => [stack.id, stack]));
  const parentByChild = new Map();
  const rowByChild = new Map();
  for (const stack of sleeve.neoStacks) {
    for (const row of stack.childStackRows ?? []) {
      for (const childId of row.neoStackIds) {
        parentByChild.set(childId, stack.id);
        rowByChild.set(childId, row.row);
      }
    }
  }
  const depthByStack = new Map([[sleeve.controllerNeoStackId, 0]]);
  for (const stackId of expectedStackIds) {
    if (stackId !== sleeve.controllerNeoStackId) {
      const parentId = parentByChild.get(stackId);
      assert.ok(parentId, `missing parent for ${stackId}`);
      assert.ok(expectedStackIds.includes(parentId), `missing ancestor ${parentId} for ${stackId}`);
      depthByStack.set(stackId, depthByStack.get(parentId) + 1);
    }
  }
  for (const event of traceEvents(result, 'NEOSTACK_ACTIVE')) {
    const stackId = event.subject.id;
    assert.equal(event.data.depth, depthByStack.get(stackId));
    if (stackId !== sleeve.controllerNeoStackId) {
      assert.equal(event.data.parentNeoStackId, parentByChild.get(stackId));
      assert.equal(event.data.rowInParent, rowByChild.get(stackId));
    }
  }
  for (const part of result.runtime.promptParts) {
    const stack = stackById.get(part.neoStackId);
    assert.ok(stack, `prompt part has unknown stack ${part.neoStackId}`);
    assert.ok(stack.neoBlockRows.some((row) => row.neoBlockIds.includes(part.neoBlockId)));
  }
  assertNoPriorityKeys(result, context);
}

function addCase(testCase) {
  CASES.push(testCase);
  FAMILY_COUNTS.set(testCase.family, (FAMILY_COUNTS.get(testCase.family) ?? 0) + 1);
  if (testCase.bounds?.topologyDepth) {
    OBSERVED.maxTopologyDepth = Math.max(OBSERVED.maxTopologyDepth, testCase.bounds.topologyDepth);
  }
  if (testCase.bounds?.peerWidth) {
    OBSERVED.maxPeerWidth = Math.max(OBSERVED.maxPeerWidth, testCase.bounds.peerWidth);
  }
  if (testCase.bounds?.contentChars) {
    OBSERVED.maxContentChars = Math.max(OBSERVED.maxContentChars, testCase.bounds.contentChars);
  }
}

function addSimpleCase({
  id,
  family,
  description,
  expectedInvariant,
  expectedStage,
  sleeve,
  selection,
  replayCount = 3,
  expectedCodes = [],
  bounds,
  assertResult = () => {},
}) {
  addCase({
    id,
    family,
    description,
    expectedInvariant,
    expectedStage,
    sleeve,
    selection,
    replayCount,
    expectedCodes,
    bounds,
    assertResult,
  });
}

function addSequenceCase({
  id,
  family,
  description,
  expectedInvariant,
  expectedStage = 'post_run',
  bounds,
  run,
}) {
  addCase({
    id,
    family,
    description,
    expectedInvariant,
    expectedStage,
    sequence: true,
    bounds,
    run,
  });
}

const fixtures = {
  dealershipSleeve: json('fixtures/dealership.sleeve.json'),
  normalSelection: json('fixtures/requests/normal.selection.json'),
  secondaryBSelection: json('fixtures/requests/secondary-b.selection.json'),
  multiSecondarySelection: json('fixtures/requests/multi-secondary-error.selection.json'),
  bundleOverlaySleeve: json('fixtures/bundle-overlay.sleeve.json'),
  bundleOverlayBaseSelection: json('fixtures/requests/bundle-overlay-base.selection.json'),
  bundleOverlaySecondaryBSelection: json('fixtures/requests/bundle-overlay-secondary-b.selection.json'),
  bundleOverlayOverlaysAbSelection: json('fixtures/requests/bundle-overlay-overlays-ab.selection.json'),
  mergeSleeve: json('fixtures/merge-contract.sleeve.json'),
  mergeBaseSelection: json('fixtures/requests/merge-contract-base.selection.json'),
  mergeBundleSelection: json('fixtures/requests/merge-contract-bundle.selection.json'),
  mergeOverlaySelection: json('fixtures/requests/merge-contract-overlay.selection.json'),
  stateSleeve: json('fixtures/state-selection.sleeve.json'),
  stateClosedSelection: json('fixtures/requests/state-selection-closed.selection.json'),
};

function buildDenseSleeve(id = 'D3.DENSE') {
  const ids = {
    tDefault: blockId(id, 'trigger', 'DEFAULT'),
    tSecondary: blockId(id, 'trigger', 'SECONDARY'),
    tAlt: blockId(id, 'trigger', 'ALT'),
    dPrime: blockId(id, 'directive', 'PRIME'),
    dSecondary: blockId(id, 'directive', 'SECONDARY'),
    dAlt: blockId(id, 'directive', 'ALT'),
    iBase1: blockId(id, 'instruction', 'BASE.1'),
    iBase2: blockId(id, 'instruction', 'BASE.2'),
    iBase3: blockId(id, 'instruction', 'BASE.3'),
    iBundle1: blockId(id, 'instruction', 'BUNDLE.1'),
    iBundle2: blockId(id, 'instruction', 'BUNDLE.2'),
    iMergeSrc: blockId(id, 'instruction', 'MERGE.SRC'),
    iMergeResult: blockId(id, 'instruction', 'MERGE.RESULT'),
    iScopedSleeve: blockId(id, 'instruction', 'SCOPED.SLEEVE'),
    iOverlayActive: blockId(id, 'instruction', 'OVERLAY.ACTIVE'),
    iOverlayInactive: blockId(id, 'instruction', 'OVERLAY.INACTIVE'),
    sBase1: blockId(id, 'subject', 'BASE.1'),
    sBase2: blockId(id, 'subject', 'BASE.2'),
    sBundle1: blockId(id, 'subject', 'BUNDLE.1'),
    sBundle2: blockId(id, 'subject', 'BUNDLE.2'),
    pBase1: blockId(id, 'primary', 'BASE.1'),
    pBase2: blockId(id, 'primary', 'BASE.2'),
    pBundle1: blockId(id, 'primary', 'BUNDLE.1'),
    pBundle2: blockId(id, 'primary', 'BUNDLE.2'),
    phBase: blockId(id, 'philosophy', 'BASE'),
    phBundle: blockId(id, 'philosophy', 'BUNDLE'),
    phMergeContext: blockId(id, 'philosophy', 'MERGE.CONTEXT'),
    phScopedStack: blockId(id, 'philosophy', 'SCOPED.STACK'),
    bpBase: blockId(id, 'blueprint', 'BASE'),
    bpBundle: blockId(id, 'blueprint', 'BUNDLE'),
    bpScopedSleeve: blockId(id, 'blueprint', 'SCOPED.SLEEVE'),
  };
  const moltBlocks = [
    makeMolt(id, 'trigger', 'DEFAULT'),
    makeMolt(id, 'trigger', 'SECONDARY'),
    makeMolt(id, 'trigger', 'ALT'),
    makeMolt(id, 'directive', 'PRIME'),
    makeMolt(id, 'directive', 'SECONDARY'),
    makeMolt(id, 'directive', 'ALT'),
    makeMolt(id, 'instruction', 'BASE.1'),
    makeMolt(id, 'instruction', 'BASE.2'),
    makeMolt(id, 'instruction', 'BASE.3'),
    makeMolt(id, 'instruction', 'BUNDLE.1'),
    makeMolt(id, 'instruction', 'BUNDLE.2'),
    makeMolt(id, 'instruction', 'MERGE.SRC'),
    makeMolt(id, 'instruction', 'MERGE.RESULT'),
    makeMolt(id, 'instruction', 'SCOPED.SLEEVE'),
    makeMolt(id, 'instruction', 'OVERLAY.ACTIVE'),
    makeMolt(id, 'instruction', 'OVERLAY.INACTIVE'),
    makeMolt(id, 'subject', 'BASE.1'),
    makeMolt(id, 'subject', 'BASE.2'),
    makeMolt(id, 'subject', 'BUNDLE.1'),
    makeMolt(id, 'subject', 'BUNDLE.2'),
    makeMolt(id, 'primary', 'BASE.1'),
    makeMolt(id, 'primary', 'BASE.2'),
    makeMolt(id, 'primary', 'BUNDLE.1'),
    makeMolt(id, 'primary', 'BUNDLE.2'),
    makeMolt(id, 'philosophy', 'BASE'),
    makeMolt(id, 'philosophy', 'BUNDLE'),
    makeMolt(id, 'philosophy', 'MERGE.CONTEXT'),
    makeMolt(id, 'philosophy', 'SCOPED.STACK'),
    makeMolt(id, 'blueprint', 'BASE'),
    makeMolt(id, 'blueprint', 'BUNDLE'),
    makeMolt(id, 'blueprint', 'SCOPED.SLEEVE'),
  ];
  const target = {
    id: `NB.${id}.TARGET`,
    name: 'Dense NeoBlock',
    moltBlockIds: moltBlocks.map((block) => block.id),
    primeDirectiveId: ids.dPrime,
    secondaryDirectives: [
      {
        id: `SD.${id}.SECONDARY`,
        directiveBlockId: ids.dSecondary,
        triggerBlockId: ids.tSecondary,
        bundles: {
          instruction: `BND.${id}.I`,
          subject: `BND.${id}.S`,
          primary: `BND.${id}.P`,
          philosophy: `BND.${id}.PH`,
          blueprint: `BND.${id}.BP`,
        },
      },
      {
        id: `SD.${id}.ALT`,
        directiveBlockId: ids.dAlt,
        triggerBlockId: ids.tAlt,
        bundles: {
          instruction: `BND.${id}.I.ALT`,
        },
      },
    ],
    baseGeometry: {
      trigger: [{ row: 1, blockIds: [ids.tDefault, ids.tSecondary, ids.tAlt] }],
      directive: [{ row: 1, blockIds: [ids.dPrime] }],
      instruction: [
        { row: 1, blockIds: [ids.iBase1, ids.iBase2] },
        { row: 2, blockIds: [ids.iBase3, ids.iMergeResult] },
      ],
      subject: [
        { row: 1, blockIds: [ids.sBase1, ids.sBase2] },
      ],
      primary: [
        { row: 1, blockIds: [ids.pBase1] },
        { row: 2, blockIds: [ids.pBase2] },
      ],
      philosophy: [{ row: 1, blockIds: [ids.phBase] }],
      blueprint: [{ row: 1, blockIds: [ids.bpBase] }],
    },
    bundles: [
      {
        id: `BND.${id}.I`,
        name: 'Instruction Bundle',
        moltType: 'instruction',
        rows: [
          { row: 1, blockIds: [ids.iBundle1, ids.iMergeResult] },
          { row: 2, blockIds: [ids.iBundle2] },
        ],
      },
      {
        id: `BND.${id}.I.ALT`,
        name: 'Alt Instruction Bundle',
        moltType: 'instruction',
        rows: [{ row: 1, blockIds: [ids.iBundle2] }],
      },
      {
        id: `BND.${id}.S`,
        name: 'Subject Bundle',
        moltType: 'subject',
        rows: [{ row: 1, blockIds: [ids.sBundle1, ids.sBundle2] }],
      },
      {
        id: `BND.${id}.P`,
        name: 'Primary Bundle',
        moltType: 'primary',
        rows: [{ row: 1, blockIds: [ids.pBundle1, ids.pBundle2] }],
      },
      {
        id: `BND.${id}.PH`,
        name: 'Philosophy Bundle',
        moltType: 'philosophy',
        rows: [{ row: 1, blockIds: [ids.phBundle] }],
      },
      {
        id: `BND.${id}.BP`,
        name: 'Blueprint Bundle',
        moltType: 'blueprint',
        rows: [{ row: 1, blockIds: [ids.bpBundle] }],
      },
    ],
    merges: [
      {
        id: `MRG.${id}.BASE`,
        sourceBlockIds: [ids.iMergeSrc, ids.phMergeContext],
        resultBlockId: ids.iMergeResult,
      },
      {
        id: `MRG.${id}.DORMANT`,
        sourceBlockIds: [ids.iBase1, ids.phBase],
        resultBlockId: ids.iBundle2,
      },
    ],
  };
  const rootMade = makeBasicNeoBlock(id, 'ROOT');
  return {
    sleeve: {
      schemaVersion: 'umg.compiler-vnext.sleeve.v0.1',
      id: `SLV.${id}`,
      name: 'Dense Pathological Sleeve',
      controllerNeoStackId: `NS.${id}.ROOT`,
      moltBlocks: [...rootMade.moltBlocks, ...moltBlocks],
      neoBlocks: [rootMade.neoBlock, target],
      neoStacks: [
        {
          id: `NS.${id}.ROOT`,
          name: 'Dense Root',
          skill: 'Routes into the dense target.',
          neoBlockRows: [{ row: 1, neoBlockIds: [rootMade.neoBlock.id] }],
          childStackRows: [{ row: 1, neoStackIds: [`NS.${id}.TARGET`] }],
        },
        {
          id: `NS.${id}.TARGET`,
          name: 'Dense Target Stack',
          skill: 'Owns dense valid composition.',
          neoBlockRows: [{ row: 1, neoBlockIds: [target.id] }],
        },
      ],
      scopedMolt: [
        { id: `ATT.${id}.SLEEVE.I`, blockId: ids.iScopedSleeve, scope: { kind: 'sleeve' } },
        { id: `ATT.${id}.STACK.PH`, blockId: ids.phScopedStack, scope: { kind: 'neostack', neoStackId: `NS.${id}.TARGET` } },
        { id: `ATT.${id}.SLEEVE.BP`, blockId: ids.bpScopedSleeve, scope: { kind: 'sleeve' } },
      ],
      overlays: [
        {
          id: `OV.${id}.ACTIVE`,
          name: 'Active Overlay',
          attachments: [{ id: `ATT.OV.${id}.I`, blockId: ids.iOverlayActive, scope: { kind: 'sleeve' } }],
        },
        {
          id: `OV.${id}.INACTIVE`,
          name: 'Inactive Overlay',
          attachments: [{ id: `ATT.OV.${id}.INACTIVE.I`, blockId: ids.iOverlayInactive, scope: { kind: 'sleeve' } }],
        },
      ],
      governance: [
        {
          id: `GOV.${id}.TARGET.OFF`,
          name: 'Dense Target OFF',
          description: 'Declared but inactive unless selected.',
          offNeoBlockIds: [target.id],
        },
      ],
    },
    ids,
    rootTriggerId: rootMade.triggerId,
    targetNeoBlockId: target.id,
  };
}

function denseSelection(dense, triggerPatch, rest = {}) {
  return makeSelection({
    activeNeoStackIds: [`NS.D3.DENSE.ROOT`, `NS.D3.DENSE.TARGET`],
    activeNeoBlockIds: [`NB.D3.DENSE.ROOT`, dense.targetNeoBlockId],
    triggerState: {
      [dense.rootTriggerId]: true,
      [dense.ids.tDefault]: true,
      [dense.ids.tSecondary]: false,
      [dense.ids.tAlt]: false,
      ...triggerPatch,
    },
    ...rest,
  });
}

function buildSecondarySleeve(matchCount) {
  const id = `D3.SEC.${matchCount}`;
  const base = makeBasicNeoBlock(id, 'ROOT');
  const target = makeBasicNeoBlock(id, 'TARGET');
  const extraBlocks = [];
  const secondaryDirectives = [];
  const bundles = [];
  const triggerState = {
    [base.triggerId]: true,
    [target.triggerId]: true,
  };
  for (let index = 0; index < 4; index += 1) {
    const trigger = makeMolt(id, 'trigger', `SEC${index}`);
    const directive = makeMolt(id, 'directive', `SEC${index}`);
    const bundled = makeMolt(id, 'instruction', `BUNDLE${index}`);
    extraBlocks.push(trigger, directive, bundled);
    target.neoBlock.moltBlockIds.push(trigger.id, directive.id, bundled.id);
    secondaryDirectives.push({
      id: `SD.${id}.${index}`,
      directiveBlockId: directive.id,
      triggerBlockId: trigger.id,
      bundles: { instruction: `BND.${id}.${index}` },
    });
    bundles.push({
      id: `BND.${id}.${index}`,
      name: `Secondary Bundle ${index}`,
      moltType: 'instruction',
      rows: [{ row: 1, blockIds: [bundled.id] }],
    });
    triggerState[trigger.id] = index < matchCount;
  }
  target.neoBlock.secondaryDirectives = secondaryDirectives;
  target.neoBlock.bundles = bundles;
  target.neoBlock.baseGeometry.trigger[0].blockIds.push(...extraBlocks.filter((block) => block.type === 'trigger').map((block) => block.id));
  return {
    sleeve: {
      schemaVersion: 'umg.compiler-vnext.sleeve.v0.1',
      id: `SLV.${id}`,
      name: `Secondary Pathology ${matchCount}`,
      controllerNeoStackId: `NS.${id}.ROOT`,
      moltBlocks: [...base.moltBlocks, ...target.moltBlocks, ...extraBlocks],
      neoBlocks: [base.neoBlock, target.neoBlock],
      neoStacks: [
        {
          id: `NS.${id}.ROOT`,
          name: 'Root',
          skill: 'Routes to target.',
          neoBlockRows: [{ row: 1, neoBlockIds: [base.neoBlock.id] }],
          childStackRows: [{ row: 1, neoStackIds: [`NS.${id}.TARGET`] }],
        },
        {
          id: `NS.${id}.TARGET`,
          name: 'Target',
          skill: 'Secondary matching target.',
          neoBlockRows: [{ row: 1, neoBlockIds: [target.neoBlock.id] }],
        },
      ],
    },
    selection: makeSelection({
      activeNeoStackIds: [`NS.${id}.ROOT`, `NS.${id}.TARGET`],
      activeNeoBlockIds: [base.neoBlock.id, target.neoBlock.id],
      triggerState,
    }),
    targetNeoBlockId: target.neoBlock.id,
  };
}

function buildIdentitySleeve(idSuffix, identity) {
  const id = `D3.ID.${idSuffix}`;
  const stackId = `NS.${identity.stack}`;
  const blockIdValue = `NB.${identity.block}`;
  const trigger = { id: `T.${identity.trigger}`, type: 'trigger', content: identity.content, title: identity.title };
  const directive = { id: `D.${identity.directive}`, type: 'directive', content: identity.content, title: identity.title };
  const instruction = { id: `I.${identity.instruction}`, type: 'instruction', content: identity.content, title: identity.title };
  const subject = { id: `S.${identity.subject}`, type: 'subject', content: identity.content, title: identity.title };
  const primary = { id: `P.${identity.primary}`, type: 'primary', content: identity.content, title: identity.title };
  return {
    sleeve: {
      schemaVersion: 'umg.compiler-vnext.sleeve.v0.1',
      id: `SLV.${identity.sleeve}`,
      name: identity.name,
      controllerNeoStackId: stackId,
      moltBlocks: [trigger, directive, instruction, subject, primary],
      neoBlocks: [
        {
          id: blockIdValue,
          name: identity.name,
          moltBlockIds: [trigger.id, directive.id, instruction.id, subject.id, primary.id],
          primeDirectiveId: directive.id,
          baseGeometry: {
            trigger: [{ row: 1, blockIds: [trigger.id] }],
            directive: [{ row: 1, blockIds: [directive.id] }],
            instruction: [{ row: 1, blockIds: [instruction.id] }],
            subject: [{ row: 1, blockIds: [subject.id] }],
            primary: [{ row: 1, blockIds: [primary.id] }],
          },
        },
      ],
      neoStacks: [
        {
          id: stackId,
          name: identity.name,
          skill: identity.content,
          neoBlockRows: [{ row: 1, neoBlockIds: [blockIdValue] }],
        },
      ],
    },
    selection: makeSelection({
      activeNeoStackIds: [stackId],
      activeNeoBlockIds: [blockIdValue],
      triggerState: { [trigger.id]: true },
    }),
    expectedInstructionId: instruction.id,
    expectedContent: identity.content,
  };
}

function addDepthCases() {
  for (const depth of [1, 2, 4, 8, 16, 32]) {
    const id = `D3.DEPTH.${depth}`;
    const topology = buildChainTopology(depth, id);
    const blockIds = topology.stackIds.map((stackId) => topology.blockByStack[stackId]);
    const baseSelection = makeSelection({
      activeNeoStackIds: topology.stackIds,
      activeNeoBlockIds: blockIds,
      triggerState: topology.triggerState,
      compiledAt: `2026-08-16T00:${String(depth).padStart(2, '0')}:00.000Z`,
    });
    addSimpleCase({
      id: `D3-TOPOLOGY-DEPTH-${depth}-AUTHORED`,
      family: 'bounded_topology_depth',
      description: `Valid single-parent NeoStack chain with tested depth ${depth}.`,
      expectedInvariant: 'ancestor closure, deterministic controller traversal, containment, trace depth metadata, and runtimeHash replay remain coherent',
      expectedStage: 'post_run',
      sleeve: topology.sleeve,
      selection: baseSelection,
      replayCount: 4,
      bounds: { topologyDepth: depth },
      assertResult: (result, context) => assertTopology(result, topology.sleeve, topology.stackIds, context),
    });
    addSimpleCase({
      id: `D3-TOPOLOGY-DEPTH-${depth}-SELECTION-REVERSED`,
      family: 'bounded_topology_depth',
      description: `Same tested depth ${depth} with selection arrays reversed.`,
      expectedInvariant: 'selection array order does not replace authored traversal authority',
      expectedStage: 'post_run',
      sleeve: topology.sleeve,
      selection: { ...baseSelection, activeNeoStackIds: topology.stackIds.slice().reverse(), activeNeoBlockIds: blockIds.slice().reverse() },
      replayCount: 3,
      bounds: { topologyDepth: depth },
      assertResult: (result, context) => assertTopology(result, topology.sleeve, topology.stackIds, context),
    });
  }
}

function addWidthCases() {
  for (const width of [1, 4, 8, 16, 32, 64]) {
    const id = `D3.WIDTH.${width}`;
    const topology = buildWidthTopology(width, id);
    const expectedStackOrder = [topology.rootId, ...topology.orderedChildren];
    const expectedBlockOrder = expectedStackOrder.map((stackId) => topology.blockByStack[stackId]);
    const baseSelection = makeSelection({
      activeNeoStackIds: expectedStackOrder,
      activeNeoBlockIds: expectedBlockOrder,
      triggerState: topology.triggerState,
      compiledAt: `2026-08-16T01:${String(width % 60).padStart(2, '0')}:00.000Z`,
    });
    addSimpleCase({
      id: `D3-TOPOLOGY-WIDTH-${width}-AUTHORED`,
      family: 'bounded_topology_width',
      description: `Root parent with ${width} same-row peer children.`,
      expectedInvariant: 'same-row children remain peers and authored left-to-right order is deterministic',
      expectedStage: 'post_run',
      sleeve: topology.sleeve,
      selection: baseSelection,
      replayCount: 3,
      bounds: { peerWidth: width },
      assertResult: (result, context) => {
        assertTopology(result, topology.sleeve, expectedStackOrder, context);
        const peers = traceEvents(result, 'NEOSTACK_ACTIVE', (event) => event.data.parentNeoStackId === topology.rootId);
        assert.deepEqual(peers.map((event) => event.subject.id), topology.orderedChildren);
        assert.ok(peers.every((event) => event.data.rowInParent === 1));
      },
    });
    addSimpleCase({
      id: `D3-TOPOLOGY-WIDTH-${width}-SELECTION-REVERSED`,
      family: 'bounded_topology_width',
      description: `Same ${width} peers with reversed selection membership arrays.`,
      expectedInvariant: 'selection array order does not introduce authority or priority',
      expectedStage: 'post_run',
      sleeve: topology.sleeve,
      selection: {
        ...baseSelection,
        activeNeoStackIds: expectedStackOrder.slice().reverse(),
        activeNeoBlockIds: expectedBlockOrder.slice().reverse(),
      },
      replayCount: 3,
      bounds: { peerWidth: width },
      assertResult: (result, context) => assertTopology(result, topology.sleeve, expectedStackOrder, context),
    });
    const reversed = buildWidthTopology(width, `${id}.REV`, 'reverse');
    const reversedExpected = [reversed.rootId, ...reversed.orderedChildren];
    addSimpleCase({
      id: `D3-TOPOLOGY-WIDTH-${width}-AUTHORED-REVERSED`,
      family: 'bounded_topology_width',
      description: `Same peer count ${width} with authored left-to-right order reversed.`,
      expectedInvariant: 'authored peer read order changes output order only through frozen traversal order',
      expectedStage: 'post_run',
      sleeve: reversed.sleeve,
      selection: makeSelection({
        activeNeoStackIds: reversed.stackIds,
        activeNeoBlockIds: reversed.stackIds.map((stackId) => reversed.blockByStack[stackId]),
        triggerState: reversed.triggerState,
        compiledAt: `2026-08-16T02:${String(width % 60).padStart(2, '0')}:00.000Z`,
      }),
      replayCount: 3,
      bounds: { peerWidth: width },
      assertResult: (result, context) => assertTopology(result, reversed.sleeve, reversedExpected, context),
    });
  }
}

function addMixedTopologyCases() {
  const specs = [
    { id: 'D3.MIXED.A', depth: 8, siblingTiers: [2, 4, 6], siblings: 4 },
    { id: 'D3.MIXED.B', depth: 12, siblingTiers: [3, 7, 10], siblings: 2 },
    { id: 'D3.MIXED.C', depth: 12, siblingTiers: [2, 5, 8], siblings: 3 },
    { id: 'D3.MIXED.D', depth: 9, siblingTiers: [1, 4, 7], siblings: 4 },
  ];
  for (const spec of specs) {
    const spine = Array.from({ length: spec.depth }, (_, index) => `NS.${spec.id}.SPINE.${String(index).padStart(2, '0')}`);
    const stackIds = [...spine];
    const childMap = new Map();
    for (let index = 0; index < spine.length - 1; index += 1) {
      const rowChildren = [spine[index + 1]];
      if (spec.siblingTiers.includes(index)) {
        for (let peer = 0; peer < spec.siblings; peer += 1) {
          const peerId = `NS.${spec.id}.T${index}.PEER.${peer}`;
          rowChildren.push(peerId);
          stackIds.push(peerId);
        }
      }
      childMap.set(spine[index], [{ row: 1, neoStackIds: rowChildren }]);
    }
    const topology = buildTopologySleeve({ id: spec.id, childMap, stackIds });
    const expected = traverseStackIds(topology.sleeve);
    addSimpleCase({
      id: `D3-MIXED-${spec.id.replaceAll('.', '-')}`,
      family: 'mixed_depth_width',
      description: `Moderate tree combining depth ${spec.depth} with ${spec.siblings} peers at selected tiers.`,
      expectedInvariant: 'reachability, unique parent law, authored traversal, selection closure, state maps, RuntimeSpec ordering, and Trace ordering remain deterministic',
      expectedStage: 'post_run',
      sleeve: topology.sleeve,
      selection: makeSelection({
        activeNeoStackIds: stackIds.slice().reverse(),
        activeNeoBlockIds: stackIds.map((stackId) => topology.blockByStack[stackId]).reverse(),
        triggerState: topology.triggerState,
        compiledAt: `2026-08-16T03:${String(spec.depth).padStart(2, '0')}:00.000Z`,
      }),
      replayCount: 4,
      bounds: { topologyDepth: spec.depth, peerWidth: spec.siblings + 1 },
      assertResult: (result, context) => assertTopology(result, topology.sleeve, expected, context),
    });
  }
}

function addDenseCompositionCases() {
  const dense = buildDenseSleeve();
  addSimpleCase({
    id: 'D3-DENSE-BASE',
    family: 'dense_valid_neoblock_composition',
    description: 'Dense NeoBlock with base geometry, scoped MOLT, inactive overlay, and declared inactive Governance.',
    expectedInvariant: 'dense valid optional subsystems remain distinct and inactive surfaces are inert',
    expectedStage: 'post_run',
    sleeve: dense.sleeve,
    selection: denseSelection(dense, {}),
    replayCount: 4,
    assertResult: (result) => {
      assert.deepEqual(rowIds(result.runtime, dense.targetNeoBlockId, 'directive'), [[dense.ids.dPrime]]);
      assert.deepEqual(rowIds(result.runtime, dense.targetNeoBlockId, 'instruction'), [
        [dense.ids.iBase1, dense.ids.iBase2],
        [dense.ids.iBase3, dense.ids.iMergeResult],
      ]);
      assert.equal(result.runtime.promptParts.some((part) => part.id === dense.ids.iOverlayInactive), false);
      assert.equal(traceEvents(result, 'GOVERNANCE_RULE_APPLIED').length, 0);
    },
  });
  addSimpleCase({
    id: 'D3-DENSE-SECONDARY-BUNDLES',
    family: 'dense_valid_neoblock_composition',
    description: 'Dense NeoBlock activating exactly one selectable Secondary with legal lane bundles.',
    expectedInvariant: 'Prime plus one Secondary activates legal Bundles without subsystem provenance bleed',
    expectedStage: 'post_run',
    sleeve: dense.sleeve,
    selection: denseSelection(dense, { [dense.ids.tSecondary]: true, [dense.ids.tDefault]: false }),
    replayCount: 4,
    assertResult: (result) => {
      const resolved = result.runtime.resolvedNeoBlocks.find((block) => block.id === dense.targetNeoBlockId);
      assert.equal(resolved.secondaryDirectiveId, 'SD.D3.DENSE.SECONDARY');
      assert.deepEqual(rowIds(result.runtime, dense.targetNeoBlockId, 'directive').flat(), [dense.ids.dPrime, dense.ids.dSecondary]);
      assert.equal(lane(result.runtime, dense.targetNeoBlockId, 'instruction').geometrySource, 'bundle');
      assert.equal(lane(result.runtime, dense.targetNeoBlockId, 'instruction').bundleId, 'BND.D3.DENSE.I');
      assert.equal(result.runtime.promptParts.find((part) => part.id === dense.ids.iMergeResult).sourceMode, 'merge');
    },
  });
  addSimpleCase({
    id: 'D3-DENSE-SECONDARY-OVERLAY',
    family: 'dense_valid_neoblock_composition',
    description: 'Dense Secondary bundle coexisting with active Overlay and scoped contributions.',
    expectedInvariant: 'Bundle, Merge, scoped, and Overlay provenance stay separated in one active lane',
    expectedStage: 'post_run',
    sleeve: dense.sleeve,
    selection: denseSelection(dense, {
      [dense.ids.tSecondary]: true,
      [dense.ids.tDefault]: false,
    }, { activeOverlayIds: ['OV.D3.DENSE.ACTIVE'] }),
    replayCount: 4,
    assertResult: (result) => {
      const instructionScoped = scoped(result.runtime, dense.targetNeoBlockId, 'instruction');
      assert.deepEqual(instructionScoped.map((block) => block.sourceMode), ['scoped', 'overlay']);
      assert.deepEqual(instructionScoped.map((block) => block.id), [dense.ids.iScopedSleeve, dense.ids.iOverlayActive]);
      assert.equal(result.runtime.promptParts.find((part) => part.id === dense.ids.iBundle1).sourceMode, 'local');
      assert.equal(result.runtime.promptParts.find((part) => part.id === dense.ids.iMergeResult).sourceMode, 'merge');
      assert.equal(result.runtime.promptParts.find((part) => part.id === dense.ids.iScopedSleeve).sourceMode, 'scoped');
      assert.equal(result.runtime.promptParts.find((part) => part.id === dense.ids.iOverlayActive).sourceMode, 'overlay');
      assert.equal(result.runtime.promptParts.some((part) => part.id === dense.ids.iOverlayInactive), false);
    },
  });
  addSimpleCase({
    id: 'D3-DENSE-ALT-SECONDARY',
    family: 'dense_valid_neoblock_composition',
    description: 'Dense NeoBlock activating a different single Secondary with a narrower bundle set.',
    expectedInvariant: 'a different legal Secondary remains deterministic and does not coexist with another Secondary',
    expectedStage: 'post_run',
    sleeve: dense.sleeve,
    selection: denseSelection(dense, { [dense.ids.tAlt]: true, [dense.ids.tDefault]: false }),
    replayCount: 3,
    assertResult: (result) => {
      const resolved = result.runtime.resolvedNeoBlocks.find((block) => block.id === dense.targetNeoBlockId);
      assert.equal(resolved.secondaryDirectiveId, 'SD.D3.DENSE.ALT');
      assert.equal(lane(result.runtime, dense.targetNeoBlockId, 'instruction').bundleId, 'BND.D3.DENSE.I.ALT');
    },
  });
}

function addCompositionCollisionCases() {
  const sleeve = clone(fixtures.mergeSleeve);
  const selection = clone(fixtures.mergeBundleSelection);
  selection.activeOverlayIds = ['OVR.MRG.ACTIVE'];
  addSimpleCase({
    id: 'D3-COLLISION-BUNDLE-MERGE-SCOPED-OVERLAY',
    family: 'bundle_merge_scoped_overlay_collision',
    description: 'Same active lane contains bundle-selected local contribution, Merge result, scoped contribution, and Overlay contribution.',
    expectedInvariant: 'Bundle controls local geometry only; Merge, scoped, and Overlay keep their own provenance and stable order',
    expectedStage: 'post_run',
    sleeve,
    selection,
    replayCount: 5,
    assertResult: (result) => {
      const instructionLane = lane(result.runtime, 'NB.MRG.CONTRACT', 'instruction');
      assert.equal(instructionLane.geometrySource, 'bundle');
      assert.equal(instructionLane.bundleId, 'B.MRG.INSTRUCTION');
      assert.deepEqual(instructionLane.scoped.map((block) => `${block.id}:${block.sourceMode}`), [
        'I.SCOPE.MRG.GUIDE:scoped',
        'I.OVERLAY.MRG.NOTE:overlay',
      ]);
      assert.deepEqual(instructionLane.rows.flatMap((row) => row.blocks.map((block) => `${block.id}:${block.sourceMode}:${block.mergeId ?? ''}`)), [
        'I.MRG.BUNDLE.KEEP:local:',
        'I.MRG.RESULT.BUNDLE:merge:MRG.MRG.BUNDLE',
      ]);
    },
  });
  addSimpleCase({
    id: 'D3-COLLISION-MERGE-BASE-SCOPED-OVERLAY',
    family: 'bundle_merge_scoped_overlay_collision',
    description: 'Base Merge results coexist with scoped and Overlay contributions without Bundle activation.',
    expectedInvariant: 'inactive Bundle contributions remain dormant while Merge and Overlay provenance is preserved',
    expectedStage: 'post_run',
    sleeve: fixtures.mergeSleeve,
    selection: fixtures.mergeOverlaySelection,
    replayCount: 4,
    assertResult: (result) => {
      assert.equal(result.runtime.promptParts.some((part) => part.id === 'I.MRG.RESULT.BUNDLE'), false);
      assert.equal(result.runtime.promptParts.find((part) => part.id === 'I.MRG.RESULT.BASE').sourceMode, 'merge');
      assert.equal(result.runtime.promptParts.find((part) => part.id === 'I.OVERLAY.MRG.NOTE').sourceMode, 'overlay');
    },
  });
}

function addDuplicateProvenanceCases() {
  const sleeve = clone(fixtures.bundleOverlaySleeve);
  sleeve.scopedMolt.push({
    id: 'ATT.D3.DUP.SCOPED.PH',
    blockId: 'PH.OVERLAY.DUP',
    scope: { kind: 'sleeve' },
  });
  const selection = clone(fixtures.bundleOverlayOverlaysAbSelection);
  addSimpleCase({
    id: 'D3-DUPLICATE-PROVENANCE-SCOPED-OVERLAY',
    family: 'explicit_duplicate_provenance',
    description: 'Distinct legal scoped and Overlay attachments reference the same underlying MOLT block.',
    expectedInvariant: 'explicit duplicate contributions remain present with distinct provenance and hash multiplicity',
    expectedStage: 'post_run',
    sleeve,
    selection,
    replayCount: 5,
    assertResult: (result) => {
      const dupParts = promptParts(result.runtime, (part) => part.id === 'PH.OVERLAY.DUP' && part.neoBlockId === 'NB.TARGET');
      assert.deepEqual(dupParts.map((part) => `${part.sourceMode}:${part.sourceId}`), [
        'scoped:ATT.D3.DUP.SCOPED.PH',
        'overlay:ATT.OV.B.PH.Z',
        'overlay:ATT.OV.B.PH.A',
      ]);
      assert.equal(new Set(dupParts.map((part) => part.sourceId)).size, 3);
    },
  });
  const removedOne = clone(sleeve);
  removedOne.overlays.find((overlay) => overlay.id === 'OV.B').attachments.pop();
  addSequenceCase({
    id: 'D3-DUPLICATE-PROVENANCE-REMOVAL-SENSITIVITY',
    family: 'explicit_duplicate_provenance',
    description: 'Remove one explicit duplicate contribution and compare semantic projection/hash.',
    expectedInvariant: 'removing an explicit contribution changes prompt multiplicity and runtimeHash',
    run: (context) => {
      const full = compileWithReplay(sleeve, selection, context, 3);
      const reduced = compileWithReplay(removedOne, selection, context, 3);
      assertSuccessInvariants(sleeve, selection, full, context);
      assertSuccessInvariants(removedOne, selection, reduced, context);
      assert.notEqual(full.runtime.runtimeHash, reduced.runtime.runtimeHash);
      assert.notDeepEqual(promptProjection(full.runtime), promptProjection(reduced.runtime));
    },
  });
}

function addGovernanceCases() {
  const stateCases = [
    {
      id: 'D3-GOV-PARENT-OFF',
      selectionPatch: { activeGovernanceRuleIds: ['GOV.PARENT.OFF'] },
      target: 'NS.CHILD',
      kind: 'neostack',
      expectedRules: ['GOV.PARENT.OFF'],
      reason: 'ancestor_governance_off',
    },
    {
      id: 'D3-GOV-BLOCK-OFF',
      selectionPatch: {
        activeNeoStackIds: ['NS.ROOT', 'NS.PARENT'],
        activeNeoBlockIds: ['NB.ROOT.ROUTE', 'NB.PARENT.RIGHT'],
        activeGovernanceRuleIds: ['GOV.PARENT.RIGHT.OFF'],
        triggerState: { ...fixtures.stateClosedSelection.triggerState, 'T.PARENT.RIGHT.DEFAULT': true },
      },
      deleteTriggers: ['T.PARENT.LEFT.DEFAULT', 'T.CHILD.DEFAULT'],
      target: 'NB.PARENT.RIGHT',
      kind: 'neoblock',
      expectedRules: ['GOV.PARENT.RIGHT.OFF'],
      reason: 'governance_off',
    },
  ];
  for (const item of stateCases) {
    const selection = clone(fixtures.stateClosedSelection);
    Object.assign(selection, item.selectionPatch);
    if (item.selectionPatch.triggerState) selection.triggerState = item.selectionPatch.triggerState;
    for (const triggerId of item.deleteTriggers ?? []) delete selection.triggerState[triggerId];
    addSimpleCase({
      id: item.id,
      family: 'governance_collision_matrix',
      description: 'Governance OFF overlaps active route selection.',
      expectedInvariant: 'OFF has precedence and Governance provenance remains available',
      expectedStage: 'resolution',
      sleeve: fixtures.stateSleeve,
      selection,
      expectedCodes: ['SELECTION_TARGET_NOT_EXECUTABLE'],
      assertResult: (result) => {
        const diagnostic = result.diagnostics.find((entry) => entry.details?.targetId === item.target && entry.details?.targetKind === item.kind);
        assert.ok(diagnostic);
        assert.equal(diagnostic.details.effectiveState, 'off');
        assert.equal(diagnostic.details.blockingReason, item.reason);
        assert.deepEqual(diagnostic.details.governanceRuleIds, item.expectedRules);
      },
    });
  }
  const multiRuleSleeve = clone(fixtures.stateSleeve);
  multiRuleSleeve.governance.push({
    id: 'GOV.D3.CHILD.OFF',
    name: 'D3 Child OFF',
    description: 'Also turns the child stack OFF.',
    offNeoStackIds: ['NS.CHILD'],
  });
  const multiRuleSelection = clone(fixtures.stateClosedSelection);
  multiRuleSelection.activeGovernanceRuleIds = ['GOV.PARENT.OFF', 'GOV.D3.CHILD.OFF'];
  addSimpleCase({
    id: 'D3-GOV-MULTI-RULE-PRECEDENCE',
    family: 'governance_collision_matrix',
    description: 'Parent and child Governance OFF rules both apply to a selected child.',
    expectedInvariant: 'all applicable governanceRuleIds remain visible and declaration order is provenance order only',
    expectedStage: 'resolution',
    sleeve: multiRuleSleeve,
    selection: multiRuleSelection,
    expectedCodes: ['SELECTION_TARGET_NOT_EXECUTABLE'],
    assertResult: (result) => {
      const diagnostic = result.diagnostics.find((entry) => entry.details?.targetId === 'NS.CHILD');
      assert.ok(diagnostic);
      assert.deepEqual(diagnostic.details.governanceRuleIds, ['GOV.PARENT.OFF', 'GOV.D3.CHILD.OFF']);
      assert.deepEqual(diagnostic.details.directGovernanceRuleIds, ['GOV.D3.CHILD.OFF']);
      assert.deepEqual(diagnostic.details.inheritedGovernanceRuleIds, ['GOV.PARENT.OFF']);
      assert.equal(result.trace.finalNeoStackStates['NS.CHILD'], 'off');
    },
  });
  const offDisabledSelection = clone(fixtures.stateClosedSelection);
  offDisabledSelection.activeGovernanceRuleIds = ['GOV.PARENT.OFF'];
  offDisabledSelection.disabledNeoStackIds = ['NS.PARENT'];
  offDisabledSelection.activeNeoStackIds = ['NS.ROOT', 'NS.PARENT'];
  offDisabledSelection.activeNeoBlockIds = ['NB.ROOT.ROUTE'];
  delete offDisabledSelection.triggerState['T.PARENT.LEFT.DEFAULT'];
  delete offDisabledSelection.triggerState['T.CHILD.DEFAULT'];
  addSimpleCase({
    id: 'D3-GOV-OFF-BEATS-DISABLED-ACTIVE-READY',
    family: 'governance_collision_matrix',
    description: 'Same target is selected active, caller disabled, and Governance OFF.',
    expectedInvariant: 'exact state precedence is OFF > DISABLED > ACTIVE > READY',
    expectedStage: 'resolution',
    sleeve: fixtures.stateSleeve,
    selection: offDisabledSelection,
    expectedCodes: ['SELECTION_TARGET_NOT_EXECUTABLE'],
    assertResult: (result) => {
      const diagnostic = result.diagnostics.find((entry) => entry.details?.targetId === 'NS.PARENT');
      assert.ok(diagnostic);
      assert.equal(diagnostic.details.effectiveState, 'off');
      assert.equal(diagnostic.details.blockingReason, 'governance_off');
    },
  });
  const compositionGov = clone(fixtures.bundleOverlaySecondaryBSelection);
  compositionGov.activeOverlayIds = ['OV.A', 'OV.B'];
  compositionGov.activeGovernanceRuleIds = ['GOV.TARGET.OFF'];
  addSimpleCase({
    id: 'D3-GOV-COMPOSITION-BUNDLE-OVERLAY-SCOPED',
    family: 'governance_composition_collision',
    description: 'Governance OFF targets a NeoBlock with Bundle, scoped MOLT, and Overlay active.',
    expectedInvariant: 'no composition path restores an OFF target',
    expectedStage: 'resolution',
    sleeve: fixtures.bundleOverlaySleeve,
    selection: compositionGov,
    expectedCodes: ['SELECTION_TARGET_NOT_EXECUTABLE'],
    assertResult: (result) => {
      assert.equal(result.trace.finalNeoBlockStates['NB.TARGET'], 'off');
      assert.equal(traceEvents(result, 'BUNDLE_APPLIED', (event) => event.data.neoBlockId === 'NB.TARGET').length, 0);
      assert.equal(traceEvents(result, 'OVERLAY_APPLIED', (event) => event.data.neoBlockId === 'NB.TARGET').length, 0);
      assert.equal(traceEvents(result, 'SCOPED_MOLT_APPLIED', (event) => event.data.neoBlockId === 'NB.TARGET').length, 0);
    },
  });
  const mergeGovSleeve = clone(fixtures.mergeSleeve);
  mergeGovSleeve.governance = [
    {
      id: 'GOV.MRG.CONTRACT.OFF',
      name: 'Merge Owner OFF',
      description: 'Turns the merge owner OFF.',
      offNeoBlockIds: ['NB.MRG.CONTRACT'],
    },
  ];
  const mergeGovSelection = clone(fixtures.mergeBundleSelection);
  mergeGovSelection.activeGovernanceRuleIds = ['GOV.MRG.CONTRACT.OFF'];
  addSimpleCase({
    id: 'D3-GOV-COMPOSITION-MERGE',
    family: 'governance_composition_collision',
    description: 'Governance OFF targets a Merge owner with active bundle route.',
    expectedInvariant: 'blocked Merge result cannot enter RuntimeSpec',
    expectedStage: 'resolution',
    sleeve: mergeGovSleeve,
    selection: mergeGovSelection,
    expectedCodes: ['SELECTION_TARGET_NOT_EXECUTABLE'],
    assertResult: (result) => {
      assert.equal(traceEvents(result, 'MERGE_VALIDATED', (event) => event.data.neoBlockId === 'NB.MRG.CONTRACT').length, 0);
    },
  });
}

function addDisabledCompositionCases() {
  const callerDisabled = clone(fixtures.bundleOverlaySecondaryBSelection);
  callerDisabled.activeOverlayIds = ['OV.A', 'OV.B'];
  callerDisabled.disabledNeoBlockIds = ['NB.TARGET'];
  addSimpleCase({
    id: 'D3-DISABLED-COMPOSITION-CALLER',
    family: 'disabled_composition_collision',
    description: 'Caller-disabled target contains Bundle, scoped MOLT, and active Overlay.',
    expectedInvariant: 'disabled target remains disabled and composition cannot restore it',
    expectedStage: 'resolution',
    sleeve: fixtures.bundleOverlaySleeve,
    selection: callerDisabled,
    expectedCodes: ['SELECTION_TARGET_NOT_EXECUTABLE'],
    assertResult: (result) => {
      assert.equal(result.trace.finalNeoBlockStates['NB.TARGET'], 'disabled');
      assert.equal(traceEvents(result, 'BUNDLE_APPLIED', (event) => event.data.neoBlockId === 'NB.TARGET').length, 0);
      assert.equal(traceEvents(result, 'OVERLAY_APPLIED', (event) => event.data.neoBlockId === 'NB.TARGET').length, 0);
    },
  });
  const authoredDisabled = clone(fixtures.bundleOverlaySleeve);
  findNeoBlock(authoredDisabled, 'NB.TARGET').defaultState = 'disabled';
  addSimpleCase({
    id: 'D3-DISABLED-COMPOSITION-AUTHORED',
    family: 'disabled_composition_collision',
    description: 'Authored-disabled target contains Bundle, scoped MOLT, and active Overlay.',
    expectedInvariant: 'authored disabled state blocks composition deterministically',
    expectedStage: 'resolution',
    sleeve: authoredDisabled,
    selection: fixtures.bundleOverlayOverlaysAbSelection,
    expectedCodes: ['SELECTION_TARGET_NOT_EXECUTABLE'],
    assertResult: (result) => {
      assert.equal(result.trace.finalNeoBlockStates['NB.TARGET'], 'disabled');
      assert.equal(traceEvents(result, 'BUNDLE_APPLIED', (event) => event.data.neoBlockId === 'NB.TARGET').length, 0);
    },
  });
  const stackDisabled = clone(fixtures.bundleOverlaySecondaryBSelection);
  stackDisabled.disabledNeoStackIds = ['NS.TARGET'];
  addSimpleCase({
    id: 'D3-DISABLED-COMPOSITION-ANCESTOR-STACK',
    family: 'disabled_composition_collision',
    description: 'Caller-disabled containing NeoStack blocks a compositional target.',
    expectedInvariant: 'ancestor Disabled propagation remains deterministic',
    expectedStage: 'resolution',
    sleeve: fixtures.bundleOverlaySleeve,
    selection: stackDisabled,
    expectedCodes: ['SELECTION_TARGET_NOT_EXECUTABLE'],
    assertResult: (result) => {
      assert.equal(result.trace.finalNeoStackStates['NS.TARGET'], 'disabled');
      assert.equal(result.trace.finalNeoBlockStates['NB.TARGET'], 'disabled');
    },
  });
}

function addSecondaryCases() {
  for (const matchCount of [0, 1, 2, 3, 4]) {
    const built = buildSecondarySleeve(matchCount);
    const failure = matchCount >= 2;
    addSimpleCase({
      id: `D3-SECONDARY-MATCH-${matchCount}`,
      family: 'secondary_collision_pathology',
      description: `${matchCount} Secondary trigger(s) match while Prime trigger remains active.`,
      expectedInvariant: failure
        ? '2+ matching Secondary Directives fails resolution and no Bundle contribution escapes'
        : '0 or 1 matching Secondary Directives produce Prime-only or Prime-plus-one-Secondary output',
      expectedStage: failure ? 'resolution' : 'post_run',
      sleeve: built.sleeve,
      selection: built.selection,
      expectedCodes: failure ? ['MULTIPLE_SECONDARY_DIRECTIVE_MATCH'] : [],
      assertResult: (result) => {
        if (failure) {
          assert.equal(result.runtime, null);
          assert.equal(traceEvents(result, 'BUNDLE_APPLIED', (event) => event.data.neoBlockId === built.targetNeoBlockId).length, 0);
          return;
        }
        const target = result.runtime.resolvedNeoBlocks.find((block) => block.id === built.targetNeoBlockId);
        assert.ok(target);
        if (matchCount === 0) {
          assert.equal(target.secondaryDirectiveId, undefined);
          assert.equal(lane(result.runtime, built.targetNeoBlockId, 'instruction').geometrySource, 'base');
        } else {
          assert.equal(target.secondaryDirectiveId, 'SD.D3.SEC.1.0');
          assert.equal(lane(result.runtime, built.targetNeoBlockId, 'instruction').geometrySource, 'bundle');
        }
      },
    });
  }
}

function addMergeGraphCases() {
  addSimpleCase({
    id: 'D3-MERGE-INDEPENDENT-MANY',
    family: 'merge_graph_pathology',
    description: 'Many independent legal Merges in a bounded active NeoBlock.',
    expectedInvariant: 'independent legal Merges resolve deterministically',
    expectedStage: 'post_run',
    sleeve: fixtures.mergeSleeve,
    selection: fixtures.mergeBaseSelection,
    replayCount: 5,
    assertResult: (result) => {
      assert.ok(traceEvents(result, 'MERGE_VALIDATED').length >= 3);
      assert.equal(result.runtime.promptParts.find((part) => part.id === 'I.MRG.RESULT.BASE').sourceMode, 'merge');
      assert.equal(result.runtime.promptParts.find((part) => part.id === 'I.MRG.RESULT.REUSE').sourceMode, 'merge');
    },
  });
  addSimpleCase({
    id: 'D3-MERGE-DORMANT-BUNDLE-ONE-ACTIVE',
    family: 'merge_graph_pathology',
    description: 'One active bundle Merge result among dormant base results.',
    expectedInvariant: 'inactive placed results remain dormant and active result is deterministic',
    expectedStage: 'post_run',
    sleeve: fixtures.mergeSleeve,
    selection: fixtures.mergeBundleSelection,
    replayCount: 4,
    assertResult: (result) => {
      assert.equal(result.runtime.promptParts.some((part) => part.id === 'I.MRG.RESULT.BASE'), false);
      assert.equal(result.runtime.promptParts.find((part) => part.id === 'I.MRG.RESULT.BUNDLE').sourceMode, 'merge');
      assert.equal(traceEvents(result, 'MERGE_VALIDATED', (event) => event.data.mergeId === 'MRG.MRG.BUNDLE').length, 1);
    },
  });
  const chain = clone(fixtures.mergeSleeve);
  findMerge(chain, 'NB.MRG.CONTRACT', 'MRG.MRG.REUSE').sourceBlockIds = ['I.MRG.RESULT.BASE', 'PH.MRG.REUSE.CONTEXT'];
  addSimpleCase({
    id: 'D3-MERGE-CHAIN-UNSUPPORTED',
    family: 'merge_graph_pathology',
    description: 'Acyclic Merge chain where one result is used as another source.',
    expectedInvariant: 'chain returns MERGE_CHAIN_UNSUPPORTED without raw recursion failure',
    expectedStage: 'semantic',
    sleeve: chain,
    selection: fixtures.mergeBaseSelection,
    expectedCodes: ['MERGE_CHAIN_UNSUPPORTED'],
  });
  const twoCycle = clone(fixtures.mergeSleeve);
  findMerge(twoCycle, 'NB.MRG.CONTRACT', 'MRG.MRG.BASE.CONTEXT').sourceBlockIds = ['I.MRG.RESULT.REUSE', 'PH.MRG.BASE.CONTEXT'];
  findMerge(twoCycle, 'NB.MRG.CONTRACT', 'MRG.MRG.REUSE').sourceBlockIds = ['I.MRG.RESULT.BASE', 'PH.MRG.REUSE.CONTEXT'];
  addSimpleCase({
    id: 'D3-MERGE-CYCLE-TWO-NODE',
    family: 'merge_graph_pathology',
    description: 'Two-node Merge cycle.',
    expectedInvariant: 'cycle returns MERGE_CYCLE without raw recursion failure',
    expectedStage: 'semantic',
    sleeve: twoCycle,
    selection: fixtures.mergeBaseSelection,
    expectedCodes: ['MERGE_CYCLE'],
  });
  const threeCycle = clone(fixtures.mergeSleeve);
  findMerge(threeCycle, 'NB.MRG.CONTRACT', 'MRG.MRG.DOWNWARD').sourceBlockIds = ['I.MRG.RESULT.BUNDLE', 'BP.MRG.DOWN.CONTEXT'];
  findMerge(threeCycle, 'NB.MRG.CONTRACT', 'MRG.MRG.REUSE').sourceBlockIds = ['I.MRG.RESULT.DOWN', 'PH.MRG.REUSE.CONTEXT'];
  findMerge(threeCycle, 'NB.MRG.CONTRACT', 'MRG.MRG.BUNDLE').sourceBlockIds = ['I.MRG.RESULT.REUSE', 'PH.MRG.BUNDLE.CONTEXT'];
  addSimpleCase({
    id: 'D3-MERGE-CYCLE-THREE-NODE',
    family: 'merge_graph_pathology',
    description: 'Three-node bounded Merge cycle.',
    expectedInvariant: 'cycle returns MERGE_CYCLE deterministically',
    expectedStage: 'semantic',
    sleeve: threeCycle,
    selection: fixtures.mergeBaseSelection,
    expectedCodes: ['MERGE_CYCLE'],
  });
  const longCycle = clone(fixtures.mergeSleeve);
  findMerge(longCycle, 'NB.MRG.CONTRACT', 'MRG.MRG.BASE.CONTEXT').sourceBlockIds = ['I.MRG.RESULT.BUNDLE', 'PH.MRG.BASE.CONTEXT'];
  findMerge(longCycle, 'NB.MRG.CONTRACT', 'MRG.MRG.BUNDLE').sourceBlockIds = ['I.MRG.RESULT.DOWN', 'PH.MRG.BUNDLE.CONTEXT'];
  findMerge(longCycle, 'NB.MRG.CONTRACT', 'MRG.MRG.DOWNWARD').sourceBlockIds = ['I.MRG.RESULT.REUSE', 'BP.MRG.DOWN.CONTEXT'];
  findMerge(longCycle, 'NB.MRG.CONTRACT', 'MRG.MRG.REUSE').sourceBlockIds = ['I.MRG.RESULT.BASE', 'PH.MRG.REUSE.CONTEXT'];
  addSimpleCase({
    id: 'D3-MERGE-CYCLE-LONG-BOUNDED',
    family: 'merge_graph_pathology',
    description: 'Longer bounded Merge cycle using four declarations.',
    expectedInvariant: 'longer bounded cycle returns MERGE_CYCLE deterministically',
    expectedStage: 'semantic',
    sleeve: longCycle,
    selection: fixtures.mergeBaseSelection,
    expectedCodes: ['MERGE_CYCLE'],
  });
}

function addStormCases() {
  for (let index = 0; index < 6; index += 1) {
    const sleeve = clone(fixtures.mergeSleeve);
    sleeve.moltBlocks.push({ id: 'I.MRG.BASE.STEP', type: 'instruction', content: 'Duplicate global id.' });
    findNeoBlock(sleeve, 'NB.MRG.CONTRACT').primeDirectiveId = 'I.MRG.BASE.STEP';
    findNeoBlock(sleeve, 'NB.MRG.CONTRACT').baseGeometry.instruction = [
      { row: 1, blockIds: ['I.MRG.BASE.STEP'] },
      { row: 3, blockIds: ['I.MRG.RESULT.BASE'] },
    ];
    findMerge(sleeve, 'NB.MRG.CONTRACT', 'MRG.MRG.BASE.CONTEXT').resultBlockId = 'D.MRG.BUNDLE';
    sleeve.governance = [
      {
        id: `GOV.D3.STORM.${index}`,
        name: 'Bad target',
        description: 'Targets an unknown NeoStack.',
        offNeoStackIds: [`NS.UNKNOWN.${index}`],
      },
    ];
    addSimpleCase({
      id: `D3-SEMANTIC-STORM-${index}`,
      family: 'multi_error_semantic_storms',
      description: 'Structurally valid Sleeve with duplicate id, bad Prime, noncontiguous geometry, bad Merge, and bad Governance target.',
      expectedInvariant: 'semantic diagnostics are deterministic, registered, ordered, and stop before output/post_run',
      expectedStage: 'semantic',
      sleeve,
      selection: fixtures.mergeBaseSelection,
      expectedCodes: ['DUPLICATE_GLOBAL_ID'],
      assertResult: (result) => {
        assert.ok(result.diagnostics.length >= 2);
        assert.equal(result.trace.events.some((event) => event.stage === 'output' || event.stage === 'post_run'), false);
      },
    });
  }
  for (let index = 0; index < 6; index += 1) {
    const selection = clone(fixtures.stateClosedSelection);
    selection.activeNeoStackIds = ['NS.ROOT', 'NS.CHILD'];
    selection.activeNeoBlockIds = ['NB.ROOT.ROUTE', 'NB.PARENT.LEFT', 'NB.PARENT.RIGHT'];
    selection.disabledNeoBlockIds = ['NB.PARENT.RIGHT'];
    selection.activeGovernanceRuleIds = index % 2 === 0 ? ['GOV.PARENT.OFF'] : [];
    delete selection.triggerState['T.PARENT.LEFT.DEFAULT'];
    selection.triggerState['T.PARENT.RIGHT.DEFAULT'] = true;
    addSimpleCase({
      id: `D3-RESOLUTION-STORM-${index}`,
      family: 'multi_error_resolution_storms',
      description: 'Semantically valid Sleeve with simultaneous route/state selection errors.',
      expectedInvariant: 'resolution diagnostics are deterministic, linked to trace, runtime null, and no output/post_run events escape',
      expectedStage: 'resolution',
      sleeve: fixtures.stateSleeve,
      selection,
      assertResult: (result) => {
        assert.ok(result.diagnostics.every((diagnostic) => diagnostic.stage === 'resolution'));
        assert.ok(result.diagnostics.length >= 1);
      },
    });
  }
}

function addIdentityAndUnicodeCases() {
  const identities = [
    { label: 'short', value: 'x', content: 'x' },
    { label: 'long', value: `LONG.${'A'.repeat(120)}`, content: 'long bounded content' },
    { label: 'spaces', value: 'ID WITH SPACES', content: 'content with spaces preserved' },
    { label: 'punctuation', value: 'ID.!#$%&()*+,/:;<=>?@[\\]^_{|}~', content: 'punctuation preserved' },
    { label: 'unicode-escaped', value: 'ID.\\u00e9', content: 'composed \\u00e9' },
    { label: 'combining', value: 'ID.e\\u0301', content: 'decomposed e\\u0301' },
    { label: 'emoji', value: 'ID.\\u{1f680}', content: 'emoji \\u{1f680}' },
    { label: 'cjk', value: 'ID.\\u65e5\\u672c\\u8a9e', content: '\\u65e5\\u672c\\u8a9e content' },
    { label: 'rtl', value: 'ID.\\u05e9\\u05dc\\u05d5\\u05dd', content: '\\u05e9\\u05dc\\u05d5\\u05dd content' },
    { label: 'case-distinct-upper', value: 'ID.CASE', content: 'case distinct upper' },
    { label: 'case-distinct-lower', value: 'ID.case', content: 'case distinct lower' },
    { label: 'mixed-symbols', value: 'ID.[a](b){c}', content: 'mixed symbols preserved' },
  ].map((entry) => ({
    ...entry,
    value: entry.value.replaceAll('\\u00e9', '\u00e9').replaceAll('\\u0301', '\u0301').replaceAll('\\u{1f680}', '\u{1f680}').replaceAll('\\u65e5', '\u65e5').replaceAll('\\u672c', '\u672c').replaceAll('\\u8a9e', '\u8a9e').replaceAll('\\u05e9', '\u05e9').replaceAll('\\u05dc', '\u05dc').replaceAll('\\u05d5', '\u05d5').replaceAll('\\u05dd', '\u05dd'),
    content: entry.content.replaceAll('\\u00e9', '\u00e9').replaceAll('\\u0301', '\u0301').replaceAll('\\u{1f680}', '\u{1f680}').replaceAll('\\u65e5', '\u65e5').replaceAll('\\u672c', '\u672c').replaceAll('\\u8a9e', '\u8a9e').replaceAll('\\u05e9', '\u05e9').replaceAll('\\u05dc', '\u05dc').replaceAll('\\u05d5', '\u05d5').replaceAll('\\u05dd', '\u05dd'),
  }));
  for (const identity of identities) {
    const built = buildIdentitySleeve(identity.label.toUpperCase(), {
      sleeve: identity.value,
      stack: identity.value,
      block: identity.value,
      trigger: identity.value,
      directive: identity.value,
      instruction: identity.value,
      subject: identity.value,
      primary: identity.value,
      title: identity.content,
      name: identity.content,
      content: identity.content,
    });
    addSimpleCase({
      id: `D3-IDENTITY-${identity.label.toUpperCase()}`,
      family: 'extreme_legal_identities',
      description: `Legal unusual identity/content case: ${identity.label}.`,
      expectedInvariant: 'exact content and IDs are preserved without normalization or case folding',
      expectedStage: 'post_run',
      sleeve: built.sleeve,
      selection: built.selection,
      replayCount: 4,
      assertResult: (result) => {
        const part = result.runtime.promptParts.find((candidate) => candidate.id === built.expectedInstructionId);
        assert.ok(part);
        assert.equal(part.content, built.expectedContent);
        assert.equal(result.runtime.resolvedNeoBlocks[0].id, built.sleeve.neoBlocks[0].id);
        assert.equal(result.runtime.activeNeoStackIds[0], built.sleeve.neoStacks[0].id);
      },
    });
  }
  addSequenceCase({
    id: 'D3-UNICODE-HASH-COMPOSED-DECOMPOSED',
    family: 'unicode_hash_integrity',
    description: 'Two valid sleeves differ only by composed vs decomposed Unicode content.',
    expectedInvariant: 'runtimeHash performs no Unicode normalization: distinct code point content hashes differently and exact replay is stable',
    run: (context) => {
      const composed = buildIdentitySleeve('COMPOSED', {
        sleeve: 'UNICODE.HASH',
        stack: 'UNICODE.HASH',
        block: 'UNICODE.HASH',
        trigger: 'UNICODE.HASH.T',
        directive: 'UNICODE.HASH.D',
        instruction: 'UNICODE.HASH.I',
        subject: 'UNICODE.HASH.S',
        primary: 'UNICODE.HASH.P',
        title: 'cafe\u00e9',
        name: 'unicode hash',
        content: 'cafe\u00e9',
      });
      const decomposed = buildIdentitySleeve('DECOMPOSED', {
        sleeve: 'UNICODE.HASH',
        stack: 'UNICODE.HASH',
        block: 'UNICODE.HASH',
        trigger: 'UNICODE.HASH.T',
        directive: 'UNICODE.HASH.D',
        instruction: 'UNICODE.HASH.I',
        subject: 'UNICODE.HASH.S',
        primary: 'UNICODE.HASH.P',
        title: 'cafee\u0301',
        name: 'unicode hash',
        content: 'cafee\u0301',
      });
      const a = compileWithReplay(composed.sleeve, composed.selection, context, 4);
      const b = compileWithReplay(decomposed.sleeve, decomposed.selection, context, 4);
      assertSuccessInvariants(composed.sleeve, composed.selection, a, context);
      assertSuccessInvariants(decomposed.sleeve, decomposed.selection, b, context);
      assert.notEqual(a.runtime.runtimeHash, b.runtime.runtimeHash);
    },
  });
}

function addLargeContentCases() {
  for (const size of [256, 1024, 4096, 8192]) {
    const content = 'X'.repeat(size);
    const built = buildIdentitySleeve(`CONTENT.${size}`, {
      sleeve: `CONTENT.${size}`,
      stack: `CONTENT.${size}`,
      block: `CONTENT.${size}`,
      trigger: `CONTENT.${size}.T`,
      directive: `CONTENT.${size}.D`,
      instruction: `CONTENT.${size}.I`,
      subject: `CONTENT.${size}.S`,
      primary: `CONTENT.${size}.P`,
      title: `content ${size}`,
      name: `content ${size}`,
      content,
    });
    addSimpleCase({
      id: `D3-LARGE-CONTENT-${size}`,
      family: 'large_but_bounded_content_strings',
      description: `Legal MOLT content with ${size} characters.`,
      expectedInvariant: 'content is preserved exactly, RuntimeSpec output is complete, runtimeHash deterministic, and Trace contract-valid',
      expectedStage: 'post_run',
      sleeve: built.sleeve,
      selection: built.selection,
      replayCount: 4,
      bounds: { contentChars: size },
      assertResult: (result) => {
        for (const part of result.runtime.promptParts) assert.equal(part.content, content);
      },
    });
  }
}

function addOptionalSurfaceCases() {
  const base = buildChainTopology(1, 'D3.OPTIONAL.MINIMAL');
  const baseSelection = makeSelection({
    activeNeoStackIds: base.stackIds,
    activeNeoBlockIds: base.stackIds.map((stackId) => base.blockByStack[stackId]),
    triggerState: base.triggerState,
  });
  const variants = [
    ['none', (sleeve) => sleeve],
    ['empty-overlays', (sleeve) => ({ ...sleeve, overlays: [] })],
    ['empty-governance', (sleeve) => ({ ...sleeve, governance: [] })],
    ['empty-scoped', (sleeve) => ({ ...sleeve, scopedMolt: [] })],
    ['one-governance-declared', (sleeve) => ({ ...sleeve, governance: [{ id: 'GOV.D3.OPTIONAL.UNUSED', name: 'Unused', description: 'Declared but inactive.', offNeoBlockIds: [base.blockByStack[base.stackIds[0]]] }] })],
  ];
  for (const [label, mutate] of variants) {
    addSimpleCase({
      id: `D3-OPTIONAL-${label.toUpperCase()}`,
      family: 'empty_optional_surface_pathology',
      description: `Minimal valid optional surface variant: ${label}.`,
      expectedInvariant: 'absence or inactive optional subsystem is inert and no phantom output appears',
      expectedStage: 'post_run',
      sleeve: mutate(clone(base.sleeve)),
      selection: baseSelection,
      replayCount: 4,
      assertResult: (result) => {
        assert.equal(result.runtime.promptParts.some((part) => part.sourceMode !== 'local'), false);
      },
    });
  }
  const scopedSleeve = clone(base.sleeve);
  scopedSleeve.moltBlocks.push({
    id: 'I.D3.OPTIONAL.SCOPED',
    type: 'instruction',
    content: 'Optional scoped instruction.',
  });
  scopedSleeve.scopedMolt = [
    { id: 'ATT.D3.OPTIONAL.SCOPED', blockId: 'I.D3.OPTIONAL.SCOPED', scope: { kind: 'sleeve' } },
  ];
  addSimpleCase({
    id: 'D3-OPTIONAL-ONE-SCOPED',
    family: 'empty_optional_surface_pathology',
    description: 'Minimal valid Sleeve with one scoped MOLT attachment enabled.',
    expectedInvariant: 'single scoped subsystem contributes exactly its explicit block and no phantom output appears',
    expectedStage: 'post_run',
    sleeve: scopedSleeve,
    selection: baseSelection,
    replayCount: 4,
    assertResult: (result) => {
      assert.equal(promptParts(result.runtime, (part) => part.id === 'I.D3.OPTIONAL.SCOPED').length, 1);
      assert.equal(result.runtime.promptParts.find((part) => part.id === 'I.D3.OPTIONAL.SCOPED').sourceMode, 'scoped');
    },
  });
  const overlaySleeve = clone(base.sleeve);
  overlaySleeve.moltBlocks.push({
    id: 'I.D3.OPTIONAL.OVERLAY',
    type: 'instruction',
    content: 'Optional overlay instruction.',
  });
  overlaySleeve.overlays = [
    {
      id: 'OV.D3.OPTIONAL.ACTIVE',
      name: 'Optional Overlay',
      attachments: [
        { id: 'ATT.D3.OPTIONAL.OVERLAY', blockId: 'I.D3.OPTIONAL.OVERLAY', scope: { kind: 'sleeve' } },
      ],
    },
  ];
  addSimpleCase({
    id: 'D3-OPTIONAL-ONE-ACTIVE-OVERLAY',
    family: 'empty_optional_surface_pathology',
    description: 'Minimal valid Sleeve with one active Overlay attachment.',
    expectedInvariant: 'single active Overlay contributes exactly its explicit block and inactive absence remains inert',
    expectedStage: 'post_run',
    sleeve: overlaySleeve,
    selection: { ...baseSelection, activeOverlayIds: ['OV.D3.OPTIONAL.ACTIVE'] },
    replayCount: 4,
    assertResult: (result) => {
      assert.equal(promptParts(result.runtime, (part) => part.id === 'I.D3.OPTIONAL.OVERLAY').length, 1);
      assert.equal(result.runtime.promptParts.find((part) => part.id === 'I.D3.OPTIONAL.OVERLAY').sourceMode, 'overlay');
    },
  });
  addSimpleCase({
    id: 'D3-OPTIONAL-ONE-INACTIVE-OVERLAY',
    family: 'empty_optional_surface_pathology',
    description: 'Minimal valid Sleeve with one declared but inactive Overlay.',
    expectedInvariant: 'declared inactive Overlay is inert',
    expectedStage: 'post_run',
    sleeve: overlaySleeve,
    selection: baseSelection,
    replayCount: 4,
    assertResult: (result) => {
      assert.equal(result.runtime.promptParts.some((part) => part.id === 'I.D3.OPTIONAL.OVERLAY'), false);
      assert.equal(traceEvents(result, 'OVERLAY_APPLIED').length, 0);
    },
  });
  const mergeSleeve = clone(base.sleeve);
  const mergeBlock = findNeoBlock(mergeSleeve, base.blockByStack[base.stackIds[0]]);
  mergeSleeve.moltBlocks.push(
    { id: 'I.D3.OPTIONAL.MERGE.SRC', type: 'instruction', content: 'Optional merge source.' },
    { id: 'PH.D3.OPTIONAL.MERGE.CTX', type: 'philosophy', content: 'Optional merge context.' },
    { id: 'I.D3.OPTIONAL.MERGE.RESULT', type: 'instruction', content: 'Optional merge result.' },
  );
  mergeBlock.moltBlockIds.push('I.D3.OPTIONAL.MERGE.SRC', 'PH.D3.OPTIONAL.MERGE.CTX', 'I.D3.OPTIONAL.MERGE.RESULT');
  mergeBlock.baseGeometry.instruction[0].blockIds.push('I.D3.OPTIONAL.MERGE.RESULT');
  mergeBlock.merges = [
    {
      id: 'MRG.D3.OPTIONAL.ONE',
      sourceBlockIds: ['I.D3.OPTIONAL.MERGE.SRC', 'PH.D3.OPTIONAL.MERGE.CTX'],
      resultBlockId: 'I.D3.OPTIONAL.MERGE.RESULT',
    },
  ];
  addSimpleCase({
    id: 'D3-OPTIONAL-ONE-MERGE',
    family: 'empty_optional_surface_pathology',
    description: 'Minimal valid Sleeve with one legal Merge declaration.',
    expectedInvariant: 'single optional Merge contributes only its pre-authored result with merge provenance',
    expectedStage: 'post_run',
    sleeve: mergeSleeve,
    selection: baseSelection,
    replayCount: 4,
    assertResult: (result) => {
      const part = result.runtime.promptParts.find((candidate) => candidate.id === 'I.D3.OPTIONAL.MERGE.RESULT');
      assert.ok(part);
      assert.equal(part.sourceMode, 'merge');
      assert.equal(part.mergeId, 'MRG.D3.OPTIONAL.ONE');
    },
  });
  const bundleSleeve = clone(base.sleeve);
  const bundleBlock = findNeoBlock(bundleSleeve, base.blockByStack[base.stackIds[0]]);
  bundleSleeve.moltBlocks.push(
    { id: 'T.D3.OPTIONAL.SECONDARY', type: 'trigger', content: 'Optional secondary trigger.' },
    { id: 'D.D3.OPTIONAL.SECONDARY', type: 'directive', content: 'Optional secondary directive.' },
    { id: 'I.D3.OPTIONAL.BUNDLE', type: 'instruction', content: 'Optional bundle instruction.' },
  );
  bundleBlock.moltBlockIds.push('T.D3.OPTIONAL.SECONDARY', 'D.D3.OPTIONAL.SECONDARY', 'I.D3.OPTIONAL.BUNDLE');
  bundleBlock.baseGeometry.trigger[0].blockIds.push('T.D3.OPTIONAL.SECONDARY');
  bundleBlock.secondaryDirectives = [
    {
      id: 'SD.D3.OPTIONAL.ONE',
      directiveBlockId: 'D.D3.OPTIONAL.SECONDARY',
      triggerBlockId: 'T.D3.OPTIONAL.SECONDARY',
      bundles: { instruction: 'BND.D3.OPTIONAL.ONE' },
    },
  ];
  bundleBlock.bundles = [
    {
      id: 'BND.D3.OPTIONAL.ONE',
      name: 'Optional Bundle',
      moltType: 'instruction',
      rows: [{ row: 1, blockIds: ['I.D3.OPTIONAL.BUNDLE'] }],
    },
  ];
  addSimpleCase({
    id: 'D3-OPTIONAL-ONE-BUNDLE',
    family: 'empty_optional_surface_pathology',
    description: 'Minimal valid Sleeve with one Secondary-selected Bundle.',
    expectedInvariant: 'single optional Bundle controls local lane geometry only when selected',
    expectedStage: 'post_run',
    sleeve: bundleSleeve,
    selection: {
      ...baseSelection,
      triggerState: {
        ...baseSelection.triggerState,
        'T.D3.OPTIONAL.SECONDARY': true,
      },
    },
    replayCount: 4,
    assertResult: (result) => {
      assert.equal(lane(result.runtime, base.blockByStack[base.stackIds[0]], 'instruction').geometrySource, 'bundle');
      assert.equal(result.runtime.promptParts.find((part) => part.id === 'I.D3.OPTIONAL.BUNDLE').sourceMode, 'local');
    },
  });
}

function addStateIsolationCases() {
  addSequenceCase({
    id: 'D3-STATE-BACK-TO-BACK-ISOLATION',
    family: 'back_to_back_state_isolation',
    description: 'One Node process compiles a deterministic sequence alternating success and failure modes twice.',
    expectedInvariant: 'later compile results match standalone baselines and no module/global state leaks',
    run: (context) => {
      const sequence = [
        ['governance-off', fixtures.bundleOverlaySleeve, { ...clone(fixtures.bundleOverlaySecondaryBSelection), activeGovernanceRuleIds: ['GOV.TARGET.OFF'] }],
        ['normal', fixtures.dealershipSleeve, fixtures.normalSelection],
        ['disabled', fixtures.bundleOverlaySleeve, { ...clone(fixtures.bundleOverlaySecondaryBSelection), disabledNeoBlockIds: ['NB.TARGET'] }],
        ['overlay-active', fixtures.bundleOverlaySleeve, fixtures.bundleOverlayOverlaysAbSelection],
        ['merge-active', fixtures.mergeSleeve, fixtures.mergeBaseSelection],
        ['semantic-failure', (() => {
          const sleeve = clone(fixtures.mergeSleeve);
          findMerge(sleeve, 'NB.MRG.CONTRACT', 'MRG.MRG.REUSE').sourceBlockIds = ['I.MRG.RESULT.BASE', 'PH.MRG.REUSE.CONTEXT'];
          return sleeve;
        })(), fixtures.mergeBaseSelection],
        ['resolution-failure', fixtures.dealershipSleeve, fixtures.multiSecondarySelection],
      ];
      const standalone = new Map();
      for (const [label, sleeve, selection] of sequence) {
        standalone.set(label, compileWithReplay(sleeve, selection, { ...context, id: `${context.id}.${label}` }, 3));
      }
      for (let pass = 0; pass < 2; pass += 1) {
        for (const [label, sleeve, selection] of sequence) {
          const result = compileWithReplay(sleeve, selection, { ...context, id: `${context.id}.${label}.${pass}` }, 2);
          try {
            assert.deepEqual(result, standalone.get(label));
          } catch (error) {
            failStateLeak(context, `State leakage after ${label}`, { result, expected: standalone.get(label), error: error.message });
          }
        }
      }
    },
  });
  addSequenceCase({
    id: 'D3-STATE-SAME-INPUT-AFTER-FAILURE',
    family: 'same_input_after_failure',
    description: 'Failure, valid baseline, same failure, and valid baseline replay.',
    expectedInvariant: 'failures and successes remain identical and protected baseline hashes stay unchanged',
    run: (context) => {
      const failure = compileWithReplay(fixtures.dealershipSleeve, fixtures.multiSecondarySelection, context, 3);
      const success = compileWithReplay(fixtures.dealershipSleeve, fixtures.normalSelection, context, 3);
      const failureAgain = compileWithReplay(fixtures.dealershipSleeve, fixtures.multiSecondarySelection, context, 3);
      const successAgain = compileWithReplay(fixtures.dealershipSleeve, fixtures.normalSelection, context, 3);
      assert.deepEqual(failureAgain, failure);
      assert.deepEqual(successAgain, success);
      assert.equal(success.runtime.runtimeHash, EXPECTED_HASHES.normal);
      assert.equal(successAgain.runtime.runtimeHash, EXPECTED_HASHES.normal);
    },
  });
}

function addProtectedHashCases() {
  addSequenceCase({
    id: 'D3-PROTECTED-HASHES',
    family: 'protected_hash_replay',
    description: 'Protected normal and secondary-b fixture hashes remain unchanged during D3.',
    expectedInvariant: 'C3 protected runtime hashes are unchanged',
    run: (context) => {
      const normal = compileWithReplay(fixtures.dealershipSleeve, fixtures.normalSelection, context, 3);
      const secondaryB = compileWithReplay(fixtures.dealershipSleeve, fixtures.secondaryBSelection, context, 3);
      assertSuccessInvariants(fixtures.dealershipSleeve, fixtures.normalSelection, normal, context);
      assertSuccessInvariants(fixtures.dealershipSleeve, fixtures.secondaryBSelection, secondaryB, context);
      assert.equal(normal.runtime.runtimeHash, EXPECTED_HASHES.normal);
      assert.equal(secondaryB.runtime.runtimeHash, EXPECTED_HASHES.secondaryB);
    },
  });
}

addDepthCases();
addWidthCases();
addMixedTopologyCases();
addDenseCompositionCases();
addCompositionCollisionCases();
addDuplicateProvenanceCases();
addGovernanceCases();
addDisabledCompositionCases();
addSecondaryCases();
addMergeGraphCases();
addStormCases();
addIdentityAndUnicodeCases();
addLargeContentCases();
addOptionalSurfaceCases();
addStateIsolationCases();
addProtectedHashCases();

function observe(result) {
  bump(OBSERVED.statusCounts, result.status);
  if (result.trace) {
    bump(OBSERVED.terminalStages, result.trace.terminalStage);
    OBSERVED.traceEventCounts.push(result.trace.events.length);
    for (const event of result.trace.events) bump(OBSERVED.traceEventTypes, event.type);
  }
  for (const diagnostic of result.diagnostics ?? []) bump(OBSERVED.diagnosticCodes, diagnostic.code);
  if (result.status === 'success') OBSERVED.successCases += 1;
  if (result.trace?.terminalStage === 'semantic') OBSERVED.semanticFailureCases += 1;
  if (result.trace?.terminalStage === 'resolution') OBSERVED.resolutionFailureCases += 1;
}

function runCase(testCase) {
  let result = null;
  const context = {
    id: testCase.id,
    family: testCase.family,
    description: testCase.description,
    expectedInvariant: testCase.expectedInvariant,
    expectedStage: testCase.expectedStage,
    sleeve: testCase.sleeve,
    selection: testCase.selection,
  };
  try {
    if (testCase.sequence) {
      testCase.run(context);
      CASE_INDEX.push({
        id: testCase.id,
        family: testCase.family,
        description: testCase.description,
        expectedInvariant: testCase.expectedInvariant,
        expectedStage: testCase.expectedStage,
        observedStatus: 'sequence-pass',
      });
      OBSERVED.successCases += 1;
      return;
    }
    result = compileWithReplay(testCase.sleeve, testCase.selection, context, testCase.replayCount);
    observe(result);
    assertRegisteredOutput(result, context);
    assert.equal(result.status, STAGE_TO_STATUS[testCase.expectedStage], `wrong status for ${testCase.id}`);
    if (result.status === 'success') {
      assertSuccessInvariants(testCase.sleeve, testCase.selection, result, context);
    } else {
      assertFailureEnvelope(result, testCase.expectedStage, context);
    }
    for (const code of testCase.expectedCodes ?? []) {
      assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === code), `missing diagnostic ${code}`);
    }
    testCase.assertResult(result, context);
    CASE_INDEX.push({
      id: testCase.id,
      family: testCase.family,
      description: testCase.description,
      expectedInvariant: testCase.expectedInvariant,
      expectedStage: testCase.expectedStage,
      observedStatus: result.status,
      observedTerminalStage: result.trace?.terminalStage ?? null,
      diagnosticCodes: diagnosticCodes(result),
      traceEventCount: result.trace?.events.length ?? 0,
      runtimeHash: result.runtime?.runtimeHash ?? null,
    });
  } catch (error) {
    if (!error?.d3Preserved) {
      OBSERVED.contractViolations += 1;
      preserveFailure(context, error, result);
    }
    throw error;
  }
}

for (const testCase of CASES) {
  runCase(testCase);
}

function writeEvidence() {
  mkdirSync(evidenceDir, { recursive: true });
  const result = {
    status: 'PASS',
    familyCount: FAMILY_COUNTS.size,
    caseCount: CASES.length,
    families: Object.fromEntries(FAMILY_COUNTS.entries()),
    successfulCases: OBSERVED.successCases,
    semanticFailureCases: OBSERVED.semanticFailureCases,
    resolutionFailureCases: OBSERVED.resolutionFailureCases,
    unexpectedThrows: OBSERVED.unexpectedThrows,
    contractViolations: OBSERVED.contractViolations,
    partialRuntimeLeaks: OBSERVED.partialRuntimeLeaks,
    stateLeaks: OBSERVED.stateLeaks,
    defects: OBSERVED.defects,
    testedBounds: {
      maxTopologyDepth: OBSERVED.maxTopologyDepth,
      maxPeerWidth: OBSERVED.maxPeerWidth,
      maxContentChars: OBSERVED.maxContentChars,
      note: 'tested bounds only, not product limits',
    },
    traceEventCounts: {
      observed: OBSERVED.traceEventCounts,
      note: 'informational observed counts only; no maximum asserted',
    },
    diagnosticCodes: OBSERVED.diagnosticCodes,
    traceEventTypes: OBSERVED.traceEventTypes,
    terminalStages: OBSERVED.terminalStages,
    statusCounts: OBSERVED.statusCounts,
    protectedHashes: EXPECTED_HASHES,
  };
  writeFileSync(resolve(evidenceDir, 'PATHOLOGICAL_RESULTS.json'), `${JSON.stringify(result, null, 2)}\n`);
  writeFileSync(resolve(evidenceDir, 'PATHOLOGICAL_CASE_INDEX.json'), `${JSON.stringify(CASE_INDEX, null, 2)}\n`);
  writeFileSync(
    resolve(evidenceDir, 'PATHOLOGICAL_ROBUSTNESS_REPORT.md'),
    [
      '# compiler-vnext D3 Pathological Robustness Report',
      '',
      'status: PASS',
      `family_count: ${FAMILY_COUNTS.size}`,
      `case_count: ${CASES.length}`,
      `success_cases: ${OBSERVED.successCases}`,
      `semantic_failure_cases: ${OBSERVED.semanticFailureCases}`,
      `resolution_failure_cases: ${OBSERVED.resolutionFailureCases}`,
      `unexpected_throws: ${OBSERVED.unexpectedThrows}`,
      `contract_violations: ${OBSERVED.contractViolations}`,
      `partial_runtime_leaks: ${OBSERVED.partialRuntimeLeaks}`,
      `state_leaks: ${OBSERVED.stateLeaks}`,
      '',
      'TESTED_BOUNDS:',
      `- max_topology_depth: ${OBSERVED.maxTopologyDepth}`,
      `- max_peer_width: ${OBSERVED.maxPeerWidth}`,
      `- max_content_chars: ${OBSERVED.maxContentChars}`,
      '- note: tested bounds only, not product limits',
      '',
      'Families:',
      ...[...FAMILY_COUNTS.entries()].map(([family, count]) => `- ${family}: ${count}`),
      '',
      'Defects:',
      '- count: 0',
      '',
    ].join('\n'),
  );
  writeFileSync(resolve(evidenceDir, 'status.txt'), 'PASS\n');
}

writeEvidence();

console.log('UMG compiler-vnext pathological robustness contract: PASS');
console.log(JSON.stringify({
  families: Object.fromEntries(FAMILY_COUNTS.entries()),
  totalCases: CASES.length,
  successfulCases: OBSERVED.successCases,
  semanticFailureCases: OBSERVED.semanticFailureCases,
  resolutionFailureCases: OBSERVED.resolutionFailureCases,
  unexpectedThrows: OBSERVED.unexpectedThrows,
  contractViolations: OBSERVED.contractViolations,
  partialRuntimeLeaks: OBSERVED.partialRuntimeLeaks,
  stateLeaks: OBSERVED.stateLeaks,
  testedBounds: {
    maxTopologyDepth: OBSERVED.maxTopologyDepth,
    maxPeerWidth: OBSERVED.maxPeerWidth,
    maxContentChars: OBSERVED.maxContentChars,
    note: 'tested bounds only, not product limits',
  },
}, null, 2));
