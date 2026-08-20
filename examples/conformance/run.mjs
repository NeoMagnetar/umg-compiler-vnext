import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const exampleRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(exampleRoot, '..', '..');
const tempRoot = mkdtempSync(resolve(tmpdir(), 'umg-h3-conformance-'));
const outputPath = resolve(tempRoot, 'conformance-result.json');

try {
  const run = spawnSync(
    process.execPath,
    [
      resolve(repoRoot, 'h2', 'conformance', 'runner.mjs'),
      '--subject-root',
      repoRoot,
      '--json',
      '--output',
      outputPath,
    ],
    { cwd: repoRoot, encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 },
  );
  if (run.status !== 0) {
    process.stderr.write(run.stdout ?? '');
    process.stderr.write(run.stderr ?? '');
    throw new Error(`H2 conformance runner failed with exit ${run.status}.`);
  }

  const result = JSON.parse(readFileSync(outputPath, 'utf8'));
  if (result.schemaVersion !== 'UMG_VNEXT_CONFORMANCE_RESULT.v0.1') {
    throw new Error(`Unexpected result schema: ${result.schemaVersion}`);
  }
  if (!result.summary.conformant || result.summary.total !== 13 || result.summary.passed !== 13) {
    throw new Error(`Subject is not conformant: ${JSON.stringify(result.summary)}`);
  }

  const requirementIds = new Set(
    result.cases.flatMap((item) => [...item.requirementIds.primary, ...item.requirementIds.secondary]),
  );
  if (requirementIds.size !== 39) {
    throw new Error(`Expected 39 unique requirement IDs, received ${requirementIds.size}.`);
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        schemaVersion: result.schemaVersion,
        cases: result.summary.total,
        passed: result.summary.passed,
        uniqueRequirementIds: requirementIds.size,
        conformant: result.summary.conformant,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
