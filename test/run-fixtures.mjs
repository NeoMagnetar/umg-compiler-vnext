import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalize, compileSleeve, validateSleeve } from '../dist/index.js';
import { compileCases } from './fixture-cases.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const compileCaseByName = new Map(compileCases.map((testCase) => [testCase.name, testCase]));
const compileCache = new Map();

function json(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

function compileCase(name) {
  if (!compileCache.has(name)) {
    const testCase = compileCaseByName.get(name);
    assert.ok(testCase, `unknown compile case ${name}`);
    compileCache.set(name, compileSleeve(json(testCase.sleevePath), json(testCase.selectionPath)));
  }
  return compileCache.get(name);
}

function expectedCase(name) {
  const testCase = compileCaseByName.get(name);
  assert.ok(testCase, `unknown expected case ${name}`);
  return json(testCase.expectedPath);
}

function assertGolden(name) {
  const result = compileCase(name);
  assert.equal(canonicalize(result), canonicalize(expectedCase(name)), `golden mismatch for ${name}`);
  return result;
}

function assertSuccessInvariant(result) {
  assert.equal(result.schemaVersion, 'umg.compiler-vnext.compile-result.v0.1');
  assert.equal(result.compilerVersion, '0.1.0-experimental');
  assert.equal(result.status, 'success');
  assert.equal(result.hasErrors, false);
  assert.ok(result.runtime);
  assert.ok(result.trace);
  assert.deepEqual(result.diagnostics, result.trace.diagnostics);
  assert.ok(!result.diagnostics.some((diagnostic) => diagnostic.level === 'error'));
}

function assertFailureInvariant(result) {
  assert.equal(result.schemaVersion, 'umg.compiler-vnext.compile-result.v0.1');
  assert.equal(result.compilerVersion, '0.1.0-experimental');
  assert.equal(result.status, 'failure');
  assert.equal(result.hasErrors, true);
  assert.equal(result.runtime, null);
  assert.ok(result.trace);
  assert.deepEqual(result.diagnostics, result.trace.diagnostics);
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.level === 'error'));
}

function lane(runtime, neoBlockId, moltType) {
  const neoBlock = runtime.resolvedNeoBlocks.find((item) => item.id === neoBlockId);
  assert.ok(neoBlock, `missing resolved NeoBlock ${neoBlockId}`);
  return neoBlock.lanes.find((item) => item.moltType === moltType);
}

function idsForLane(runtime, neoBlockId, moltType) {
  const resolvedLane = lane(runtime, neoBlockId, moltType);
  return resolvedLane ? resolvedLane.rows.flatMap((row) => row.blocks.map((block) => block.id)) : [];
}

function rowIdsForLane(runtime, neoBlockId, moltType) {
  const resolvedLane = lane(runtime, neoBlockId, moltType);
  return resolvedLane ? resolvedLane.rows.map((row) => row.blocks.map((block) => block.id)) : [];
}

function scopedIdsForLane(runtime, neoBlockId, moltType) {
  const resolvedLane = lane(runtime, neoBlockId, moltType);
  return resolvedLane ? resolvedLane.scoped.map((block) => block.id) : [];
}

function traceEvent(result, type, predicate = () => true) {
  return result.trace.events.find((event) => event.type === type && predicate(event));
}

function traceEvents(result, type, predicate = () => true) {
  return result.trace.events.filter((event) => event.type === type && predicate(event));
}

