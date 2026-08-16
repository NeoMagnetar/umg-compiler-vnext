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

function diagnostic(result, code, predicate = () => true) {
  const match = result.diagnostics.find(
    (item) => item.code === code && item.level === 'error' && predicate(item),
  );
  assert.ok(match, `missing diagnostic ${code}`);
  return match;
}

function traceEvent(result, type, predicate = () => true) {
  const match = result.trace?.events.find((event) => event.type === type && predicate(event));
  assert.ok(match, `missing trace event ${type}`);
  return match;
}

function traceEvents(result, type, predicate = () => true) {
  return result.trace?.events.filter((event) => event.type === type && predicate(event)) ?? [];
}

function traceSubjectId(event) {
  return event.subject?.id;
}

function assertGovernanceProvenance(
  data,
  governanceRuleIds,
  {
    directGovernanceRuleIds,
    inheritedGovernanceRuleIds,
    inheritedFromId,
    blockingReason,
    blockingSource,
  } = {},
) {
  assert.ok(data, 'missing provenance data');
  assert.deepEqual(data.governanceRuleIds, governanceRuleIds);
  assert.equal(data.governanceRuleId, governanceRuleIds[0]);
  if (directGovernanceRuleIds !== undefined) {
    assert.deepEqual(data.directGovernanceRuleIds, directGovernanceRuleIds);
  }
  if (inheritedGovernanceRuleIds !== undefined) {
    assert.deepEqual(data.inheritedGovernanceRuleIds, inheritedGovernanceRuleIds);
  }
  if (inheritedFromId !== undefined) {
    assert.equal(data.inheritedFromId, inheritedFromId);
  }
  if (blockingReason !== undefined) {
    assert.equal(data.blockingReason, blockingReason);
  }
  if (blockingSource !== undefined) {
    assert.equal(data.blockingSource, blockingSource);
  }
}

const stateSleeve = json('fixtures/state-selection.sleeve.json');
const closedSelection = json('fixtures/requests/state-selection-closed.selection.json');
const bundleOverlaySleeve = json('fixtures/bundle-overlay.sleeve.json');
const bundleOverlayBaseSelection = json('fixtures/requests/bundle-overlay-base.selection.json');
const bundleOverlaySecondaryBSelection = json('fixtures/requests/bundle-overlay-secondary-b.selection.json');
const bundleOverlayOverlaysAbSelection = json('fixtures/requests/bundle-overlay-overlays-ab.selection.json');
const mergeSleeve = json('fixtures/merge-contract.sleeve.json');
const mergeBaseSelection = json('fixtures/requests/merge-contract-base.selection.json');

{
  const withoutGovernance = clone(bundleOverlaySleeve);
  delete withoutGovernance.governance;
  const withDeclared = compileSleeve(bundleOverlaySleeve, bundleOverlayBaseSelection);
  const withoutDeclared = compileSleeve(withoutGovernance, bundleOverlayBaseSelection);
  assertSuccess(withDeclared);
  assertSuccess(withoutDeclared);
  assert.equal(withDeclared.runtime.runtimeHash, withoutDeclared.runtime.runtimeHash);
  assert.equal(canonicalize(withDeclared.runtime), canonicalize(withoutDeclared.runtime));
}

{
  const sleeve = clone(stateSleeve);
  sleeve.governance.push({
    id: 'GOV.EMPTY',
    name: 'Empty Rule',
    description: 'No targets.',
    offNeoStackIds: [],
    offNeoBlockIds: [],
  });
  assertInvalidCompile(sleeve, closedSelection, ['GOVERNANCE_RULE_NO_TARGETS']);
}

{
  const sleeve = clone(stateSleeve);
  sleeve.governance[0].offNeoStackIds = ['NS.UNKNOWN'];
  assertInvalidCompile(sleeve, closedSelection, ['UNKNOWN_GOVERNANCE_NEOSTACK_TARGET']);
}

{
  const sleeve = clone(stateSleeve);
  sleeve.governance[1].offNeoBlockIds = ['NB.UNKNOWN'];
  assertInvalidCompile(sleeve, closedSelection, ['UNKNOWN_GOVERNANCE_NEOBLOCK_TARGET']);
}

