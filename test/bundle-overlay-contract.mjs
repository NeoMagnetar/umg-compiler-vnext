import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalize, compileSleeve, validateSleeve } from '../dist/index.js';

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

function lane(runtime, neoBlockId, moltType) {
  const neoBlock = runtime.resolvedNeoBlocks.find((item) => item.id === neoBlockId);
  assert.ok(neoBlock, `missing resolved NeoBlock ${neoBlockId}`);
  const resolvedLane = neoBlock.lanes.find((item) => item.moltType === moltType);
  assert.ok(resolvedLane, `missing resolved lane ${moltType} for ${neoBlockId}`);
  return resolvedLane;
}

function rowIds(runtime, neoBlockId, moltType) {
  return lane(runtime, neoBlockId, moltType).rows.map((row) => row.blocks.map((block) => block.id));
}

function scopedIds(runtime, neoBlockId, moltType) {
  return lane(runtime, neoBlockId, moltType).scoped.map((block) => block.id);
}

function scopedSourceIds(runtime, neoBlockId, moltType) {
  return lane(runtime, neoBlockId, moltType).scoped.map((block) => block.sourceId);
}

function traceEvents(result, type, predicate = () => true) {
  return result.trace?.events.filter((event) => event.type === type && predicate(event)) ?? [];
}

function findSecondary(sleeve, relationId) {
  return sleeve.neoBlocks
    .find((neoBlock) => neoBlock.id === 'NB.TARGET')
    .secondaryDirectives.find((secondary) => secondary.id === relationId);
}

function findBundle(sleeve, bundleId) {
  return sleeve.neoBlocks
    .find((neoBlock) => neoBlock.id === 'NB.TARGET')
    .bundles.find((bundle) => bundle.id === bundleId);
}

const bundleOverlaySleeve = json('fixtures/bundle-overlay.sleeve.json');
const baseSelection = json('fixtures/requests/bundle-overlay-base.selection.json');
const secondaryBSelection = json('fixtures/requests/bundle-overlay-secondary-b.selection.json');
const overlaysAbSelection = json('fixtures/requests/bundle-overlay-overlays-ab.selection.json');
const overlaysBaSelection = json('fixtures/requests/bundle-overlay-overlays-ba.selection.json');
const siblingOverlaySelection = json('fixtures/requests/bundle-overlay-sibling-overlay.selection.json');

assert.equal(
  validateSleeve(bundleOverlaySleeve).diagnostics.filter((diagnostic) => diagnostic.level === 'error').length,
  0,
  JSON.stringify(validateSleeve(bundleOverlaySleeve), null, 2),
);

const base = compileSleeve(bundleOverlaySleeve, baseSelection);
assertSuccess(base);
assert.equal(lane(base.runtime, 'NB.TARGET', 'instruction').geometrySource, 'base');
assert.equal(lane(base.runtime, 'NB.TARGET', 'philosophy').geometrySource, 'base');
assert.equal(lane(base.runtime, 'NB.TARGET', 'blueprint').geometrySource, 'base');
assert.deepEqual(rowIds(base.runtime, 'NB.TARGET', 'instruction'), [['I.TARGET.BASE.1', 'I.TARGET.BASE.2']]);
assert.deepEqual(rowIds(base.runtime, 'NB.TARGET', 'philosophy'), [['PH.TARGET.BASE']]);
assert.deepEqual(rowIds(base.runtime, 'NB.TARGET', 'blueprint'), [['BP.TARGET.BASE']]);
assert.deepEqual(scopedIds(base.runtime, 'NB.TARGET', 'philosophy'), ['PH.SLEEVE.BETA', 'PH.SLEEVE.ALPHA']);
assert.deepEqual(scopedSourceIds(base.runtime, 'NB.TARGET', 'philosophy'), [
  'ATT.SLEEVE.PH.BETA',
  'ATT.SLEEVE.PH.ALPHA',
]);
assert.deepEqual(scopedIds(base.runtime, 'NB.TARGET', 'instruction'), ['I.TARGET.GUIDE']);
assert.deepEqual(scopedIds(base.runtime, 'NB.TARGET', 'blueprint'), [
  'BP.SLEEVE.GLOBAL',
  'BP.TARGET.GUIDE.Z',
  'BP.TARGET.GUIDE.A',
]);
assert.deepEqual(scopedIds(base.runtime, 'NB.DESC', 'blueprint'), [
  'BP.SLEEVE.GLOBAL',
  'BP.TARGET.GUIDE.Z',
  'BP.TARGET.GUIDE.A',
]);
assert.equal(base.runtime.resolvedNeoBlocks.some((neoBlock) => neoBlock.id === 'NB.SIBLING'), false);
assert.equal(base.runtime.activeNeoStackIds.includes('NS.SIBLING'), false);
assert.equal(traceEvents(base, 'OVERLAY_APPLIED').length, 0);
assert.equal(base.runtime.promptParts.some((part) => part.sourceMode === 'overlay'), false);

