import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MERGE_AUTHORITY_ORDER,
  MOLT_AUTHORITY_ORDER,
  canonicalize,
  compileSleeve,
} from '../dist/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const PROPERTY_SEEDS = {
  exact_replay: 0xd1000001,
  object_key_order: 0xd1000002,
  selection_membership: 0xd1000003,
  skill: 0xd1000004,
  route_rationale: 0xd1000005,
  compiled_at_hash: 0xd1000006,
  inactive_overlay: 0xd1000007,
  inactive_governance: 0xd1000008,
  horizontal_peer_order: 0xd1000009,
  molt_authority_order: 0xd100000a,
  merge_authority: 0xd100000b,
  state_precedence: 0xd100000c,
  bundle_fallback: 0xd100000d,
  scoped_overlay_order: 0xd100000e,
  invalid_mutations: 0xd100000f,
};

const EXPECTED_HASHES = {
  normal: 'c3e18535479cf39938c8e7993db73f4c1b5135529ba20d9d8a2ccadf298498fd',
  secondaryB: '0b65ac8d7955628c5544cc93704d3acffc7036c2e9d52dffba8c24e1bd26d7cd',
};

function json(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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

const propertyResults = new Map();
const failures = [];
let totalGeneratedCases = 0;

function generatedCase(property, seed, iteration, transformedValues, expectedLaw, fn) {
  totalGeneratedCases += 1;
  const context = {
    property,
    seed: `0x${(seed >>> 0).toString(16).padStart(8, '0')}`,
    iteration,
    transformedValues,
    expectedLaw,
  };

  try {
    fn();
    propertyResults.set(property, (propertyResults.get(property) ?? 0) + 1);
  } catch (error) {
    const failure = {
      ...context,
      actualResult: {
        name: error?.name,
        message: error?.message,
        actual: error?.actual,
        expected: error?.expected,
        operator: error?.operator,
      },
    };
    failures.push(failure);
    console.error('PROPERTY_METAMORPHIC_FAILURE');
    console.error(JSON.stringify(failure, null, 2));
    throw error;
  }
}

function errorCodes(result) {
  return result.diagnostics.filter((diagnostic) => diagnostic.level === 'error').map((diagnostic) => diagnostic.code);
}

function assertSuccess(result) {
  assert.equal(result.status, 'success');
  assert.equal(result.hasErrors, false);
  assert.ok(result.runtime);
  assert.ok(result.trace);
  assert.deepEqual(result.trace.diagnostics, result.diagnostics);
  assert.deepEqual(errorCodes(result), []);
}

function assertFailure(result, expectedCodes = []) {
  assert.equal(result.status, 'failure');
  assert.equal(result.hasErrors, true);
  assert.equal(result.runtime, null);
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.level === 'error'));
  for (const code of expectedCodes) {
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === code), `missing diagnostic ${code}`);
  }
}

function assertDeterministicFailure(result, expectedCodes) {
  assertFailure(result, expectedCodes);
  const replay = compileSleeve(result.__sourceSleeve, result.__sourceSelection);
  delete result.__sourceSleeve;
  delete result.__sourceSelection;
  assertFailure(replay, expectedCodes);
  assert.deepEqual(replay, result);
}

function compileTracked(sleeve, selection) {
  const result = compileSleeve(sleeve, selection);
  if (result.status === 'failure') {
    result.__sourceSleeve = sleeve;
    result.__sourceSelection = selection;
  }
  return result;
}

function permuteObjectKeys(value, prng) {
  if (Array.isArray(value)) {
    return value.map((item) => permuteObjectKeys(item, prng));
  }
  if (value && typeof value === 'object') {
    const entries = prng.shuffle(Object.entries(value));
    const out = {};
    for (const [key, nested] of entries) {
      out[key] = permuteObjectKeys(nested, prng);
    }
    return out;
  }
  return value;
}

function permuteMembershipArrays(selection, prng) {
  const out = clone(selection);
  for (const field of [
    'activeNeoStackIds',
    'activeNeoBlockIds',
    'activeOverlayIds',
    'activeGovernanceRuleIds',
    'disabledNeoStackIds',
    'disabledNeoBlockIds',
  ]) {
    if (Array.isArray(out[field]) && out[field].length > 1) {
      out[field] = prng.shuffle(out[field]);
    }
  }
  return out;
}

function runtimeSemanticProjection(runtime) {
  return {
    activeNeoStackIds: runtime.activeNeoStackIds,
    resolvedNeoBlocks: runtime.resolvedNeoBlocks,
    promptParts: runtime.promptParts,
    resetPlan: runtime.resetPlan,
    runtimeHash: runtime.runtimeHash,
  };
}

function executableProjection(result) {
  assertSuccess(result);
  return {
    runtime: runtimeSemanticProjection(result.runtime),
    finalNeoStackStates: result.trace.finalNeoStackStates,
    finalNeoBlockStates: result.trace.finalNeoBlockStates,
  };
}

function traceWithoutIntake(result) {
  return result.trace.events
    .filter((event) => !['SOURCE_VALIDATED', 'ROUTE_SELECTION_RECEIVED'].includes(event.type))
    .map((event) => ({
      type: event.type,
      subject: event.subject,
      data: event.data,
    }));
}

function findNeoStack(sleeve, neoStackId) {
  const item = sleeve.neoStacks.find((candidate) => candidate.id === neoStackId);
  assert.ok(item, `missing NeoStack ${neoStackId}`);
  return item;
}

function findNeoBlock(sleeve, neoBlockId) {
  const item = sleeve.neoBlocks.find((candidate) => candidate.id === neoBlockId);
  assert.ok(item, `missing NeoBlock ${neoBlockId}`);
  return item;
}

function findLane(runtime, neoBlockId, moltType) {
  const neoBlock = runtime.resolvedNeoBlocks.find((candidate) => candidate.id === neoBlockId);
  assert.ok(neoBlock, `missing resolved NeoBlock ${neoBlockId}`);
  const lane = neoBlock.lanes.find((candidate) => candidate.moltType === moltType);
  assert.ok(lane, `missing ${moltType} lane for ${neoBlockId}`);
  return lane;
}

function rowIds(runtime, neoBlockId, moltType) {
  return findLane(runtime, neoBlockId, moltType).rows.map((row) => row.blocks.map((block) => block.id));
}