{
  const selection = clone(closedSelection);
  selection.activeGovernanceRuleIds = ['GOV.UNKNOWN'];
  assertFailure(compileSleeve(stateSleeve, selection), {
    codes: ['UNKNOWN_ACTIVE_GOVERNANCE_RULE'],
    trace: 'present',
  });
}

{
  const selection = clone(closedSelection);
  selection.activeGovernanceRuleIds = ['GOV.PARENT.OFF', 'GOV.PARENT.OFF'];
  assertFailure(compileSleeve(stateSleeve, selection), {
    codes: ['STRUCTURAL_SCHEMA_VIOLATION'],
    trace: 'null',
  });
}

{
  const sleeve = clone(stateSleeve);
  sleeve.governance.push({
    id: 'GOV.PARENT.RIGHT.OFF.2',
    name: 'Second Right Peer OFF Rule',
    description: 'Also turns the unselected right peer NeoBlock OFF.',
    offNeoBlockIds: ['NB.PARENT.RIGHT'],
  });
  const selection = clone(closedSelection);
  selection.activeGovernanceRuleIds = ['GOV.PARENT.RIGHT.OFF', 'GOV.PARENT.RIGHT.OFF.2'];
  const result = compileSleeve(sleeve, selection);
  assertSuccess(result);
  assert.equal(result.trace.finalNeoBlockStates['NB.PARENT.RIGHT'], 'off');
  assert.ok(!result.runtime.resolvedNeoBlocks.some((neoBlock) => neoBlock.id === 'NB.PARENT.RIGHT'));
  assertGovernanceProvenance(
    traceEvent(result, 'NEOBLOCK_OFF', (event) => traceSubjectId(event) === 'NB.PARENT.RIGHT').data,
    ['GOV.PARENT.RIGHT.OFF', 'GOV.PARENT.RIGHT.OFF.2'],
    {
      directGovernanceRuleIds: ['GOV.PARENT.RIGHT.OFF', 'GOV.PARENT.RIGHT.OFF.2'],
      blockingReason: 'governance_off',
      blockingSource: 'governance',
    },
  );
}

{
  const sleeve = clone(bundleOverlaySleeve);
  sleeve.governance.push(
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
    {
      id: 'GOV.SIBLING.BLOCK.C',
      name: 'Sibling Block Off C',
      description: 'Also turns the unselected sibling NeoBlock OFF.',
      offNeoBlockIds: ['NB.SIBLING'],
    },
  );
  const selectionA = clone(bundleOverlayBaseSelection);
  selectionA.activeGovernanceRuleIds = ['GOV.SIBLING.BLOCK.A', 'GOV.SIBLING.STACK.B', 'GOV.SIBLING.BLOCK.C'];
  const selectionB = clone(bundleOverlayBaseSelection);
  selectionB.activeGovernanceRuleIds = ['GOV.SIBLING.BLOCK.C', 'GOV.SIBLING.BLOCK.A', 'GOV.SIBLING.STACK.B'];
  const resultA = compileSleeve(sleeve, selectionA);
  const resultB = compileSleeve(sleeve, selectionB);
  assertSuccess(resultA);
  assertSuccess(resultB);
  assert.equal(resultA.runtime.runtimeHash, resultB.runtime.runtimeHash);
  assert.equal(canonicalize(resultA.runtime), canonicalize(resultB.runtime));
  const expectedAppliedOrder = ['GOV.SIBLING.BLOCK.A', 'GOV.SIBLING.STACK.B', 'GOV.SIBLING.BLOCK.C'];
  assert.deepEqual(traceEvents(resultA, 'GOVERNANCE_RULE_APPLIED').map(traceSubjectId), expectedAppliedOrder);
  assert.deepEqual(traceEvents(resultB, 'GOVERNANCE_RULE_APPLIED').map(traceSubjectId), expectedAppliedOrder);
  assertGovernanceProvenance(
    traceEvent(resultA, 'NEOBLOCK_OFF', (event) => traceSubjectId(event) === 'NB.SIBLING').data,
    expectedAppliedOrder,
    {
      directGovernanceRuleIds: ['GOV.SIBLING.BLOCK.A', 'GOV.SIBLING.BLOCK.C'],
      inheritedGovernanceRuleIds: ['GOV.SIBLING.STACK.B'],
      inheritedFromId: 'NS.SIBLING',
      blockingReason: 'governance_off',
      blockingSource: 'governance',
    },
  );
  assertGovernanceProvenance(
    traceEvent(resultB, 'NEOBLOCK_OFF', (event) => traceSubjectId(event) === 'NB.SIBLING').data,
    expectedAppliedOrder,
    {
      directGovernanceRuleIds: ['GOV.SIBLING.BLOCK.A', 'GOV.SIBLING.BLOCK.C'],
      inheritedGovernanceRuleIds: ['GOV.SIBLING.STACK.B'],
      inheritedFromId: 'NS.SIBLING',
      blockingReason: 'governance_off',
      blockingSource: 'governance',
    },
  );
}

