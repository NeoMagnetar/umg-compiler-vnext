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

function diagnostic(result, code, predicate = () => true) {
  const match = result.diagnostics.find(
    (item) => item.code === code && item.level === 'error' && predicate(item),
  );
  assert.ok(match, `missing diagnostic ${code}`);
  return match;
}

function traceEvents(result, type, predicate = () => true) {
  return result.trace?.events.filter((event) => event.type === type && predicate(event)) ?? [];
}

function traceEvent(result, type, subjectId) {
  const match = result.trace?.events.find((event) => event.type === type && event.subject?.id === subjectId);
  assert.ok(match, `missing trace event ${type} for ${subjectId}`);
  return match;
}

function resolvedLaneIds(runtime, neoBlockId, moltType) {
  const neoBlock = runtime.resolvedNeoBlocks.find((item) => item.id === neoBlockId);
  assert.ok(neoBlock, `missing resolved NeoBlock ${neoBlockId}`);
  const lane = neoBlock.lanes.find((item) => item.moltType === moltType);
  return lane ? lane.rows.flatMap((row) => row.blocks.map((block) => block.id)) : [];
}

function resolvedNeoBlockIds(result) {
  return result.runtime.resolvedNeoBlocks.map((neoBlock) => neoBlock.id);
}

function findNeoStack(sleeve, stackId) {
  const stack = sleeve.neoStacks.find((item) => item.id === stackId);
  assert.ok(stack, `missing NeoStack ${stackId}`);
  return stack;
}

function findNeoBlock(sleeve, neoBlockId) {
  const neoBlock = sleeve.neoBlocks.find((item) => item.id === neoBlockId);
  assert.ok(neoBlock, `missing NeoBlock ${neoBlockId}`);
  return neoBlock;
}

function assertInvalidCompile(sleeve, selection, { codes = [], trace } = {}) {
  const validation = validateSleeve(sleeve);
  assert.ok(validation.diagnostics.some((item) => item.level === 'error'));
  const result = compileSleeve(sleeve, selection);
  assertFailure(result, { codes, trace });
  return result;
}

const dealershipSleeve = json('fixtures/dealership.sleeve.json');
const normalSelection = json('fixtures/requests/normal.selection.json');
const secondaryBSelection = json('fixtures/requests/secondary-b.selection.json');
const mergeDirectiveSleeve = json('fixtures/merge-directive.sleeve.json');
const mergeDirectiveSelection = json('fixtures/requests/merge-directive.selection.json');
const structuralSleeve = json('fixtures/directive-geometry.sleeve.json');
const structuralSelection = json('fixtures/requests/directive-geometry.selection.json');
const structuralShuffledSelection = json('fixtures/requests/directive-geometry-shuffled.selection.json');

const structuralStackOrder = [
  'NS.ROOT',
  'NS.SALES',
  'NS.SERVICE',
  'NS.WARRANTY',
  'NS.SUPPORT',
  'NS.BILLING',
  'NS.RETENTION',
];

const structuralNeoBlockOrder = [
  'NB.ROOT.ROUTE',
  'NB.SALES.LEAD',
  'NB.SERVICE.INTAKE',
  'NB.SERVICE.DISPATCH',
  'NB.WARRANTY.CLAIM',
  'NB.SUPPORT.REPLY',
  'NB.BILLING.COLLECT',
  'NB.RETENTION.RENEW',
];

const normal = compileSleeve(dealershipSleeve, normalSelection);
assertSuccess(normal);
assert.deepEqual(resolvedLaneIds(normal.runtime, 'NB.CONTROLLER.INTAKE', 'directive'), ['D.CTRL.PRIME']);
assert.deepEqual(resolvedLaneIds(normal.runtime, 'NB.SERVICE.TRIAGE', 'directive'), ['D.SVC.PRIME']);

const secondary = compileSleeve(dealershipSleeve, secondaryBSelection);
assertSuccess(secondary);
assert.deepEqual(resolvedLaneIds(secondary.runtime, 'NB.SERVICE.TRIAGE', 'directive'), ['D.SVC.PRIME', 'D.SVC.B']);

const mergeDirective = compileSleeve(mergeDirectiveSleeve, mergeDirectiveSelection);
assertSuccess(mergeDirective);
assert.deepEqual(resolvedLaneIds(mergeDirective.runtime, 'NB.MERGE.DIRECTIVE', 'directive'), [
  'D.MRG.PRIME',
  'D.MRG.SELECTED',
]);