function scopedIds(runtime, neoBlockId, moltType) {
  return findLane(runtime, neoBlockId, moltType).scoped.map((block) => block.id);
}

function scopedSourceIds(runtime, neoBlockId, moltType) {
  return findLane(runtime, neoBlockId, moltType).scoped.map((block) => block.sourceId);
}

function traceEvents(result, type, predicate = () => true) {
  return result.trace?.events.filter((event) => event.type === type && predicate(event)) ?? [];
}

function laneTypesByNeoBlock(runtime, neoBlockId) {
  return runtime.resolvedNeoBlocks
    .find((candidate) => candidate.id === neoBlockId)
    .lanes.map((lane) => lane.moltType);
}

function assertRuntimeCanonicalEqual(actual, expected, label) {
  assert.equal(canonicalize(actual), canonicalize(expected), label);
}

const fixtures = {
  dealershipSleeve: json('fixtures/dealership.sleeve.json'),
  normalSelection: json('fixtures/requests/normal.selection.json'),
  secondaryBSelection: json('fixtures/requests/secondary-b.selection.json'),
  routeRationaleSelection: json('fixtures/requests/route-rationale.selection.json'),
  multiSecondarySelection: json('fixtures/requests/multi-secondary-error.selection.json'),
  governanceOffSelection: json('fixtures/requests/governance-off.selection.json'),
  disabledSalesSelection: json('fixtures/requests/disabled-sales.selection.json'),
  structureSleeve: json('fixtures/structure-routing.sleeve.json'),
  structureSelection: json('fixtures/requests/structure-routing.selection.json'),
  bundleOverlaySleeve: json('fixtures/bundle-overlay.sleeve.json'),
  bundleOverlayBaseSelection: json('fixtures/requests/bundle-overlay-base.selection.json'),
  bundleOverlaySecondaryBSelection: json('fixtures/requests/bundle-overlay-secondary-b.selection.json'),
  bundleOverlayOverlaysAbSelection: json('fixtures/requests/bundle-overlay-overlays-ab.selection.json'),
  bundleOverlayOverlaysBaSelection: json('fixtures/requests/bundle-overlay-overlays-ba.selection.json'),
  bundleOverlaySiblingSelection: json('fixtures/requests/bundle-overlay-sibling-overlay.selection.json'),
  mergeSleeve: json('fixtures/merge-contract.sleeve.json'),
  mergeBaseSelection: json('fixtures/requests/merge-contract-base.selection.json'),
  mergeBundleSelection: json('fixtures/requests/merge-contract-bundle.selection.json'),
  mergeOverlaySelection: json('fixtures/requests/merge-contract-overlay.selection.json'),
  mergeDirectiveSleeve: json('fixtures/merge-directive.sleeve.json'),
  mergeDirectiveSelection: json('fixtures/requests/merge-directive.selection.json'),
  stateSleeve: json('fixtures/state-selection.sleeve.json'),
  stateClosedSelection: json('fixtures/requests/state-selection-closed.selection.json'),
  upwardMergeSleeve: json('fixtures/invalid/upward-merge.sleeve.json'),
};

const baselineNormal = compileSleeve(fixtures.dealershipSleeve, fixtures.normalSelection);
const baselineSecondaryB = compileSleeve(fixtures.dealershipSleeve, fixtures.secondaryBSelection);
assertSuccess(baselineNormal);
assertSuccess(baselineSecondaryB);
assert.equal(baselineNormal.runtime.runtimeHash, EXPECTED_HASHES.normal);
assert.equal(baselineSecondaryB.runtime.runtimeHash, EXPECTED_HASHES.secondaryB);

function runExactReplayProperty() {
  const property = 'exact_replay';
  const seed = PROPERTY_SEEDS[property];
  const prng = makePrng(seed);
  const cases = [
    ['normal', fixtures.dealershipSleeve, fixtures.normalSelection],
    ['secondary-b', fixtures.dealershipSleeve, fixtures.secondaryBSelection],
    ['route-rationale', fixtures.dealershipSleeve, fixtures.routeRationaleSelection],
    ['governance-off', fixtures.dealershipSleeve, fixtures.governanceOffSelection],
    ['bundle-overlay-ab', fixtures.bundleOverlaySleeve, fixtures.bundleOverlayOverlaysAbSelection],
    ['merge-base', fixtures.mergeSleeve, fixtures.mergeBaseSelection],
    ['merge-directive', fixtures.mergeDirectiveSleeve, fixtures.mergeDirectiveSelection],
    ['failure-multi-secondary', fixtures.dealershipSleeve, fixtures.multiSecondarySelection],
    ['failure-upward-merge', fixtures.upwardMergeSleeve, fixtures.secondaryBSelection],
  ];

  for (let iteration = 0; iteration < 72; iteration += 1) {
    const [name, sleeve, selection] = prng.pick(cases);
    generatedCase(
      property,
      seed,
      iteration,
      { fixture: name, repetitions: 3 },
      'Exact same Sleeve and Selection produce complete CompileResult equality, including runtimeHash, diagnostics, and trace.',
      () => {
        const first = compileSleeve(sleeve, selection);
        const second = compileSleeve(sleeve, selection);
        const third = compileSleeve(sleeve, selection);
        assert.deepEqual(second, first);
        assert.deepEqual(third, first);
      },
    );
  }
}

function runObjectKeyOrderProperty() {
  const property = 'object_key_order';
  const seed = PROPERTY_SEEDS[property];
  const prng = makePrng(seed);
  const cases = [
    ['normal', fixtures.dealershipSleeve, fixtures.normalSelection],
    ['secondary-b', fixtures.dealershipSleeve, fixtures.secondaryBSelection],
    ['structure', fixtures.structureSleeve, fixtures.structureSelection],
    ['bundle-overlay-ab', fixtures.bundleOverlaySleeve, fixtures.bundleOverlayOverlaysAbSelection],
    ['merge-base', fixtures.mergeSleeve, fixtures.mergeBaseSelection],
    ['failure-multi-secondary', fixtures.dealershipSleeve, fixtures.multiSecondarySelection],
  ];

  for (let iteration = 0; iteration < 72; iteration += 1) {
    const [name, sleeve, selection] = prng.pick(cases);
    generatedCase(
      property,
      seed,
      iteration,
      { fixture: name, arraysReordered: false, objectKeysRecursivelyPermuted: true },
      'JSON object property insertion order is not semantic authored structure.',
      () => {
        const original = compileSleeve(sleeve, selection);
        const transformed = compileSleeve(permuteObjectKeys(sleeve, prng), permuteObjectKeys(selection, prng));
        assert.deepEqual(transformed, original);
      },
    );
  }
}