{
  const baseSelection = clone(bundleOverlayBaseSelection);
  baseSelection.activeNeoStackIds = ['NS.ROOT'];
  baseSelection.activeNeoBlockIds = ['NB.ROOT'];

  const sleeveA = clone(bundleOverlaySleeve);
  sleeveA.governance = [
    {
      id: 'GOV.REORDER.STACKS',
      name: 'Reordered Stack Targets',
      description: 'Turns two unselected NeoStacks OFF.',
      offNeoStackIds: ['NS.TARGET', 'NS.SIBLING'],
    },
  ];
  const sleeveB = clone(sleeveA);
  sleeveB.governance[0].offNeoStackIds = ['NS.SIBLING', 'NS.TARGET'];

  const resultA = compileSleeve(sleeveA, baseSelection);
  const resultB = compileSleeve(sleeveB, baseSelection);
  assertSuccess(resultA);
  assertSuccess(resultB);
  assert.equal(resultA.runtime.runtimeHash, resultB.runtime.runtimeHash);
  assert.equal(canonicalize(resultA.runtime), canonicalize(resultB.runtime));
  assert.deepEqual(resultA.trace.finalNeoStackStates, resultB.trace.finalNeoStackStates);
  assert.deepEqual(resultA.trace.finalNeoBlockStates, resultB.trace.finalNeoBlockStates);
}

{
  const selection = clone(closedSelection);
  selection.activeGovernanceRuleIds = ['GOV.PARENT.OFF'];
  selection.activeNeoStackIds = ['NS.ROOT', 'NS.PARENT'];
  selection.activeNeoBlockIds = ['NB.ROOT.ROUTE'];
  delete selection.triggerState['T.PARENT.LEFT.DEFAULT'];
  delete selection.triggerState['T.CHILD.DEFAULT'];
  const result = compileSleeve(stateSleeve, selection);
  assertFailure(result, { codes: ['SELECTION_TARGET_NOT_EXECUTABLE'], trace: 'present' });
  const issue = diagnostic(
    result,
    'SELECTION_TARGET_NOT_EXECUTABLE',
    (item) => item.details?.targetId === 'NS.PARENT' && item.details?.targetKind === 'neostack',
  );
  assertGovernanceProvenance(issue.details, ['GOV.PARENT.OFF'], {
    directGovernanceRuleIds: ['GOV.PARENT.OFF'],
    blockingReason: 'governance_off',
    blockingSource: 'governance',
  });
}

{
  const selection = clone(closedSelection);
  selection.activeGovernanceRuleIds = ['GOV.PARENT.OFF'];
  const result = compileSleeve(stateSleeve, selection);
  assertFailure(result, { codes: ['SELECTION_TARGET_NOT_EXECUTABLE'], trace: 'present' });
  const issue = diagnostic(
    result,
    'SELECTION_TARGET_NOT_EXECUTABLE',
    (item) => item.details?.targetId === 'NS.CHILD' && item.details?.targetKind === 'neostack',
  );
  assertGovernanceProvenance(issue.details, ['GOV.PARENT.OFF'], {
    inheritedGovernanceRuleIds: ['GOV.PARENT.OFF'],
    inheritedFromId: 'NS.PARENT',
    blockingReason: 'ancestor_governance_off',
    blockingSource: 'ancestor',
  });
}