const oneChildSelection = {
  schemaVersion: 'umg.compiler-vnext.selection.v0.1',
  compiledAt: '2026-08-16T00:00:00.000Z',
  activeNeoStackIds: ['NS.ROOT', 'NS.SALES'],
  activeNeoBlockIds: ['NB.ROOT.ROUTE', 'NB.SALES.LEAD'],
  triggerState: {
    'T.ROOT.DEFAULT': true,
    'T.SALES.DEFAULT': true,
  },
};

const oneChild = compileSleeve(structuralSleeve, oneChildSelection);
assertSuccess(oneChild);
assert.deepEqual(oneChild.runtime.activeNeoStackIds, ['NS.ROOT', 'NS.SALES']);
assert.deepEqual(resolvedNeoBlockIds(oneChild), ['NB.ROOT.ROUTE', 'NB.SALES.LEAD']);

const structural = compileSleeve(structuralSleeve, structuralSelection);
assertSuccess(structural);
assert.deepEqual(structural.runtime.activeNeoStackIds, structuralStackOrder);
assert.deepEqual(resolvedNeoBlockIds(structural), structuralNeoBlockOrder);

const rootPeers = traceEvents(
  structural,
  'NEOSTACK_ACTIVE',
  (event) => event.data?.parentNeoStackId === 'NS.ROOT',
);
assert.deepEqual(
  rootPeers.map((event) => event.subject?.id),
  ['NS.SALES', 'NS.SERVICE', 'NS.SUPPORT', 'NS.BILLING', 'NS.RETENTION'],
);
assert.deepEqual(
  rootPeers.map((event) => event.data?.rowInParent),
  [1, 1, 1, 2, 2],
);
assert.ok(rootPeers.every((event) => event.data?.depth === 1));

const serviceChild = traceEvent(structural, 'NEOSTACK_ACTIVE', 'NS.WARRANTY');
assert.equal(serviceChild.data?.parentNeoStackId, 'NS.SERVICE');
assert.equal(serviceChild.data?.rowInParent, 1);
assert.equal(serviceChild.data?.depth, 2);

const servicePeers = traceEvents(
  structural,
  'NEOBLOCK_SELECTION_ATTEMPTED',
  (event) => event.data?.neoStackId === 'NS.SERVICE',
);
assert.deepEqual(
  servicePeers.map((event) => event.subject?.id),
  ['NB.SERVICE.INTAKE', 'NB.SERVICE.DISPATCH'],
);
assert.deepEqual(
  servicePeers.map((event) => event.data?.rowInNeoStack),
  [1, 1],
);

const structuralShuffled = compileSleeve(structuralSleeve, structuralShuffledSelection);
assertSuccess(structuralShuffled);
assert.notDeepEqual(structuralShuffledSelection.activeNeoStackIds, structuralSelection.activeNeoStackIds);
assert.notDeepEqual(structuralShuffledSelection.activeNeoBlockIds, structuralSelection.activeNeoBlockIds);
assert.deepEqual(structuralShuffled.runtime.activeNeoStackIds, structural.runtime.activeNeoStackIds);
assert.deepEqual(resolvedNeoBlockIds(structuralShuffled), resolvedNeoBlockIds(structural));

{
  const sleeve = clone(structuralSleeve);
  const selection = clone(structuralSelection);
  const neoBlock = findNeoBlock(sleeve, 'NB.SALES.LEAD');
  neoBlock.primeDirectiveId = 'I.SALES.STEP';
  assertInvalidCompile(sleeve, selection, { codes: ['INVALID_PRIME_DIRECTIVE'], trace: 'present' });
}

{
  const sleeve = clone(mergeDirectiveSleeve);
  const selection = clone(mergeDirectiveSelection);
  const neoBlock = findNeoBlock(sleeve, 'NB.MERGE.DIRECTIVE');
  neoBlock.baseGeometry.directive[0].blockIds = ['D.MRG.PRIME', 'D.MRG.SELECTED'];
  assertInvalidCompile(sleeve, selection, {
    codes: ['DIRECTIVE_BASE_GEOMETRY_CANON_VIOLATION'],
    trace: 'present',
  });
}

{
  const sleeve = clone(mergeDirectiveSleeve);
  const selection = clone(mergeDirectiveSelection);
  const neoBlock = findNeoBlock(sleeve, 'NB.MERGE.DIRECTIVE');
  neoBlock.secondaryDirectives.push({
    id: 'SD.MRG.DIRECTIVE',
    directiveBlockId: 'D.MRG.SELECTED',
    triggerBlockId: 'T.MRG.DEFAULT',
  });
  assertInvalidCompile(sleeve, selection, { codes: ['DUPLICATE_SECONDARY_DIRECTIVE_ID'], trace: 'present' });
}