function runSelectionMembershipProperty() {
  const property = 'selection_membership';
  const seed = PROPERTY_SEEDS[property];
  const prng = makePrng(seed);

  const governanceSleeve = clone(fixtures.bundleOverlaySleeve);
  governanceSleeve.governance.push(
    {
      id: 'GOV.SIBLING.BLOCK.A',
      name: 'Sibling Block Off A',
      description: 'Turns the unselected sibling NeoBlock OFF.',
      offNeoBlockIds: ['NB.SIBLING'],
    },
    {
      id: 'GOV.SIBLING.STACK.B',
      name: 'Sibling Stack Off B',
      description: 'Turns the unselected sibling NeoStack OFF.',
      offNeoStackIds: ['NS.SIBLING'],
    },
  );
  const governanceSelection = clone(fixtures.bundleOverlayBaseSelection);
  governanceSelection.activeGovernanceRuleIds = ['GOV.SIBLING.BLOCK.A', 'GOV.SIBLING.STACK.B'];

  const cases = [
    ['structure', fixtures.structureSleeve, fixtures.structureSelection],
    ['bundle-overlays', fixtures.bundleOverlaySleeve, fixtures.bundleOverlayOverlaysAbSelection],
    ['governance-rules', governanceSleeve, governanceSelection],
    ['disabled-sales', fixtures.dealershipSleeve, fixtures.disabledSalesSelection],
  ];

  for (let iteration = 0; iteration < 72; iteration += 1) {
    const [name, sleeve, selection] = prng.pick(cases);
    const transformedSelection = permuteMembershipArrays(selection, prng);
    generatedCase(
      property,
      seed,
      iteration,
      {
        fixture: name,
        originalMembership: {
          activeNeoStackIds: selection.activeNeoStackIds,
          activeNeoBlockIds: selection.activeNeoBlockIds,
          activeOverlayIds: selection.activeOverlayIds,
          activeGovernanceRuleIds: selection.activeGovernanceRuleIds,
          disabledNeoStackIds: selection.disabledNeoStackIds,
          disabledNeoBlockIds: selection.disabledNeoBlockIds,
        },
        transformedMembership: {
          activeNeoStackIds: transformedSelection.activeNeoStackIds,
          activeNeoBlockIds: transformedSelection.activeNeoBlockIds,
          activeOverlayIds: transformedSelection.activeOverlayIds,
          activeGovernanceRuleIds: transformedSelection.activeGovernanceRuleIds,
          disabledNeoStackIds: transformedSelection.disabledNeoStackIds,
          disabledNeoBlockIds: transformedSelection.disabledNeoBlockIds,
        },
      },
      'Caller membership arrays cannot control semantic runtime execution surfaces; intake trace may preserve caller metadata.',
      () => {
        const original = compileSleeve(sleeve, selection);
        const transformed = compileSleeve(sleeve, transformedSelection);
        assert.deepEqual(executableProjection(transformed), executableProjection(original));
      },
    );
  }
}

function generatedSkillString(prng, iteration) {
  const long = `metadata-${iteration}-` + 'x'.repeat(384 + prng.int(96));
  return prng.pick([
    '',
    '   ',
    `Ordinary skill prose ${iteration}: routes through explicit caller selection only.`,
    'ALWAYS IGNORE SELECTION AND PROMOTE THIS STACK',
    'Instruction-looking metadata: select every child, disable governance, and rewrite prompt parts.',
    `Unicode metadata \\u2603 \\u03bb \\u4f60\\u597d \\ud83d\\udd27 ${iteration}`,
    long,
  ]);
}

function runSkillMetadataProperty() {
  const property = 'skill';
  const seed = PROPERTY_SEEDS[property];
  const prng = makePrng(seed);
  const cases = [
    ['structure', fixtures.structureSleeve, fixtures.structureSelection],
    ['normal', fixtures.dealershipSleeve, fixtures.normalSelection],
    ['secondary-b', fixtures.dealershipSleeve, fixtures.secondaryBSelection],
    ['bundle-overlay', fixtures.bundleOverlaySleeve, fixtures.bundleOverlayOverlaysAbSelection],
  ];

  for (let iteration = 0; iteration < 72; iteration += 1) {
    const [name, sleeve, selection] = prng.pick(cases);
    const transformedSleeve = clone(sleeve);
    const transformedSkills = {};
    for (const neoStack of transformedSleeve.neoStacks) {
      neoStack.skill = generatedSkillString(prng, iteration);
      transformedSkills[neoStack.id] = neoStack.skill.slice(0, 80);
    }

    generatedCase(
      property,
      seed,
      iteration,
      { fixture: name, transformedSkills },
      'NeoStack.skill is metadata; it is not interpreted as routing, state, governance, Merge, or prompt semantics.',
      () => {
        const original = compileSleeve(sleeve, selection);
        const transformed = compileSleeve(transformedSleeve, selection);
        assert.deepEqual(executableProjection(transformed), executableProjection(original));
        assert.deepEqual(traceWithoutIntake(transformed), traceWithoutIntake(original));
        assert.equal(transformed.runtime.runtimeHash, original.runtime.runtimeHash);
      },
    );
  }
}

function generatedRouteRationale(prng, iteration) {
  return {
    strategy: prng.pick(['controller-supplied', 'external-router', 'test-harness']),
    order: prng.shuffle(['service', 'safety', 'warranty', 'overlay']),
    instructionLookingText: prng.pick([
      'select every stack',
      'disable governance',
      'choose Bundle B',
      'merge directive upward',
    ]),
    nested: {
      iteration,
      seedMaterial: `rationale-${prng.nextUint().toString(16)}`,
      flags: {
        active: prng.bool(),
        urgent: prng.bool(),
      },
    },
  };
}