{
  const sleeve = clone(stateSleeve);
  sleeve.governance.push({
    id: 'GOV.CHILD.OFF',
    name: 'Child OFF Rule',
    description: 'Turns the child NeoStack OFF directly.',
    offNeoStackIds: ['NS.CHILD'],
  });
  const selection = clone(closedSelection);
  selection.activeGovernanceRuleIds = ['GOV.PARENT.OFF', 'GOV.CHILD.OFF'];
  const result = compileSleeve(sleeve, selection);
  assertFailure(result, { codes: ['SELECTION_TARGET_NOT_EXECUTABLE'], trace: 'present' });
  const issue = diagnostic(
    result,
    'SELECTION_TARGET_NOT_EXECUTABLE',
    (item) => item.details?.targetId === 'NS.CHILD' && item.details?.targetKind === 'neostack',
  );
  assertGovernanceProvenance(issue.details, ['GOV.PARENT.OFF', 'GOV.CHILD.OFF'], {
    directGovernanceRuleIds: ['GOV.CHILD.OFF'],
    inheritedGovernanceRuleIds: ['GOV.PARENT.OFF'],
    inheritedFromId: 'NS.PARENT',
    blockingReason: 'governance_off',
    blockingSource: 'governance',
  });
  assertGovernanceProvenance(
    traceEvent(result, 'NEOSTACK_OFF', (event) => traceSubjectId(event) === 'NS.CHILD').data,
    ['GOV.PARENT.OFF', 'GOV.CHILD.OFF'],
    {
      directGovernanceRuleIds: ['GOV.CHILD.OFF'],
      inheritedGovernanceRuleIds: ['GOV.PARENT.OFF'],
      inheritedFromId: 'NS.PARENT',
      blockingReason: 'governance_off',
      blockingSource: 'governance',
    },
  );
}

{
  const selection = clone(closedSelection);
  selection.activeNeoStackIds = ['NS.ROOT', 'NS.PARENT'];
  selection.activeNeoBlockIds = ['NB.ROOT.ROUTE', 'NB.PARENT.RIGHT'];
  selection.activeGovernanceRuleIds = ['GOV.PARENT.RIGHT.OFF'];
  selection.triggerState['T.PARENT.RIGHT.DEFAULT'] = true;
  delete selection.triggerState['T.PARENT.LEFT.DEFAULT'];
  delete selection.triggerState['T.CHILD.DEFAULT'];
  const result = compileSleeve(stateSleeve, selection);
  assertFailure(result, { codes: ['SELECTION_TARGET_NOT_EXECUTABLE'], trace: 'present' });
  const issue = diagnostic(
    result,
    'SELECTION_TARGET_NOT_EXECUTABLE',
    (item) => item.details?.targetId === 'NB.PARENT.RIGHT' && item.details?.targetKind === 'neoblock',
  );
  assertGovernanceProvenance(issue.details, ['GOV.PARENT.RIGHT.OFF'], {
    directGovernanceRuleIds: ['GOV.PARENT.RIGHT.OFF'],
    blockingReason: 'governance_off',
    blockingSource: 'governance',
  });
}

{
  const selection = clone(closedSelection);
  selection.activeNeoStackIds = ['NS.ROOT', 'NS.PARENT'];
  selection.activeNeoBlockIds = ['NB.ROOT.ROUTE', 'NB.PARENT.LEFT'];
  selection.activeGovernanceRuleIds = ['GOV.PARENT.OFF'];
  delete selection.triggerState['T.CHILD.DEFAULT'];
  const result = compileSleeve(stateSleeve, selection);
  assertFailure(result, { codes: ['SELECTION_TARGET_NOT_EXECUTABLE'], trace: 'present' });
  const issue = diagnostic(
    result,
    'SELECTION_TARGET_NOT_EXECUTABLE',
    (item) => item.details?.targetId === 'NB.PARENT.LEFT' && item.details?.targetKind === 'neoblock',
  );
  assertGovernanceProvenance(issue.details, ['GOV.PARENT.OFF'], {
    inheritedGovernanceRuleIds: ['GOV.PARENT.OFF'],
    inheritedFromId: 'NS.PARENT',
    blockingReason: 'container_neostack_off',
    blockingSource: 'governance',
  });
}

