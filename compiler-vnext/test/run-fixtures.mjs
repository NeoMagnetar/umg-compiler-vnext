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

const sleeve = json('fixtures/dealership.sleeve.json');

function compile(selectionName, source = sleeve) {
  return compileSleeve(source, json(`fixtures/requests/${selectionName}`));
}

function idsForLane(runtime, neoBlockId, moltType) {
  const neoBlock = runtime.resolvedNeoBlocks.find((item) => item.id === neoBlockId);
  assert.ok(neoBlock, `missing resolved NeoBlock ${neoBlockId}`);
  const lane = neoBlock.lanes.find((item) => item.moltType === moltType);
  return lane ? lane.rows.flatMap((row) => row.blocks.map((block) => block.id)) : [];
}

function scopedIdsForLane(runtime, neoBlockId, moltType) {
  const neoBlock = runtime.resolvedNeoBlocks.find((item) => item.id === neoBlockId);
  assert.ok(neoBlock, `missing resolved NeoBlock ${neoBlockId}`);
  const lane = neoBlock.lanes.find((item) => item.moltType === moltType);
  return lane ? lane.scoped.map((block) => block.id) : [];
}

const valid = validateSleeve(sleeve);
assert.equal(valid.diagnostics.filter((item) => item.level === 'error').length, 0, JSON.stringify(valid, null, 2));

const normal = compile('normal.selection.json');
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

const secondaryB = compile('secondary-b.selection.json');
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

const secondaryC = compile('secondary-c.selection.json');
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

const overlay = compile('secondary-b-overlay.selection.json');
assert.equal(overlay.hasErrors, false);
assert.deepEqual(scopedIdsForLane(overlay.runtime, 'NB.SERVICE.TRIAGE', 'philosophy'), [
  'PH.SLEEVE.PRAGMATISM',
  'PH.OVERLAY.TAOISM',
]);
assert.ok(overlay.trace.events.some((event) => event.type === 'OVERLAY_APPLIED'));

const multi = compile('multi-secondary-error.selection.json');
assert.equal(multi.hasErrors, true);
assert.ok(multi.trace.diagnostics.some((item) => item.code === 'MULTIPLE_SECONDARY_DIRECTIVE_MATCH'));
assert.equal(multi.runtime, undefined);

const governance = compile('governance-off.selection.json');
assert.equal(governance.hasErrors, false, JSON.stringify(governance.trace.diagnostics, null, 2));
assert.equal(governance.trace.finalNeoBlockStates['NB.SERVICE.DRIVE_IN'], 'off');
assert.ok(!governance.runtime.resolvedNeoBlocks.some((item) => item.id === 'NB.SERVICE.DRIVE_IN'));
assert.ok(governance.trace.events.some((event) => event.type === 'GOVERNANCE_RULE_APPLIED'));

const disabled = compile('disabled-sales.selection.json');
assert.equal(disabled.hasErrors, false, JSON.stringify(disabled.trace.diagnostics, null, 2));
assert.equal(disabled.trace.finalNeoStackStates['NS.SALES'], 'disabled');
assert.equal(disabled.trace.finalNeoBlockStates['NB.SALES.TRADE_IN'], 'disabled');
assert.ok(!disabled.runtime.activeNeoStackIds.includes('NS.SALES'));

const badBundle = validateSleeve(json('fixtures/invalid/cross-lane-bundle.sleeve.json'));
assert.ok(badBundle.diagnostics.some((item) => item.code === 'LANE_MEMBER_TYPE_MISMATCH'));

const badMerge = validateSleeve(json('fixtures/invalid/upward-merge.sleeve.json'));
assert.ok(badMerge.diagnostics.some((item) => item.code === 'MERGE_AUTHORITY_ESCALATION'));

const deterministicSelection = json('fixtures/requests/secondary-b.selection.json');
const runs = Array.from({ length: 100 }, () => compileSleeve(sleeve, deterministicSelection));
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
console.log('determinism repetitions: 100');