{
  const sleeve = clone(mergeDirectiveSleeve);
  const selection = clone(mergeDirectiveSelection);
  findNeoBlock(sleeve, 'NB.MERGE.DIRECTIVE').secondaryDirectives[0].directiveBlockId = 'D.MRG.PRIME';
  assertInvalidCompile(sleeve, selection, { codes: ['PRIME_AS_SECONDARY_DIRECTIVE'], trace: 'present' });
}

{
  const sleeve = clone(mergeDirectiveSleeve);
  const selection = clone(mergeDirectiveSelection);
  findNeoBlock(sleeve, 'NB.MERGE.DIRECTIVE').secondaryDirectives[0].directiveBlockId = 'I.MRG.STEP';
  assertInvalidCompile(sleeve, selection, { codes: ['INVALID_SECONDARY_DIRECTIVE_BLOCK'], trace: 'present' });
}

{
  const sleeve = clone(mergeDirectiveSleeve);
  const selection = clone(mergeDirectiveSelection);
  findNeoBlock(sleeve, 'NB.MERGE.DIRECTIVE').secondaryDirectives[0].triggerBlockId = 'I.MRG.STEP';
  assertInvalidCompile(sleeve, selection, { codes: ['INVALID_SECONDARY_TRIGGER_BLOCK'], trace: 'present' });
}

{
  const sleeve = clone(mergeDirectiveSleeve);
  const selection = clone(mergeDirectiveSelection);
  findNeoBlock(sleeve, 'NB.MERGE.DIRECTIVE').secondaryDirectives.push({
    id: 'SD.MRG.DIRECTIVE.2',
    directiveBlockId: 'D.MRG.SELECTED',
    triggerBlockId: 'T.MRG.ALT',
  });
  assertInvalidCompile(sleeve, selection, { codes: ['TRIGGER_BOUND_TO_MULTIPLE_SECONDARIES'], trace: 'present' });
}

{
  const sleeve = clone(structuralSleeve);
  const selection = clone(structuralSelection);
  sleeve.moltBlocks.push({
    id: 'D.SALES.ORPHAN',
    type: 'directive',
    content: 'This non-prime directive participates in no canonical relationship.',
  });
  findNeoBlock(sleeve, 'NB.SALES.LEAD').moltBlockIds.push('D.SALES.ORPHAN');
  assertInvalidCompile(sleeve, selection, { codes: ['ORPHAN_LOCAL_DIRECTIVE'], trace: 'present' });
}

{
  const sleeve = clone(structuralSleeve);
  const selection = clone(structuralSelection);
  findNeoStack(sleeve, 'NS.ROOT').childStackRows[0].neoStackIds[0] = 'NS.UNKNOWN';
  assertInvalidCompile(sleeve, selection, { codes: ['UNKNOWN_CHILD_NEOSTACK'], trace: 'present' });
}

{
  const sleeve = clone(structuralSleeve);
  const selection = clone(structuralSelection);
  findNeoStack(sleeve, 'NS.SERVICE').childStackRows[0].neoStackIds.push('NS.SALES');
  assertInvalidCompile(sleeve, selection, { codes: ['MULTIPLE_NEOSTACK_PARENTS'], trace: 'present' });
}

{
  const sleeve = clone(structuralSleeve);
  const selection = clone(structuralSelection);
  const service = findNeoStack(sleeve, 'NS.SERVICE');
  service.childStackRows = [{ row: 1, neoStackIds: ['NS.ROOT'] }];
  const result = assertInvalidCompile(sleeve, selection, {
    codes: ['CONTROLLER_HAS_PARENT', 'NEOSTACK_CYCLE'],
    trace: 'present',
  });
  diagnostic(result, 'NEOSTACK_CYCLE');
}

{
  const sleeve = clone(structuralSleeve);
  const selection = clone(structuralSelection);
  const support = findNeoStack(sleeve, 'NS.SUPPORT');
  support.childStackRows = [{ row: 1, neoStackIds: ['NS.ROOT'] }];
  findNeoStack(sleeve, 'NS.ROOT').childStackRows[0].neoStackIds = ['NS.SALES', 'NS.SERVICE'];
  assertInvalidCompile(sleeve, selection, { codes: ['CONTROLLER_HAS_PARENT'], trace: 'present' });
}

{
  const sleeve = clone(structuralSleeve);
  const selection = clone(structuralSelection);
  findNeoStack(sleeve, 'NS.ROOT').childStackRows[0].neoStackIds = ['NS.SALES', 'NS.SERVICE'];
  const support = findNeoStack(sleeve, 'NS.SUPPORT');
  support.childStackRows = [{ row: 1, neoStackIds: ['NS.SUPPORT'] }];
  const result = assertInvalidCompile(sleeve, selection, { codes: ['NEOSTACK_CYCLE'], trace: 'present' });
  diagnostic(result, 'NEOSTACK_CYCLE');
}

