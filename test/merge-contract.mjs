import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileSleeve, validateSleeve } from '../dist/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

function json(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function errorCodes(diagnostics) {
  return diagnostics.filter((diagnostic) => diagnostic.level === 'error').map((diagnostic) => diagnostic.code);
}

function assertSuccess(result) {
  assert.equal(result.status, 'success');
  assert.equal(result.hasErrors, false);
  assert.ok(result.runtime);
  assert.ok(result.trace);
  assert.deepEqual(result.trace.diagnostics, result.diagnostics);
  assert.equal(errorCodes(result.diagnostics).length, 0);
}

function assertFailure(result, { codes = [], trace } = {}) {
  assert.equal(result.status, 'failure');
  assert.equal(result.hasErrors, true);
  assert.equal(result.runtime, null);
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.level === 'error'));
  if (trace === 'present') {
    assert.ok(result.trace);
    assert.deepEqual(result.trace.diagnostics, result.diagnostics);
  } else if (trace === 'null') {
    assert.equal(result.trace, null);
  }
  for (const code of codes) {
    assert.ok(
      result.diagnostics.some((diagnostic) => diagnostic.code === code),
      `missing expected diagnostic ${code}`,
    );
  }
}

function assertInvalidCompile(sleeve, selection, codes) {
  const validation = validateSleeve(sleeve);
  assert.ok(validation.diagnostics.some((diagnostic) => diagnostic.level === 'error'));
  for (const code of codes) {
    assert.ok(
      validation.diagnostics.some((diagnostic) => diagnostic.code === code),
      `missing validation diagnostic ${code}`,
    );
  }

  const result = compileSleeve(sleeve, selection);
  assertFailure(result, { codes });
  return result;
}

function resolvedLane(runtime, neoBlockId, moltType) {
  const neoBlock = runtime.resolvedNeoBlocks.find((item) => item.id === neoBlockId);
  assert.ok(neoBlock, `missing resolved NeoBlock ${neoBlockId}`);
  const lane = neoBlock.lanes.find((item) => item.moltType === moltType);
  assert.ok(lane, `missing lane ${moltType} for ${neoBlockId}`);
  return lane;
}

function laneIds(runtime, neoBlockId, moltType) {
  return resolvedLane(runtime, neoBlockId, moltType).rows.flatMap((row) => row.blocks.map((block) => block.id));
}

function scopedIds(runtime, neoBlockId, moltType) {
  return resolvedLane(runtime, neoBlockId, moltType).scoped.map((block) => block.id);
}

function promptPart(runtime, blockId) {
  const part = runtime.promptParts.find((item) => item.id === blockId);
  assert.ok(part, `missing prompt part ${blockId}`);
  return part;
}

function traceEvents(result, type, predicate = () => true) {
  return result.trace?.events.filter((event) => event.type === type && predicate(event)) ?? [];
}

function mergeTrace(result, mergeId) {
  const event = result.trace?.events.find(
    (item) => item.type === 'MERGE_VALIDATED' && item.data?.mergeId === mergeId,
  );
  assert.ok(event, `missing MERGE_VALIDATED for ${mergeId}`);
  return event;
}

function hasMergeTrace(result, mergeId) {
  return result.trace?.events.some(
    (item) => item.type === 'MERGE_VALIDATED' && item.data?.mergeId === mergeId,
  ) ?? false;
}

function findNeoBlock(sleeve, neoBlockId) {
  const neoBlock = sleeve.neoBlocks.find((item) => item.id === neoBlockId);
  assert.ok(neoBlock, `missing NeoBlock ${neoBlockId}`);
  return neoBlock;
}

function findMerge(sleeve, neoBlockId, mergeId) {
  const merge = findNeoBlock(sleeve, neoBlockId).merges.find((item) => item.id === mergeId);
  assert.ok(merge, `missing Merge ${mergeId}`);
  return merge;
}

const mergeSleeve = json('fixtures/merge-contract.sleeve.json');
const baseSelection = json('fixtures/requests/merge-contract-base.selection.json');
const bundleSelection = json('fixtures/requests/merge-contract-bundle.selection.json');
const overlaySelection = json('fixtures/requests/merge-contract-overlay.selection.json');
const directiveSleeve = json('fixtures/merge-directive.sleeve.json');
const directiveSelection = json('fixtures/requests/merge-directive.selection.json');