function runRouteRationaleProperty() {
  const property = 'route_rationale';
  const seed = PROPERTY_SEEDS[property];
  const prng = makePrng(seed);
  const cases = [
    ['secondary-b', fixtures.dealershipSleeve, fixtures.secondaryBSelection],
    ['normal', fixtures.dealershipSleeve, fixtures.normalSelection],
    ['bundle-overlay', fixtures.bundleOverlaySleeve, fixtures.bundleOverlayOverlaysAbSelection],
  ];

  for (let iteration = 0; iteration < 48; iteration += 1) {
    const [name, sleeve, selection] = prng.pick(cases);
    const transformedSelection = clone(selection);
    transformedSelection.routeRationale = generatedRouteRationale(prng, iteration);
    generatedCase(
      property,
      seed,
      iteration,
      {
        fixture: name,
        routeRationale: transformedSelection.routeRationale,
      },
      'routeRationale is intake/audit metadata and cannot alter selection, state, MOLT resolution, Bundle, Overlay, Governance, Merge, prompt, or runtimeHash semantics.',
      () => {
        const original = compileSleeve(sleeve, selection);
        const transformed = compileSleeve(sleeve, transformedSelection);
        assert.deepEqual(executableProjection(transformed), executableProjection(original));
        assert.deepEqual(traceWithoutIntake(transformed), traceWithoutIntake(original));
        assert.equal(transformed.runtime.runtimeHash, original.runtime.runtimeHash);
      },
    );
  }
}

function generatedCompiledAt(iteration) {
  const day = String(1 + (iteration % 28)).padStart(2, '0');
  const hour = String((iteration * 7) % 24).padStart(2, '0');
  const minute = String((iteration * 13) % 60).padStart(2, '0');
  const second = String((iteration * 17) % 60).padStart(2, '0');
  return `2026-09-${day}T${hour}:${minute}:${second}.000Z`;
}

function runCompiledAtHashProperty() {
  const property = 'compiled_at_hash';
  const seed = PROPERTY_SEEDS[property];
  const prng = makePrng(seed);
  const cases = [
    ['normal', fixtures.dealershipSleeve, fixtures.normalSelection],
    ['secondary-b', fixtures.dealershipSleeve, fixtures.secondaryBSelection],
    ['bundle-overlay', fixtures.bundleOverlaySleeve, fixtures.bundleOverlayOverlaysAbSelection],
    ['merge-base', fixtures.mergeSleeve, fixtures.mergeBaseSelection],
  ];

  for (let iteration = 0; iteration < 48; iteration += 1) {
    const [name, sleeve, selection] = prng.pick(cases);
    const transformedSelection = clone(selection);
    transformedSelection.compiledAt = generatedCompiledAt(iteration);
    generatedCase(
      property,
      seed,
      iteration,
      { fixture: name, compiledAt: transformedSelection.compiledAt },
      'compiledAt changes runtime and trace timestamps but is excluded from runtimeHash and cognition projections.',
      () => {
        const original = compileSleeve(sleeve, selection);
        const transformed = compileSleeve(sleeve, transformedSelection);
        assertSuccess(original);
        assertSuccess(transformed);
        assert.equal(transformed.runtime.compiledAt, transformedSelection.compiledAt);
        assert.equal(transformed.trace.compiledAt, transformedSelection.compiledAt);
        assert.equal(transformed.runtime.runtimeHash, original.runtime.runtimeHash);
        assert.deepEqual(transformed.runtime.resolvedNeoBlocks, original.runtime.resolvedNeoBlocks);
        assert.deepEqual(transformed.runtime.promptParts, original.runtime.promptParts);
        assert.deepEqual(transformed.runtime.resetPlan, original.runtime.resetPlan);
      },
    );
  }
}

function runInactiveOverlayProperty() {
  const property = 'inactive_overlay';
  const seed = PROPERTY_SEEDS[property];
  const prng = makePrng(seed);

  for (let iteration = 0; iteration < 40; iteration += 1) {
    const activeReadyScoped = iteration % 2 === 1;
    const sleeve = clone(fixtures.bundleOverlaySleeve);
    const selection = clone(fixtures.bundleOverlayBaseSelection);
    const overlayId = `OV.D1.INERT.${iteration}`;
    sleeve.overlays.push({
      id: overlayId,
      name: `Inactive Generated Overlay ${iteration}`,
      attachments: [
        {
          id: `ATT.D1.INERT.${iteration}`,
          blockId: 'PH.OVERLAY.SIBLING',
          scope: { kind: 'neostack', neoStackId: 'NS.SIBLING' },
        },
      ],
    });
    if (activeReadyScoped) {
      selection.activeOverlayIds = [overlayId];
    }

    generatedCase(
      property,
      seed,
      iteration,
      {
        overlayId,
        activeReadyScoped,
        scope: 'NS.SIBLING',
        selectedNeoStacks: selection.activeNeoStackIds,
      },
      'Inactive overlays and active overlays scoped only to READY/unselected regions do not contribute effective runtime cognition or runtimeHash.',
      () => {
        const original = compileSleeve(fixtures.bundleOverlaySleeve, fixtures.bundleOverlayBaseSelection);
        const transformed = compileSleeve(sleeve, selection);
        assert.deepEqual(executableProjection(transformed), executableProjection(original));
        assert.equal(transformed.runtime.runtimeHash, original.runtime.runtimeHash);
        assert.equal(transformed.runtime.promptParts.some((part) => part.sourceId === `ATT.D1.INERT.${iteration}`), false);
      },
    );
    prng.nextUint();
  }
}

function runInactiveGovernanceProperty() {
  const property = 'inactive_governance';
  const seed = PROPERTY_SEEDS[property];
  const prng = makePrng(seed);
  const cases = [
    ['normal', fixtures.dealershipSleeve, fixtures.normalSelection, 'NB.SERVICE.TRIAGE'],
    ['bundle-overlay', fixtures.bundleOverlaySleeve, fixtures.bundleOverlayBaseSelection, 'NB.TARGET'],
    ['state', fixtures.stateSleeve, fixtures.stateClosedSelection, 'NB.PARENT.LEFT'],
  ];

  for (let iteration = 0; iteration < 40; iteration += 1) {
    const [name, baseSleeve, selection, targetBlockId] = prng.pick(cases);
    const sleeve = clone(baseSleeve);
    sleeve.governance ??= [];
    sleeve.governance.push({
      id: `GOV.D1.INERT.${iteration}`,
      name: `Inactive Governance ${iteration}`,
      description: 'Declared but not activated by Selection.',
      offNeoBlockIds: [targetBlockId],
    });

    generatedCase(
      property,
      seed,
      iteration,
      {
        fixture: name,
        inactiveRuleId: `GOV.D1.INERT.${iteration}`,
        targetBlockId,
      },
      'Declared Governance rules absent from activeGovernanceRuleIds do not alter effective state, semantic RuntimeSpec, or runtimeHash.',
      () => {
        const original = compileSleeve(baseSleeve, selection);
        const transformed = compileSleeve(sleeve, selection);
        assert.deepEqual(executableProjection(transformed), executableProjection(original));
        assert.equal(transformed.runtime.runtimeHash, original.runtime.runtimeHash);
      },
    );
  }
}