function stripBundleMutationSurface(result) {
  const clone = JSON.parse(JSON.stringify(result));
  if (clone.runtime) {
    clone.runtime.runtimeHash = '__RUNTIME_HASH__';
    clone.runtime.resolvedNeoBlocks = clone.runtime.resolvedNeoBlocks.map((neoBlock) =>
      neoBlock.id === 'NB.BUNDLE.ORDER'
        ? {
            ...neoBlock,
            lanes: neoBlock.lanes.filter((item) => item.moltType !== 'instruction'),
          }
        : neoBlock,
    );
    clone.runtime.promptParts = clone.runtime.promptParts.filter(
      (part) => !(part.neoBlockId === 'NB.BUNDLE.ORDER' && part.type === 'instruction'),
    );
  }
  clone.trace.events = clone.trace.events
    .filter(
      (event) =>
        !(
          event.type === 'GEOMETRY_RESOLVED' &&
          event.data?.neoBlockId === 'NB.BUNDLE.ORDER' &&
          event.data?.moltType === 'instruction'
        ),
    )
    .map((event) =>
      event.type === 'RUNTIME_COMPILED'
        ? {
            ...event,
            data: {
              ...event.data,
              runtimeHash: '__RUNTIME_HASH__',
            },
          }
        : event,
    );
  return clone;
}

function makeSparseBlock(suffix, title) {
  const triggerId = `T.${suffix}.DEFAULT`;
  const directiveId = `D.${suffix}.PRIME`;
  const instructionId = `I.${suffix}.STEP`;
  const subjectId = `S.${suffix}.REQUEST`;
  const primaryId = `P.${suffix}.GOAL`;
  return {
    moltBlocks: [
      { id: triggerId, type: 'trigger', content: `${title} trigger.` },
      { id: directiveId, type: 'directive', content: `${title} directive.` },
      { id: instructionId, type: 'instruction', content: `${title} instruction.` },
      { id: subjectId, type: 'subject', content: `${title} subject.` },
      { id: primaryId, type: 'primary', content: `${title} primary.` },
    ],
    neoBlock: {
      id: `NB.${suffix}`,
      name: title,
      moltBlockIds: [triggerId, directiveId, instructionId, subjectId, primaryId],
      primeDirectiveId: directiveId,
      baseGeometry: {
        trigger: [{ row: 1, blockIds: [triggerId] }],
        directive: [{ row: 1, blockIds: [directiveId] }],
        instruction: [{ row: 1, blockIds: [instructionId] }],
        subject: [{ row: 1, blockIds: [subjectId] }],
        primary: [{ row: 1, blockIds: [primaryId] }],
      },
    },
    triggerId,
  };
}