{
  const sleeve = clone(structuralSleeve);
  const selection = clone(structuralSelection);
  findNeoStack(sleeve, 'NS.ROOT').childStackRows[0].neoStackIds = ['NS.SALES', 'NS.SUPPORT'];
  const service = findNeoStack(sleeve, 'NS.SERVICE');
  service.childStackRows = [{ row: 1, neoStackIds: ['NS.WARRANTY'] }];
  findNeoStack(sleeve, 'NS.WARRANTY').childStackRows = [{ row: 1, neoStackIds: ['NS.SERVICE'] }];
  const result = assertInvalidCompile(sleeve, selection, { codes: ['NEOSTACK_CYCLE'], trace: 'present' });
  diagnostic(result, 'NEOSTACK_CYCLE');
}

{
  const sleeve = clone(structuralSleeve);
  const selection = clone(structuralSelection);
  findNeoStack(sleeve, 'NS.ROOT').childStackRows[0].neoStackIds = ['NS.SALES'];
  const service = findNeoStack(sleeve, 'NS.SERVICE');
  service.childStackRows = [{ row: 1, neoStackIds: ['NS.WARRANTY'] }];
  findNeoStack(sleeve, 'NS.WARRANTY').childStackRows = [{ row: 1, neoStackIds: ['NS.SUPPORT'] }];
  findNeoStack(sleeve, 'NS.SUPPORT').childStackRows = [{ row: 1, neoStackIds: ['NS.SERVICE'] }];
  const result = assertInvalidCompile(sleeve, selection, { codes: ['NEOSTACK_CYCLE'], trace: 'present' });
  diagnostic(result, 'NEOSTACK_CYCLE');
}

{
  const sleeve = clone(structuralSleeve);
  const selection = clone(structuralSelection);
  findNeoStack(sleeve, 'NS.ROOT').childStackRows[0].neoStackIds = ['NS.SALES', 'NS.SERVICE'];
  assertInvalidCompile(sleeve, selection, { codes: ['ORPHAN_NEOSTACK'], trace: 'present' });
}

{
  const sleeve = clone(structuralSleeve);
  const selection = clone(structuralSelection);
  findNeoStack(sleeve, 'NS.ROOT').childStackRows = [{ row: 1, neoStackIds: ['NS.SALES', 'NS.SERVICE', 'NS.SUPPORT'] }];
  findNeoStack(sleeve, 'NS.BILLING').childStackRows = [{ row: 1, neoStackIds: ['NS.RETENTION'] }];
  assertInvalidCompile(sleeve, selection, { codes: ['ORPHAN_NEOSTACK'], trace: 'present' });
}

{
  const sleeve = clone(structuralSleeve);
  const selection = clone(structuralSelection);
  sleeve.controllerNeoStackId = 'NS.UNKNOWN';
  assertInvalidCompile(sleeve, selection, { codes: ['UNKNOWN_CONTROLLER_NEOSTACK'], trace: 'present' });
}

{
  const sleeve = clone(structuralSleeve);
  const selection = clone(structuralSelection);
  findNeoStack(sleeve, 'NS.ROOT').childStackRows = [
    { row: 1, neoStackIds: ['NS.SALES', 'NS.SERVICE'] },
    { row: 1, neoStackIds: ['NS.SUPPORT'] },
    { row: 2, neoStackIds: ['NS.BILLING', 'NS.RETENTION'] },
  ];
  assertInvalidCompile(sleeve, selection, { codes: ['DUPLICATE_MODULE_ROW'], trace: 'present' });
}

{
  const sleeve = clone(structuralSleeve);
  const selection = clone(structuralSelection);
  findNeoStack(sleeve, 'NS.ROOT').childStackRows = [
    { row: 1, neoStackIds: ['NS.SALES', 'NS.SERVICE', 'NS.SUPPORT'] },
    { row: 3, neoStackIds: ['NS.BILLING', 'NS.RETENTION'] },
  ];
  assertInvalidCompile(sleeve, selection, { codes: ['NONCONTIGUOUS_MODULE_ROWS'], trace: 'present' });
}

for (const row of [0, -1, 1.5]) {
  const sleeve = clone(structuralSleeve);
  const selection = clone(structuralSelection);
  findNeoStack(sleeve, 'NS.ROOT').childStackRows[0].row = row;
  assertInvalidCompile(sleeve, selection, { trace: 'null' });
}