const base = compileSleeve(mergeSleeve, baseSelection);
assertSuccess(base);
assert.deepEqual(laneIds(base.runtime, 'NB.MRG.CONTRACT', 'directive'), ['D.MRG.PRIME']);
assert.deepEqual(laneIds(base.runtime, 'NB.MRG.CONTRACT', 'instruction'), [
  'I.MRG.BASE.STEP',
  'I.MRG.RESULT.BASE',
  'I.MRG.RESULT.DOWN',
  'I.MRG.RESULT.REUSE',
]);
assert.deepEqual(scopedIds(base.runtime, 'NB.MRG.CONTRACT', 'instruction'), ['I.SCOPE.MRG.GUIDE']);
assert.deepEqual(scopedIds(base.runtime, 'NB.MRG.CONTRACT', 'philosophy'), ['PH.SCOPE.MRG.CONTEXT']);
assert.deepEqual(scopedIds(base.runtime, 'NB.MRG.CONTRACT', 'blueprint'), ['BP.SCOPE.MRG.FLOW']);
assert.equal(promptPart(base.runtime, 'I.MRG.RESULT.BASE').sourceMode, 'merge');
assert.equal(promptPart(base.runtime, 'I.MRG.RESULT.BASE').mergeId, 'MRG.MRG.BASE.CONTEXT');
assert.equal(promptPart(base.runtime, 'I.MRG.RESULT.DOWN').sourceMode, 'merge');
assert.equal(promptPart(base.runtime, 'I.MRG.RESULT.REUSE').sourceMode, 'merge');
assert.ok(!laneIds(base.runtime, 'NB.MRG.CONTRACT', 'instruction').includes('I.MRG.SRC.HIDDEN'));
assert.equal(hasMergeTrace(base, 'MRG.MRG.BUNDLE'), false);
assert.deepEqual(mergeTrace(base, 'MRG.MRG.BASE.CONTEXT').data, {
  neoBlockId: 'NB.MRG.CONTRACT',
  mergeId: 'MRG.MRG.BASE.CONTEXT',
  sources: [
    { blockId: 'I.MRG.SRC.HIDDEN', moltType: 'instruction' },
    { blockId: 'PH.MRG.BASE.CONTEXT', moltType: 'philosophy' },
  ],
  result: { blockId: 'I.MRG.RESULT.BASE', moltType: 'instruction' },
  authorityCeiling: 'instruction',
  authorityCheck: 'pass',
});
assert.deepEqual(mergeTrace(base, 'MRG.MRG.DOWNWARD').data, {
  neoBlockId: 'NB.MRG.CONTRACT',
  mergeId: 'MRG.MRG.DOWNWARD',
  sources: [
    { blockId: 'D.MRG.DOWN.SOURCE', moltType: 'directive' },
    { blockId: 'BP.MRG.DOWN.CONTEXT', moltType: 'blueprint' },
  ],
  result: { blockId: 'I.MRG.RESULT.DOWN', moltType: 'instruction' },
  authorityCeiling: 'directive',
  authorityCheck: 'pass',
});
assert.deepEqual(mergeTrace(base, 'MRG.MRG.REUSE').data, {
  neoBlockId: 'NB.MRG.CONTRACT',
  mergeId: 'MRG.MRG.REUSE',
  sources: [
    { blockId: 'I.MRG.SRC.HIDDEN', moltType: 'instruction' },
    { blockId: 'PH.MRG.REUSE.CONTEXT', moltType: 'philosophy' },
  ],
  result: { blockId: 'I.MRG.RESULT.REUSE', moltType: 'instruction' },
  authorityCeiling: 'instruction',
  authorityCheck: 'pass',
});

const bundle = compileSleeve(mergeSleeve, bundleSelection);
assertSuccess(bundle);
assert.deepEqual(laneIds(bundle.runtime, 'NB.MRG.CONTRACT', 'directive'), ['D.MRG.PRIME', 'D.MRG.BUNDLE']);
assert.deepEqual(laneIds(bundle.runtime, 'NB.MRG.CONTRACT', 'instruction'), [
  'I.MRG.BUNDLE.KEEP',
  'I.MRG.RESULT.BUNDLE',
]);
assert.equal(promptPart(bundle.runtime, 'I.MRG.RESULT.BUNDLE').sourceMode, 'merge');
assert.equal(promptPart(bundle.runtime, 'I.MRG.RESULT.BUNDLE').mergeId, 'MRG.MRG.BUNDLE');
assert.deepEqual(mergeTrace(bundle, 'MRG.MRG.BUNDLE').data, {
  neoBlockId: 'NB.MRG.CONTRACT',
  mergeId: 'MRG.MRG.BUNDLE',
  sources: [
    { blockId: 'I.MRG.BUNDLE.SRC', moltType: 'instruction' },
    { blockId: 'PH.MRG.BUNDLE.CONTEXT', moltType: 'philosophy' },
  ],
  result: { blockId: 'I.MRG.RESULT.BUNDLE', moltType: 'instruction' },
  authorityCeiling: 'instruction',
  authorityCheck: 'pass',
});