function buildSparseRuntimeFixture() {
  const rootBlock = makeSparseBlock('SPARSE.ROOT', 'Sparse Root');
  const branchKeys = ['A', 'B', 'C'];
  const leafKeys = ['1', '2', '3'];
  const branchBlocks = branchKeys.map((branch) => makeSparseBlock(`SPARSE.${branch}`, `Sparse Branch ${branch}`));
  const leafBlocks = branchKeys.flatMap((branch) =>
    leafKeys.map((leaf) => makeSparseBlock(`SPARSE.${branch}${leaf}`, `Sparse Leaf ${branch}${leaf}`)),
  );

  const moltBlocks = [
    ...rootBlock.moltBlocks,
    ...branchBlocks.flatMap((item) => item.moltBlocks),
    ...leafBlocks.flatMap((item) => item.moltBlocks),
  ];
  const neoBlocks = [
    rootBlock.neoBlock,
    ...branchBlocks.map((item) => item.neoBlock),
    ...leafBlocks.map((item) => item.neoBlock),
  ];

  const rootStack = {
    id: 'NS.SPARSE.ROOT',
    name: 'Sparse Root',
    skill: 'Owns the root route for the sparse-runtime fixture.',
    neoBlockRows: [{ row: 1, neoBlockIds: ['NB.SPARSE.ROOT'] }],
    childStackRows: [{ row: 1, neoStackIds: branchKeys.map((branch) => `NS.SPARSE.${branch}`) }],
  };
  const branchStacks = branchKeys.map((branch) => ({
    id: `NS.SPARSE.${branch}`,
    name: `Sparse Branch ${branch}`,
    skill: `Owns branch ${branch} for the sparse-runtime fixture.`,
    neoBlockRows: [{ row: 1, neoBlockIds: [`NB.SPARSE.${branch}`] }],
    childStackRows: [{ row: 1, neoStackIds: leafKeys.map((leaf) => `NS.SPARSE.${branch}${leaf}`) }],
  }));
  const leafStacks = branchKeys.flatMap((branch) =>
    leafKeys.map((leaf) => ({
      id: `NS.SPARSE.${branch}${leaf}`,
      name: `Sparse Leaf ${branch}${leaf}`,
      skill: `Owns sparse leaf ${branch}${leaf}.`,
      neoBlockRows: [{ row: 1, neoBlockIds: [`NB.SPARSE.${branch}${leaf}`] }],
    })),
  );

  const sleeve = {
    schemaVersion: 'umg.compiler-vnext.sleeve.v0.1',
    id: 'SLV.SPARSE.RUNTIME.v0.1',
    name: 'Sparse Runtime Fixture',
    description: 'Programmatically generated sparse-runtime fixture for compiler-vnext.',
    controllerNeoStackId: 'NS.SPARSE.ROOT',
    moltBlocks,
    neoBlocks,
    neoStacks: [rootStack, ...branchStacks, ...leafStacks],
  };

  const activeNeoStackIds = ['NS.SPARSE.ROOT', 'NS.SPARSE.B', 'NS.SPARSE.B2'];
  const activeNeoBlockIds = ['NB.SPARSE.ROOT', 'NB.SPARSE.B', 'NB.SPARSE.B2'];
  const triggerState = Object.fromEntries(moltBlocks.filter((block) => block.type === 'trigger').map((block) => [block.id, true]));
  const selection = {
    schemaVersion: 'umg.compiler-vnext.selection.v0.1',
    compiledAt: '2026-08-16T00:00:00.000Z',
    activeNeoStackIds,
    activeNeoBlockIds,
    triggerState,
  };

  return {
    sleeve,
    selection,
    counts: {
      totalNeoStacks: sleeve.neoStacks.length,
      totalNeoBlocks: sleeve.neoBlocks.length,
      totalMoltBlocks: sleeve.moltBlocks.length,
      activeNeoStacks: activeNeoStackIds.length,
      activeNeoBlocks: activeNeoBlockIds.length,
      effectiveMoltBlocks: activeNeoBlockIds.length * 5,
    },
    activeNeoStackIds,
    activeNeoBlockIds,
  };
}

const dealershipSleeve = json('fixtures/dealership.sleeve.json');
const dealershipValid = validateSleeve(dealershipSleeve);
assert.equal(
  dealershipValid.diagnostics.filter((item) => item.level === 'error').length,
  0,
  JSON.stringify(dealershipValid, null, 2),
);

const invalidDirective = validateSleeve(json('fixtures/invalid/directive-secondary-in-base.sleeve.json'));
assert.ok(invalidDirective.diagnostics.some((item) => item.code === 'DIRECTIVE_BASE_GEOMETRY_CANON_VIOLATION'));

const badBundle = validateSleeve(json('fixtures/invalid/cross-lane-bundle.sleeve.json'));
assert.ok(badBundle.diagnostics.some((item) => item.code === 'LANE_MEMBER_TYPE_MISMATCH'));

const badMerge = validateSleeve(json('fixtures/invalid/upward-merge.sleeve.json'));
assert.ok(badMerge.diagnostics.some((item) => item.code === 'MERGE_AUTHORITY_ESCALATION'));

const normal = assertGolden('normal');
assertSuccessInvariant(normal);
assert.equal(normal.hasErrors, false, JSON.stringify(normal.trace.diagnostics, null, 2));
assert.deepEqual(idsForLane(normal.runtime, 'NB.SERVICE.TRIAGE', 'directive'), ['D.SVC.PRIME']);
assert.deepEqual(idsForLane(normal.runtime, 'NB.SERVICE.TRIAGE', 'instruction'), [
  'I.SVC.01',
  'I.SVC.02',
  'I.SVC.03',
  'I.SVC.04',
  'I.SVC.05',
]);
assert.deepEqual(scopedIdsForLane(normal.runtime, 'NB.SERVICE.TRIAGE', 'philosophy'), ['PH.SLEEVE.PRAGMATISM']);
assert.equal(normal.trace.finalNeoBlockStates['NB.SERVICE.TRIAGE'], 'active');
assert.equal(normal.runtime.resetPlan.targetState, 'ready');
assert.equal(traceEvent(normal, 'SOURCE_VALIDATED').data.routeRationale, 'not_supplied');
assert.ok(normal.runtime.resolvedNeoBlocks.every((neoBlock) => neoBlock.postRunState === 'ready'));