{
  const sleeve = clone(structuralSleeve);
  const selection = clone(structuralSelection);
  findNeoStack(sleeve, 'NS.ROOT').childStackRows[0].neoStackIds = [];
  assertInvalidCompile(sleeve, selection, { trace: 'null' });
}

{
  const sleeve = clone(structuralSleeve);
  const selection = clone(structuralSelection);
  const service = findNeoStack(sleeve, 'NS.SERVICE');
  service.neoBlockRows = [
    { row: 1, neoBlockIds: ['NB.SERVICE.INTAKE'] },
    { row: 1, neoBlockIds: ['NB.SERVICE.DISPATCH'] },
  ];
  assertInvalidCompile(sleeve, selection, { codes: ['DUPLICATE_MODULE_ROW'], trace: 'present' });
}

{
  const sleeve = clone(structuralSleeve);
  const selection = clone(structuralSelection);
  const service = findNeoStack(sleeve, 'NS.SERVICE');
  service.neoBlockRows = [
    { row: 1, neoBlockIds: ['NB.SERVICE.INTAKE'] },
    { row: 3, neoBlockIds: ['NB.SERVICE.DISPATCH'] },
  ];
  assertInvalidCompile(sleeve, selection, { codes: ['NONCONTIGUOUS_MODULE_ROWS'], trace: 'present' });
}

for (const row of [0, -1, 1.5]) {
  const sleeve = clone(structuralSleeve);
  const selection = clone(structuralSelection);
  findNeoStack(sleeve, 'NS.SERVICE').neoBlockRows[0].row = row;
  assertInvalidCompile(sleeve, selection, { trace: 'null' });
}

{
  const sleeve = clone(structuralSleeve);
  const selection = clone(structuralSelection);
  findNeoStack(sleeve, 'NS.SERVICE').neoBlockRows[0].neoBlockIds = [];
  assertInvalidCompile(sleeve, selection, { trace: 'null' });
}

{
  const sleeve = clone(structuralSleeve);
  const selection = clone(structuralSelection);
  sleeve.moltBlocks.push(
    { id: 'T.SUPPORT.FILLER.DEFAULT', type: 'trigger', content: 'Support filler route is active.' },
    { id: 'D.SUPPORT.FILLER.PRIME', type: 'directive', content: 'Keep the Support row structurally populated.' },
    { id: 'I.SUPPORT.FILLER.STEP', type: 'instruction', content: 'Support filler instruction.' },
    { id: 'S.SUPPORT.FILLER.REQUEST', type: 'subject', content: 'Support filler request.' },
    { id: 'P.SUPPORT.FILLER.OUTCOME', type: 'primary', content: 'Support filler outcome.' },
  );
  sleeve.neoBlocks.push({
    id: 'NB.SUPPORT.FILLER',
    name: 'Support Filler',
    moltBlockIds: [
      'T.SUPPORT.FILLER.DEFAULT',
      'D.SUPPORT.FILLER.PRIME',
      'I.SUPPORT.FILLER.STEP',
      'S.SUPPORT.FILLER.REQUEST',
      'P.SUPPORT.FILLER.OUTCOME',
    ],
    primeDirectiveId: 'D.SUPPORT.FILLER.PRIME',
    baseGeometry: {
      trigger: [{ row: 1, blockIds: ['T.SUPPORT.FILLER.DEFAULT'] }],
      directive: [{ row: 1, blockIds: ['D.SUPPORT.FILLER.PRIME'] }],
      instruction: [{ row: 1, blockIds: ['I.SUPPORT.FILLER.STEP'] }],
      subject: [{ row: 1, blockIds: ['S.SUPPORT.FILLER.REQUEST'] }],
      primary: [{ row: 1, blockIds: ['P.SUPPORT.FILLER.OUTCOME'] }],
    },
  });
  findNeoStack(sleeve, 'NS.SUPPORT').neoBlockRows[0].neoBlockIds = ['NB.SUPPORT.FILLER'];
  assertInvalidCompile(sleeve, selection, { codes: ['NEOBLOCK_WITHOUT_NEOSTACK'], trace: 'present' });
}

{
  const sleeve = clone(structuralSleeve);
  const selection = clone(structuralSelection);
  findNeoStack(sleeve, 'NS.SUPPORT').neoBlockRows[0].neoBlockIds.push('NB.SALES.LEAD');
  assertInvalidCompile(sleeve, selection, { codes: ['NEOBLOCK_IN_MULTIPLE_NEOSTACKS'], trace: 'present' });
}

console.log('UMG compiler-vnext directive/geometry contract tests: PASS');
