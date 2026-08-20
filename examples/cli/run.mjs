import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const exampleRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(exampleRoot, '..', '..');
const cli = resolve(repoRoot, 'dist', 'cli.js');
const sleeve = resolve(repoRoot, 'examples', 'data', 'basic.sleeve.json');
const selection = resolve(repoRoot, 'examples', 'data', 'basic.selection.json');
const tempRoot = mkdtempSync(resolve(tmpdir(), 'umg-h3-cli-'));

function run(args) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    windowsHide: true,
  });
}

try {
  const validate = run(['validate', sleeve]);
  const outputPath = resolve(tempRoot, 'compile-result.json');
  const compile = run(['compile', sleeve, selection, outputPath]);

  const failureSelection = JSON.parse(readFileSync(selection, 'utf8'));
  failureSelection.triggerState['T.EXAMPLE.FOCUSED'] = true;
  failureSelection.triggerState['T.EXAMPLE.SAFE'] = true;
  const failureSelectionPath = resolve(tempRoot, 'failure.selection.json');
  writeFileSync(failureSelectionPath, `${JSON.stringify(failureSelection, null, 2)}\n`, 'utf8');
  const compilerFailure = run(['compile', sleeve, failureSelectionPath]);
  const toolingFailure = run(['compile']);

  const validation = JSON.parse(validate.stdout);
  const output = JSON.parse(readFileSync(outputPath, 'utf8'));
  const failureOutput = JSON.parse(compilerFailure.stdout);
  const expected = {
    validate: 0,
    compile: 0,
    compilerFailure: 1,
    toolingFailure: 2,
  };
  const actual = {
    validate: validate.status,
    compile: compile.status,
    compilerFailure: compilerFailure.status,
    toolingFailure: toolingFailure.status,
  };

  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Unexpected CLI exit statuses: ${JSON.stringify(actual)}`);
  }
  if (validation.diagnostics.length !== 0 || output.status !== 'success' || failureOutput.status !== 'failure') {
    throw new Error('CLI returned an unexpected compiler contract.');
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        exitStatus: actual,
        outputFileStatus: output.status,
        failureRuntime: failureOutput.runtime,
        failureCodes: failureOutput.diagnostics.map((item) => item.code),
      },
      null,
      2,
    )}\n`,
  );
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
