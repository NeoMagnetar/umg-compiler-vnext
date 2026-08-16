import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileSleeve, validateSleeve } from '../dist/index.js';
import {
  DIAGNOSTIC_REGISTRY,
  diagnosticRegistryAsJson,
  validateDiagnosticAgainstRegistry,
} from '../dist/diagnostic-registry.js';
import {
  internalCompilerErrorDiagnostic,
  internalOutputContractViolationDiagnostic,
} from '../dist/errors.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

function json(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

function text(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function diagnosticByCode(diagnostics, code) {
  const match = diagnostics.find((diagnostic) => diagnostic.code === code);
  assert.ok(match, `missing diagnostic ${code}`);
  return match;
}

function assertConforms(diagnostic) {
  const issues = validateDiagnosticAgainstRegistry(diagnostic);
  assert.deepEqual(issues, [], JSON.stringify({ diagnostic, issues }, null, 2));
  const entry = DIAGNOSTIC_REGISTRY[diagnostic.code];
  assert.equal(diagnostic.level, entry.level);
  assert.equal(diagnostic.stage, entry.stage);
  assert.ok(entry.allowedSubjectKinds.includes(diagnostic.subject.kind));
  for (const key of entry.requiredDetailKeys) {
    assert.notEqual(
      diagnostic.details?.[key],
      undefined,
      `diagnostic ${diagnostic.code} must include details.${key}`,
    );
  }
}

{
  const emittedCodes = new Set();
  for (const path of [
    'src/schema-validation.ts',
    'src/validate.ts',
    'src/resolve.ts',
    'src/errors.ts',
  ]) {
    const source = text(path);
    for (const match of source.matchAll(/(?:errorDiagnostic|warningDiagnostic|createDiagnostic)\(\s*'([A-Z0-9_]+)'/g)) {
      emittedCodes.add(match[1]);
    }
  }

  const unregisteredCodes = [...emittedCodes].filter((code) => !Object.hasOwn(DIAGNOSTIC_REGISTRY, code)).sort();

  assert.deepEqual(unregisteredCodes, []);
}

{
  const registryJson = json('schemas/DIAGNOSTIC_REGISTRY.json');
  assert.deepEqual(registryJson, diagnosticRegistryAsJson());
}

const dealershipSleeve = json('fixtures/dealership.sleeve.json');
const stateSleeve = json('fixtures/state-selection.sleeve.json');
const closedSelection = json('fixtures/requests/state-selection-closed.selection.json');
const semanticInvalidSleeve = json('fixtures/invalid/directive-secondary-in-base.sleeve.json');

const structuralSleeve = clone(dealershipSleeve);
structuralSleeve.unexpectedTopLevelField = true;
const structuralDiagnostic = diagnosticByCode(validateSleeve(structuralSleeve).diagnostics, 'UNKNOWN_FIELD');
assert.equal(structuralDiagnostic.stage, 'structural');
assert.equal(structuralDiagnostic.subject.kind, 'sleeve');
assertConforms(structuralDiagnostic);

const semanticDiagnostic = diagnosticByCode(
  validateSleeve(semanticInvalidSleeve).diagnostics,
  'DIRECTIVE_BASE_GEOMETRY_CANON_VIOLATION',
);
assert.equal(semanticDiagnostic.stage, 'semantic');
assert.equal(semanticDiagnostic.subject.kind, 'neoblock');
assertConforms(semanticDiagnostic);

const resolutionSelection = clone(closedSelection);
resolutionSelection.disabledNeoStackIds = ['NS.CHILD'];
resolutionSelection.activeNeoBlockIds = ['NB.ROOT.ROUTE', 'NB.PARENT.LEFT'];
delete resolutionSelection.triggerState['T.CHILD.DEFAULT'];
const resolutionResult = compileSleeve(stateSleeve, resolutionSelection);
const resolutionDiagnostic = diagnosticByCode(
  resolutionResult.diagnostics,
  'SELECTION_TARGET_NOT_EXECUTABLE',
);
assert.equal(resolutionDiagnostic.stage, 'resolution');
assert.equal(resolutionDiagnostic.subject.kind, 'neostack');
assertConforms(resolutionDiagnostic);

const outputDiagnostic = internalOutputContractViolationDiagnostic({ message: 'forced output violation' });
assert.equal(outputDiagnostic.code, 'INTERNAL_OUTPUT_CONTRACT_VIOLATION');
assert.equal(outputDiagnostic.stage, 'output');
assert.equal(outputDiagnostic.subject.kind, 'compile_result');
assertConforms(outputDiagnostic);

const internalDiagnostic = internalCompilerErrorDiagnostic();
assert.equal(internalDiagnostic.code, 'INTERNAL_COMPILER_ERROR');
assert.equal(internalDiagnostic.stage, 'internal');
assert.equal(internalDiagnostic.subject.kind, 'compiler');
assertConforms(internalDiagnostic);

for (const diagnostic of [
  structuralDiagnostic,
  semanticDiagnostic,
  resolutionDiagnostic,
  outputDiagnostic,
  internalDiagnostic,
]) {
  const entry = DIAGNOSTIC_REGISTRY[diagnostic.code];
  assert.equal(diagnostic.level, entry.level);
  assert.equal(diagnostic.stage, entry.stage);
  assert.ok(entry.allowedSubjectKinds.includes(diagnostic.subject.kind));
}

console.log('UMG compiler-vnext diagnostic registry contract tests: PASS');