const secondaryB = assertGolden('secondary-b');
assertSuccessInvariant(secondaryB);
assert.equal(secondaryB.hasErrors, false, JSON.stringify(secondaryB.trace.diagnostics, null, 2));
assert.deepEqual(idsForLane(secondaryB.runtime, 'NB.SERVICE.TRIAGE', 'directive'), ['D.SVC.PRIME', 'D.SVC.B']);
assert.deepEqual(idsForLane(secondaryB.runtime, 'NB.SERVICE.TRIAGE', 'instruction'), [
  'I.SVC.06',
  'I.SVC.02',
  'I.SVC.01',
  'I.SVC.07',
  'I.SVC.MERGED.SAFE_STOP',
  'I.SVC.05',
]);
assert.deepEqual(idsForLane(secondaryB.runtime, 'NB.SERVICE.TRIAGE', 'philosophy'), ['PH.SVC.PRECAUTION']);
assert.deepEqual(idsForLane(secondaryB.runtime, 'NB.SERVICE.TRIAGE', 'blueprint'), ['BP.SVC.SAFETY']);
const mergedPart = secondaryB.runtime.promptParts.find((part) => part.id === 'I.SVC.MERGED.SAFE_STOP');
assert.ok(mergedPart);
assert.equal(mergedPart.sourceMode, 'merge');
assert.equal(mergedPart.mergeId, 'MRG.SVC.SAFE_STOP');
assert.ok(secondaryB.trace.events.some((event) => event.type === 'MERGE_VALIDATED'));
assert.ok(
  secondaryB.trace.events.some(
    (event) => event.type === 'MOLT_READY' && event.subjectId === 'I.SVC.03',
  ),
);
assert.deepEqual(
  traceEvent(
    secondaryB,
    'GEOMETRY_RESOLVED',
    (event) => event.data?.neoBlockId === 'NB.SERVICE.TRIAGE' && event.data?.moltType === 'instruction',
  ).data.readOrder,
  ['I.SVC.06', 'I.SVC.02', 'I.SVC.01', 'I.SVC.07', 'I.SVC.MERGED.SAFE_STOP', 'I.SVC.05'],
);
assert.deepEqual(
  traceEvent(secondaryB, 'MERGE_VALIDATED').data,
  {
    neoBlockId: 'NB.SERVICE.TRIAGE',
    mergeId: 'MRG.SVC.SAFE_STOP',
    sources: [
      { blockId: 'I.SVC.06', moltType: 'instruction' },
      { blockId: 'PH.SVC.PRECAUTION', moltType: 'philosophy' },
    ],
    result: { blockId: 'I.SVC.MERGED.SAFE_STOP', moltType: 'instruction' },
    authorityCeiling: 'instruction',
    authorityCheck: 'pass',
  },
);

const secondaryC = assertGolden('secondary-c');
assertSuccessInvariant(secondaryC);
assert.equal(secondaryC.hasErrors, false, JSON.stringify(secondaryC.trace.diagnostics, null, 2));
assert.deepEqual(idsForLane(secondaryC.runtime, 'NB.SERVICE.TRIAGE', 'directive'), ['D.SVC.PRIME', 'D.SVC.C']);
assert.deepEqual(idsForLane(secondaryC.runtime, 'NB.SERVICE.TRIAGE', 'instruction'), [
  'I.SVC.01',
  'I.SVC.08',
  'I.SVC.02',
  'I.SVC.09',
  'I.SVC.10',
]);
assert.deepEqual(idsForLane(secondaryC.runtime, 'NB.SERVICE.TRIAGE', 'philosophy'), []);
assert.deepEqual(scopedIdsForLane(secondaryC.runtime, 'NB.SERVICE.TRIAGE', 'philosophy'), ['PH.SLEEVE.PRAGMATISM']);
assert.deepEqual(idsForLane(secondaryC.runtime, 'NB.SERVICE.TRIAGE', 'blueprint'), ['BP.SVC.WARRANTY']);