const overlay = compileSleeve(mergeSleeve, overlaySelection);
assertSuccess(overlay);
assert.deepEqual(scopedIds(overlay.runtime, 'NB.MRG.CONTRACT', 'instruction'), [
  'I.SCOPE.MRG.GUIDE',
  'I.OVERLAY.MRG.NOTE',
]);
assert.equal(
  resolvedLane(overlay.runtime, 'NB.MRG.CONTRACT', 'instruction').scoped[1].sourceMode,
  'overlay',
);
assert.equal(promptPart(overlay.runtime, 'I.MRG.RESULT.BASE').sourceMode, 'merge');
assert.deepEqual(
  mergeTrace(overlay, 'MRG.MRG.BASE.CONTEXT').data.sources.map((source) => source.blockId),
  ['I.MRG.SRC.HIDDEN', 'PH.MRG.BASE.CONTEXT'],
);

const directive = compileSleeve(directiveSleeve, directiveSelection);
assertSuccess(directive);
assert.deepEqual(laneIds(directive.runtime, 'NB.MERGE.DIRECTIVE', 'directive'), ['D.MRG.PRIME', 'D.MRG.SELECTED']);
assert.deepEqual(mergeTrace(directive, 'MRG.DIRECTIVE.CONTEXT').data, {
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

{
  const sleeve = clone(mergeSleeve);
  findMerge(sleeve, 'NB.MRG.CONTRACT', 'MRG.MRG.BASE.CONTEXT').sourceBlockIds = ['I.MRG.SRC.HIDDEN'];
  assertInvalidCompile(sleeve, baseSelection, ['MERGE_TOO_FEW_SOURCES']);
}

{
  const sleeve = clone(mergeSleeve);
  findMerge(sleeve, 'NB.MRG.CONTRACT', 'MRG.MRG.BASE.CONTEXT').sourceBlockIds = [
    'I.MRG.SRC.HIDDEN',
    'I.MRG.SRC.HIDDEN',
  ];
  assertInvalidCompile(sleeve, baseSelection, ['MERGE_DUPLICATE_SOURCE']);
}

{
  const sleeve = clone(mergeSleeve);
  findMerge(sleeve, 'NB.MRG.CONTRACT', 'MRG.MRG.BASE.CONTEXT').sourceBlockIds = [
    'I.MRG.UNKNOWN',
    'PH.MRG.BASE.CONTEXT',
  ];
  assertInvalidCompile(sleeve, baseSelection, ['INVALID_MERGE_SOURCE']);
}

{
  const sleeve = clone(mergeSleeve);
  findMerge(sleeve, 'NB.MRG.CONTRACT', 'MRG.MRG.BASE.CONTEXT').sourceBlockIds = [
    'I.OTHER.NONLOCAL',
    'PH.MRG.BASE.CONTEXT',
  ];
  assertInvalidCompile(sleeve, baseSelection, ['INVALID_MERGE_SOURCE']);
}

{
  const sleeve = clone(mergeSleeve);
  findMerge(sleeve, 'NB.MRG.CONTRACT', 'MRG.MRG.BASE.CONTEXT').resultBlockId = 'I.MRG.UNKNOWN.RESULT';
  assertInvalidCompile(sleeve, baseSelection, ['INVALID_MERGE_RESULT']);
}

{
  const sleeve = clone(mergeSleeve);
  findMerge(sleeve, 'NB.MRG.CONTRACT', 'MRG.MRG.BASE.CONTEXT').resultBlockId = 'I.OTHER.NONLOCAL';
  assertInvalidCompile(sleeve, baseSelection, ['INVALID_MERGE_RESULT']);
}

{
  const sleeve = clone(mergeSleeve);
  findMerge(sleeve, 'NB.MRG.CONTRACT', 'MRG.MRG.BASE.CONTEXT').sourceBlockIds = [
    'I.MRG.RESULT.BASE',
    'PH.MRG.BASE.CONTEXT',
  ];
  const result = assertInvalidCompile(sleeve, baseSelection, ['MERGE_RESULT_IS_SOURCE']);
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === 'MERGE_CHAIN_UNSUPPORTED'), false);
}

{
  const sleeve = clone(mergeSleeve);
  findMerge(sleeve, 'NB.MRG.CONTRACT', 'MRG.MRG.REUSE').resultBlockId = 'I.MRG.RESULT.BASE';
  assertInvalidCompile(sleeve, baseSelection, ['DUPLICATE_MERGE_RESULT']);
}