{
  const withoutOverlays = clone(bundleOverlaySleeve);
  delete withoutOverlays.overlays;
  const result = compileSleeve(withoutOverlays, baseSelection);
  assertSuccess(result);
  assert.equal(canonicalize(result.runtime), canonicalize(base.runtime));
  assert.equal(result.runtime.runtimeHash, base.runtime.runtimeHash);
}

const siblingOverlay = compileSleeve(bundleOverlaySleeve, siblingOverlaySelection);
assertSuccess(siblingOverlay);
assert.equal(canonicalize(siblingOverlay.runtime), canonicalize(base.runtime));
assert.equal(siblingOverlay.runtime.runtimeHash, base.runtime.runtimeHash);
assert.equal(traceEvents(siblingOverlay, 'OVERLAY_APPLIED').length, 0);
assert.equal(siblingOverlay.runtime.promptParts.some((part) => part.id === 'PH.OVERLAY.SIBLING'), false);
assert.equal(siblingOverlay.runtime.activeNeoStackIds.includes('NS.SIBLING'), false);

{
  const oneBundleSleeve = clone(bundleOverlaySleeve);
  findSecondary(oneBundleSleeve, 'SD.TARGET.B').bundles = { instruction: 'BND.TARGET.B.I' };
  const result = compileSleeve(oneBundleSleeve, secondaryBSelection);
  assertSuccess(result);
  assert.equal(lane(result.runtime, 'NB.TARGET', 'instruction').geometrySource, 'bundle');
  assert.equal(lane(result.runtime, 'NB.TARGET', 'philosophy').geometrySource, 'base');
  assert.equal(lane(result.runtime, 'NB.TARGET', 'blueprint').geometrySource, 'base');
  assert.deepEqual(rowIds(result.runtime, 'NB.TARGET', 'instruction'), [['I.TARGET.B.1'], ['I.TARGET.B.2']]);
  assert.deepEqual(rowIds(result.runtime, 'NB.TARGET', 'philosophy'), [['PH.TARGET.BASE']]);
  assert.deepEqual(rowIds(result.runtime, 'NB.TARGET', 'blueprint'), [['BP.TARGET.BASE']]);
}

const secondaryB = compileSleeve(bundleOverlaySleeve, secondaryBSelection);
assertSuccess(secondaryB);
assert.deepEqual(rowIds(secondaryB.runtime, 'NB.TARGET', 'instruction'), [['I.TARGET.B.1'], ['I.TARGET.B.2']]);
assert.deepEqual(rowIds(secondaryB.runtime, 'NB.TARGET', 'philosophy'), [['PH.TARGET.B']]);
assert.deepEqual(rowIds(secondaryB.runtime, 'NB.TARGET', 'blueprint'), [['BP.TARGET.B']]);
assert.equal(lane(secondaryB.runtime, 'NB.TARGET', 'instruction').geometrySource, 'bundle');
assert.equal(lane(secondaryB.runtime, 'NB.TARGET', 'philosophy').geometrySource, 'bundle');
assert.equal(lane(secondaryB.runtime, 'NB.TARGET', 'blueprint').geometrySource, 'bundle');
assert.deepEqual(scopedIds(secondaryB.runtime, 'NB.TARGET', 'philosophy'), ['PH.SLEEVE.BETA', 'PH.SLEEVE.ALPHA']);
assert.deepEqual(scopedIds(secondaryB.runtime, 'NB.TARGET', 'instruction'), ['I.TARGET.GUIDE']);
assert.deepEqual(scopedIds(secondaryB.runtime, 'NB.TARGET', 'blueprint'), [
  'BP.SLEEVE.GLOBAL',
  'BP.TARGET.GUIDE.Z',
  'BP.TARGET.GUIDE.A',
]);

{
  const fallbackSleeve = clone(bundleOverlaySleeve);
  delete findSecondary(fallbackSleeve, 'SD.TARGET.B').bundles.blueprint;
  const result = compileSleeve(fallbackSleeve, secondaryBSelection);
  assertSuccess(result);
  assert.equal(lane(result.runtime, 'NB.TARGET', 'instruction').geometrySource, 'bundle');
  assert.equal(lane(result.runtime, 'NB.TARGET', 'philosophy').geometrySource, 'bundle');
  assert.equal(lane(result.runtime, 'NB.TARGET', 'blueprint').geometrySource, 'base');
  assert.deepEqual(rowIds(result.runtime, 'NB.TARGET', 'blueprint'), [['BP.TARGET.BASE']]);
}