const overlay = assertGolden('secondary-b-overlay');
assertSuccessInvariant(overlay);
assert.equal(overlay.hasErrors, false);
assert.deepEqual(scopedIdsForLane(overlay.runtime, 'NB.SERVICE.TRIAGE', 'philosophy'), [
  'PH.SLEEVE.PRAGMATISM',
  'PH.OVERLAY.TAOISM',
]);
assert.ok(overlay.trace.events.some((event) => event.type === 'OVERLAY_APPLIED'));

const multi = assertGolden('multi-secondary-error');
assertFailureInvariant(multi);
assert.equal(multi.hasErrors, true);
assert.ok(multi.trace.diagnostics.some((item) => item.code === 'MULTIPLE_SECONDARY_DIRECTIVE_MATCH'));
assert.equal(multi.trace.finalNeoBlockStates['NB.SERVICE.TRIAGE'], 'ready');
assert.equal(multi.runtime, null);
assert.ok(traceEvent(multi, 'NEOBLOCK_SELECTION_ATTEMPTED', (event) => event.subjectId === 'NB.SERVICE.TRIAGE'));
assert.deepEqual(traceEvent(multi, 'NEOBLOCK_RESOLUTION_FAILED', (event) => event.subjectId === 'NB.SERVICE.TRIAGE').data, {
  neoStackId: 'NS.SERVICE',
  rowInNeoStack: 1,
  activeTriggerIds: ['T.SVC.SAFETY', 'T.SVC.WARRANTY'],
  matchedSecondaryDirectiveIds: ['SD.SVC.B', 'SD.SVC.C'],
  diagnosticCodes: ['MULTIPLE_SECONDARY_DIRECTIVE_MATCH'],
});
assert.ok(traceEvent(multi, 'NEOBLOCK_READY', (event) => event.subjectId === 'NB.SERVICE.TRIAGE'));

const governance = assertGolden('governance-off');
assertSuccessInvariant(governance);
assert.equal(governance.hasErrors, false, JSON.stringify(governance.trace.diagnostics, null, 2));
assert.equal(governance.trace.finalNeoBlockStates['NB.SERVICE.DRIVE_IN'], 'off');
assert.ok(!governance.runtime.resolvedNeoBlocks.some((item) => item.id === 'NB.SERVICE.DRIVE_IN'));
assert.ok(governance.trace.events.some((event) => event.type === 'GOVERNANCE_RULE_APPLIED'));
assert.ok(!governance.runtime.resetPlan.neoBlockIds.includes('NB.SERVICE.DRIVE_IN'));

const disabled = assertGolden('disabled-sales');
assertSuccessInvariant(disabled);
assert.equal(disabled.hasErrors, false, JSON.stringify(disabled.trace.diagnostics, null, 2));
assert.equal(disabled.trace.finalNeoStackStates['NS.SALES'], 'disabled');
assert.equal(disabled.trace.finalNeoBlockStates['NB.SALES.TRADE_IN'], 'disabled');
assert.ok(!disabled.runtime.activeNeoStackIds.includes('NS.SALES'));
assert.ok(!disabled.runtime.resetPlan.neoStackIds.includes('NS.SALES'));
assert.ok(!disabled.runtime.resetPlan.neoBlockIds.includes('NB.SALES.TRADE_IN'));

