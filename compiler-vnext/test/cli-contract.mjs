import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const cliPath = resolve(root, 'dist', 'cli.js');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}

function parseJson(text) {
  return JSON.parse(text);
}

const compileSuccess = runCli([
  'compile',
  'fixtures/dealership.sleeve.json',
  'fixtures/requests/secondary-b.selection.json',
]);
assert.equal(compileSuccess.status, 0);
assert.equal(compileSuccess.stderr, '');
assert.equal(compileSuccess.stdout.length > 0, true);
{
  const result = parseJson(compileSuccess.stdout);
  assert.equal(result.status, 'success');
  assert.equal(result.hasErrors, false);
  assert.ok(result.runtime);
  assert.ok(result.trace);
}

const compileFailure = runCli([
  'compile',
  'fixtures/dealership.sleeve.json',
  'fixtures/requests/multi-secondary-error.selection.json',
]);
assert.equal(compileFailure.status, 1);
assert.equal(compileFailure.stderr, '');
{
  const result = parseJson(compileFailure.stdout);
  assert.equal(result.status, 'failure');
  assert.equal(result.hasErrors, true);
  assert.equal(result.runtime, null);
  assert.ok(result.trace);
}

const tempDir = mkdtempSync(resolve(tmpdir(), 'umg-vnext-cli-'));
try {
  const badJsonPath = resolve(tempDir, 'invalid.selection.json');
  writeFileSync(badJsonPath, '{"schemaVersion": ', 'utf8');

  const toolingFailure = runCli([
    'compile',
    'fixtures/dealership.sleeve.json',
    badJsonPath,
  ]);
  assert.equal(toolingFailure.status, 2);
  assert.equal(toolingFailure.stdout, '');
  assert.match(toolingFailure.stderr, /^UMG_VNEXT_CLI_ERROR INPUT_READ_FAILED:/);

  const outputPath = resolve(tempDir, 'compile-result.json');
  const writeFailure = runCli([
    'compile',
    'fixtures/dealership.sleeve.json',
    'fixtures/requests/multi-secondary-error.selection.json',
    outputPath,
  ]);
  assert.equal(writeFailure.status, 1);
  assert.equal(writeFailure.stdout, '');
  const fileResult = parseJson(readFileSync(outputPath, 'utf8'));
  assert.equal(fileResult.status, 'failure');
  assert.equal(fileResult.runtime, null);
} finally {
  rmSync(tempDir, { force: true, recursive: true });
}

const usageFailure = runCli([]);
assert.equal(usageFailure.status, 2);
assert.equal(usageFailure.stdout, '');
assert.match(usageFailure.stderr, /^UMG_VNEXT_CLI_ERROR INVALID_USAGE/);

console.log('UMG compiler-vnext CLI contract tests: PASS');