{
  const baseOverlaySelection = clone(baseSelection);
  baseOverlaySelection.activeOverlayIds = ['OV.A', 'OV.B'];
  const result = compileSleeve(bundleOverlaySleeve, baseOverlaySelection);
  assertSuccess(result);
  assert.equal(lane(result.runtime, 'NB.TARGET', 'instruction').geometrySource, 'base');
  assert.equal(lane(result.runtime, 'NB.TARGET', 'philosophy').geometrySource, 'base');
  assert.equal(lane(result.runtime, 'NB.TARGET', 'blueprint').geometrySource, 'base');
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
}

const bundleOverlayAb = compileSleeve(bundleOverlaySleeve, overlaysAbSelection);
assertSuccess(bundleOverlayAb);
assert.equal(lane(bundleOverlayAb.runtime, 'NB.TARGET', 'instruction').geometrySource, 'bundle');
assert.equal(lane(bundleOverlayAb.runtime, 'NB.TARGET', 'philosophy').geometrySource, 'bundle');
assert.equal(lane(bundleOverlayAb.runtime, 'NB.TARGET', 'blueprint').geometrySource, 'bundle');
assert.deepEqual(scopedIds(bundleOverlayAb.runtime, 'NB.TARGET', 'philosophy'), [
  'PH.SLEEVE.BETA',
  'PH.SLEEVE.ALPHA',
  'PH.OVERLAY.A',
  'PH.OVERLAY.DUP',
  'PH.OVERLAY.DUP',
]);
assert.deepEqual(scopedSourceIds(bundleOverlayAb.runtime, 'NB.TARGET', 'philosophy'), [
  'ATT.SLEEVE.PH.BETA',
  'ATT.SLEEVE.PH.ALPHA',
  'ATT.OV.A.PH',
  'ATT.OV.B.PH.Z',
  'ATT.OV.B.PH.A',
]);
assert.deepEqual(scopedIds(bundleOverlayAb.runtime, 'NB.TARGET', 'blueprint'), [
  'BP.SLEEVE.GLOBAL',
  'BP.TARGET.GUIDE.Z',
  'BP.TARGET.GUIDE.A',
  'BP.OVERLAY.DESC',
]);
assert.deepEqual(scopedIds(bundleOverlayAb.runtime, 'NB.DESC', 'blueprint'), [
  'BP.SLEEVE.GLOBAL',
  'BP.TARGET.GUIDE.Z',
  'BP.TARGET.GUIDE.A',
  'BP.OVERLAY.DESC',
]);
assert.deepEqual(
  traceEvents(bundleOverlayAb, 'OVERLAY_APPLIED').map(
    (event) => `${event.data.overlayId}:${event.data.attachmentId}:${event.data.neoBlockId}`,
  ),
  [
    'OV.A:ATT.OV.A.PH:NB.ROOT',
    'OV.B:ATT.OV.B.PH.Z:NB.ROOT',
    'OV.B:ATT.OV.B.PH.A:NB.ROOT',
    'OV.A:ATT.OV.A.PH:NB.TARGET',
    'OV.A:ATT.OV.A.BP:NB.TARGET',
    'OV.B:ATT.OV.B.PH.Z:NB.TARGET',
    'OV.B:ATT.OV.B.PH.A:NB.TARGET',
    'OV.A:ATT.OV.A.PH:NB.DESC',
    'OV.A:ATT.OV.A.BP:NB.DESC',
    'OV.B:ATT.OV.B.PH.Z:NB.DESC',
    'OV.B:ATT.OV.B.PH.A:NB.DESC'
  ],
);

const bundleOverlayBa = compileSleeve(bundleOverlaySleeve, overlaysBaSelection);
assertSuccess(bundleOverlayBa);
assert.notDeepEqual(overlaysAbSelection.activeOverlayIds, overlaysBaSelection.activeOverlayIds);
assert.equal(canonicalize(bundleOverlayAb.runtime), canonicalize(bundleOverlayBa.runtime));
assert.equal(bundleOverlayAb.runtime.runtimeHash, bundleOverlayBa.runtime.runtimeHash);
assert.deepEqual(
  traceEvents(bundleOverlayBa, 'OVERLAY_APPLIED').map(
    (event) => `${event.data.overlayId}:${event.data.attachmentId}:${event.data.neoBlockId}`,
  ),
  traceEvents(bundleOverlayAb, 'OVERLAY_APPLIED').map(
    (event) => `${event.data.overlayId}:${event.data.attachmentId}:${event.data.neoBlockId}`,
  ),
);