const routeRationaleSelection = json('fixtures/requests/route-rationale.selection.json');
const routeRationale = assertGolden('route-rationale');
assertSuccessInvariant(routeRationale);
assert.equal(routeRationale.hasErrors, false);
assert.deepEqual(traceEvent(routeRationale, 'ROUTE_SELECTION_RECEIVED').data.routeRationale, routeRationaleSelection.routeRationale);
assert.equal(traceEvent(routeRationale, 'SOURCE_VALIDATED').data.routeRationale, 'supplied');
assert.equal(routeRationale.runtime.runtimeHash, secondaryB.runtime.runtimeHash);

const mergeDirective = assertGolden('merge-directive');
assertSuccessInvariant(mergeDirective);
assert.equal(mergeDirective.hasErrors, false, JSON.stringify(mergeDirective.trace.diagnostics, null, 2));
assert.deepEqual(idsForLane(mergeDirective.runtime, 'NB.MERGE.DIRECTIVE', 'directive'), ['D.MRG.PRIME', 'D.MRG.SELECTED']);
assert.deepEqual(traceEvent(mergeDirective, 'MERGE_VALIDATED').data, {
  neoBlockId: 'NB.MERGE.DIRECTIVE',
  mergeId: 'MRG.DIRECTIVE.CONTEXT',
  sources: [
    { blockId: 'D.MRG.PRIME', moltType: 'directive' },
    { blockId: 'PH.MRG.CONTEXT', moltType: 'philosophy' },
  ],
  result: { blockId: 'D.MRG.SELECTED', moltType: 'directive' },
  authorityCeiling: 'directive',
  authorityCheck: 'pass',
});

const structureRouting = assertGolden('structure-routing');
assertSuccessInvariant(structureRouting);
assert.equal(structureRouting.hasErrors, false, JSON.stringify(structureRouting.trace.diagnostics, null, 2));
assert.deepEqual(structureRouting.runtime.activeNeoStackIds, ['NS.ROOT', 'NS.PARENT', 'NS.CHILD']);
assert.deepEqual(
  structureRouting.runtime.resolvedNeoBlocks.map((neoBlock) => neoBlock.id),
  ['NB.ROOT.ROUTE', 'NB.PARENT.LEFT', 'NB.PARENT.RIGHT', 'NB.CHILD.DESCENDANT'],
);
assert.deepEqual(
  traceEvents(structureRouting, 'NEOBLOCK_SELECTION_ATTEMPTED').map((event) => event.subjectId),
  ['NB.ROOT.ROUTE', 'NB.PARENT.LEFT', 'NB.PARENT.RIGHT', 'NB.CHILD.DESCENDANT'],
);
assert.deepEqual(traceEvent(structureRouting, 'NEOSTACK_ACTIVE', (event) => event.subjectId === 'NS.PARENT').data, {
  depth: 1,
  parentNeoStackId: 'NS.ROOT',
  rowInParent: 1,
  selectionOrder: 2,
});
assert.deepEqual(traceEvent(structureRouting, 'NEOSTACK_ACTIVE', (event) => event.subjectId === 'NS.CHILD').data, {
  depth: 2,
  parentNeoStackId: 'NS.PARENT',
  rowInParent: 1,
  selectionOrder: 3,
});

