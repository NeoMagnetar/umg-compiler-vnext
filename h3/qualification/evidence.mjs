#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { runExamples } from './run-examples.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const artifactRoot = resolve(repoRoot, 'docs', 'qualification', 'H3');
const startingHead = '29cb63900dbfd35c64e076b0af72c5fbac71b9f1';

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function spawnChecked(command, args, options = {}) {
  const child = spawnSync(command, args, {
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 128 * 1024 * 1024,
    ...options,
  });
  return {
    status: child.status,
    signal: child.signal ?? null,
    stdout: child.stdout ?? '',
    stderr: child.stderr ?? '',
    ok: child.status === 0,
  };
}

function spawnNpm(args, options = {}) {
  if (process.platform === 'win32') {
    return spawnChecked(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', `npm ${args.join(' ')}`], options);
  }
  return spawnChecked('npm', args, options);
}

function git(root, args) {
  return spawnChecked('git', ['-C', root, ...args], { cwd: root });
}

function gitHead(root) {
  const result = git(root, ['rev-parse', 'HEAD']);
  if (!result.ok) throw new Error(result.stderr || result.stdout);
  return result.stdout.trim();
}

function writeJson(name, value) {
  ensureDir(artifactRoot);
  const path = resolve(artifactRoot, name);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return path;
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex').toUpperCase();
}

function listFiles(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(root, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

function runPackedArtifactConsumer() {
  const tempRoot = mkdtempSync(join(tmpdir(), 'umg-h3-package-'));
  const packageRoot = resolve(tempRoot, 'package');
  const consumerRoot = resolve(tempRoot, 'consumer');
  mkdirSync(packageRoot);
  mkdirSync(consumerRoot);
  try {
    const pack = spawnNpm(['pack', '--json', '--pack-destination', packageRoot], { cwd: repoRoot });
    if (!pack.ok) return { pack, install: { ok: false }, execute: { ok: false }, qualified: false };
    const packResult = JSON.parse(pack.stdout);
    const tarball = resolve(packageRoot, packResult[0].filename);

    copyFileSync(resolve(repoRoot, 'examples', 'data', 'basic.sleeve.json'), resolve(consumerRoot, 'sleeve.json'));
    copyFileSync(resolve(repoRoot, 'examples', 'data', 'basic.selection.json'), resolve(consumerRoot, 'selection.json'));
    writeFileSync(
      resolve(consumerRoot, 'package.json'),
      `${JSON.stringify({ name: 'umg-h3-artifact-consumer', private: true, type: 'module' }, null, 2)}\n`,
      'utf8',
    );
    writeFileSync(
      resolve(consumerRoot, 'index.mjs'),
      [
        "import { readFileSync } from 'node:fs';",
        "import { compileSleeve, computeRuntimeHash } from 'umg-compiler-vnext';",
        "const sleeve = JSON.parse(readFileSync(new URL('./sleeve.json', import.meta.url), 'utf8'));",
        "const selection = JSON.parse(readFileSync(new URL('./selection.json', import.meta.url), 'utf8'));",
        'const result = compileSleeve(sleeve, selection);',
        "if (result.status !== 'success' || !result.runtime) throw new Error(JSON.stringify(result.diagnostics));",
        "if (computeRuntimeHash(result.runtime) !== result.runtime.runtimeHash) throw new Error('runtimeHash mismatch');",
        "process.stdout.write(JSON.stringify({ status: result.status, runtimeHash: result.runtime.runtimeHash }));",
      ].join('\n'),
      'utf8',
    );

    const install = spawnNpm(['install', '--silent', tarball.replaceAll('\\', '/')], { cwd: consumerRoot });
    const execute = install.ok
      ? spawnChecked(process.execPath, ['index.mjs'], { cwd: consumerRoot })
      : { ok: false, status: null, signal: null, stdout: '', stderr: '' };
    return {
      packageVersion: packResult[0].version,
      tarballName: basename(tarball),
      tarballSha256: sha256File(tarball),
      pack,
      install,
      execute,
      qualified: pack.ok && install.ok && execute.ok,
    };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runH2(root) {
  const tempRoot = mkdtempSync(join(tmpdir(), 'umg-h3-h2-'));
  const output = resolve(tempRoot, 'result.json');
  try {
    const execution = spawnChecked(
      process.execPath,
      [resolve(root, 'h2', 'conformance', 'runner.mjs'), '--subject-root', root, '--json', '--output', output],
      { cwd: root },
    );
    const result = execution.ok ? JSON.parse(readFileSync(output, 'utf8')) : null;
    return {
      ...execution,
      conformant: result?.summary?.conformant === true,
      summary: result?.summary ?? null,
    };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runFreshClone() {
  const cloneRoot = mkdtempSync(join(tmpdir(), 'umg-h3-fresh-clone-'));
  try {
    const clone = spawnChecked('git', ['clone', '--quiet', repoRoot, cloneRoot], { cwd: repoRoot });
    if (!clone.ok) return { clone, passed: false };
    const npmCi = spawnNpm(['ci'], { cwd: cloneRoot });
    const build = npmCi.ok ? spawnNpm(['run', 'build'], { cwd: cloneRoot }) : { ok: false };
    const tests = build.ok ? spawnNpm(['test'], { cwd: cloneRoot }) : { ok: false };
    const h2 = tests.ok ? runH2(cloneRoot) : { ok: false, conformant: false };
    const examples = h2.conformant ? runExamples(cloneRoot) : { allPassed: false, total: 5, passed: 0, failed: 5 };
    const clean = spawnNpm(['run', 'clean'], { cwd: cloneRoot });
    const status = git(cloneRoot, ['status', '--porcelain']);
    const workingTreeClean = clean.ok && status.ok && status.stdout.trim().length === 0;
    const passed =
      clone.ok &&
      npmCi.ok &&
      build.ok &&
      tests.ok &&
      h2.conformant &&
      examples.allPassed &&
      workingTreeClean;
    return {
      head: gitHead(cloneRoot),
      clone,
      npm_ci: npmCi,
      build,
      existing_tests: tests,
      h2_conformance: h2,
      h3_examples: examples,
      clean,
      working_tree_clean: workingTreeClean,
      passed,
    };
  } finally {
    rmSync(cloneRoot, { recursive: true, force: true });
  }
}

function repositoryIntegrity() {
  const protectedPaths = [
    'src',
    'test',
    'fixtures',
    'schemas',
    'docs/qualification/H1',
    'package.json',
    'package-lock.json',
  ];
  const changed = git(repoRoot, ['diff', '--name-only', `${startingHead}..HEAD`, '--', ...protectedPaths]);
  const files = changed.stdout.split(/\r?\n/u).filter(Boolean);
  return {
    startingHead,
    currentHead: gitHead(repoRoot),
    protectedPaths,
    changedFiles: files,
    compilerSourceChanged: files.some((path) => path.startsWith('src/')),
    testsChanged: files.some((path) => path.startsWith('test/')),
    h1CorpusChanged: files.some((path) => path.startsWith('fixtures/') || path.startsWith('docs/qualification/H1/')),
    expectedOutputsChanged: files.some((path) => path.startsWith('fixtures/expected/')),
    schemasChanged: files.some((path) => path.startsWith('schemas/')),
    packageChanged: files.some((path) => path === 'package.json' || path === 'package-lock.json'),
    unchanged: changed.ok && files.length === 0,
  };
}

function writeReport(path, report) {
  const lines = [
    '# H3 Example Execution Report',
    '',
    `- Status: \`${report.status}\``,
    `- Qualified tooling head: \`${report.qualified_head}\``,
    `- Local examples: ${report.examples.passed}/${report.examples.total} passed`,
    `- Packed artifact consumer: ${report.package_artifact.qualified ? 'PASS' : 'FAIL'}`,
    `- Fresh clone npm ci: ${report.fresh_clone.npm_ci.ok ? 'PASS' : 'FAIL'}`,
    `- Fresh clone build: ${report.fresh_clone.build.ok ? 'PASS' : 'FAIL'}`,
    `- Existing tests: ${report.fresh_clone.existing_tests.ok ? 'PASS' : 'FAIL'}`,
    `- H2 conformance: ${report.fresh_clone.h2_conformance.conformant ? 'PASS' : 'FAIL'}`,
    `- H3 examples: ${report.fresh_clone.h3_examples.allPassed ? 'PASS' : 'FAIL'}`,
    `- Protected repository scope unchanged: ${report.repository_integrity.unchanged}`,
  ];
  writeFileSync(path, `${lines.join('\n')}\n`, 'utf8');
}

function artifactFiles() {
  return [
    ...listFiles(resolve(repoRoot, 'docs', 'integration')),
    ...listFiles(resolve(repoRoot, 'examples')),
    ...listFiles(resolve(repoRoot, 'h3', 'qualification')),
    ...listFiles(artifactRoot).filter((path) => !path.endsWith('PHASE_H3_ARTIFACT_SHA256SUMS.txt')),
  ].sort((left, right) => left.localeCompare(right));
}

function main() {
  ensureDir(artifactRoot);
  const examples = runExamples(repoRoot);
  const packageArtifact = runPackedArtifactConsumer();
  const freshClone = runFreshClone();
  const integrity = repositoryIntegrity();
  const pass = examples.allPassed && packageArtifact.qualified && freshClone.passed && integrity.unchanged;
  const status = pass
    ? 'VNEXT_PHASE_H3_INTEGRATION_DOCS_EXAMPLES_PASS'
    : 'VNEXT_PHASE_H3_INTEGRATION_DOCS_EXAMPLES_FAIL';

  writeJson('H3_EXAMPLE_EXECUTION_RESULTS.json', examples);
  writeJson('H3_PACKAGE_ARTIFACT_RESULTS.json', packageArtifact);
  writeJson('H3_FRESH_CLONE_RESULTS.json', freshClone);
  writeJson('H3_REPOSITORY_INTEGRITY_RESULTS.json', integrity);

  const report = {
    status,
    qualified_head: gitHead(repoRoot),
    examples: { total: examples.total, passed: examples.passed, failed: examples.failed },
    package_artifact: { qualified: packageArtifact.qualified, version: packageArtifact.packageVersion },
    fresh_clone: freshClone,
    repository_integrity: integrity,
  };
  writeJson('H3_EXAMPLE_EXECUTION_REPORT.json', report);
  writeReport(resolve(artifactRoot, 'H3_EXAMPLE_EXECUTION_REPORT.md'), report);

  const decision = {
    status,
    phase_h3_verified_complete: pass,
    integration_documentation_qualified: pass,
    runnable_examples_qualified: pass,
    server_adapter_example_qualified: pass,
    phase_h4_ready: pass,
    integration_ready: false,
  };
  writeJson('H3_FINAL_DECISION.json', decision);

  const manifest = artifactFiles()
    .map((path) => `${sha256File(path)}  ${relative(repoRoot, path).replaceAll('\\', '/')}`)
    .join('\n');
  writeFileSync(resolve(artifactRoot, 'PHASE_H3_ARTIFACT_SHA256SUMS.txt'), `${manifest}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(decision, null, 2)}\n`);
  process.exitCode = pass ? 0 : 1;
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 2;
}
