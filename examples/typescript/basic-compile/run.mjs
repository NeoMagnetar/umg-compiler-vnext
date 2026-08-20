import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const exampleRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(exampleRoot, '..', '..', '..');
const outputRoot = mkdtempSync(resolve(exampleRoot, '.build-'));
const tsc = resolve(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc');

try {
  const compile = spawnSync(
    process.execPath,
    [tsc, '--project', resolve(exampleRoot, 'tsconfig.json'), '--outDir', outputRoot],
    { cwd: repoRoot, encoding: 'utf8', windowsHide: true },
  );
  if (compile.status !== 0) {
    process.stderr.write(compile.stdout ?? '');
    process.stderr.write(compile.stderr ?? '');
    throw new Error(`TypeScript compilation failed with exit ${compile.status}.`);
  }

  const execute = spawnSync(process.execPath, [resolve(outputRoot, 'index.js')], {
    cwd: repoRoot,
    encoding: 'utf8',
    windowsHide: true,
  });
  process.stdout.write(execute.stdout ?? '');
  process.stderr.write(execute.stderr ?? '');
  if (execute.status !== 0) throw new Error(`Compiled TypeScript example failed with exit ${execute.status}.`);
} finally {
  rmSync(outputRoot, { recursive: true, force: true });
}
