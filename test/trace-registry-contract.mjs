import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compileSleeve,
  TRACE_EVENT_REGISTRY,
  TRACE_STAGE_ORDER,
  traceEventRegistryAsJson,
} from '../dist/index.js';
import {
  validateCompileResultContract,
  validateTraceContract,
} from '../dist/public-output-contract.js';
import { compileCases } from './fixture-cases.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const compileCaseByName = new Map(compileCases.map((testCase) => [testCase.name, testCase]));

function json(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

function text(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function compileNamedCase(name) {
  const testCase = compileCaseByName.get(name);
  assert.ok(testCase, `unknown compile case ${name}`);
  return {
    sleeve: json(testCase.sleevePath),
    selection: json(testCase.selectionPath),
    result: compileSleeve(json(testCase.sleevePath), json(testCase.selectionPath)),
  };
}

function traceSubjectId(event) {
  return event.subject?.id;
}

function emittedTraceEventTypes() {
  const emitted = new Set();
  for (const path of ['src/compile.ts', 'src/resolve.ts']) {
    const source = text(path);
    for (const match of source.matchAll(/createTraceEvent\(\s*[^,]+,\s*'([A-Z_]+)'/g)) {
      emitted.add(match[1]);
    }
    for (const match of source.matchAll(/pushTraceEvent\(\s*[^,]+,\s*[^,]+,\s*'([A-Z_]+)'/g)) {
      emitted.add(match[1]);
    }
  }
  return [...emitted].sort();
}

function assertTraceContract(result) {
  assert.ok(result.trace, 'expected Trace to be present');
  const traceValidation = validateTraceContract(result.trace);
  assert.deepEqual(traceValidation.diagnostics, [], JSON.stringify(traceValidation.diagnostics, null, 2));
  const resultValidation = validateCompileResultContract(result);
  assert.deepEqual(resultValidation.diagnostics, [], JSON.stringify(resultValidation.diagnostics, null, 2));
}

function assertRegistryConformance(trace) {
  trace.events.forEach((event) => {
    const entry = TRACE_EVENT_REGISTRY[event.type];
    assert.ok(entry, `unregistered event type ${event.type}`);
    assert.equal(event.stage, entry.stage);
    assert.ok(entry.allowedSubjectKinds.includes(event.subject.kind));
    if (entry.subjectIdPolicy === 'required') {
      assert.ok(event.subject.id, `${event.type} must include subject.id`);
    } else if (entry.subjectIdPolicy === 'forbidden') {
      assert.equal(event.subject.id, undefined, `${event.type} must not include subject.id`);
    }
    for (const key of entry.requiredDataKeys) {
      assert.notEqual(event.data[key], undefined, `${event.type} missing data.${key}`);
    }
  });
}

function assertContiguousSeq(trace) {
  trace.events.forEach((event, index) => {
    assert.equal(event.seq, index + 1, `expected contiguous seq at event index ${index}`);
  });
}

function assertStageMonotonic(trace) {
  let previous = -1;
  trace.events.forEach((event, index) => {
    const current = TRACE_STAGE_ORDER[event.stage];
    assert.ok(current >= previous, `stage order regressed at event index ${index}`);
    previous = current;
  });
}

function assertDiagnosticLinkage(trace, stage) {
  const eventTypes =
    stage === 'semantic'
      ? new Set(['VALIDATION_ERROR', 'VALIDATION_WARNING'])
      : new Set(['RESOLUTION_ERROR', 'RESOLUTION_WARNING']);

  const expectedDiagnosticIndexes = trace.diagnostics
    .map((diagnostic, index) => ({ diagnostic, index }))
    .filter(({ diagnostic }) => diagnostic.stage === stage)
    .map(({ index }) => index);

  const actualDiagnosticIndexes = trace.events
    .filter((event) => eventTypes.has(event.type))
    .map((event) => event.data.diagnosticIndex);

  assert.deepEqual(actualDiagnosticIndexes, expectedDiagnosticIndexes);

  trace.events
    .filter((event) => eventTypes.has(event.type))
    .forEach((event) => {
      const diagnostic = trace.diagnostics[event.data.diagnosticIndex];
      assert.ok(diagnostic, `missing linked diagnostic for ${event.type}`);
      assert.equal(event.data.code, diagnostic.code);
      assert.equal(event.stage, diagnostic.stage);
      assert.deepEqual(event.subject, diagnostic.subject);
      if (stage === 'semantic') {
        assert.equal(
          event.type,
          diagnostic.level === 'error' ? 'VALIDATION_ERROR' : 'VALIDATION_WARNING',
        );
      } else {
        assert.equal(
          event.type,
          diagnostic.level === 'error' ? 'RESOLUTION_ERROR' : 'RESOLUTION_WARNING',
        );
      }
    });
}

function assertSuccessTerminal(trace) {
  assert.equal(trace.terminalStage, 'post_run');
  assert.equal(trace.events.filter((event) => event.type === 'RUNTIME_COMPILED').length, 1);
  assert.equal(trace.events.filter((event) => event.type === 'POST_RUN_RESET_DECLARED').length, 1);
  assert.equal(trace.events[trace.events.length - 2]?.type, 'RUNTIME_COMPILED');
  assert.equal(trace.events[trace.events.length - 1]?.type, 'POST_RUN_RESET_DECLARED');
}

function assertSemanticFailureTerminal(trace) {
  assert.equal(trace.terminalStage, 'semantic');
  assert.equal(trace.events.some((event) => event.stage === 'resolution'), false);
  assert.equal(trace.events.some((event) => event.type === 'RUNTIME_COMPILED'), false);
  assert.equal(trace.events.some((event) => event.type === 'POST_RUN_RESET_DECLARED'), false);
}

function assertResolutionFailureTerminal(trace) {
  assert.equal(trace.terminalStage, 'resolution');
  assert.equal(trace.events.some((event) => event.stage === 'output'), false);
  assert.equal(trace.events.some((event) => event.stage === 'post_run'), false);
  assert.equal(trace.events.some((event) => event.type === 'RUNTIME_COMPILED'), false);
  assert.equal(trace.events.some((event) => event.type === 'POST_RUN_RESET_DECLARED'), false);
}

function assertStateMapCoverage(result, sleeve) {
  assert.deepEqual(
    Object.keys(result.trace.finalNeoStackStates).sort(),
    sleeve.neoStacks.map((stack) => stack.id).sort(),
  );
  assert.deepEqual(
    Object.keys(result.trace.finalNeoBlockStates).sort(),
    sleeve.neoBlocks.map((block) => block.id).sort(),
  );
}

function assertSuccessActiveStateAgreement(result) {
  result.runtime.activeNeoStackIds.forEach((stackId) => {
    assert.equal(result.trace.finalNeoStackStates[stackId], 'active');
  });
  result.runtime.resolvedNeoBlocks.forEach((neoBlock) => {
    assert.equal(result.trace.finalNeoBlockStates[neoBlock.id], 'active');
  });
}

{
  const emittedTypes = emittedTraceEventTypes();
  const registeredTypes = Object.keys(TRACE_EVENT_REGISTRY).sort();
  const unregisteredTypes = emittedTypes.filter((type) => !Object.hasOwn(TRACE_EVENT_REGISTRY, type));
  assert.deepEqual(unregisteredTypes, []);
  assert.ok(emittedTypes.every((type) => registeredTypes.includes(type)));
}

{
  const registryJson = json('schemas/TRACE_EVENT_REGISTRY.json');
  assert.deepEqual(registryJson, traceEventRegistryAsJson());
}

const normal = compileNamedCase('normal');
const secondaryB = compileNamedCase('secondary-b');
const secondaryBOverlay = compileNamedCase('secondary-b-overlay');
const mergeDirective = compileNamedCase('merge-directive');
const routeRationale = compileNamedCase('route-rationale');

const governanceUnaffectedSleeve = json('fixtures/bundle-overlay.sleeve.json');
const governanceUnaffectedSelection = json('fixtures/requests/bundle-overlay-base.selection.json');
const governanceUnaffected = {
  sleeve: governanceUnaffectedSleeve,
  selection: governanceUnaffectedSelection,
  result: compileSleeve(governanceUnaffectedSleeve, governanceUnaffectedSelection),
};

const multiSecondary = compileNamedCase('multi-secondary-error');

const selectedGovernanceOffSelection = clone(json('fixtures/requests/state-selection-closed.selection.json'));
selectedGovernanceOffSelection.activeGovernanceRuleIds = ['GOV.PARENT.OFF'];
const selectedGovernanceOff = {
  sleeve: json('fixtures/state-selection.sleeve.json'),
  selection: selectedGovernanceOffSelection,
  result: compileSleeve(json('fixtures/state-selection.sleeve.json'), selectedGovernanceOffSelection),
};

const semanticFailure = {
  sleeve: json('fixtures/invalid/directive-secondary-in-base.sleeve.json'),
  selection: json('fixtures/requests/normal.selection.json'),
  result: compileSleeve(
    json('fixtures/invalid/directive-secondary-in-base.sleeve.json'),
    json('fixtures/requests/normal.selection.json'),
  ),
};

for (const fixture of [
  normal,
  secondaryB,
  secondaryBOverlay,
  mergeDirective,
  governanceUnaffected,
  routeRationale,
  multiSecondary,
  selectedGovernanceOff,
  semanticFailure,
]) {
  assertTraceContract(fixture.result);
  assertRegistryConformance(fixture.result.trace);
  assertContiguousSeq(fixture.result.trace);
  assertStageMonotonic(fixture.result.trace);
  assertStateMapCoverage(fixture.result, fixture.sleeve);
}

assert.equal(normal.result.status, 'success');
assert.equal(secondaryB.result.status, 'success');
assert.equal(secondaryBOverlay.result.status, 'success');
assert.equal(mergeDirective.result.status, 'success');
assert.equal(governanceUnaffected.result.status, 'success');
assert.equal(routeRationale.result.status, 'success');
assert.equal(multiSecondary.result.status, 'failure');
assert.equal(selectedGovernanceOff.result.status, 'failure');
assert.equal(semanticFailure.result.status, 'failure');

for (const successCase of [
  normal.result,
  secondaryB.result,
  secondaryBOverlay.result,
  mergeDirective.result,
  governanceUnaffected.result,
  routeRationale.result,
]) {
  assertSuccessTerminal(successCase.trace);
  assertSuccessActiveStateAgreement(successCase);
}

assertSemanticFailureTerminal(semanticFailure.result.trace);
assertResolutionFailureTerminal(multiSecondary.result.trace);
assertResolutionFailureTerminal(selectedGovernanceOff.result.trace);

assertDiagnosticLinkage(semanticFailure.result.trace, 'semantic');
assertDiagnosticLinkage(multiSecondary.result.trace, 'resolution');
assertDiagnosticLinkage(selectedGovernanceOff.result.trace, 'resolution');

assert.equal(routeRationale.result.trace.events.some((event) => event.type === 'ROUTE_SELECTION_RECEIVED'), true);
assert.equal(governanceUnaffected.result.trace.events.some((event) => event.type === 'GOVERNANCE_RULE_APPLIED'), false);
assert.equal(
  mergeDirective.result.trace.events.some(
    (event) => event.type === 'MERGE_VALIDATED' && traceSubjectId(event) === 'MRG.DIRECTIVE.CONTEXT',
  ),
  true,
);

console.log('UMG compiler-vnext trace registry contract tests: PASS');
