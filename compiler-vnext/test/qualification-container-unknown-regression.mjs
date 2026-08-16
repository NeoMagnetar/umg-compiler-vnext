import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileSleeve } from '../dist/index.js';
import { resolveSleeve } from '../dist/resolve.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

function json(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function errorDiagnostics(diagnostics) {
  return diagnostics.filter((diagnostic) => diagnostic.level === 'error');
}

function diagnostic(diagnostics, code, predicate = () => true) {
  const match = diagnostics.find(
    (item) => item.code === code && item.level === 'error' && predicate(item),
  );
  assert.ok(match, `missing diagnostic ${code}`);
  return match;
}

function traceEvent(events, type, subjectId, predicate = () => true) {
  const match = events.find(
    (event) => event.type === type && event.subject?.id === subjectId && predicate(event),
  );
  assert.ok(match, `missing trace event ${type} for ${subjectId}`);
  return match;
}

function withoutNeoBlockPlacement(sleeve, blockId, stackId) {
  const mutated = clone(sleeve);
  const stack = mutated.neoStacks.find((item) => item.id === stackId);
  assert.ok(stack, `missing stack ${stackId}`);
  stack.neoBlockRows = stack.neoBlockRows
    .map((row) => ({
      ...row,
      neoBlockIds: row.neoBlockIds.filter((id) => id !== blockId),
    }))
    .filter((row) => row.neoBlockIds.length > 0);
  return mutated;
}

const stateSleeve = json('fixtures/state-selection.sleeve.json');
const closedSelection = json('fixtures/requests/state-selection-closed.selection.json');

{
  const mutatedSleeve = withoutNeoBlockPlacement(stateSleeve, 'NB.PARENT.LEFT', 'NS.PARENT');
  const resolution = resolveSleeve(mutatedSleeve, closedSelection);

  assert.deepEqual(
    errorDiagnostics(resolution.diagnostics).map((item) => item.code),
    ['SELECTION_NEOBLOCK_CONTAINER_UNKNOWN'],
  );
  const issue = diagnostic(
    resolution.diagnostics,
    'SELECTION_NEOBLOCK_CONTAINER_UNKNOWN',
    (item) => item.subject?.id === 'NB.PARENT.LEFT',
  );
  assert.equal(issue.level, 'error');
  assert.equal(issue.stage, 'resolution');
  assert.deepEqual(issue.subject, { kind: 'neoblock', id: 'NB.PARENT.LEFT' });
  assert.equal(issue.details?.targetId, 'NB.PARENT.LEFT');
  assert.equal(issue.details?.targetKind, 'neoblock');
  assert.equal(issue.details?.blockingReason, 'container_unknown');
  assert.equal(issue.details?.blockingSource, 'selection');
  assert.deepEqual(
    resolution.resolvedNeoBlocks.map((neoBlock) => neoBlock.id),
    ['NB.ROOT.ROUTE', 'NB.CHILD.DESCENDANT'],
  );
  assert.notEqual(resolution.finalNeoBlockStates['NB.PARENT.LEFT'], 'active');
  assert.equal(
    resolution.events.some(
      (event) => event.type === 'NEOBLOCK_SELECTION_ATTEMPTED' && event.subject?.id === 'NB.PARENT.LEFT',
    ),
    false,
  );
  assert.equal(
    resolution.events.some(
      (event) => event.type === 'NEOBLOCK_SELECTION_BLOCKED' && event.subject?.id === 'NB.PARENT.LEFT',
    ),
    false,
  );
  assert.equal(
    resolution.events.some(
      (event) => event.subject?.id === 'NB.PARENT.LEFT' && event.data.neoStackId !== undefined,
    ),
    false,
  );
}

{
  const resolution = resolveSleeve(stateSleeve, closedSelection);
  const attempt = traceEvent(
    resolution.events,
    'NEOBLOCK_SELECTION_ATTEMPTED',
    'NB.PARENT.LEFT',
  );
  assert.equal(attempt.data.neoStackId, 'NS.PARENT');
  assert.equal(attempt.data.rowInNeoStack, 1);
}

{
  const selection = clone(closedSelection);
  selection.activeNeoStackIds = ['NS.ROOT'];
  selection.activeNeoBlockIds = ['NB.ROOT.ROUTE', 'NB.PARENT.LEFT'];

  const resolution = resolveSleeve(stateSleeve, selection);
  const issue = diagnostic(
    resolution.diagnostics,
    'SELECTION_NEOBLOCK_CONTAINER_NOT_SELECTED',
    (item) => item.details?.targetId === 'NB.PARENT.LEFT',
  );
  assert.equal(issue.details?.containerNeoStackId, 'NS.PARENT');
  const blocked = traceEvent(
    resolution.events,
    'NEOBLOCK_SELECTION_BLOCKED',
    'NB.PARENT.LEFT',
  );
  assert.equal(blocked.data.diagnosticCode, 'SELECTION_NEOBLOCK_CONTAINER_NOT_SELECTED');
  assert.equal(blocked.data.neoStackId, 'NS.PARENT');
}

{
  const mutatedSleeve = withoutNeoBlockPlacement(stateSleeve, 'NB.PARENT.LEFT', 'NS.PARENT');
  const result = compileSleeve(mutatedSleeve, closedSelection);

  assert.equal(result.status, 'failure');
  assert.equal(result.runtime, null);
  assert.ok(result.trace);
  assert.equal(result.trace.terminalStage, 'semantic');
  assert.ok(
    result.diagnostics.some((item) => item.code === 'NEOBLOCK_WITHOUT_NEOSTACK'),
    'expected NEOBLOCK_WITHOUT_NEOSTACK semantic validation to remain active',
  );
  assert.equal(
    result.diagnostics.some((item) => item.code === 'SELECTION_NEOBLOCK_CONTAINER_UNKNOWN'),
    false,
  );
}

console.log('UMG compiler-vnext qualification container-unknown regression: PASS');