{
  const renamedSleeve = clone(bundleOverlaySleeve);
  renamedSleeve.scopedMolt[0].id = 'ATT.SLEEVE.PH.ZZZ';
  renamedSleeve.scopedMolt[1].id = 'ATT.SLEEVE.PH.000';
  renamedSleeve.scopedMolt[3].id = 'ATT.TARGET.BP.999';
  renamedSleeve.scopedMolt[4].id = 'ATT.TARGET.BP.001';
  const result = compileSleeve(renamedSleeve, baseSelection);
  assertSuccess(result);
  assert.deepEqual(scopedIds(result.runtime, 'NB.TARGET', 'philosophy'), scopedIds(base.runtime, 'NB.TARGET', 'philosophy'));
  assert.deepEqual(scopedIds(result.runtime, 'NB.TARGET', 'blueprint'), scopedIds(base.runtime, 'NB.TARGET', 'blueprint'));
}

{
  const sleeve = clone(bundleOverlaySleeve);
  findBundle(sleeve, 'BND.TARGET.B.I').moltType = 'trigger';
  assertFailure(compileSleeve(sleeve, secondaryBSelection), { codes: ['INVALID_ENUM_VALUE'], trace: 'null' });
}

{
  const sleeve = clone(bundleOverlaySleeve);
  findBundle(sleeve, 'BND.TARGET.B.I').moltType = 'directive';
  assertFailure(compileSleeve(sleeve, secondaryBSelection), { codes: ['INVALID_ENUM_VALUE'], trace: 'null' });
}

{
  const sleeve = clone(bundleOverlaySleeve);
  findBundle(sleeve, 'BND.TARGET.B.I').rows[0].blockIds = ['PH.TARGET.B'];
  assertFailure(compileSleeve(sleeve, secondaryBSelection), {
    codes: ['LANE_MEMBER_TYPE_MISMATCH'],
    trace: 'present',
  });
}

{
  const sleeve = clone(bundleOverlaySleeve);
  findSecondary(sleeve, 'SD.TARGET.B').bundles.instruction = 'BND.UNKNOWN';
  assertFailure(compileSleeve(sleeve, secondaryBSelection), {
    codes: ['UNKNOWN_BUNDLE_REFERENCE'],
    trace: 'present',
  });
}

{
  const sleeve = clone(bundleOverlaySleeve);
  findBundle(sleeve, 'BND.TARGET.B.PH').id = 'BND.TARGET.B.I';
  assertFailure(compileSleeve(sleeve, secondaryBSelection), {
    codes: ['DUPLICATE_BUNDLE_ID'],
    trace: 'present',
  });
}

{
  const selection = clone(overlaysAbSelection);
  selection.activeOverlayIds = ['OV.UNKNOWN'];
  assertFailure(compileSleeve(bundleOverlaySleeve, selection), {
    codes: ['UNKNOWN_ACTIVE_OVERLAY'],
    trace: 'present',
  });
}

{
  const selection = clone(overlaysAbSelection);
  selection.activeOverlayIds = ['OV.A', 'OV.A'];
  assertFailure(compileSleeve(bundleOverlaySleeve, selection), {
    codes: ['STRUCTURAL_SCHEMA_VIOLATION'],
    trace: 'null',
  });
}

{
  const sleeve = clone(bundleOverlaySleeve);
  sleeve.overlays[0].attachments[0].blockId = 'D.TARGET.PRIME';
  assertFailure(compileSleeve(sleeve, overlaysAbSelection), {
    codes: ['SCOPED_MOLT_TYPE_UNSUPPORTED'],
    trace: 'present',
  });
}

{
  const sleeve = clone(bundleOverlaySleeve);
  sleeve.overlays[0].attachments[1].scope = { kind: 'neostack', neoStackId: 'NS.UNKNOWN' };
  assertFailure(compileSleeve(sleeve, overlaysAbSelection), {
    codes: ['UNKNOWN_SCOPED_NEOSTACK'],
    trace: 'present',
  });
}

{
  const selection = clone(overlaysAbSelection);
  selection.activeGovernanceRuleIds = ['GOV.TARGET.OFF'];
  assertFailure(compileSleeve(bundleOverlaySleeve, selection), {
    codes: ['SELECTION_TARGET_NOT_EXECUTABLE'],
    trace: 'present',
  });
}

{
  const sleeve = clone(bundleOverlaySleeve);
  sleeve.neoBlocks.find((neoBlock) => neoBlock.id === 'NB.TARGET').defaultState = 'disabled';
  assertFailure(compileSleeve(sleeve, overlaysAbSelection), {
    codes: ['SELECTION_TARGET_NOT_EXECUTABLE'],
    trace: 'present',
  });
}

console.log('UMG compiler-vnext bundle/overlay contract tests: PASS');
