#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { canonicalize } from './internal/canonicalize.mjs';
import { gitRevParse, gitStatusPorcelain, sha256BufferUpper } from './internal/git.mjs';
import { createContext, runSuite } from './runner.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..', '..');
const artifactRoot = resolve(repoRoot, 'docs', 'qualification', 'H2');

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function writeJsonArtifact(name, value) {
  ensureDir(artifactRoot);
  const filePath = resolve(artifactRoot, name);
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return filePath;
}

function makeTempDir(prefix) {
  return mkdtempSync(join(tmpdir(), prefix));
}

function cloneCorpusRepository(sourceRoot) {
  const tempRoot = makeTempDir('umg-h2-corpus-');
  const clone = spawnChecked('git', ['clone', '--quiet', sourceRoot, tempRoot], { cwd: sourceRoot });
  if (!clone.ok) {
    throw new Error(`Failed to clone corpus repository: ${clone.stderr || clone.stdout}`);
  }
  return tempRoot;
}

function commitMutation(root, message, paths) {
  const relativePaths = paths.map((path) => relative(root, path).replaceAll('\\', '/'));
  const add = spawnChecked('git', ['-C', root, 'add', '--', ...relativePaths], { cwd: root });
  if (!add.ok) {
    throw new Error(`Failed to stage mutation: ${add.stderr || add.stdout}`);
  }

  const commit = spawnChecked(
    'git',
    [
      '-C',
      root,
      '-c',
      'user.name=H2 Evidence',
      '-c',
      'user.email=h2-evidence@example.invalid',
      'commit',
      '--quiet',
      '-m',
      message,
    ],
    { cwd: root },
  );
  if (!commit.ok) {
    throw new Error(`Failed to commit mutation: ${commit.stderr || commit.stdout}`);
  }
}

