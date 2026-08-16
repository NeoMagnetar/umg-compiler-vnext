import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  COMPATIBILITY_MANIFEST,
  COMPATIBILITY_MANIFEST_VERSION,
  COMPILER_VERSION,
  COMPILE_RESULT_SCHEMA_VERSION,
  DIAGNOSTIC_REGISTRY_VERSION,
  RUNTIME_HASH_PROFILE_VERSION,
  RUNTIME_SCHEMA_VERSION,
  SCHEMA_REGISTRY_VERSION,
  SELECTION_SCHEMA_VERSION,
  SLEEVE_SCHEMA_VERSION,
  TRACE_EVENT_REGISTRY_VERSION,
  TRACE_SCHEMA_VERSION,
  compatibilityManifestAsJson,
  compileSleeve,
  getCompilerCompatibility,
} from '../dist/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

function json(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function unsupportedCodes(result) {
  return result.diagnostics.map((diagnostic) => diagnostic.code);
}

function schemaConst(rootSchema, defName) {
  return rootSchema.$defs[defName].properties.schemaVersion.const;
}

function assertStructuralUnsupported(result, code, label) {
  assert.equal(result.status, 'failure', label);
  assert.equal(result.runtime, null, label);
  assert.equal(result.trace, null, label);
  assert.ok(unsupportedCodes(result).includes(code), `${label} should include ${code}`);
}

const packageJson = json('package.json');
const compatibilityMatrix = json('schemas/COMPATIBILITY_MATRIX.json');
const rootSchema = json('schemas/umg-compiler-vnext.schema.json');
const schemaRegistry = json('schemas/SCHEMA_REGISTRY.json');
const diagnosticRegistry = json('schemas/DIAGNOSTIC_REGISTRY.json');
const traceRegistry = json('schemas/TRACE_EVENT_REGISTRY.json');
const hashProfile = json('schemas/RUNTIME_HASH_PROFILE.json');

assert.equal(packageJson.version, COMPILER_VERSION);
assert.equal(packageJson.version, '0.1.0-experimental');

assert.equal(compatibilityMatrix.compatibilityManifestVersion, COMPATIBILITY_MANIFEST_VERSION);
assert.deepEqual(compatibilityMatrix, compatibilityManifestAsJson());
assert.deepEqual(compatibilityMatrix, COMPATIBILITY_MANIFEST);

const compilerEntry = getCompilerCompatibility(COMPILER_VERSION);
assert.ok(compilerEntry, `missing compatibility entry for ${COMPILER_VERSION}`);
assert.deepEqual(compilerEntry, COMPATIBILITY_MANIFEST.compilerVersions[COMPILER_VERSION]);
assert.deepEqual(compilerEntry.accepts.sleeve, [SLEEVE_SCHEMA_VERSION]);
assert.deepEqual(compilerEntry.accepts.selection, [SELECTION_SCHEMA_VERSION]);
assert.equal(compilerEntry.emits.runtime, RUNTIME_SCHEMA_VERSION);
assert.equal(compilerEntry.emits.trace, TRACE_SCHEMA_VERSION);
assert.equal(compilerEntry.emits.compileResult, COMPILE_RESULT_SCHEMA_VERSION);
assert.equal(compilerEntry.contracts.schemaRegistry, SCHEMA_REGISTRY_VERSION);
assert.equal(compilerEntry.contracts.diagnosticRegistry, DIAGNOSTIC_REGISTRY_VERSION);
assert.equal(compilerEntry.contracts.traceEventRegistry, TRACE_EVENT_REGISTRY_VERSION);
assert.equal(compilerEntry.contracts.runtimeHashProfile, RUNTIME_HASH_PROFILE_VERSION);
assert.equal(compilerEntry.compatibilityPolicy.exactManifestMembership, true);
assert.equal(compilerEntry.compatibilityPolicy.inferFromSemver, false);
assert.equal(compilerEntry.compatibilityPolicy.autoUpgradeLegacyInput, false);
assert.equal(compilerEntry.compatibilityPolicy.acceptUnknownFutureVersion, false);

assert.equal(schemaConst(rootSchema, 'Sleeve'), SLEEVE_SCHEMA_VERSION);
assert.equal(schemaConst(rootSchema, 'CompileSelection'), SELECTION_SCHEMA_VERSION);
assert.equal(schemaConst(rootSchema, 'RuntimeSpec'), RUNTIME_SCHEMA_VERSION);
assert.equal(schemaConst(rootSchema, 'Trace'), TRACE_SCHEMA_VERSION);
assert.equal(schemaConst(rootSchema, 'CompileResult'), COMPILE_RESULT_SCHEMA_VERSION);

assert.equal(schemaRegistry.schemaRegistryVersion, SCHEMA_REGISTRY_VERSION);
const registryByKind = Object.fromEntries(schemaRegistry.documents.map((entry) => [entry.kind, entry]));
assert.equal(registryByKind.sleeve.schemaVersion, compilerEntry.accepts.sleeve[0]);
assert.equal(registryByKind.selection.schemaVersion, compilerEntry.accepts.selection[0]);
assert.equal(registryByKind.runtime.schemaVersion, compilerEntry.emits.runtime);
assert.equal(registryByKind.trace.schemaVersion, compilerEntry.emits.trace);
assert.equal(registryByKind.compile_result.schemaVersion, compilerEntry.emits.compileResult);

assert.equal(diagnosticRegistry.registryVersion, DIAGNOSTIC_REGISTRY_VERSION);
assert.equal(traceRegistry.registryVersion, TRACE_EVENT_REGISTRY_VERSION);
assert.equal(hashProfile.profileVersion, RUNTIME_HASH_PROFILE_VERSION);

const dealershipSleeve = json('fixtures/dealership.sleeve.json');
const normalSelection = json('fixtures/requests/normal.selection.json');
const secondaryBSelection = json('fixtures/requests/secondary-b.selection.json');
const invalidSemanticSleeve = json('fixtures/invalid/directive-secondary-in-base.sleeve.json');
const multiSecondarySelection = json('fixtures/requests/multi-secondary-error.selection.json');

const normal = compileSleeve(dealershipSleeve, normalSelection);
const secondaryB = compileSleeve(dealershipSleeve, secondaryBSelection);
const resolutionFailure = compileSleeve(dealershipSleeve, multiSecondarySelection);
const semanticFailure = compileSleeve(invalidSemanticSleeve, normalSelection);

for (const result of [normal, secondaryB, resolutionFailure, semanticFailure]) {
  assert.equal(result.schemaVersion, compilerEntry.emits.compileResult);
  assert.equal(result.compilerVersion, COMPILER_VERSION);
  if (result.trace) {
    assert.equal(result.trace.schemaVersion, compilerEntry.emits.trace);
    assert.equal(result.trace.compilerVersion, COMPILER_VERSION);
  }
  if (result.runtime) {
    assert.equal(result.runtime.schemaVersion, compilerEntry.emits.runtime);
    assert.equal(result.runtime.compilerVersion, COMPILER_VERSION);
  }
}

assert.equal(normal.runtime.runtimeHash, 'c3e18535479cf39938c8e7993db73f4c1b5135529ba20d9d8a2ccadf298498fd');
assert.equal(secondaryB.runtime.runtimeHash, '0b65ac8d7955628c5544cc93704d3acffc7036c2e9d52dffba8c24e1bd26d7cd');

for (const [schemaVersion, label] of [
  ['umg.compiler-vnext.sleeve.v0.2', 'sleeve-v0.2'],
  ['umg.compiler-vnext.sleeve.v1', 'sleeve-v1'],
  ['', 'sleeve-empty'],
  ['not-a-sleeve-version', 'sleeve-wrong'],
  ['umg.compiler-vnext.sleeve.v0.10', 'sleeve-v0.10'],
  ['umg.compiler-vnext.sleeve.v0.1-extra', 'sleeve-v0.1-extra'],
]) {
  const sleeve = clone(dealershipSleeve);
  sleeve.schemaVersion = schemaVersion;
  assertStructuralUnsupported(
    compileSleeve(sleeve, normalSelection),
    'UNSUPPORTED_SLEEVE_SCHEMA',
    label,
  );
}

for (const [schemaVersion, label] of [
  ['umg.compiler-vnext.selection.v0.2', 'selection-v0.2'],
  ['umg.compiler-vnext.selection.v1', 'selection-v1'],
  ['', 'selection-empty'],
  ['not-a-selection-version', 'selection-wrong'],
  ['umg.compiler-vnext.selection.v0.10', 'selection-v0.10'],
  ['umg.compiler-vnext.selection.v0.1-extra', 'selection-v0.1-extra'],
]) {
  const selection = clone(normalSelection);
  selection.schemaVersion = schemaVersion;
  assertStructuralUnsupported(
    compileSleeve(dealershipSleeve, selection),
    'UNSUPPORTED_SELECTION_SCHEMA',
    label,
  );
}

assert.equal(getCompilerCompatibility('0.1.0'), undefined);
assert.equal(getCompilerCompatibility('0.1.1'), undefined);
assert.equal(getCompilerCompatibility('0.1.0-rc.1'), undefined);
assert.equal(getCompilerCompatibility(COMPILER_VERSION), compilerEntry);

console.log('UMG compiler-vnext version compatibility contract tests: PASS');