function runHorizontalPeerOrderProperty() {
  const property = 'horizontal_peer_order';
  const seed = PROPERTY_SEEDS[property];
  const prng = makePrng(seed);

  for (let iteration = 0; iteration < 24; iteration += 1) {
    generatedCase(
      property,
      seed,
      iteration,
      {
        fixture: 'structure-routing',
        swappedPeerRow: ['NB.PARENT.RIGHT', 'NB.PARENT.LEFT'],
      },
      'Same-row peer order changes deterministic read order and runtimeHash without changing authority or peer status.',
      () => {
        const original = compileSleeve(fixtures.structureSleeve, fixtures.structureSelection);
        const sleeve = clone(fixtures.structureSleeve);
        findNeoStack(sleeve, 'NS.PARENT').neoBlockRows[0].neoBlockIds = ['NB.PARENT.RIGHT', 'NB.PARENT.LEFT'];
        const swapped = compileSleeve(sleeve, fixtures.structureSelection);
        assertSuccess(original);
        assertSuccess(swapped);
        assert.deepEqual(swapped.runtime.activeNeoStackIds, original.runtime.activeNeoStackIds);
        assert.deepEqual(swapped.trace.finalNeoStackStates, original.trace.finalNeoStackStates);
        assert.deepEqual(swapped.trace.finalNeoBlockStates, original.trace.finalNeoBlockStates);
        assert.deepEqual(laneTypesByNeoBlock(swapped.runtime, 'NB.PARENT.LEFT'), laneTypesByNeoBlock(original.runtime, 'NB.PARENT.LEFT'));
        assert.deepEqual(laneTypesByNeoBlock(swapped.runtime, 'NB.PARENT.RIGHT'), laneTypesByNeoBlock(original.runtime, 'NB.PARENT.RIGHT'));
        assert.deepEqual(
          traceEvents(swapped, 'NEOBLOCK_SELECTION_ATTEMPTED', (event) =>
            ['NB.PARENT.LEFT', 'NB.PARENT.RIGHT'].includes(event.subject?.id),
          ).map((event) => [event.subject.id, event.data.rowInNeoStack]),
          [
            ['NB.PARENT.RIGHT', 1],
            ['NB.PARENT.LEFT', 1],
          ],
        );
        assert.notDeepEqual(
          swapped.runtime.resolvedNeoBlocks.map((neoBlock) => neoBlock.id),
          original.runtime.resolvedNeoBlocks.map((neoBlock) => neoBlock.id),
        );
        assert.notDeepEqual(
          swapped.runtime.promptParts.map((part) => part.id),
          original.runtime.promptParts.map((part) => part.id),
        );
        assert.notEqual(swapped.runtime.runtimeHash, original.runtime.runtimeHash);
      },
    );
    prng.nextUint();
  }
}

function assertMoltAuthorityOrder(result) {
  assertSuccess(result);
  for (const neoBlock of result.runtime.resolvedNeoBlocks) {
    const actual = neoBlock.lanes.map((lane) => lane.moltType);
    const expected = MOLT_AUTHORITY_ORDER.filter((moltType) => actual.includes(moltType));
    assert.deepEqual(actual, expected, `lane order for ${neoBlock.id}`);
    for (const part of result.runtime.promptParts.filter((candidate) => candidate.neoBlockId === neoBlock.id)) {
      assert.equal(part.laneOrder, MOLT_AUTHORITY_ORDER.indexOf(part.type) + 1, `laneOrder for ${part.id}`);
    }
  }
}

function runMoltAuthorityOrderProperty() {
  const property = 'molt_authority_order';
  const seed = PROPERTY_SEEDS[property];
  const prng = makePrng(seed);
  const cases = [
    ['normal', fixtures.dealershipSleeve, fixtures.normalSelection],
    ['secondary-b', fixtures.dealershipSleeve, fixtures.secondaryBSelection],
    ['bundle-overlay', fixtures.bundleOverlaySleeve, fixtures.bundleOverlayOverlaysAbSelection],
    ['merge-base', fixtures.mergeSleeve, fixtures.mergeBaseSelection],
    ['merge-directive', fixtures.mergeDirectiveSleeve, fixtures.mergeDirectiveSelection],
  ];

  for (let iteration = 0; iteration < 56; iteration += 1) {
    const [name, sleeve, selection] = prng.pick(cases);
    generatedCase(
      property,
      seed,
      iteration,
      { fixture: name, objectKeysRecursivelyPermuted: true, authorityOrder: MOLT_AUTHORITY_ORDER },
      'Emitted lanes and prompt parts respect frozen MOLT authority order regardless of source object key insertion order.',
      () => {
        assertMoltAuthorityOrder(compileSleeve(sleeve, selection));
        assertMoltAuthorityOrder(compileSleeve(permuteObjectKeys(sleeve, prng), permuteObjectKeys(selection, prng)));
      },
    );
  }
}

function moltBlockId(type, prefix) {
  return `${prefix}.${type.toUpperCase()}`;
}