function spawnChecked(command, args, options = {}) {
  const child = spawnSync(command, args, {
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
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

function hashText(text) {
  return sha256BufferUpper(Buffer.from(text, 'utf8'));
}

async function runPositive(context) {
  const result = await runSuite(context);
  return result;
}

async function runDeterminism(context, runs = 10) {
  const fingerprints = [];
  const summaries = [];
  for (let index = 0; index < runs; index += 1) {
    const result = await runSuite(context);
    fingerprints.push(hashText(canonicalize(result)));
    summaries.push({
      run: index + 1,
      conformant: result.summary.conformant,
      passed: result.summary.passed,
      failed: result.summary.failed,
      total: result.summary.total,
    });
  }
  const identical = new Set(fingerprints).size === 1;
  return {
    completeRuns: runs,
    identical,
    fingerprints,
    summaries,
  };
}

async function runNegativeControls(subjectRoot) {
  const controls = [];

  {
    const tempCorpusRoot = cloneCorpusRepository(repoRoot);
    const sleevePath = resolve(tempCorpusRoot, 'fixtures', 'dealership.sleeve.json');
    writeFileSync(sleevePath, `${readFileSync(sleevePath, 'utf8')} \n`, 'utf8');
    commitMutation(tempCorpusRoot, 'h2 negative control: corrupt corpus input', [sleevePath]);
    const context = await createContext({ corpusRoot: tempCorpusRoot, subjectRoot });
    const result = await runSuite(context);
    controls.push({
      controlId: 'corrupt-corpus-input',
      mutation: 'append-whitespace-to-dealership-sleeve',
      conformant: result.summary.conformant,
      detected: result.summary.conformant === false,
      failureReason: result.summary.conformant ? null : 'corpus hash mismatch detected by runner',
      evidence: result.corpus.integrity,
    });
    if (context.contractWorkspace) context.contractWorkspace.cleanup();
    rmSync(tempCorpusRoot, { recursive: true, force: true });
  }

  {
    const tempCorpusRoot = cloneCorpusRepository(repoRoot);
    const expectedPath = resolve(tempCorpusRoot, 'fixtures', 'expected', 'normal.compile-result.json');
    writeFileSync(expectedPath, `${readFileSync(expectedPath, 'utf8')} \n`, 'utf8');
    commitMutation(tempCorpusRoot, 'h2 negative control: wrong expected/output hash', [expectedPath]);
    const context = await createContext({ corpusRoot: tempCorpusRoot, subjectRoot });
    const result = await runSuite(context);
    controls.push({
      controlId: 'wrong-expected-hash',
      mutation: 'append-whitespace-to-normal-expected-result',
      conformant: result.summary.conformant,
      detected: result.summary.conformant === false,
      failureReason: result.summary.conformant ? null : 'expected result hash mismatch detected by runner',
      evidence: result.cases.find((item) => item.caseId === 'CC-001')?.inputIntegrity ?? null,
    });
    if (context.contractWorkspace) context.contractWorkspace.cleanup();
    rmSync(tempCorpusRoot, { recursive: true, force: true });
  }

  {
    const context = await createContext({ subjectRoot });
    const sleeve = JSON.parse(readFileSync(resolve(repoRoot, 'fixtures', 'dealership.sleeve.json'), 'utf8'));
    const selection = JSON.parse(readFileSync(resolve(repoRoot, 'fixtures', 'requests', 'secondary-b.selection.json'), 'utf8'));
    const mutated = context.subjectApi.compileSleeve(sleeve, selection);
    mutated.runtime.runtimeHash = 'DEADBEEF';
    const validation = context.subjectApi.validateRuntimeSpecContract(mutated.runtime);
    controls.push({
      controlId: 'wrong-runtime-hash',
      mutation: 'mutate-runtime-hash-in-memory',
      conformant: validation.diagnostics.length === 0,
      detected: validation.diagnostics.length > 0,
      failureReason: validation.diagnostics.length > 0 ? 'runtimeHash contract rejected mutated runtime' : null,
      evidence: validation,
    });
  }

  {
    const tempCorpusRoot = cloneCorpusRepository(repoRoot);
    const manifestPath = resolve(tempCorpusRoot, 'docs', 'qualification', 'H1', 'H1F4B_CORPUS_INTEGRITY_MANIFEST.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.cases = manifest.cases.slice(0, -1);
    manifest.caseCount = manifest.cases.length;
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    commitMutation(tempCorpusRoot, 'h2 negative control: missing required case', [manifestPath]);
    const context = await createContext({ corpusRoot: tempCorpusRoot, subjectRoot });
    const result = await runSuite(context);
    controls.push({
      controlId: 'missing-required-case',
      mutation: 'remove-cc-009e-from-manifest',
      conformant: result.summary.conformant,
      detected: result.summary.conformant === false,
      failureReason: result.summary.conformant ? null : 'case ID sequence mismatch detected by runner',
      evidence: result.corpus.integrity,
    });
    if (context.contractWorkspace) context.contractWorkspace.cleanup();
    rmSync(tempCorpusRoot, { recursive: true, force: true });
  }

  {
    const tempCorpusRoot = cloneCorpusRepository(repoRoot);
    const expectedPath = resolve(tempCorpusRoot, 'fixtures', 'expected', 'multi-secondary-error.compile-result.json');
    const expected = JSON.parse(readFileSync(expectedPath, 'utf8'));
    expected.diagnostics = expected.diagnostics.map((diagnostic) =>
      diagnostic.code === 'MULTIPLE_SECONDARY_DIRECTIVE_MATCH'
        ? { ...diagnostic, code: 'FORCED_DIAGNOSTIC_MISMATCH' }
        : diagnostic,
    );
    writeFileSync(expectedPath, `${JSON.stringify(expected, null, 2)}\n`, 'utf8');
    commitMutation(tempCorpusRoot, 'h2 negative control: altered diagnostic expectation', [expectedPath]);
    const context = await createContext({ corpusRoot: tempCorpusRoot, subjectRoot });
    const result = await runSuite(context);
    controls.push({
      controlId: 'altered-diagnostic-expectation',
      mutation: 'change-failure-diagnostic-code-in-expected-result',
      conformant: result.summary.conformant,
      detected: result.summary.conformant === false,
      failureReason: result.summary.conformant ? null : 'diagnostic comparison mismatch detected by runner',
      evidence: result.cases.find((item) => item.caseId === 'CC-004')?.comparison ?? null,
    });
    if (context.contractWorkspace) context.contractWorkspace.cleanup();
    rmSync(tempCorpusRoot, { recursive: true, force: true });
  }

  return {
    total: controls.length,
    detected: controls.filter((item) => item.detected).length,
    missed: controls.filter((item) => !item.detected).length,
    controls,
  };
}

async function runCrossPlatform(subjectRoot) {
  const windowsContext = await createContext({ subjectRoot });
  const windows = await runSuite(windowsContext);
  if (windowsContext.contractWorkspace) windowsContext.contractWorkspace.cleanup();

  const wslProbe = spawnChecked('wsl.exe', ['bash', '-lc', 'command -v node >/dev/null && command -v npm >/dev/null && command -v git >/dev/null']);
  if (!wslProbe.ok) {
    return {
      windows: {
        available: true,
        fingerprint: hashText(canonicalize(windows)),
        conformant: windows.summary.conformant,
        summary: windows.summary,
      },
      linux: {
        available: false,
        reason: 'wsl_or_tooling_unavailable',
      },
      semanticMismatches: ['linux_unavailable'],
    };
  }

  const script = [
    'set -euo pipefail',
    'repo_root="$(wslpath -a "$REPO_WIN_ROOT")"',
    'workdir="$(mktemp -d)"',
    'trap \'rm -rf "$workdir"\' EXIT',
    'git clone --quiet "$repo_root" "$workdir/repo"',
    'cd "$workdir/repo"',
    'npm ci --silent',
    'npm run build --silent',
    'node h2/conformance/runner.mjs --json',
  ].join('; ');

  const linuxRun = spawnChecked('wsl.exe', ['bash', '-lc', script], {
    env: {
      ...process.env,
      REPO_WIN_ROOT: subjectRoot,
    },
  });

  if (!linuxRun.ok) {
    return {
      windows: {
        available: true,
        fingerprint: hashText(canonicalize(windows)),
        conformant: windows.summary.conformant,
        summary: windows.summary,
      },
      linux: {
        available: true,
        conformant: false,
        exitCode: linuxRun.status,
        stdout: linuxRun.stdout,
        stderr: linuxRun.stderr,
        reason: 'wsl_execution_failed',
      },
      semanticMismatches: ['linux_execution_failed'],
    };
  }

  const linuxResult = JSON.parse(linuxRun.stdout.trim());
  return {
    windows: {
      available: true,
      fingerprint: hashText(canonicalize(windows)),
      conformant: windows.summary.conformant,
      summary: windows.summary,
    },
    linux: {
      available: true,
      fingerprint: hashText(canonicalize(linuxResult)),
      conformant: linuxResult.summary.conformant,
      summary: linuxResult.summary,
    },
    semanticMismatches: canonicalize(windows.cases) === canonicalize(linuxResult.cases) ? [] : ['case_outcomes_differ'],
  };
}

async function runFreshClone(subjectRoot) {
  const tempCloneRoot = makeTempDir('umg-h2-fresh-clone-');
  const cloneResult = spawnChecked('git', ['clone', '--quiet', repoRoot, tempCloneRoot], { cwd: repoRoot });
  if (!cloneResult.ok) {
    rmSync(tempCloneRoot, { recursive: true, force: true });
    return {
      cloneRoot: tempCloneRoot,
      clone: cloneResult,
      npm_ci: { ok: false },
      build: { ok: false },
      existing_tests: { ok: false },
      conformance: { conformant: false },
      clean: { ok: false },
      working_tree_clean: false,
      corpus_unchanged: false,
    };
  }

  const npmCi = spawnChecked('npm', ['ci'], { cwd: tempCloneRoot });
  const build = spawnChecked('npm', ['run', 'build'], { cwd: tempCloneRoot });
  const tests = spawnChecked('npm', ['test'], { cwd: tempCloneRoot });

  const freshContext = await createContext({ corpusRoot: tempCloneRoot, subjectRoot: tempCloneRoot });
  const conformance = await runSuite(freshContext);
  if (freshContext.contractWorkspace) freshContext.contractWorkspace.cleanup();
  const clean = spawnChecked('npm', ['run', 'clean'], { cwd: tempCloneRoot });
  const status = gitStatusPorcelain(tempCloneRoot);
  const head = gitRevParse(tempCloneRoot, 'HEAD');

  const result = {
    cloneRoot: tempCloneRoot,
    head,
    clone: cloneResult,
    npm_ci: npmCi,
    build,
    existing_tests: tests,
    conformance: {
      conformant: conformance.summary.conformant,
      summary: conformance.summary,
      fingerprint: hashText(canonicalize(conformance)),
    },
    working_tree_clean: clean.ok && status.trim().length === 0,
    corpus_unchanged: conformance.corpus.integrity.ok,
    clean,
  };

  rmSync(tempCloneRoot, { recursive: true, force: true });
  return result;
}

function hashManifestForFiles(files) {
  return files
    .map((file) => {
      const text = readFileSync(file, 'utf8');
      return `${sha256BufferUpper(Buffer.from(text, 'utf8'))}  ${file}`;
    })
    .join('\n');
}

function writeMarkdownReport(path, report) {
  const lines = [
    '# H2 Runner Implementation Report',
    '',
    `- Status: \`${report.status}\``,
    `- Subject root: \`${report.subject_root}\``,
    `- Corpus root: \`${report.corpus_root}\``,
    `- Positive summary: ${report.positive.passed}/${report.positive.total} passed, conformant=${report.positive.conformant}`,
    `- Negative controls: ${report.negative_controls.detected}/${report.negative_controls.total} detected`,
    `- Determinism: ${report.determinism.complete_runs} runs, identical=${report.determinism.identical}`,
    `- Cross-platform: windows=${report.cross_platform.windows.conformant}, linux=${report.cross_platform.linux.available ? report.cross_platform.linux.conformant : 'unavailable'}`,
    `- Fresh clone: npm ci=${report.fresh_clone.npm_ci.ok}, build=${report.fresh_clone.build.ok}, tests=${report.fresh_clone.existing_tests.ok}, conformance=${report.fresh_clone.conformance.conformant}`,
    `- Working tree clean: ${report.fresh_clone.working_tree_clean}`,
    `- Corpus unchanged: ${report.fresh_clone.corpus_unchanged}`,
  ];
  writeFileSync(path, `${lines.join('\n')}\n`, 'utf8');
}

async function main() {
  const subjectRoot = repoRoot;
  const context = await createContext({ subjectRoot });
  const positive = await runPositive(context);
  if (context.contractWorkspace) context.contractWorkspace.cleanup();

  const positivePath = writeJsonArtifact('H2_POSITIVE_SELF_TEST_RESULTS.json', positive);
  const determinismContext = await createContext({ subjectRoot });
  const determinism = await runDeterminism(determinismContext);
  if (determinismContext.contractWorkspace) determinismContext.contractWorkspace.cleanup();
  const determinismPath = writeJsonArtifact('H2_DETERMINISM_RESULTS.json', determinism);
  const negative = await runNegativeControls(subjectRoot);
  const negativePath = writeJsonArtifact('H2_NEGATIVE_CONTROL_RESULTS.json', negative);
  const crossPlatform = await runCrossPlatform(subjectRoot);
  const crossPlatformPath = writeJsonArtifact('H2_CROSS_PLATFORM_RESULTS.json', crossPlatform);
  const freshClone = await runFreshClone(subjectRoot);
  const freshClonePath = writeJsonArtifact('H2_FRESH_CLONE_RESULTS.json', freshClone);
  const allEvidencePass =
    positive.summary.conformant &&
    negative.missed === 0 &&
    determinism.identical &&
    crossPlatform.semanticMismatches.length === 0 &&
    freshClone.npm_ci.ok &&
    freshClone.build.ok &&
    freshClone.existing_tests.ok &&
    freshClone.conformance.conformant &&
    freshClone.clean.ok &&
    freshClone.working_tree_clean &&
    freshClone.corpus_unchanged;

  const implementationReport = {
    status: allEvidencePass ? 'VNEXT_PHASE_H2_EXECUTABLE_CONFORMANCE_RUNNER_PASS' : 'VNEXT_PHASE_H2_EXECUTABLE_CONFORMANCE_RUNNER_FAIL',
    subject_root: subjectRoot,
    corpus_root: repoRoot,
    positive: positive.summary,
    negative_controls: {
      total: negative.total,
      detected: negative.detected,
      missed: negative.missed,
    },
    determinism: {
      complete_runs: determinism.completeRuns,
      identical: determinism.identical,
    },
    cross_platform: {
      windows: crossPlatform.windows,
      linux: crossPlatform.linux,
      semantic_mismatches: crossPlatform.semanticMismatches,
    },
    fresh_clone: {
      npm_ci: freshClone.npm_ci,
      build: freshClone.build,
      existing_tests: freshClone.existing_tests,
      conformance: freshClone.conformance,
      clean: freshClone.clean,
      working_tree_clean: freshClone.working_tree_clean,
      corpus_unchanged: freshClone.corpus_unchanged,
    },
  };

  const reportJsonPath = writeJsonArtifact('H2_RUNNER_IMPLEMENTATION_REPORT.json', implementationReport);
  const reportMdPath = resolve(artifactRoot, 'H2_RUNNER_IMPLEMENTATION_REPORT.md');
  writeMarkdownReport(reportMdPath, implementationReport);
  const finalDecision = {
    status: implementationReport.status,
    phase_h2_verified_complete: allEvidencePass,
    executable_conformance_runner_qualified: allEvidencePass,
    h1_corpus_unchanged: freshClone.corpus_unchanged,
    phase_h3_ready: allEvidencePass,
    integration_ready: false,
  };
  const finalDecisionPath = writeJsonArtifact('H2_FINAL_DECISION.json', finalDecision);

  const hashManifestFiles = [
    positivePath,
    determinismPath,
    negativePath,
    crossPlatformPath,
    freshClonePath,
    reportJsonPath,
    reportMdPath,
    finalDecisionPath,
    resolve(artifactRoot, 'H2_EXECUTABLE_CONFORMANCE_RUNNER_CONTRACT.md'),
    resolve(repoRoot, 'h2', 'conformance', 'runner.mjs'),
    resolve(repoRoot, 'h2', 'conformance', 'evidence.mjs'),
    resolve(repoRoot, 'h2', 'conformance', 'internal', 'canonicalize.mjs'),
    resolve(repoRoot, 'h2', 'conformance', 'internal', 'git.mjs'),
    resolve(repoRoot, 'h2', 'conformance', 'internal', 'subject.mjs'),
    resolve(repoRoot, 'h2', 'conformance', 'internal', 'temp-workspace.mjs'),
    resolve(repoRoot, 'h2', 'conformance', 'internal', 'result-contract.mjs'),
  ];
  const manifestText = hashManifestForFiles(hashManifestFiles);
  writeFileSync(resolve(artifactRoot, 'PHASE_H2_ARTIFACT_SHA256SUMS.txt'), `${manifestText}\n`, 'utf8');

  process.stdout.write(
    JSON.stringify(
      {
        positive,
        negative,
        determinism,
        crossPlatform,
        freshClone,
        implementationReport,
        finalDecision,
      },
      null,
      2,
    ),
  );
}

await main();
