import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileSleeve, validateSelection, validateSleeve } from '../dist/index.js';

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

function assertFailure(result, options = {}) {
  assert.equal(result.schemaVersion, 'umg.compiler-vnext.compile-result.v0.1');
  assert.equal(result.compilerVersion, '0.1.0-experimental');
  assert.equal(result.status, 'failure');
  assert.equal(result.hasErrors, true);
  assert.equal(result.runtime, null);
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.level === 'error'));
  if (options.trace === 'present') {
    assert.ok(result.trace, 'expected failure trace to be present');
    assert.deepEqual(result.trace.diagnostics, result.diagnostics);
  } else if (options.trace === 'null') {
    assert.equal(result.trace, null);
  }
  if (options.codes) {
    for (const code of options.codes) {
      assert.ok(
        result.diagnostics.some((diagnostic) => diagnostic.code === code),
        `missing expected diagnostic ${code}`,
      );
    }
  }
}

const dealershipSleeve = json('fixtures/dealership.sleeve.json');
const secondaryBSelection = json('fixtures/requests/secondary-b.selection.json');
const multiSecondarySelection = json('fixtures/requests/multi-secondary-error.selection.json');
const semanticInvalidSleeve = json('fixtures/invalid/directive-secondary-in-base.sleeve.json');

assert.equal(
  validateSleeve(dealershipSleeve).diagnostics.filter((diagnostic) => diagnostic.level === 'error').length,
  0,
  'valid dealership sleeve should remain structurally and semantically valid',
);
assert.equal(
  validateSelection(dealershipSleeve, secondaryBSelection).diagnostics.filter((diagnostic) => diagnostic.level === 'error').length,
  0,
  'valid selection should remain structurally and semantically valid',
);

{
  const sleeve = clone(dealershipSleeve);
  sleeve.unexpectedTopLevelField = true;
  const diagnostics = validateSleeve(sleeve).diagnostics;
  assert.deepEqual(errorCodes(diagnostics), ['UNKNOWN_FIELD']);
  assertFailure(compileSleeve(sleeve, secondaryBSelection), {
    trace: 'null',
    codes: ['UNKNOWN_FIELD'],
  });
}

{
  const sleeve = clone(dealershipSleeve);
  delete sleeve.name;
  const diagnostics = validateSleeve(sleeve).diagnostics;
  assert.deepEqual(errorCodes(diagnostics), ['MISSING_REQUIRED_FIELD']);
  assertFailure(compileSleeve(sleeve, secondaryBSelection), {
    trace: 'null',
    codes: ['MISSING_REQUIRED_FIELD'],
  });
}

{
  const sleeve = clone(dealershipSleeve);
  sleeve.moltBlocks[0].type = 'merge';
  const diagnostics = validateSleeve(sleeve).diagnostics;
  assert.deepEqual(errorCodes(diagnostics), ['INVALID_ENUM_VALUE']);
  assertFailure(compileSleeve(sleeve, secondaryBSelection), {
    trace: 'null',
    codes: ['INVALID_ENUM_VALUE'],
  });
}

{
  const selection = clone(secondaryBSelection);
  selection.triggerState['T.UNKNOWN'] = true;
  const diagnostics = validateSelection(dealershipSleeve, selection).diagnostics;
  assert.ok(errorCodes(diagnostics).includes('UNKNOWN_TRIGGER_STATE_ID'));
  assertFailure(compileSleeve(dealershipSleeve, selection), {
    trace: 'present',
    codes: ['UNKNOWN_TRIGGER_STATE_ID'],
  });
}

{
  const selection = clone(secondaryBSelection);
  selection.triggerState['I.SVC.01'] = true;
  const diagnostics = validateSelection(dealershipSleeve, selection).diagnostics;
  assert.ok(errorCodes(diagnostics).includes('TRIGGER_STATE_TYPE_MISMATCH'));
  assertFailure(compileSleeve(dealershipSleeve, selection), {
    trace: 'present',
    codes: ['TRIGGER_STATE_TYPE_MISMATCH'],
  });
}

{
  const selection = clone(secondaryBSelection);
  selection.triggerState['D.SVC.PRIME'] = true;
  const diagnostics = validateSelection(dealershipSleeve, selection).diagnostics;
  assert.ok(errorCodes(diagnostics).includes('TRIGGER_STATE_TYPE_MISMATCH'));
  assertFailure(compileSleeve(dealershipSleeve, selection), {
    trace: 'present',
    codes: ['TRIGGER_STATE_TYPE_MISMATCH'],
  });
}

{
  const sleeve = clone(dealershipSleeve);
  sleeve.scopedMolt[0].scope = { kind: 'bogus' };
  const diagnostics = validateSleeve(sleeve).diagnostics;
  assert.ok(errorCodes(diagnostics).length > 0);
  assertFailure(compileSleeve(sleeve, secondaryBSelection), {
    trace: 'null',
  });
}

{
  const sleeve = clone(dealershipSleeve);
  sleeve.scopedMolt[0].scope = { kind: 'neostack', neoStackId: 'NS.UNKNOWN' };
  const diagnostics = validateSleeve(sleeve).diagnostics;
  assert.ok(errorCodes(diagnostics).includes('UNKNOWN_SCOPED_NEOSTACK'));
  assertFailure(compileSleeve(sleeve, secondaryBSelection), {
    trace: 'present',
    codes: ['UNKNOWN_SCOPED_NEOSTACK'],
  });
}

{
  const sleeve = clone(dealershipSleeve);
  delete sleeve.neoBlocks[1].primeDirectiveId;
  const diagnostics = validateSleeve(sleeve).diagnostics;
  assert.deepEqual(errorCodes(diagnostics), ['MISSING_REQUIRED_FIELD']);
  assertFailure(compileSleeve(sleeve, secondaryBSelection), {
    trace: 'null',
    codes: ['MISSING_REQUIRED_FIELD'],
  });
}

{
  const diagnostics = validateSleeve(semanticInvalidSleeve).diagnostics;
  assert.ok(errorCodes(diagnostics).includes('DIRECTIVE_BASE_GEOMETRY_CANON_VIOLATION'));
  assertFailure(compileSleeve(semanticInvalidSleeve, secondaryBSelection), {
    trace: 'present',
    codes: ['DIRECTIVE_BASE_GEOMETRY_CANON_VIOLATION'],
  });
}

{
  assertFailure(compileSleeve(dealershipSleeve, multiSecondarySelection), {
    trace: 'present',
    codes: ['MULTIPLE_SECONDARY_DIRECTIVE_MATCH'],
  });
}

{
  const malformedResult = compileSleeve(
    { schemaVersion: 'umg.compiler-vnext.sleeve.v0.1', id: 'SLV.API.BYPASS' },
    { schemaVersion: 'umg.compiler-vnext.selection.v0.1' },
  );
  assertFailure(malformedResult, { trace: 'null' });
}

console.log('UMG compiler-vnext failure contract tests: PASS');