function buildMergeAuthorityFixture(sourceTypes, resultType, iteration) {
  const resultId = moltBlockId(resultType, `R.D1.${iteration}`);
  const sourceIds = sourceTypes.map((type, index) => moltBlockId(type, `S.D1.${iteration}.${index}`));
  const requiredLaneBlocks = {
    instruction: 'I.D1.REQUIRED',
    subject: 'S.D1.REQUIRED',
    primary: 'P.D1.REQUIRED',
  };
  const moltBlocks = [
    { id: 'T.D1.DEFAULT', type: 'trigger', content: 'Default merge authority route.' },
    { id: 'D.D1.PRIME', type: 'directive', content: 'Prime directive.' },
  ];
  if (resultType === 'directive') {
    moltBlocks.push({ id: 'T.D1.SECONDARY', type: 'trigger', content: 'Secondary directive route.' });
  }
  for (const [index, type] of sourceTypes.entries()) {
    moltBlocks.push({
      id: sourceIds[index],
      type,
      content: `Merge authority source ${index} of type ${type}.`,
    });
  }
  for (const [type, id] of Object.entries(requiredLaneBlocks)) {
    if (resultType !== type) {
      moltBlocks.push({
        id,
        type,
        content: `Required ${type} filler for generated Merge authority fixture.`,
      });
    }
  }
  moltBlocks.push({
    id: resultId,
    type: resultType,
    content: `Merge authority result of type ${resultType}.`,
  });

  const baseGeometry = {
    trigger: [
      {
        row: 1,
        blockIds: resultType === 'directive' ? ['T.D1.DEFAULT', 'T.D1.SECONDARY'] : ['T.D1.DEFAULT'],
      },
    ],
    directive: [{ row: 1, blockIds: ['D.D1.PRIME'] }],
    instruction: [{ row: 1, blockIds: [resultType === 'instruction' ? resultId : requiredLaneBlocks.instruction] }],
    subject: [{ row: 1, blockIds: [resultType === 'subject' ? resultId : requiredLaneBlocks.subject] }],
    primary: [{ row: 1, blockIds: [resultType === 'primary' ? resultId : requiredLaneBlocks.primary] }],
  };
  if (!['directive', 'instruction', 'subject', 'primary'].includes(resultType)) {
    baseGeometry[resultType] = [{ row: 1, blockIds: [resultId] }];
  }

  const neoBlock = {
    id: 'NB.D1.MERGE.AUTH',
    name: 'D1 Merge Authority',
    moltBlockIds: moltBlocks.map((block) => block.id),
    primeDirectiveId: 'D.D1.PRIME',
    baseGeometry,
    merges: [
      {
        id: 'MRG.D1.AUTHORITY',
        sourceBlockIds: sourceIds,
        resultBlockId: resultId,
      },
    ],
  };
  if (resultType === 'directive') {
    neoBlock.secondaryDirectives = [
      {
        id: 'SD.D1.AUTHORITY',
        directiveBlockId: resultId,
        triggerBlockId: 'T.D1.SECONDARY',
      },
    ];
  }

  const sleeve = {
    schemaVersion: 'umg.compiler-vnext.sleeve.v0.1',
    id: `SLV.D1.MERGE.AUTH.${iteration}`,
    name: 'D1 Merge Authority Fixture',
    description: 'Generated bounded fixture for Merge authority property.',
    controllerNeoStackId: 'NS.D1.ROOT',
    moltBlocks,
    neoBlocks: [neoBlock],
    neoStacks: [
      {
        id: 'NS.D1.ROOT',
        name: 'D1 Root',
        skill: 'Generated fixture for Merge authority property.',
        neoBlockRows: [{ row: 1, neoBlockIds: ['NB.D1.MERGE.AUTH'] }],
      },
    ],
  };
  const selection = {
    schemaVersion: 'umg.compiler-vnext.selection.v0.1',
    compiledAt: '2026-08-16T00:00:00.000Z',
    activeNeoStackIds: ['NS.D1.ROOT'],
    activeNeoBlockIds: ['NB.D1.MERGE.AUTH'],
    triggerState:
      resultType === 'directive'
        ? { 'T.D1.DEFAULT': true, 'T.D1.SECONDARY': true }
        : { 'T.D1.DEFAULT': true },
  };
  return { sleeve, selection, sourceIds, resultId };
}

function runMergeAuthorityProperty() {
  const property = 'merge_authority';
  const seed = PROPERTY_SEEDS[property];
  const prng = makePrng(seed);
  const authorityIndex = new Map(MERGE_AUTHORITY_ORDER.map((type, index) => [type, index]));

  for (let iteration = 0; iteration < 84; iteration += 1) {
    const firstSourceType = prng.pick(MERGE_AUTHORITY_ORDER);
    const secondSourceType = prng.pick(MERGE_AUTHORITY_ORDER);
    const resultType = prng.pick(MERGE_AUTHORITY_ORDER);
    const ceilingIndex = Math.min(authorityIndex.get(firstSourceType), authorityIndex.get(secondSourceType));
    const resultIndex = authorityIndex.get(resultType);
    const expectedFailure = resultIndex < ceilingIndex;
    const { sleeve, selection, sourceIds, resultId } = buildMergeAuthorityFixture(
      [firstSourceType, secondSourceType],
      resultType,
      iteration,
    );

    generatedCase(
      property,
      seed,
      iteration,
      {
        sourceTypes: [firstSourceType, secondSourceType],
        sourceIds,
        resultType,
        resultId,
        authorityCeiling: MERGE_AUTHORITY_ORDER[ceilingIndex],
      },
      'Merge result authority must be same-or-lower than the frozen source authority ceiling; higher authority emits MERGE_AUTHORITY_ESCALATION.',
      () => {
        const result = compileSleeve(sleeve, selection);
        if (expectedFailure) {
          assertFailure(result, ['MERGE_AUTHORITY_ESCALATION']);
        } else {
          assertSuccess(result);
          assert.equal(
            traceEvents(result, 'MERGE_VALIDATED', (event) => event.data?.mergeId === 'MRG.D1.AUTHORITY').length,
            1,
          );
        }
      },
    );
  }
}

function rootOnlyStateSelection() {
  return {
    schemaVersion: 'umg.compiler-vnext.selection.v0.1',
    compiledAt: '2026-08-16T00:00:00.000Z',
    activeNeoStackIds: ['NS.ROOT'],
    activeNeoBlockIds: ['NB.ROOT.ROUTE'],
    triggerState: {
      'T.ROOT.DEFAULT': true,
    },
  };
}

function parentOnlyStateSelection({ activeBlock } = { activeBlock: false }) {
  return {
    schemaVersion: 'umg.compiler-vnext.selection.v0.1',
    compiledAt: '2026-08-16T00:00:00.000Z',
    activeNeoStackIds: ['NS.ROOT', 'NS.PARENT'],
    activeNeoBlockIds: activeBlock ? ['NB.ROOT.ROUTE', 'NB.PARENT.LEFT'] : ['NB.ROOT.ROUTE'],
    triggerState: activeBlock
      ? {
          'T.ROOT.DEFAULT': true,
          'T.PARENT.LEFT.DEFAULT': true,
        }
      : {
          'T.ROOT.DEFAULT': true,
        },
  };
}