const bundleReorderBase = assertGolden('bundle-reorder-base');
const bundleReorderAlt = assertGolden('bundle-reorder-alt');
assertSuccessInvariant(bundleReorderBase);
assertSuccessInvariant(bundleReorderAlt);
assert.equal(bundleReorderBase.hasErrors, false);
assert.equal(bundleReorderAlt.hasErrors, false);
assert.notEqual(bundleReorderBase.runtime.runtimeHash, bundleReorderAlt.runtime.runtimeHash);
assert.deepEqual(rowIdsForLane(bundleReorderBase.runtime, 'NB.BUNDLE.ORDER', 'instruction'), [
  ['I.BND.01'],
  ['I.BND.02', 'I.BND.03'],
]);
assert.deepEqual(rowIdsForLane(bundleReorderAlt.runtime, 'NB.BUNDLE.ORDER', 'instruction'), [
  ['I.BND.02'],
  ['I.BND.03', 'I.BND.01'],
]);
const bundleSourceShape = (sleevePath) =>
  canonicalize(
    json(sleevePath)
      .moltBlocks.map(({ id, type, content }) => ({ id, type, content }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  );
assert.equal(bundleSourceShape('fixtures/bundle-reorder-base.sleeve.json'), bundleSourceShape('fixtures/bundle-reorder-alt.sleeve.json'));
assert.equal(
  canonicalize(stripBundleMutationSurface(bundleReorderBase)),
  canonicalize(stripBundleMutationSurface(bundleReorderAlt)),
);

const sparseFixture = buildSparseRuntimeFixture();
const sparseValidation = validateSleeve(sparseFixture.sleeve);
assert.equal(
  sparseValidation.diagnostics.filter((item) => item.level === 'error').length,
  0,
  JSON.stringify(sparseValidation, null, 2),
);
const sparse = compileSleeve(sparseFixture.sleeve, sparseFixture.selection);
assertSuccessInvariant(sparse);
assert.equal(sparse.hasErrors, false, JSON.stringify(sparse.trace.diagnostics, null, 2));
assert.deepEqual(sparse.runtime.activeNeoStackIds, sparseFixture.activeNeoStackIds);
assert.deepEqual(
  sparse.runtime.resolvedNeoBlocks.map((neoBlock) => neoBlock.id),
  sparseFixture.activeNeoBlockIds,
);
assert.equal(traceEvent(sparse, 'SOURCE_VALIDATED').data.counts.neoStacks, sparseFixture.counts.totalNeoStacks);
assert.equal(traceEvent(sparse, 'SOURCE_VALIDATED').data.counts.neoBlocks, sparseFixture.counts.totalNeoBlocks);
assert.equal(traceEvent(sparse, 'SOURCE_VALIDATED').data.counts.moltBlocks, sparseFixture.counts.totalMoltBlocks);
assert.deepEqual(traceEvent(sparse, 'RUNTIME_COMPILED').data, {
  runtimeHash: sparse.runtime.runtimeHash,
  promptPartCount: sparseFixture.counts.effectiveMoltBlocks,
  totalNeoStacks: sparseFixture.counts.totalNeoStacks,
  totalNeoBlocks: sparseFixture.counts.totalNeoBlocks,
  totalMoltBlocks: sparseFixture.counts.totalMoltBlocks,
  activeNeoStacks: sparseFixture.counts.activeNeoStacks,
  activeNeoBlocks: sparseFixture.counts.activeNeoBlocks,
  effectiveMoltBlocks: sparseFixture.counts.effectiveMoltBlocks,
});
assert.equal(
  Object.values(sparse.trace.finalNeoStackStates).filter((state) => state === 'ready').length,
  sparseFixture.counts.totalNeoStacks - sparseFixture.counts.activeNeoStacks,
);
assert.equal(
  Object.values(sparse.trace.finalNeoBlockStates).filter((state) => state === 'ready').length,
  sparseFixture.counts.totalNeoBlocks - sparseFixture.counts.activeNeoBlocks,
);

const deterministicSelection = json('fixtures/requests/secondary-b.selection.json');
const runs = Array.from({ length: 100 }, () => compileSleeve(dealershipSleeve, deterministicSelection));
const first = canonicalize(runs[0]);
for (const run of runs.slice(1)) assert.equal(canonicalize(run), first);

const peerParts = secondaryB.runtime.promptParts.filter(
  (part) => part.neoBlockId === 'NB.SERVICE.TRIAGE' && part.type === 'instruction' && part.row === 2,
);
assert.deepEqual(peerParts.map((part) => part.id), ['I.SVC.02', 'I.SVC.01']);
assert.deepEqual(peerParts.map((part) => part.column), [1, 2]);

console.log('UMG compiler-vnext fixture suite: PASS');
console.log(`runtimeHash(normal): ${normal.runtime.runtimeHash}`);
console.log(`runtimeHash(secondary-b): ${secondaryB.runtime.runtimeHash}`);
console.log(`golden compile fixtures: ${compileCases.length}`);
console.log('determinism repetitions: 100');