{
  const sleeve = clone(mergeSleeve);
  findMerge(sleeve, 'NB.MRG.CONTRACT', 'MRG.MRG.BASE.CONTEXT').sourceBlockIds = [
    'T.MRG.DEFAULT',
    'PH.MRG.BASE.CONTEXT',
  ];
  assertInvalidCompile(sleeve, baseSelection, ['TRIGGER_MERGE_UNSUPPORTED']);
}

{
  const sleeve = clone(mergeSleeve);
  findMerge(sleeve, 'NB.MRG.CONTRACT', 'MRG.MRG.BASE.CONTEXT').resultBlockId = 'T.MRG.DEFAULT';
  assertInvalidCompile(sleeve, baseSelection, ['TRIGGER_MERGE_UNSUPPORTED']);
}

{
  const sleeve = clone(mergeSleeve);
  findMerge(sleeve, 'NB.MRG.CONTRACT', 'MRG.MRG.BASE.CONTEXT').resultBlockId = 'D.MRG.BUNDLE';
  assertInvalidCompile(sleeve, baseSelection, ['MERGE_AUTHORITY_ESCALATION']);
}

{
  const sleeve = clone(mergeSleeve);
  sleeve.moltBlocks.push({
    id: 'I.MRG.RESULT.UNPLACED',
    type: 'instruction',
    content: 'Unplaced merge result.',
  });
  findNeoBlock(sleeve, 'NB.MRG.CONTRACT').moltBlockIds.push('I.MRG.RESULT.UNPLACED');
  findMerge(sleeve, 'NB.MRG.CONTRACT', 'MRG.MRG.BASE.CONTEXT').resultBlockId = 'I.MRG.RESULT.UNPLACED';
  assertInvalidCompile(sleeve, baseSelection, ['MERGE_RESULT_NOT_PLACED']);
}

{
  const sleeve = clone(mergeSleeve);
  findMerge(sleeve, 'NB.MRG.CONTRACT', 'MRG.MRG.REUSE').sourceBlockIds = [
    'I.MRG.RESULT.BASE',
    'PH.MRG.REUSE.CONTEXT',
  ];
  const result = assertInvalidCompile(sleeve, baseSelection, ['MERGE_CHAIN_UNSUPPORTED']);
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === 'MERGE_CYCLE'), false);
}

{
  const sleeve = clone(mergeSleeve);
  findMerge(sleeve, 'NB.MRG.CONTRACT', 'MRG.MRG.BASE.CONTEXT').sourceBlockIds = [
    'I.MRG.RESULT.REUSE',
    'PH.MRG.BASE.CONTEXT',
  ];
  findMerge(sleeve, 'NB.MRG.CONTRACT', 'MRG.MRG.REUSE').sourceBlockIds = [
    'I.MRG.RESULT.BASE',
    'PH.MRG.REUSE.CONTEXT',
  ];
  const result = assertInvalidCompile(sleeve, baseSelection, ['MERGE_CYCLE']);
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === 'MERGE_CHAIN_UNSUPPORTED'), false);
}

{
  const sleeve = clone(mergeSleeve);
  findMerge(sleeve, 'NB.MRG.CONTRACT', 'MRG.MRG.DOWNWARD').sourceBlockIds = [
    'I.MRG.RESULT.BUNDLE',
    'BP.MRG.DOWN.CONTEXT',
  ];
  findMerge(sleeve, 'NB.MRG.CONTRACT', 'MRG.MRG.REUSE').sourceBlockIds = [
    'I.MRG.RESULT.DOWN',
    'PH.MRG.REUSE.CONTEXT',
  ];
  findMerge(sleeve, 'NB.MRG.CONTRACT', 'MRG.MRG.BUNDLE').sourceBlockIds = [
    'I.MRG.RESULT.REUSE',
    'PH.MRG.BUNDLE.CONTEXT',
  ];
  const result = assertInvalidCompile(sleeve, baseSelection, ['MERGE_CYCLE']);
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === 'MERGE_CHAIN_UNSUPPORTED'), false);
}

{
  const sleeve = clone(mergeSleeve);
  sleeve.scopedMolt[0].blockId = 'I.MRG.RESULT.BASE';
  assertInvalidCompile(sleeve, baseSelection, ['MERGE_RESULT_SCOPED_UNSUPPORTED']);
}

{
  const sleeve = clone(mergeSleeve);
  sleeve.overlays[0].attachments[0].blockId = 'I.MRG.RESULT.BASE';
  assertInvalidCompile(sleeve, baseSelection, ['MERGE_RESULT_SCOPED_UNSUPPORTED']);
}

assert.equal(traceEvents(base, 'MERGE_VALIDATED').length >= 3, true);
assert.equal(traceEvents(bundle, 'MERGE_VALIDATED').length >= 1, true);

console.log('UMG compiler-vnext Merge contract tests: PASS');