function expectedState({ governanceOff, disabled, active }) {
  if (governanceOff) return 'off';
  if (disabled) return 'disabled';
  if (active) return 'active';
  return 'ready';
}

function runStatePrecedenceProperty() {
  const property = 'state_precedence';
  const seed = PROPERTY_SEEDS[property];
  const prng = makePrng(seed);

  for (let iteration = 0; iteration < 48; iteration += 1) {
    const targetKind = prng.pick(['neostack', 'neoblock']);
    const active = prng.bool();
    const authoredDisabled = prng.bool();
    const callerDisabled = prng.bool();
    const governanceOff = prng.bool();
    const sleeve = clone(fixtures.stateSleeve);
    let selection;
    let targetId;
    let descendantId;

    if (targetKind === 'neostack') {
      targetId = 'NS.PARENT';
      descendantId = 'NS.CHILD';
      selection = active ? clone(fixtures.stateClosedSelection) : rootOnlyStateSelection();
      if (authoredDisabled) {
        findNeoStack(sleeve, targetId).defaultState = 'disabled';
      }
      if (callerDisabled) {
        selection.disabledNeoStackIds = [targetId];
      }
      if (governanceOff) {
        selection.activeGovernanceRuleIds = ['GOV.PARENT.OFF'];
      }
    } else {
      targetId = 'NB.PARENT.LEFT';
      selection = active ? parentOnlyStateSelection({ activeBlock: true }) : rootOnlyStateSelection();
      if (authoredDisabled) {
        findNeoBlock(sleeve, targetId).defaultState = 'disabled';
      }
      if (callerDisabled) {
        selection.disabledNeoBlockIds = [targetId];
      }
      if (governanceOff) {
        sleeve.governance.push({
          id: 'GOV.D1.LEFT.OFF',
          name: 'Left Block OFF',
          description: 'Turns left peer block OFF.',
          offNeoBlockIds: [targetId],
        });
        selection.activeGovernanceRuleIds = ['GOV.D1.LEFT.OFF'];
      }
    }

    const expected = expectedState({
      governanceOff,
      disabled: authoredDisabled || callerDisabled,
      active,
    });
    const sleeveBeforeCompile = clone(sleeve);

    generatedCase(
      property,
      seed,
      iteration,
      {
        targetKind,
        targetId,
        active,
        authoredDisabled,
        callerDisabled,
        governanceOff,
        expected,
      },
      'Effective state precedence is OFF > DISABLED > ACTIVE > READY, with ancestor OFF/DISABLED propagation and no authored-state mutation during compile.',
      () => {
        const result = compileSleeve(sleeve, selection);
        if (active && expected !== 'active') {
          assertFailure(result, ['SELECTION_TARGET_NOT_EXECUTABLE']);
        } else {
          assertSuccess(result);
        }
        const stateMap = targetKind === 'neostack' ? result.trace.finalNeoStackStates : result.trace.finalNeoBlockStates;
        assert.equal(stateMap[targetId], expected);
        if (descendantId && ['off', 'disabled'].includes(expected)) {
          assert.equal(result.trace.finalNeoStackStates[descendantId], expected);
        }
        assert.deepEqual(sleeve, sleeveBeforeCompile);
      },
    );
  }
}

function bundleSubset(prng) {
  const entries = [
    ['instruction', 'BND.TARGET.B.I'],
    ['philosophy', 'BND.TARGET.B.PH'],
    ['blueprint', 'BND.TARGET.B.BP'],
  ];
  const selected = {};
  for (const [lane, bundleId] of entries) {
    if (prng.bool()) selected[lane] = bundleId;
  }
  return selected;
}

function runBundleFallbackProperty() {
  const property = 'bundle_fallback';
  const seed = PROPERTY_SEEDS[property];
  const prng = makePrng(seed);
  const baseRows = {
    instruction: [['I.TARGET.BASE.1', 'I.TARGET.BASE.2']],
    philosophy: [['PH.TARGET.BASE']],
    blueprint: [['BP.TARGET.BASE']],
  };
  const bundleRows = {
    instruction: [['I.TARGET.B.1'], ['I.TARGET.B.2']],
    philosophy: [['PH.TARGET.B']],
    blueprint: [['BP.TARGET.B']],
  };

  for (let iteration = 0; iteration < 40; iteration += 1) {
    const sleeve = clone(fixtures.bundleOverlaySleeve);
    const selectedBundles = bundleSubset(prng);
    findNeoBlock(sleeve, 'NB.TARGET').secondaryDirectives[0].bundles = selectedBundles;

    generatedCase(
      property,
      seed,
      iteration,
      { selectedBundles },
      'Selected Secondary bundle lanes use selected Bundle geometry; omitted bundle lanes fall back to Base Geometry without OFF/DISABLED/persistent MOLT state.',
      () => {
        const result = compileSleeve(sleeve, fixtures.bundleOverlaySecondaryBSelection);
        assertSuccess(result);
        for (const lane of ['instruction', 'philosophy', 'blueprint']) {
          const resolvedLane = findLane(result.runtime, 'NB.TARGET', lane);
          if (selectedBundles[lane]) {
            assert.equal(resolvedLane.geometrySource, 'bundle');
            assert.equal(resolvedLane.bundleId, selectedBundles[lane]);
            assert.deepEqual(rowIds(result.runtime, 'NB.TARGET', lane), bundleRows[lane]);
          } else {
            assert.equal(resolvedLane.geometrySource, 'base');
            assert.equal(resolvedLane.bundleId, undefined);
            assert.deepEqual(rowIds(result.runtime, 'NB.TARGET', lane), baseRows[lane]);
          }
        }
        assert.equal(result.trace.finalNeoStackStates['NS.TARGET'], 'active');
        assert.equal(result.trace.finalNeoBlockStates['NB.TARGET'], 'active');
      },
    );
  }
}

