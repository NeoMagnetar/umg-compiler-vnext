import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileSleeve } from '../dist/index.js';

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
  assert.deepEqual(result.diagnostics, result.trace.diagnostics);
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.level === 'error'), false);
}

function assertFailure(result, { codes = [], trace = 'present' } = {}) {
  assert.equal(result.status, 'failure');
  assert.equal(result.hasErrors, true);
  assert.equal(result.runtime, null);
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.level === 'error'));
  if (trace === 'present') {
    assert.ok(result.trace);
    assert.deepEqual(result.trace.diagnostics, result.diagnostics);
  } else {
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

function traceEvent(result, type, subjectId) {
  const match = result.trace?.events.find((event) => event.type === type && event.subject?.id === subjectId);
  assert.ok(match, `missing trace event ${type} for ${subjectId}`);
  return match;
}

const stateSleeve = json('fixtures/state-selection.sleeve.json');
const closedSelection = json('fixtures/requests/state-selection-closed.selection.json');
const disabledSiblingSelection = json('fixtures/requests/state-selection-disabled-sibling.selection.json');
const offSiblingSelection = json('fixtures/requests/state-selection-off-sibling.selection.json');
const dealershipSleeve = json('fixtures/dealership.sleeve.json');
const multiSecondarySelection = json('fixtures/requests/multi-secondary-error.selection.json');

const closed = compileSleeve(stateSleeve, closedSelection);
assertSuccess(closed);
assert.deepEqual(closed.runtime.activeNeoStackIds, ['NS.ROOT', 'NS.PARENT', 'NS.CHILD']);
assert.deepEqual(
  closed.runtime.resolvedNeoBlocks.map((neoBlock) => neoBlock.id),
  ['NB.ROOT.ROUTE', 'NB.PARENT.LEFT', 'NB.CHILD.DESCENDANT'],
);
assert.equal(closed.trace.finalNeoBlockStates['NB.PARENT.RIGHT'], 'ready');
traceEvent(closed, 'NEOBLOCK_READY', 'NB.PARENT.RIGHT');

const disabledSibling = compileSleeve(stateSleeve, disabledSiblingSelection);
assertSuccess(disabledSibling);
assert.equal(disabledSibling.trace.finalNeoBlockStates['NB.PARENT.RIGHT'], 'disabled');
assert.ok(!disabledSibling.runtime.resolvedNeoBlocks.some((neoBlock) => neoBlock.id === 'NB.PARENT.RIGHT'));
assert.equal(disabledSibling.runtime.runtimeHash, closed.runtime.runtimeHash);

const offSibling = compileSleeve(stateSleeve, offSiblingSelection);
assertSuccess(offSibling);
assert.equal(offSibling.trace.finalNeoBlockStates['NB.PARENT.RIGHT'], 'off');
assert.ok(!offSibling.runtime.resolvedNeoBlocks.some((neoBlock) => neoBlock.id === 'NB.PARENT.RIGHT'));
assert.equal(offSibling.runtime.runtimeHash, closed.runtime.runtimeHash);

{
  const selection = clone(closedSelection);
  selection.activeNeoStackIds = ['NS.ROOT', 'NS.CHILD'];
  selection.activeNeoBlockIds = ['NB.ROOT.ROUTE'];
  delete selection.triggerState['T.PARENT.LEFT.DEFAULT'];
  delete selection.triggerState['T.CHILD.DEFAULT'];
  const result = compileSleeve(stateSleeve, selection);
  assertFailure(result, { codes: ['SELECTION_MISSING_ANCESTOR'] });
  const issue = diagnostic(
    result,
    'SELECTION_MISSING_ANCESTOR',
    (item) => item.details?.selectedNeoStackId === 'NS.CHILD',
  );
  assert.equal(issue.details?.missingAncestorNeoStackId, 'NS.PARENT');
  assert.deepEqual(issue.details?.expectedPath, ['NS.ROOT', 'NS.PARENT', 'NS.CHILD']);
  assert.equal(result.trace.finalNeoStackStates['NS.CHILD'], 'ready');
  traceEvent(result, 'NEOSTACK_SELECTION_BLOCKED', 'NS.CHILD');
}

{
  const selection = clone(closedSelection);
  selection.activeNeoStackIds = ['NS.ROOT'];
  selection.activeNeoBlockIds = ['NB.ROOT.ROUTE', 'NB.PARENT.LEFT'];
  delete selection.triggerState['T.CHILD.DEFAULT'];
  const result = compileSleeve(stateSleeve, selection);
  assertFailure(result, { codes: ['SELECTION_NEOBLOCK_CONTAINER_NOT_SELECTED'] });
  const issue = diagnostic(
    result,
    'SELECTION_NEOBLOCK_CONTAINER_NOT_SELECTED',
    (item) => item.details?.targetId === 'NB.PARENT.LEFT',
  );
  assert.equal(issue.details?.containerNeoStackId, 'NS.PARENT');
  assert.equal(result.trace.finalNeoBlockStates['NB.PARENT.LEFT'], 'ready');
  traceEvent(result, 'NEOBLOCK_SELECTION_BLOCKED', 'NB.PARENT.LEFT');
}

{
  const selection = clone(closedSelection);
  selection.disabledNeoStackIds = ['NS.CHILD'];
  selection.activeNeoBlockIds = ['NB.ROOT.ROUTE', 'NB.PARENT.LEFT'];
  delete selection.triggerState['T.CHILD.DEFAULT'];
  const result = compileSleeve(stateSleeve, selection);
  assertFailure(result, { codes: ['SELECTION_TARGET_NOT_EXECUTABLE'] });
  const issue = diagnostic(
    result,
    'SELECTION_TARGET_NOT_EXECUTABLE',
    (item) => item.details?.targetId === 'NS.CHILD' && item.details?.targetKind === 'neostack',
  );
  assert.equal(issue.details?.effectiveState, 'disabled');
  assert.equal(issue.details?.blockingReason, 'human_disabled');
  assert.equal(result.trace.finalNeoStackStates['NS.CHILD'], 'disabled');
  assert.notEqual(result.trace.finalNeoStackStates['NS.CHILD'], 'active');
}

{
  const selection = clone(closedSelection);
  selection.activeGovernanceRuleIds = ['GOV.PARENT.OFF'];
  selection.activeNeoStackIds = ['NS.ROOT', 'NS.PARENT'];
  selection.activeNeoBlockIds = ['NB.ROOT.ROUTE'];
  delete selection.triggerState['T.PARENT.LEFT.DEFAULT'];
  delete selection.triggerState['T.CHILD.DEFAULT'];
  const result = compileSleeve(stateSleeve, selection);
  assertFailure(result, { codes: ['SELECTION_TARGET_NOT_EXECUTABLE'] });
  const issue = diagnostic(
    result,
    'SELECTION_TARGET_NOT_EXECUTABLE',
    (item) => item.details?.targetId === 'NS.PARENT' && item.details?.targetKind === 'neostack',
  );
  assert.equal(issue.details?.effectiveState, 'off');
  assert.equal(issue.details?.blockingReason, 'governance_off');
  assert.equal(result.trace.finalNeoStackStates['NS.PARENT'], 'off');
  assert.notEqual(result.trace.finalNeoStackStates['NS.PARENT'], 'active');
}

{
  const selection = clone(closedSelection);
  selection.activeGovernanceRuleIds = ['GOV.PARENT.OFF'];
  selection.disabledNeoStackIds = ['NS.PARENT'];
  selection.activeNeoStackIds = ['NS.ROOT', 'NS.PARENT'];
  selection.activeNeoBlockIds = ['NB.ROOT.ROUTE'];
  delete selection.triggerState['T.PARENT.LEFT.DEFAULT'];
  delete selection.triggerState['T.CHILD.DEFAULT'];
  const result = compileSleeve(stateSleeve, selection);
  assertFailure(result, { codes: ['SELECTION_TARGET_NOT_EXECUTABLE'] });
  const issue = diagnostic(
    result,
    'SELECTION_TARGET_NOT_EXECUTABLE',
    (item) => item.details?.targetId === 'NS.PARENT' && item.details?.targetKind === 'neostack',
  );
  assert.equal(issue.details?.effectiveState, 'off');
  assert.equal(issue.details?.blockingReason, 'governance_off');
  assert.equal(result.trace.finalNeoStackStates['NS.PARENT'], 'off');
}

{
  const selection = clone(closedSelection);
  selection.activeGovernanceRuleIds = ['GOV.PARENT.OFF'];
  const result = compileSleeve(stateSleeve, selection);
  assertFailure(result, { codes: ['SELECTION_TARGET_NOT_EXECUTABLE'] });
  const issue = diagnostic(
    result,
    'SELECTION_TARGET_NOT_EXECUTABLE',
    (item) => item.details?.targetId === 'NS.CHILD' && item.details?.targetKind === 'neostack',
  );
  assert.equal(issue.details?.effectiveState, 'off');
  assert.equal(issue.details?.blockingReason, 'ancestor_governance_off');
  assert.equal(issue.details?.blockingSource, 'ancestor');
  assert.equal(result.trace.finalNeoStackStates['NS.CHILD'], 'off');
  assert.notEqual(result.trace.finalNeoStackStates['NS.CHILD'], 'active');
}

{
  const selection = clone(closedSelection);
  selection.disabledNeoStackIds = ['NS.PARENT'];
  const result = compileSleeve(stateSleeve, selection);
  assertFailure(result, { codes: ['SELECTION_TARGET_NOT_EXECUTABLE'] });
  const issue = diagnostic(
    result,
    'SELECTION_TARGET_NOT_EXECUTABLE',
    (item) => item.details?.targetId === 'NS.CHILD' && item.details?.targetKind === 'neostack',
  );
  assert.equal(issue.details?.effectiveState, 'disabled');
  assert.equal(issue.details?.blockingReason, 'ancestor_disabled');
  assert.equal(issue.details?.blockingSource, 'ancestor');
  assert.equal(result.trace.finalNeoStackStates['NS.CHILD'], 'disabled');
}

{
  const selection = clone(closedSelection);
  selection.activeNeoStackIds = ['NS.ROOT', 'NS.PARENT'];
  selection.activeNeoBlockIds = ['NB.ROOT.ROUTE', 'NB.PARENT.LEFT'];
  selection.disabledNeoStackIds = ['NS.PARENT'];
  delete selection.triggerState['T.CHILD.DEFAULT'];
  const result = compileSleeve(stateSleeve, selection);
  assertFailure(result, { codes: ['SELECTION_TARGET_NOT_EXECUTABLE'] });
  const issue = diagnostic(
    result,
    'SELECTION_TARGET_NOT_EXECUTABLE',
    (item) => item.details?.targetId === 'NB.PARENT.LEFT' && item.details?.targetKind === 'neoblock',
  );
  assert.equal(issue.details?.effectiveState, 'disabled');
  assert.equal(issue.details?.blockingReason, 'container_neostack_disabled');
  assert.equal(result.trace.finalNeoBlockStates['NB.PARENT.LEFT'], 'disabled');
}

{
  const selection = clone(closedSelection);
  selection.activeNeoStackIds = ['NS.ROOT', 'NS.PARENT'];
  selection.activeNeoBlockIds = ['NB.ROOT.ROUTE', 'NB.PARENT.LEFT'];
  selection.activeGovernanceRuleIds = ['GOV.PARENT.OFF'];
  delete selection.triggerState['T.CHILD.DEFAULT'];
  const result = compileSleeve(stateSleeve, selection);
  assertFailure(result, { codes: ['SELECTION_TARGET_NOT_EXECUTABLE'] });
  const issue = diagnostic(
    result,
    'SELECTION_TARGET_NOT_EXECUTABLE',
    (item) => item.details?.targetId === 'NB.PARENT.LEFT' && item.details?.targetKind === 'neoblock',
  );
  assert.equal(issue.details?.effectiveState, 'off');
  assert.equal(issue.details?.blockingReason, 'container_neostack_off');
  assert.equal(result.trace.finalNeoBlockStates['NB.PARENT.LEFT'], 'off');
}

{
  const selection = clone(closedSelection);
  selection.activeNeoStackIds = ['NS.ROOT', 'NS.PARENT'];
  selection.activeNeoBlockIds = ['NB.ROOT.ROUTE', 'NB.PARENT.LEFT'];
  selection.disabledNeoBlockIds = ['NB.PARENT.LEFT'];
  delete selection.triggerState['T.CHILD.DEFAULT'];
  const result = compileSleeve(stateSleeve, selection);
  assertFailure(result, { codes: ['SELECTION_TARGET_NOT_EXECUTABLE'] });
  const issue = diagnostic(
    result,
    'SELECTION_TARGET_NOT_EXECUTABLE',
    (item) => item.details?.targetId === 'NB.PARENT.LEFT' && item.details?.targetKind === 'neoblock',
  );
  assert.equal(issue.details?.effectiveState, 'disabled');
  assert.equal(issue.details?.blockingReason, 'human_disabled');
  assert.equal(result.trace.finalNeoBlockStates['NB.PARENT.LEFT'], 'disabled');
}

{
  const selection = clone(closedSelection);
  selection.activeNeoStackIds = ['NS.ROOT', 'NS.PARENT'];
  selection.activeNeoBlockIds = ['NB.ROOT.ROUTE', 'NB.PARENT.RIGHT'];
  selection.activeGovernanceRuleIds = ['GOV.PARENT.RIGHT.OFF'];
  delete selection.triggerState['T.CHILD.DEFAULT'];
  selection.triggerState['T.PARENT.RIGHT.DEFAULT'] = true;
  delete selection.triggerState['T.PARENT.LEFT.DEFAULT'];
  const result = compileSleeve(stateSleeve, selection);
  assertFailure(result, { codes: ['SELECTION_TARGET_NOT_EXECUTABLE'] });
  const issue = diagnostic(
    result,
    'SELECTION_TARGET_NOT_EXECUTABLE',
    (item) => item.details?.targetId === 'NB.PARENT.RIGHT' && item.details?.targetKind === 'neoblock',
  );
  assert.equal(issue.details?.effectiveState, 'off');
  assert.equal(issue.details?.blockingReason, 'governance_off');
  assert.equal(result.trace.finalNeoBlockStates['NB.PARENT.RIGHT'], 'off');
}

{
  const baselineResult = compileSleeve(dealershipSleeve, multiSecondarySelection);
  assertFailure(baselineResult, { codes: ['MULTIPLE_SECONDARY_DIRECTIVE_MATCH'] });
  const baselineIssue = diagnostic(baselineResult, 'MULTIPLE_SECONDARY_DIRECTIVE_MATCH');
  assert.match(
    baselineIssue.message,
    /does not support implicit coexistence of multiple simultaneously matching Secondary Directives/i,
  );
  assert.equal(baselineResult.trace.finalNeoBlockStates['NB.SERVICE.TRIAGE'], 'ready');

  const reorderedSecondarySelection = clone(dealershipSleeve);
  const serviceBlock = reorderedSecondarySelection.neoBlocks.find((item) => item.id === 'NB.SERVICE.TRIAGE');
  assert.ok(serviceBlock);
  assert.ok(Array.isArray(serviceBlock.secondaryDirectives));
  serviceBlock.secondaryDirectives = [...serviceBlock.secondaryDirectives].reverse();

  const reorderedResult = compileSleeve(reorderedSecondarySelection, multiSecondarySelection);
  assertFailure(reorderedResult, { codes: ['MULTIPLE_SECONDARY_DIRECTIVE_MATCH'] });
  const reorderedIssue = diagnostic(reorderedResult, 'MULTIPLE_SECONDARY_DIRECTIVE_MATCH');
  assert.match(
    reorderedIssue.message,
    /does not support implicit coexistence of multiple simultaneously matching Secondary Directives/i,
  );
  assert.equal(reorderedResult.trace.finalNeoBlockStates['NB.SERVICE.TRIAGE'], 'ready');
  assert.deepEqual(
    [...(baselineIssue.details?.secondaryDirectiveIds ?? [])].sort(),
    [...(reorderedIssue.details?.secondaryDirectiveIds ?? [])].sort(),
  );
}

{
  const selectionA = clone(closedSelection);
  selectionA.activeGovernanceRuleIds = ['GOV.PARENT.RIGHT.OFF'];
  selectionA.activeNeoStackIds = ['NS.ROOT', 'NS.PARENT'];
  selectionA.activeNeoBlockIds = ['NB.ROOT.ROUTE', 'NB.PARENT.RIGHT'];
  selectionA.disabledNeoBlockIds = ['NB.PARENT.RIGHT', 'NB.PARENT.LEFT'];
  selectionA.triggerState['T.PARENT.RIGHT.DEFAULT'] = true;
  delete selectionA.triggerState['T.PARENT.LEFT.DEFAULT'];
  delete selectionA.triggerState['T.CHILD.DEFAULT'];

  const selectionB = clone(selectionA);
  selectionB.activeNeoStackIds = ['NS.PARENT', 'NS.ROOT'];
  selectionB.activeNeoBlockIds = ['NB.PARENT.RIGHT', 'NB.ROOT.ROUTE'];
  selectionB.disabledNeoBlockIds = ['NB.PARENT.LEFT', 'NB.PARENT.RIGHT'];

  const resultA = compileSleeve(stateSleeve, selectionA);
  const resultB = compileSleeve(stateSleeve, selectionB);
  assertFailure(resultA, { codes: ['SELECTION_TARGET_NOT_EXECUTABLE'], trace: 'present' });
  const issueA = diagnostic(
    resultA,
    'SELECTION_TARGET_NOT_EXECUTABLE',
    (item) => item.details?.targetId === 'NB.PARENT.RIGHT' && item.details?.targetKind === 'neoblock',
  );
  assert.equal(issueA.details?.effectiveState, 'off');
  assert.equal(issueA.details?.blockingReason, 'governance_off');
  assertFailure(resultB, { codes: ['SELECTION_TARGET_NOT_EXECUTABLE'], trace: 'present' });
  const issueB = diagnostic(
    resultB,
    'SELECTION_TARGET_NOT_EXECUTABLE',
    (item) => item.details?.targetId === 'NB.PARENT.RIGHT' && item.details?.targetKind === 'neoblock',
  );
  assert.equal(issueB.details?.effectiveState, 'off');
  assert.equal(issueB.details?.blockingReason, 'governance_off');
  assert.equal(resultA.trace.finalNeoBlockStates['NB.PARENT.RIGHT'], 'off');
  assert.equal(resultB.trace.finalNeoBlockStates['NB.PARENT.RIGHT'], 'off');
  assert.deepEqual(resultA.trace.finalNeoStackStates, resultB.trace.finalNeoStackStates);
  assert.deepEqual(resultA.trace.finalNeoBlockStates, resultB.trace.finalNeoBlockStates);
}

console.log('UMG compiler-vnext state/selection contract tests: PASS');