{
  const sleeve = clone(stateSleeve);
  sleeve.governance.push({
    id: 'GOV.CHILD.BLOCK.OFF',
    name: 'Child Descendant Block OFF Rule',
    description: 'Turns the child descendant NeoBlock OFF directly.',
    offNeoBlockIds: ['NB.CHILD.DESCENDANT'],
  });
  const selection = clone(closedSelection);
  selection.activeGovernanceRuleIds = ['GOV.PARENT.OFF', 'GOV.CHILD.BLOCK.OFF'];
  const result = compileSleeve(sleeve, selection);
  assertFailure(result, { codes: ['SELECTION_TARGET_NOT_EXECUTABLE'], trace: 'present' });
  const issue = diagnostic(
    result,
    'SELECTION_TARGET_NOT_EXECUTABLE',
    (item) => item.details?.targetId === 'NB.CHILD.DESCENDANT' && item.details?.targetKind === 'neoblock',
  );
  assertGovernanceProvenance(issue.details, ['GOV.PARENT.OFF', 'GOV.CHILD.BLOCK.OFF'], {
    directGovernanceRuleIds: ['GOV.CHILD.BLOCK.OFF'],
    inheritedGovernanceRuleIds: ['GOV.PARENT.OFF'],
    inheritedFromId: 'NS.CHILD',
    blockingReason: 'governance_off',
    blockingSource: 'governance',
  });
}

{
  const selectionA = clone(closedSelection);
  selectionA.activeNeoStackIds = ['NS.ROOT', 'NS.PARENT'];
  selectionA.activeNeoBlockIds = ['NB.ROOT.ROUTE', 'NB.PARENT.RIGHT'];
  selectionA.activeGovernanceRuleIds = ['GOV.PARENT.RIGHT.OFF'];
  selectionA.disabledNeoBlockIds = ['NB.PARENT.RIGHT'];
  selectionA.triggerState['T.PARENT.RIGHT.DEFAULT'] = true;
  delete selectionA.triggerState['T.PARENT.LEFT.DEFAULT'];
  delete selectionA.triggerState['T.CHILD.DEFAULT'];
  const resultA = compileSleeve(stateSleeve, selectionA);
  assertFailure(resultA, { codes: ['SELECTION_TARGET_NOT_EXECUTABLE'], trace: 'present' });
  const issueA = diagnostic(
    resultA,
    'SELECTION_TARGET_NOT_EXECUTABLE',
    (item) => item.details?.targetId === 'NB.PARENT.RIGHT' && item.details?.targetKind === 'neoblock',
  );
  assert.equal(issueA.details?.effectiveState, 'off');
  assertGovernanceProvenance(issueA.details, ['GOV.PARENT.RIGHT.OFF'], {
    directGovernanceRuleIds: ['GOV.PARENT.RIGHT.OFF'],
    blockingReason: 'governance_off',
    blockingSource: 'governance',
  });

  const selectionB = clone(selectionA);
  selectionB.activeGovernanceRuleIds = [];
  const resultB = compileSleeve(stateSleeve, selectionB);
  assertFailure(resultB, { codes: ['SELECTION_TARGET_NOT_EXECUTABLE'], trace: 'present' });
  const issueB = diagnostic(
    resultB,
    'SELECTION_TARGET_NOT_EXECUTABLE',
    (item) => item.details?.targetId === 'NB.PARENT.RIGHT' && item.details?.targetKind === 'neoblock',
  );
  assert.equal(issueB.details?.effectiveState, 'disabled');
  assert.equal(issueB.details?.blockingReason, 'human_disabled');
}