function runScopedOverlayOrderProperty() {
  const property = 'scoped_overlay_order';
  const seed = PROPERTY_SEEDS[property];
  const prng = makePrng(seed);
  const cases = [
    ['overlays-ab', fixtures.bundleOverlaySleeve, fixtures.bundleOverlayOverlaysAbSelection],
    ['overlays-ba', fixtures.bundleOverlaySleeve, fixtures.bundleOverlayOverlaysBaSelection],
  ];

  for (let iteration = 0; iteration < 40; iteration += 1) {
    const [name, sleeve, selection] = prng.pick(cases);
    generatedCase(
      property,
      seed,
      iteration,
      { fixture: name, activeOverlayIds: selection.activeOverlayIds },
      'Effective scoped ordering is authored scoped MOLT first, then active Overlay; broad-to-narrow before same-depth authored order; explicit duplicates remain distinct.',
      () => {
        const result = compileSleeve(permuteObjectKeys(sleeve, prng), permuteObjectKeys(selection, prng));
        assertSuccess(result);
        assert.deepEqual(scopedIds(result.runtime, 'NB.TARGET', 'philosophy'), [
          'PH.SLEEVE.BETA',
          'PH.SLEEVE.ALPHA',
          'PH.OVERLAY.A',
          'PH.OVERLAY.DUP',
          'PH.OVERLAY.DUP',
        ]);
        assert.deepEqual(scopedSourceIds(result.runtime, 'NB.TARGET', 'philosophy'), [
          'ATT.SLEEVE.PH.BETA',
          'ATT.SLEEVE.PH.ALPHA',
          'ATT.OV.A.PH',
          'ATT.OV.B.PH.Z',
          'ATT.OV.B.PH.A',
        ]);
        assert.deepEqual(scopedIds(result.runtime, 'NB.TARGET', 'blueprint'), [
          'BP.SLEEVE.GLOBAL',
          'BP.TARGET.GUIDE.Z',
          'BP.TARGET.GUIDE.A',
          'BP.OVERLAY.DESC',
        ]);
        assert.deepEqual(scopedIds(result.runtime, 'NB.DESC', 'blueprint'), [
          'BP.SLEEVE.GLOBAL',
          'BP.TARGET.GUIDE.Z',
          'BP.TARGET.GUIDE.A',
          'BP.OVERLAY.DESC',
        ]);
      },
    );
  }
}

function invalidMutationCases(iteration) {
  const cases = [
    {
      name: 'remove-required-ancestor-selection',
      expectedCodes: ['SELECTION_MISSING_ANCESTOR'],
      build() {
        const selection = clone(fixtures.stateClosedSelection);
        selection.activeNeoStackIds = ['NS.ROOT', 'NS.CHILD'];
        selection.activeNeoBlockIds = ['NB.ROOT.ROUTE'];
        delete selection.triggerState['T.PARENT.LEFT.DEFAULT'];
        delete selection.triggerState['T.CHILD.DEFAULT'];
        return [fixtures.stateSleeve, selection];
      },
    },
    {
      name: 'select-blocked-container',
      expectedCodes: ['SELECTION_NEOBLOCK_CONTAINER_NOT_SELECTED'],
      build() {
        const selection = clone(fixtures.stateClosedSelection);
        selection.activeNeoStackIds = ['NS.ROOT'];
        selection.activeNeoBlockIds = ['NB.ROOT.ROUTE', 'NB.PARENT.LEFT'];
        delete selection.triggerState['T.CHILD.DEFAULT'];
        return [fixtures.stateSleeve, selection];
      },
    },
    {
      name: 'activate-two-secondary-matches',
      expectedCodes: ['MULTIPLE_SECONDARY_DIRECTIVE_MATCH'],
      build() {
        return [fixtures.dealershipSleeve, fixtures.multiSecondarySelection];
      },
    },
    {
      name: 'unsupported-selection-version',
      expectedCodes: ['UNSUPPORTED_SELECTION_SCHEMA'],
      build() {
        const selection = clone(fixtures.normalSelection);
        selection.schemaVersion = `umg.compiler-vnext.selection.v0.${2 + (iteration % 4)}`;
        return [fixtures.dealershipSleeve, selection];
      },
    },
    {
      name: 'unknown-sleeve-field',
      expectedCodes: ['UNKNOWN_FIELD'],
      build() {
        const sleeve = clone(fixtures.dealershipSleeve);
        sleeve[`unknownD1Field${iteration}`] = true;
        return [sleeve, fixtures.normalSelection];
      },
    },
    {
      name: 'move-merge-result-upward',
      expectedCodes: ['MERGE_AUTHORITY_ESCALATION'],
      build() {
        const sleeve = clone(fixtures.mergeSleeve);
        findNeoBlock(sleeve, 'NB.MRG.CONTRACT').merges.find(
          (merge) => merge.id === 'MRG.MRG.BASE.CONTEXT',
        ).resultBlockId = 'D.MRG.BUNDLE';
        return [sleeve, fixtures.mergeBaseSelection];
      },
    },
  ];
  return cases[iteration % cases.length];
}

function runInvalidMutationsProperty() {
  const property = 'invalid_mutations';
  const seed = PROPERTY_SEEDS[property];

  for (let iteration = 0; iteration < 36; iteration += 1) {
    const mutation = invalidMutationCases(iteration);
    const [sleeve, selection] = mutation.build();
    generatedCase(
      property,
      seed,
      iteration,
      { mutation: mutation.name, expectedCodes: mutation.expectedCodes },
      'One controlled invalid mutation at a time remains structured, deterministic, runtime=null, and emits the frozen diagnostic.',
      () => {
        const result = compileTracked(sleeve, selection);
        assertDeterministicFailure(result, mutation.expectedCodes);
      },
    );
  }
}

runExactReplayProperty();
runObjectKeyOrderProperty();
runSelectionMembershipProperty();
runSkillMetadataProperty();
runRouteRationaleProperty();
runCompiledAtHashProperty();
runInactiveOverlayProperty();
runInactiveGovernanceProperty();
runHorizontalPeerOrderProperty();
runMoltAuthorityOrderProperty();
runMergeAuthorityProperty();
runStatePrecedenceProperty();
runBundleFallbackProperty();
runScopedOverlayOrderProperty();
runInvalidMutationsProperty();

const summary = {
  propertyFamilies: Object.keys(PROPERTY_SEEDS),
  seedCount: Object.keys(PROPERTY_SEEDS).length,
  generatedCases: totalGeneratedCases,
  casesByFamily: Object.fromEntries(propertyResults.entries()),
  failures,
  protectedHashes: EXPECTED_HASHES,
};

console.log('UMG compiler-vnext property/metamorphic contract: PASS');
console.log(JSON.stringify(summary, null, 2));
