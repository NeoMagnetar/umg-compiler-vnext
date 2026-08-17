import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileSleeve, TRACE_EVENT_REGISTRY } from '../dist/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

function json(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

function compileFixture(sleevePath, selectionPath) {
  return compileSleeve(json(sleevePath), json(selectionPath));
}

function assertSuccess(result) {
  assert.equal(result.status, 'success');
  assert.equal(result.hasErrors, false);
  assert.ok(result.runtime);
  assert.ok(result.trace);
  assert.deepEqual(result.diagnostics, result.trace.diagnostics);
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.level === 'error'), false);
}

function traceEvent(result, type, subjectId) {
  const match = result.trace.events.find(
    (event) => event.type === type && event.subject?.id === subjectId,
  );
  assert.ok(match, `missing trace event ${type} for ${subjectId}`);
  return match;
}

function assertExactTraceEvent(result, expected) {
  const event = traceEvent(result, expected.type, expected.subject.id);
  assert.equal(event.type, expected.type);
  assert.equal(event.stage, expected.stage);
  assert.deepEqual(event.subject, expected.subject);
  for (const [key, value] of Object.entries(expected.data)) {
    assert.deepEqual(event.data[key], value, `${expected.type} data.${key}`);
  }
  return event;
}

const HISTORICAL_C1_DIRECT_EVENTS = [
  'BASE_GEOMETRY_APPLIED',
  'BUNDLE_APPLIED',
  'GEOMETRY_RESOLVED',
  'GOVERNANCE_RULE_APPLIED',
  'MERGE_VALIDATED',
  'MOLT_READY',
  'NEOBLOCK_ACTIVE',
  'NEOBLOCK_OFF',
  'NEOBLOCK_READY',
  'NEOBLOCK_RESOLUTION_FAILED',
  'NEOBLOCK_SELECTION_ATTEMPTED',
  'NEOBLOCK_SELECTION_BLOCKED',
  'NEOSTACK_ACTIVE',
  'NEOSTACK_OFF',
  'NEOSTACK_READY',
  'NEOSTACK_SELECTION_BLOCKED',
  'OVERLAY_APPLIED',
  'POST_RUN_RESET_DECLARED',
  'PRIME_DIRECTIVE_APPLIED',
  'RESOLUTION_ERROR',
  'RESOLUTION_WARNING',
  'ROUTE_SELECTION_RECEIVED',
  'RUNTIME_COMPILED',
  'SCOPED_MOLT_APPLIED',
  'SECONDARY_DIRECTIVE_SELECTED',
  'SOURCE_VALIDATED',
  'TRIGGER_EVALUATED',
  'VALIDATION_ERROR',
  'VALIDATION_WARNING',
];

const POST_C1_DIRECT_EVENTS = [
  'NEOBLOCK_SELECTION_ATTEMPTED',
  'NEOBLOCK_SELECTION_BLOCKED',
];
const NEW_C2B_DIRECT_EVENTS = new Set();

const disabledSales = compileFixture(
  'fixtures/dealership.sleeve.json',
  'fixtures/requests/disabled-sales.selection.json',
);
assertSuccess(disabledSales);

assertExactTraceEvent(disabledSales, {
  type: 'NEOSTACK_DISABLED',
  stage: 'resolution',
  subject: { kind: 'neostack', id: 'NS.SALES' },
  data: {
    depth: 1,
    parentNeoStackId: 'NS.CONTROLLER',
    rowInParent: 1,
  },
});
NEW_C2B_DIRECT_EVENTS.add('NEOSTACK_DISABLED');

assertExactTraceEvent(disabledSales, {
  type: 'NEOBLOCK_DISABLED',
  stage: 'resolution',
  subject: { kind: 'neoblock', id: 'NB.SALES.TRADE_IN' },
  data: {
    neoStackId: 'NS.SALES',
    rowInNeoStack: 1,
  },
});
NEW_C2B_DIRECT_EVENTS.add('NEOBLOCK_DISABLED');

assert.equal(disabledSales.trace.finalNeoStackStates['NS.SALES'], 'disabled');
assert.equal(disabledSales.trace.finalNeoBlockStates['NB.SALES.TRADE_IN'], 'disabled');
assert.equal(disabledSales.runtime.activeNeoStackIds.includes('NS.SALES'), false);
assert.equal(disabledSales.runtime.resetPlan.neoStackIds.includes('NS.SALES'), false);
assert.equal(disabledSales.runtime.resetPlan.neoBlockIds.includes('NB.SALES.TRADE_IN'), false);

assert.deepEqual([...NEW_C2B_DIRECT_EVENTS].sort(), [
  'NEOBLOCK_DISABLED',
  'NEOSTACK_DISABLED',
]);

const registryEvents = Object.keys(TRACE_EVENT_REGISTRY).sort();
const directUnion = new Set([
  ...HISTORICAL_C1_DIRECT_EVENTS,
  ...POST_C1_DIRECT_EVENTS,
  ...NEW_C2B_DIRECT_EVENTS,
]);
const unknownDirectEvents = [...directUnion].filter((type) => !Object.hasOwn(TRACE_EVENT_REGISTRY, type)).sort();
const remainingEvents = registryEvents.filter((type) => !directUnion.has(type));

assert.equal(registryEvents.length, 31);
assert.equal(HISTORICAL_C1_DIRECT_EVENTS.length, 29);
assert.equal(POST_C1_DIRECT_EVENTS.length, 2);
assert.equal(NEW_C2B_DIRECT_EVENTS.size, 2);
assert.equal(directUnion.size, registryEvents.length);
assert.deepEqual(unknownDirectEvents, []);
assert.deepEqual(remainingEvents, []);

console.log('UMG compiler-vnext trace emission coverage: PASS');