{
  const selection = clone(bundleOverlayBaseSelection);
  selection.activeNeoStackIds = ['NS.ROOT', 'NS.TARGET', 'NS.DESC', 'NS.SIBLING'];
  selection.activeNeoBlockIds = ['NB.ROOT', 'NB.TARGET', 'NB.DESC', 'NB.SIBLING'];
  selection.activeGovernanceRuleIds = ['GOV.TARGET.OFF'];
  selection.triggerState['T.TARGET.DEFAULT'] = true;
  selection.triggerState['T.TARGET.B'] = false;
  selection.triggerState['T.SIBLING.DEFAULT'] = true;
  const result = compileSleeve(bundleOverlaySleeve, selection);
  assertFailure(result, { codes: ['SELECTION_TARGET_NOT_EXECUTABLE'], trace: 'present' });
  assert.equal(result.trace.finalNeoStackStates['NS.TARGET'], 'active');
  assert.equal(result.trace.finalNeoStackStates['NS.DESC'], 'active');
  assert.equal(result.trace.finalNeoStackStates['NS.SIBLING'], 'active');
  assert.equal(result.trace.finalNeoBlockStates['NB.TARGET'], 'off');
  assert.equal(result.trace.finalNeoBlockStates['NB.DESC'], 'active');
  assert.equal(result.trace.finalNeoBlockStates['NB.SIBLING'], 'active');
}

{
  const sleeve = clone(stateSleeve);
  sleeve.governance.push({
    id: 'GOV.ROOT.OFF',
    name: 'Controller OFF Rule',
    description: 'Turns the controller NeoStack OFF.',
    offNeoStackIds: ['NS.ROOT'],
  });
  const selection = clone(closedSelection);
  selection.activeGovernanceRuleIds = ['GOV.ROOT.OFF'];
  const result = compileSleeve(sleeve, selection);
  assertFailure(result, { codes: ['SELECTION_TARGET_NOT_EXECUTABLE'], trace: 'present' });
  const issue = diagnostic(
    result,
    'SELECTION_TARGET_NOT_EXECUTABLE',
    (item) => item.details?.targetId === 'NS.ROOT' && item.details?.targetKind === 'neostack',
  );
  assertGovernanceProvenance(issue.details, ['GOV.ROOT.OFF'], {
    directGovernanceRuleIds: ['GOV.ROOT.OFF'],
    blockingReason: 'governance_off',
    blockingSource: 'governance',
  });
  assert.equal(result.trace.finalNeoStackStates['NS.ROOT'], 'off');
  assert.equal(result.trace.finalNeoStackStates['NS.PARENT'], 'off');
  assert.equal(result.trace.finalNeoStackStates['NS.CHILD'], 'off');
}

{
  const selection = clone(bundleOverlaySecondaryBSelection);
  selection.activeOverlayIds = ['OV.A', 'OV.B'];
  selection.activeGovernanceRuleIds = ['GOV.TARGET.OFF'];
  const result = compileSleeve(bundleOverlaySleeve, selection);
  assertFailure(result, { codes: ['SELECTION_TARGET_NOT_EXECUTABLE'], trace: 'present' });
  assert.equal(
    traceEvents(result, 'BUNDLE_APPLIED', (event) => event.data?.neoBlockId === 'NB.TARGET').length,
    0,
  );
  assert.equal(
    traceEvents(result, 'OVERLAY_APPLIED', (event) => event.data?.neoBlockId === 'NB.TARGET').length,
    0,
  );
  assert.equal(
    traceEvents(result, 'SCOPED_MOLT_APPLIED', (event) => event.data?.neoBlockId === 'NB.TARGET').length,
    0,
  );
}

{
  const sleeve = clone(mergeSleeve);
  sleeve.governance = [
    {
      id: 'GOV.MRG.CONTRACT.OFF',
      name: 'Merge Owner OFF Rule',
      description: 'Turns the merge owner NeoBlock OFF.',
      offNeoBlockIds: ['NB.MRG.CONTRACT'],
    },
  ];
  const selection = clone(mergeBaseSelection);
  selection.activeGovernanceRuleIds = ['GOV.MRG.CONTRACT.OFF'];
  const result = compileSleeve(sleeve, selection);
  assertFailure(result, { codes: ['SELECTION_TARGET_NOT_EXECUTABLE'], trace: 'present' });
  assert.equal(
    traceEvents(result, 'MERGE_VALIDATED', (event) => event.data?.neoBlockId === 'NB.MRG.CONTRACT').length,
    0,
  );
}

console.log('UMG compiler-vnext governance contract tests: PASS');
