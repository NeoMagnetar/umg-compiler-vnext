import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileSleeve } from '../dist/index.js';
import {
  structurallyValidateCompileResult,
  structurallyValidateRuntimeSpec,
  structurallyValidateTrace,
} from '../dist/schema-validation.js';
import {
  validateCompileResultContract,
  validateRuntimeSpecContract,
  validateTraceContract,
} from '../dist/public-output-contract.js';
import { compileCases } from './fixture-cases.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

function json(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

const RUNTIME_SPEC_PUBLIC_FIELDS = new Set([
  'schemaVersion',
  'compilerVersion',
  'sleeveId',
  'sleeveName',
  'controllerNeoStackId',
  'compiledAt',
  'activeNeoStackIds',
  'resolvedNeoBlocks',
  'promptParts',
  'diagnostics',
  'runtimeHash',
  'resetPlan',
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertSchemaValid(result) {
  const compileResultValidation = structurallyValidateCompileResult(result);
  assert.equal(compileResultValidation.ok, true, JSON.stringify(compileResultValidation.diagnostics, null, 2));

  if (result.runtime) {
    const runtimeValidation = structurallyValidateRuntimeSpec(result.runtime);
    assert.equal(runtimeValidation.ok, true, JSON.stringify(runtimeValidation.diagnostics, null, 2));
  }

  if (result.trace) {
    const traceValidation = structurallyValidateTrace(result.trace);
    assert.equal(traceValidation.ok, true, JSON.stringify(traceValidation.diagnostics, null, 2));
  }
}

function assertRuntimeSpecPublicBoundary(result, label) {
  const unexpectedRuntimeKeys = Object.keys(result.runtime).filter((key) => !RUNTIME_SPEC_PUBLIC_FIELDS.has(key));
  assert.equal(
    unexpectedRuntimeKeys.length,
    0,
    `${label} runtime contains non-public fields: ${unexpectedRuntimeKeys.join(', ')}`,
  );
}

function assertContractValid(result) {
  const contract = validateCompileResultContract(result);
  assert.deepEqual(contract.diagnostics, [], JSON.stringify(contract.diagnostics, null, 2));

  if (result.runtime) {
    const runtimeContract = validateRuntimeSpecContract(result.runtime);
    assert.deepEqual(runtimeContract.diagnostics, [], JSON.stringify(runtimeContract.diagnostics, null, 2));
  }

  if (result.trace) {
    const traceContract = validateTraceContract(result.trace);
    assert.deepEqual(traceContract.diagnostics, [], JSON.stringify(traceContract.diagnostics, null, 2));
  }
}

const successCases = compileCases.filter((testCase) => json(testCase.expectedPath).status === 'success');
for (const testCase of successCases) {
  const expected = json(testCase.expectedPath);
  assert.equal(expected.runtime !== null, true, `${testCase.name} should retain RuntimeSpec`);
  assert.equal(expected.trace !== null, true, `${testCase.name} should retain Trace`);
  assertSchemaValid(expected);
  assertContractValid(expected);
  assertRuntimeSpecPublicBoundary(expected, `${testCase.name} fixture`);
}

const failureCases = compileCases.filter((testCase) => json(testCase.expectedPath).status === 'failure');
for (const testCase of failureCases) {
  const expected = json(testCase.expectedPath);
  assert.equal(expected.runtime, null, `${testCase.name} should not expose RuntimeSpec`);
  assert.equal(expected.trace !== null, true, `${testCase.name} should retain Trace`);
  assertSchemaValid(expected);
  assertContractValid(expected);
}

const dealershipSleeve = json('fixtures/dealership.sleeve.json');
const secondaryBSelection = json('fixtures/requests/secondary-b.selection.json');
const multiSecondarySelection = json('fixtures/requests/multi-secondary-error.selection.json');

const successResult = compileSleeve(dealershipSleeve, secondaryBSelection);
assert.equal(successResult.status, 'success');
assertContractValid(successResult);
assertRuntimeSpecPublicBoundary(successResult, 'dealership secondary-b selection');

const semanticFailure = compileSleeve(dealershipSleeve, multiSecondarySelection);
assert.equal(semanticFailure.status, 'failure');
assert.equal(semanticFailure.runtime, null);
assert.equal(semanticFailure.trace !== null, true);
assertSchemaValid(semanticFailure);
assertContractValid(semanticFailure);

const structuralFailure = compileSleeve(
  { schemaVersion: 'umg.compiler-vnext.sleeve.v0.1', id: 'SLV.STRUCTURAL.FAILURE' },
  { schemaVersion: 'umg.compiler-vnext.selection.v0.1' },
);
assert.equal(structuralFailure.status, 'failure');
assert.equal(structuralFailure.runtime, null);
assert.equal(structuralFailure.trace, null);
assertSchemaValid(structuralFailure);
assertContractValid(structuralFailure);

{
  const runtime = clone(successResult.runtime);
  delete runtime.sleeveName;
  const validation = validateRuntimeSpecContract(runtime);
  assert.ok(validation.diagnostics.length > 0);
}

{
  const runtime = clone(successResult.runtime);
  runtime.runtimeHash = 'bad';
  const validation = validateRuntimeSpecContract(runtime);
  assert.ok(validation.diagnostics.length > 0);
}

{
  const result = clone(successResult);
  result.runtime = null;
  const validation = validateCompileResultContract(result);
  assert.ok(validation.diagnostics.length > 0);
}

{
  const result = clone(successResult);
  result.trace = null;
  const validation = validateCompileResultContract(result);
  assert.ok(validation.diagnostics.length > 0);
}

{
  const result = clone(semanticFailure);
  result.runtime = clone(successResult.runtime);
  const validation = validateCompileResultContract(result);
  assert.ok(validation.diagnostics.length > 0);
}

{
  const runtime = clone(successResult.runtime);
  runtime.diagnostics = [
    {
      code: 'FORCED_RUNTIME_ERROR',
      level: 'error',
      stage: 'semantic',
      subject: { kind: 'selection' },
      message: 'forced runtime error',
    },
  ];
  const validation = validateRuntimeSpecContract(runtime);
  assert.ok(validation.diagnostics.length > 0);
}

{
  const result = clone(successResult);
  result.trace.diagnostics = [
    {
      code: 'FORCED_TRACE_WARNING',
      level: 'warning',
      stage: 'semantic',
      subject: { kind: 'selection' },
      message: 'forced trace warning',
    },
  ];
  const validation = validateCompileResultContract(result);
  assert.ok(validation.diagnostics.length > 0);
}

{
  const result = clone(successResult);
  result.runtime.diagnostics = [
    {
      code: 'FORCED_RUNTIME_WARNING',
      level: 'warning',
      stage: 'semantic',
      subject: { kind: 'selection' },
      message: 'forced runtime warning',
    },
  ];
  const validation = validateCompileResultContract(result);
  assert.ok(validation.diagnostics.length > 0);
}

{
  const runtime = clone(successResult.runtime);
  runtime.resetPlan.neoBlockIds = runtime.resetPlan.neoBlockIds.slice(1);
  const validation = validateRuntimeSpecContract(runtime);
  assert.ok(validation.diagnostics.length > 0);
}

console.log('UMG compiler-vnext public output contract tests: PASS');
