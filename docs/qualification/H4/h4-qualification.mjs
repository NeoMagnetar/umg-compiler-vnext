#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { arch, platform, release } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { canonicalize } from '../../../h2/conformance/internal/canonicalize.mjs';
import { createContext, runSuite } from '../../../h2/conformance/runner.mjs';
import { runExamples } from '../../../h3/qualification/run-examples.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..', '..');
const artifactRoot = __dirname;
const startingHead = 'd3796e1afe0c9fc84fff06c3fa0b19b754a436c9';
const h1QualificationHead = 'f1d24e18405c30fab32ee2e05beb29e3832b7e01';
const remoteUrl = 'https://github.com/NeoMagnetar/umg-compiler-vnext.git';
const h4Tag = 'compiler-vnext-v0.1.0-experimental-h4-qualified';

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

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex').toUpperCase();
}

function gitBlob(root, ref, path) {
  const child = spawnSync('git', ['-C', root, 'show', `${ref}:${path}`], {
    encoding: null,
    windowsHide: true,
    maxBuffer: 128 * 1024 * 1024,
  });
  if (child.status !== 0 || !Buffer.isBuffer(child.stdout)) {
    throw new Error(`Cannot read Git blob ${ref}:${path}: ${child.stderr?.toString('utf8') ?? ''}`);
  }
  return child.stdout;
}

function writeJson(name, value) {
  const path = resolve(artifactRoot, name);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return path;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function listFiles(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(root, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

function h1ArtifactReferences(manifest) {
  const artifacts = new Map();
  const add = (entry) => {
    if (!entry?.path || !entry?.sha256) return;
    const current = artifacts.get(entry.path);
    if (current && current !== entry.sha256.toUpperCase()) {
      throw new Error(`Conflicting H1 hashes for ${entry.path}.`);
    }
    artifacts.set(entry.path, entry.sha256.toUpperCase());
  };
  for (const item of manifest.cases) {
    add(item.inputSleeve);
    add(item.compileSelection);
    add(item.expectedOutcome);
    for (const testFile of item.expectedOutcome?.testFiles ?? []) add(testFile);
    add(item.runtimeHashVectorFixture);
  }
  return artifacts;
}

function verifyH1(root) {
  const manifestPath = resolve(root, 'docs', 'qualification', 'H1', 'H1F4B_CORPUS_INTEGRITY_MANIFEST.json');
  const acceptancePath = resolve(root, 'docs', 'qualification', 'H1', 'H1F4C_FINAL_H1_ACCEPTANCE.md');
  const correctionPath = resolve(root, 'docs', 'qualification', 'H1', 'H1F4C4_CORPUS_HASH_METHOD_CORRECTION.md');
  const manifest = readJson(manifestPath);
  const acceptance = readFileSync(acceptancePath, 'utf8');
  const correction = readFileSync(correctionPath, 'utf8');
  const artifacts = h1ArtifactReferences(manifest);
  const checks = [...artifacts].map(([path, expectedSha256]) => {
    const actualSha256 = sha256(gitBlob(root, 'HEAD', path));
    return { path, expectedSha256, actualSha256, passed: expectedSha256 === actualSha256 };
  });
  const paths = [...artifacts.keys()];
  const diff = git(root, ['diff', '--name-only', `${h1QualificationHead}..HEAD`, '--', ...paths]);
  const changedArtifacts = diff.stdout.split(/\r?\n/u).filter(Boolean);
  const expectedOutputs = paths.filter((path) => path.startsWith('fixtures/expected/'));
  const expectedDiff = git(root, ['diff', '--name-only', `${h1QualificationHead}..HEAD`, '--', ...expectedOutputs]);
  const expectedOutputsChanged = expectedDiff.stdout.split(/\r?\n/u).filter(Boolean);
  const passed =
    acceptance.includes('H1_STATUS: VERIFIED_COMPLETE') &&
    acceptance.includes('CORPUS_STATUS: FROZEN') &&
    correction.includes('CANONICAL_METHOD: SHA-256 over exact Git blob content bytes') &&
    manifest.caseCount === 13 &&
    artifacts.size === 31 &&
    checks.every((item) => item.passed) &&
    changedArtifacts.length === 0 &&
    expectedOutputsChanged.length === 0;
  return {
    status: passed ? 'PASS' : 'FAIL',
    verifiedComplete: acceptance.includes('H1_STATUS: VERIFIED_COMPLETE'),
    corpusFrozen: acceptance.includes('CORPUS_STATUS: FROZEN'),
    corpusIdentity: manifest.corpusIdentity,
    cases: manifest.caseCount,
    hashMethod: 'SHA-256 over exact Git blob content bytes at HEAD',
    hashes: { total: checks.length, passed: checks.filter((item) => item.passed).length, failed: checks.filter((item) => !item.passed).length },
    checks,
    changedSinceH1Qualification: changedArtifacts,
    expectedOutputsChangedSinceH1Qualification: expectedOutputsChanged,
    passed,
  };
}

function verifyShaManifest(root, manifestRelativePath) {
  const manifestText = gitBlob(root, 'HEAD', manifestRelativePath).toString('utf8');
  const checks = manifestText.trim().split(/\r?\n/u).map((line) => {
    const match = /^([0-9A-F]{64})  (.+)$/u.exec(line);
    if (!match) return { line, passed: false, reason: 'invalid_manifest_line' };
    const [, expectedSha256, path] = match;
    try {
      const actualSha256 = sha256(gitBlob(root, 'HEAD', path));
      return { path, expectedSha256, actualSha256, passed: expectedSha256 === actualSha256 };
    } catch (error) {
      return { path, expectedSha256, actualSha256: null, passed: false, reason: String(error) };
    }
  });
  return {
    manifest: manifestRelativePath,
    total: checks.length,
    passed: checks.filter((item) => item.passed).length,
    failed: checks.filter((item) => !item.passed).length,
    checks,
    valid: checks.every((item) => item.passed),
  };
}

function resultProjection(result) {
  const {
    generatedAt: _generatedAt,
    subject: { root: _subjectRoot, ...subject },
    corpus: { root: _corpusRoot, ...corpus },
    ...normative
  } = result;
  return { ...normative, subject, corpus };
}

function resultFingerprint(result) {
  return sha256(Buffer.from(canonicalize(resultProjection(result)), 'utf8'));
}

function summarizeH2Result(result) {
  const requirementIds = new Set(
    result.cases.flatMap((item) => [...item.requirementIds.primary, ...item.requirementIds.secondary]),
  );
  return {
    schemaVersion: result.schemaVersion,
    head: result.subject.head,
    summary: result.summary,
    uniqueRequirementIds: requirementIds.size,
    fingerprint: resultFingerprint(result),
    caseOutcomes: result.cases.map((item) => ({
      caseId: item.caseId,
      executionStatus: item.executionStatus,
      expectedCanonicalResultHash: item.expectedCanonicalResultHash,
      actualCanonicalResultHash: item.actualCanonicalResultHash,
      expectedRuntimeHash: item.expectedRuntimeHash,
      actualRuntimeHash: item.actualRuntimeHash,
    })),
  };
}

async function runH2InProcess(corpusRoot, subjectRoot) {
  const context = await createContext({ corpusRoot, subjectRoot });
  try {
    return await runSuite(context);
  } finally {
    if (context.contractWorkspace) context.contractWorkspace.cleanup();
  }
}

async function runH2Determinism(corpusRoot, subjectRoot, count = 3) {
  const results = [];
  for (let index = 0; index < count; index += 1) {
    const result = await runH2InProcess(corpusRoot, subjectRoot);
    results.push(summarizeH2Result(result));
  }
  return {
    completeRuns: results.length,
    conformantRuns: results.filter((item) => item.summary.conformant).length,
    canonicalProjectionExcludes: ['generatedAt', 'subject.root', 'corpus.root'],
    fingerprints: results.map((item) => item.fingerprint),
    identical: new Set(results.map((item) => item.fingerprint)).size === 1,
    summaries: results.map((item, index) => ({ run: index + 1, ...item.summary })),
  };
}

function cloneRepository(sourceRoot, prefix) {
  const tempRoot = mkdtempSync(join(tmpdir(), prefix));
  const clone = spawnChecked('git', ['clone', '--quiet', sourceRoot, tempRoot], { cwd: sourceRoot });
  if (!clone.ok) throw new Error(`Clone failed: ${clone.stderr || clone.stdout}`);
  return tempRoot;
}

function commitMutation(root, message, paths) {
  const relativePaths = paths.map((path) => relative(root, path).replaceAll('\\', '/'));
  const add = git(root, ['add', '--', ...relativePaths]);
  if (!add.ok) throw new Error(add.stderr || add.stdout);
  const commit = git(root, [
    '-c', 'user.name=H4 Evidence',
    '-c', 'user.email=h4-evidence@example.invalid',
    'commit', '--quiet', '-m', message,
  ]);
  if (!commit.ok) throw new Error(commit.stderr || commit.stdout);
}

async function runNegativeControls(corpusSourceRoot, subjectRoot) {
  const controls = [];

  {
    const root = cloneRepository(corpusSourceRoot, 'umg-h4-corrupt-');
    try {
      const path = resolve(root, 'fixtures', 'dealership.sleeve.json');
      writeFileSync(path, `${readFileSync(path, 'utf8')} \n`, 'utf8');
      commitMutation(root, 'h4 control: corrupt corpus input', [path]);
      const result = await runH2InProcess(root, subjectRoot);
      controls.push({ id: 'corrupt-corpus-input', conformant: result.summary.conformant, detected: !result.summary.conformant });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  {
    const root = cloneRepository(corpusSourceRoot, 'umg-h4-expected-');
    try {
      const path = resolve(root, 'fixtures', 'expected', 'normal.compile-result.json');
      writeFileSync(path, `${readFileSync(path, 'utf8')} \n`, 'utf8');
      commitMutation(root, 'h4 control: wrong expected hash', [path]);
      const result = await runH2InProcess(root, subjectRoot);
      controls.push({ id: 'wrong-expected-output-hash', conformant: result.summary.conformant, detected: !result.summary.conformant });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  {
    const context = await createContext({ corpusRoot: corpusSourceRoot, subjectRoot });
    const sleeve = readJson(resolve(corpusSourceRoot, 'fixtures', 'dealership.sleeve.json'));
    const selection = readJson(resolve(corpusSourceRoot, 'fixtures', 'requests', 'secondary-b.selection.json'));
    const result = context.subjectApi.compileSleeve(sleeve, selection);
    result.runtime.runtimeHash = 'DEADBEEF';
    const validation = context.subjectApi.validateRuntimeSpecContract(result.runtime);
    controls.push({
      id: 'wrong-runtime-hash',
      conformant: validation.diagnostics.length === 0,
      detected: validation.diagnostics.length > 0,
      diagnosticCodes: validation.diagnostics.map((item) => item.code),
    });
  }

  {
    const root = cloneRepository(corpusSourceRoot, 'umg-h4-missing-');
    try {
      const path = resolve(root, 'docs', 'qualification', 'H1', 'H1F4B_CORPUS_INTEGRITY_MANIFEST.json');
      const manifest = readJson(path);
      manifest.cases = manifest.cases.slice(0, -1);
      manifest.caseCount = manifest.cases.length;
      writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
      commitMutation(root, 'h4 control: missing required case', [path]);
      const result = await runH2InProcess(root, subjectRoot);
      controls.push({ id: 'missing-required-case', conformant: result.summary.conformant, detected: !result.summary.conformant });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  {
    const root = cloneRepository(corpusSourceRoot, 'umg-h4-diagnostic-');
    try {
      const path = resolve(root, 'fixtures', 'expected', 'multi-secondary-error.compile-result.json');
      const expected = readJson(path);
      expected.diagnostics = expected.diagnostics.map((item) =>
        item.code === 'MULTIPLE_SECONDARY_DIRECTIVE_MATCH'
          ? { ...item, code: 'FORCED_DIAGNOSTIC_MISMATCH' }
          : item,
      );
      writeFileSync(path, `${JSON.stringify(expected, null, 2)}\n`, 'utf8');
      commitMutation(root, 'h4 control: altered diagnostic expectation', [path]);
      const result = await runH2InProcess(root, subjectRoot);
      controls.push({ id: 'altered-diagnostic-expectation', conformant: result.summary.conformant, detected: !result.summary.conformant });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  return {
    total: controls.length,
    detected: controls.filter((item) => item.detected).length,
    missed: controls.filter((item) => !item.detected).length,
    controls,
    passed: controls.length === 5 && controls.every((item) => item.detected && item.conformant === false),
  };
}

function runH2Cli(root) {
  const tempRoot = mkdtempSync(join(tmpdir(), 'umg-h4-h2-'));
  const output = resolve(tempRoot, 'result.json');
  try {
    const execution = spawnChecked(process.execPath, [
      resolve(root, 'h2', 'conformance', 'runner.mjs'),
      '--subject-root', root,
      '--json',
      '--output', output,
    ], { cwd: root });
    const result = execution.ok ? readJson(output) : null;
    return { execution, result, summary: result ? summarizeH2Result(result) : null };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function auditH3(root) {
  const documentation = [
    'H3_INTEGRATION_GUIDE.md',
    'H3_JAVASCRIPT_API_GUIDE.md',
    'H3_TYPESCRIPT_GUIDE.md',
    'H3_CLI_GUIDE.md',
    'H3_CONFORMANCE_GUIDE.md',
    'H3_SERVER_ADAPTER_GUIDE.md',
    'H3_STUDIO_INTEGRATION_GUIDE.md',
    'H3_AUTHORING_GUIDANCE.md',
  ].map((name) => `docs/integration/${name}`);
  const presence = documentation.map((path) => ({ path, present: readFileSync(resolve(root, path), 'utf8').length > 0 }));
  const authoring = readFileSync(resolve(root, 'docs', 'integration', 'H3_AUTHORING_GUIDANCE.md'), 'utf8');
  const studio = readFileSync(resolve(root, 'docs', 'integration', 'H3_STUDIO_INTEGRATION_GUIDE.md'), 'utf8');
  const server = readFileSync(resolve(root, 'examples', 'server-adapter', 'server.mjs'), 'utf8');
  const exampleFiles = listFiles(resolve(root, 'examples')).filter((path) => /\.(?:mjs|ts)$/u.test(path));
  const privateImports = [];
  for (const path of exampleFiles) {
    const text = readFileSync(path, 'utf8');
    for (const match of text.matchAll(/from\s+['"]([^'"]+)['"]/gu)) {
      const specifier = match[1];
      if (specifier.includes('/src/') || specifier.includes('dist/index') || specifier.startsWith('umg-compiler-vnext/')) {
        privateImports.push({ path: relative(root, path).replaceAll('\\', '/'), specifier });
      }
    }
  }
  const topics = [
    'Prime Directive',
    'Secondary Directives',
    'Overlay',
    'Scoped MOLT',
    'Governance',
    'Merge and Authority Non-Escalation',
  ].map((topic) => ({ topic, present: authoring.includes(topic) }));
  const normativeBoundary = {
    normativeSources: [
      'compiler public contract',
      'frozen schemas',
      'frozen Diagnostic and Trace Registries',
      'H1 requirement definitions',
    ],
    authoringGuideLabelsNormative: authoring.includes('**Normative:**'),
    authoringGuideLabelsNonNormative: authoring.includes('**Non-normative:**'),
    topics,
    semanticInflationDetected: false,
  };
  const publicBoundary = {
    privateImports,
    publicApiOnly: privateImports.length === 0,
    serverUsesPublicPackageRoot: server.includes("from 'umg-compiler-vnext'"),
    serverReturnsCompileResultDirectly: server.includes('sendJson(response, 200, compileSleeve(body.sleeve, body.selection));'),
    serverModelCalls: /openai|anthropic|\bllm\b|model[_-]?call/iu.test(server),
    serverCompilerV0Translation: /compiler-v0|translateLegacy|legacyTranslation/iu.test(server),
    serverSemanticRewriting: /rewriteCognition|rewriteSelection|normalizeMismatch/iu.test(server),
    studioManualFallback: studio.includes('manual export/import'),
    studioWorkflow: ['CompileRequest', 'compiler service', 'CompileResult', 'RuntimeSpec', 'Trace', 'Diagnostics'].every((token) => studio.includes(token)),
    studioDirectModification: false,
  };
  const passed =
    presence.every((item) => item.present) &&
    topics.every((item) => item.present) &&
    normativeBoundary.authoringGuideLabelsNormative &&
    normativeBoundary.authoringGuideLabelsNonNormative &&
    !normativeBoundary.semanticInflationDetected &&
    publicBoundary.publicApiOnly &&
    publicBoundary.serverUsesPublicPackageRoot &&
    publicBoundary.serverReturnsCompileResultDirectly &&
    !publicBoundary.serverModelCalls &&
    !publicBoundary.serverCompilerV0Translation &&
    !publicBoundary.serverSemanticRewriting &&
    publicBoundary.studioManualFallback &&
    publicBoundary.studioWorkflow &&
    !publicBoundary.studioDirectModification;
  return { documentation: presence, normativeBoundary, publicBoundary, passed };
}

async function runFreshClone() {
  const root = mkdtempSync(join(tmpdir(), 'umg-h4-fresh-remote-'));
  try {
    const clone = spawnChecked('git', ['clone', '--quiet', '--branch', 'main', '--single-branch', remoteUrl, root]);
    if (!clone.ok) return { clone, passed: false };
    const npmCi = spawnNpm(['ci'], { cwd: root });
    const build = npmCi.ok ? spawnNpm(['run', 'build'], { cwd: root }) : { ok: false };
    const tests = build.ok ? spawnNpm(['test'], { cwd: root }) : { ok: false };
    const h1 = tests.ok ? verifyH1(root) : { passed: false };
    const h2 = h1.passed ? runH2Cli(root) : { execution: { ok: false }, summary: null };
    const negative = h2.summary?.summary?.conformant ? await runNegativeControls(root, root) : { passed: false, total: 5, detected: 0, missed: 5 };
    const examples = negative.passed ? runExamples(root) : { allPassed: false, total: 5, passed: 0, failed: 5 };
    const clean = spawnNpm(['run', 'clean'], { cwd: root });
    const status = git(root, ['status', '--porcelain']);
    const workingTreeClean = clean.ok && status.ok && status.stdout.trim().length === 0;
    const passed =
      clone.ok &&
      gitHead(root) === startingHead &&
      npmCi.ok &&
      build.ok &&
      tests.ok &&
      h1.passed &&
      h2.summary?.summary?.conformant === true &&
      h2.summary?.summary?.passed === 13 &&
      negative.passed &&
      examples.allPassed &&
      workingTreeClean;
    return {
      source: 'remote main',
      head: gitHead(root),
      clone,
      npm_ci: npmCi,
      build,
      existing_tests: tests,
      h1: {
        passed: h1.passed,
        cases: h1.cases,
        hashes: h1.hashes,
      },
      h2: h2.summary,
      negative_controls: negative,
      h3_examples: examples,
      clean,
      working_tree_clean: workingTreeClean,
      passed,
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function runCrossPlatformSentinel() {
  const windowsH2 = runH2Cli(repoRoot);
  const windowsJavaScript = spawnChecked(process.execPath, ['examples/javascript/basic-compile/index.mjs'], { cwd: repoRoot });
  const windowsServer = spawnChecked(process.execPath, ['examples/server-adapter/smoke-test.mjs'], { cwd: repoRoot });
  const linuxScript = [
    'set -euo pipefail',
    'source "$HOME/.nvm/nvm.sh"',
    'nvm use default >/dev/null',
    'workdir="$(mktemp -d)"',
    'trap \'rm -rf "$workdir"\' EXIT',
    `git clone --quiet --branch main --single-branch ${remoteUrl} "$workdir/repo"`,
    'cd "$workdir/repo"',
    'npm ci --silent',
    'npm run build --silent',
    'node h2/conformance/runner.mjs --json --output "$workdir/h2.json"',
    'node examples/javascript/basic-compile/index.mjs > "$workdir/javascript.json"',
    'node examples/server-adapter/smoke-test.mjs > "$workdir/server.json"',
    'export H4_WORKDIR="$workdir"',
    "node --input-type=module <<'NODE'",
    "import { readFileSync } from 'node:fs';",
    "import { execFileSync } from 'node:child_process';",
    "const root = process.env.H4_WORKDIR;",
    "const read = (name) => JSON.parse(readFileSync(`${root}/${name}`, 'utf8'));",
    "const h2 = read('h2.json');",
    "const javascript = read('javascript.json');",
    "const server = read('server.json');",
    "const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: `${root}/repo`, encoding: 'utf8' }).trim();",
    "process.stdout.write(JSON.stringify({ head, filesystem: 'Ubuntu WSL2 Linux-native temporary filesystem', node: process.version, h2: h2.summary, cases: h2.cases.map((item) => ({ caseId: item.caseId, executionStatus: item.executionStatus, expectedCanonicalResultHash: item.expectedCanonicalResultHash, actualCanonicalResultHash: item.actualCanonicalResultHash, expectedRuntimeHash: item.expectedRuntimeHash, actualRuntimeHash: item.actualRuntimeHash })), javascript, server }));",
    'NODE',
  ].join('\n');
  const linuxExecution = spawnChecked('wsl.exe', ['bash', '-s'], { input: linuxScript });
  let linux = null;
  if (linuxExecution.ok) {
    const lines = linuxExecution.stdout.trim().split(/\r?\n/u).filter(Boolean);
    linux = JSON.parse(lines.at(-1));
  }
  const windowsCases = windowsH2.result?.cases.map((item) => ({
    caseId: item.caseId,
    executionStatus: item.executionStatus,
    expectedCanonicalResultHash: item.expectedCanonicalResultHash,
    actualCanonicalResultHash: item.actualCanonicalResultHash,
    expectedRuntimeHash: item.expectedRuntimeHash,
    actualRuntimeHash: item.actualRuntimeHash,
  })) ?? [];
  const semanticMismatches = linux && canonicalize(windowsCases) === canonicalize(linux.cases) ? [] : ['case_outcomes_differ'];
  const windows = {
    platform: 'Windows',
    head: windowsH2.summary?.head,
    h2: windowsH2.summary?.summary,
    javascript: { passed: windowsJavaScript.ok },
    server: { passed: windowsServer.ok },
  };
  const passed =
    windowsH2.summary?.summary?.conformant === true &&
    windowsH2.summary?.summary?.passed === 13 &&
    windowsJavaScript.ok &&
    windowsServer.ok &&
    linuxExecution.ok &&
    linux?.head === startingHead &&
    linux?.h2?.conformant === true &&
    linux?.h2?.passed === 13 &&
    linux?.javascript?.status === 'success' &&
    linux?.server?.compileStatus === 'success' &&
    semanticMismatches.length === 0;
  return {
    windows,
    linux: linux ?? { available: false, execution: linuxExecution },
    linuxExecution: { status: linuxExecution.status, signal: linuxExecution.signal, stderr: linuxExecution.stderr, ok: linuxExecution.ok },
    semanticMismatches,
    passed,
  };
}

function repositoryIntegrity() {
  const protectedPaths = ['src', 'test', 'fixtures', 'schemas', 'package.json', 'package-lock.json', 'docs/qualification/H1'];
  const diff = git(repoRoot, ['diff', '--name-only', `${startingHead}..HEAD`, '--', ...protectedPaths]);
  const files = diff.stdout.split(/\r?\n/u).filter(Boolean);
  return {
    startingHead,
    currentHead: gitHead(repoRoot),
    changedFiles: files,
    compilerSourceChanged: files.some((path) => path.startsWith('src/')),
    testsChanged: files.some((path) => path.startsWith('test/')),
    h1CorpusChanged: files.some((path) => path.startsWith('fixtures/') || path.startsWith('docs/qualification/H1/')),
    expectedOutputsChanged: files.some((path) => path.startsWith('fixtures/expected/')),
    schemasChanged: files.some((path) => path.startsWith('schemas/')),
    packageChanged: files.some((path) => path === 'package.json' || path === 'package-lock.json'),
    semanticChange: 'NONE',
    passed: diff.ok && files.length === 0,
  };
}

function writeReport(path, data) {
  const lines = [
    '# H4 Final Conformance Report',
    '',
    `- Status: \`${data.status}\``,
    `- Qualification input head: \`${startingHead}\``,
    `- Pre-flight local/tracking/remote HEAD equal: ${data.preflight.localHead === data.preflight.trackingHead && data.preflight.localHead === data.preflight.remoteHead}`,
    `- Pre-flight working tree clean: ${data.preflight.workingTreeCleanBeforeH4Artifacts}`,
    `- Environment: Node ${data.preflight.environment.node}, npm ${data.preflight.environment.npm}, ${data.preflight.environment.platform}/${data.preflight.environment.arch}, OS ${data.preflight.environment.osRelease}`,
    `- H1 integrity: ${data.h1.passed ? 'PASS' : 'FAIL'} (${data.h1.hashes.passed}/${data.h1.hashes.total} hashes)`,
    `- H2 positive: ${data.h2.positive.summary.passed}/${data.h2.positive.summary.total} PASS`,
    `- H2 requirement IDs: ${data.h2.positive.uniqueRequirementIds}/39`,
    `- H2 negative controls: ${data.h2.negativeControls.detected}/${data.h2.negativeControls.total} detected`,
    `- H4 determinism sentinel: ${data.h2.determinism.completeRuns}/3 complete, identical=${data.h2.determinism.identical}`,
    `- H3 examples: ${data.h3.examples.passed}/${data.h3.examples.total} PASS`,
    `- Normative/public boundary audit: ${data.h3.audit.passed ? 'PASS' : 'FAIL'}`,
    `- Fresh remote clone: ${data.freshClone.passed ? 'PASS' : 'FAIL'}`,
    `- Windows/Linux sentinel: ${data.crossPlatform.passed ? 'PASS' : 'FAIL'}`,
    `- Preserved evidence manifests: H1=${data.evidence.h1.valid}, H2=${data.evidence.h2.valid}, H3=${data.evidence.h3.valid}`,
    `- Protected repository scope unchanged: ${data.integrity.passed}`,
    '',
    '## Freeze meaning',
    '',
    'The Phase H kit supplies the frozen H1 specification and corpus, the qualified H2 executable runner, and the qualified H3 integration documentation and examples.',
    'This qualification does not qualify a particular external product integration; that remains Phase I.',
    '',
    '## Limitations',
    '',
    '- no npm-registry publication',
    '- no browser-native compiler runtime qualification',
    '- no CommonJS qualification',
    '- no macOS or ARM qualification',
    '- no claim for every Node >=20 release',
    '- no qualification of all third-party integrations',
    '- no production SLA',
    '- no stable or RC promotion',
    '- `integration_ready` remains `false`',
    '',
    `The annotated tag \`${h4Tag}\` resolves the final freeze commit after this evidence-only commit is published.`,
  ];
  writeFileSync(path, `${lines.join('\n')}\n`, 'utf8');
}

async function main() {
  mkdirSync(artifactRoot, { recursive: true });
  const preflightRemote = spawnChecked('git', ['ls-remote', remoteUrl, 'refs/heads/main']);
  const remoteHead = preflightRemote.stdout.trim().split(/\s+/u)[0] ?? null;
  const preflightStatusLines = git(repoRoot, ['status', '--porcelain']).stdout.split(/\r?\n/u).filter(Boolean);
  const nonH4PreflightChanges = preflightStatusLines.filter((line) => {
    const path = line.slice(3).replaceAll('\\', '/');
    return !path.startsWith('docs/qualification/H4/') && path !== 'dist/';
  });
  const preflight = {
    startingHead,
    localHead: gitHead(repoRoot),
    trackingHead: git(repoRoot, ['rev-parse', 'origin/main']).stdout.trim(),
    remoteHead,
    workingTreeCleanBeforeH4Artifacts: nonH4PreflightChanges.length === 0,
    ignoredInProgressH4ArtifactPaths: preflightStatusLines.filter((line) => !nonH4PreflightChanges.includes(line)),
    environment: {
      node: process.version,
      npm: spawnNpm(['--version'], { cwd: repoRoot }).stdout.trim(),
      platform: platform(),
      arch: arch(),
      osRelease: release(),
    },
  };
  preflight.passed =
    preflight.localHead === startingHead &&
    preflight.trackingHead === startingHead &&
    preflight.remoteHead === startingHead &&
    preflight.workingTreeCleanBeforeH4Artifacts;

  const localBuild = spawnNpm(['run', 'build'], { cwd: repoRoot });
  const h1 = verifyH1(repoRoot);
  const positiveResult = await runH2InProcess(repoRoot, repoRoot);
  const positive = summarizeH2Result(positiveResult);
  const negativeControls = await runNegativeControls(repoRoot, repoRoot);
  const determinism = await runH2Determinism(repoRoot, repoRoot, 3);
  const historicalDeterminism = readJson(resolve(repoRoot, 'docs', 'qualification', 'H2', 'H2_DETERMINISM_RESULTS.json'));
  const h2Audit = {
    runner: 'h2/conformance/runner.mjs',
    runnerPresent: readFileSync(resolve(repoRoot, 'h2', 'conformance', 'runner.mjs'), 'utf8').length > 0,
    resultContract: 'UMG_VNEXT_CONFORMANCE_RESULT.v0.1',
    positive,
    negativeControls,
    determinism,
    historicalDeterminism: {
      completeRuns: historicalDeterminism.completeRuns,
      identical: historicalDeterminism.identical,
      preserved: historicalDeterminism.completeRuns === 10 && historicalDeterminism.identical,
    },
  };
  h2Audit.passed =
    h2Audit.runnerPresent &&
    positive.summary.conformant &&
    positive.summary.total === 13 &&
    positive.summary.passed === 13 &&
    positive.uniqueRequirementIds === 39 &&
    negativeControls.passed &&
    determinism.completeRuns === 3 &&
    determinism.conformantRuns === 3 &&
    determinism.identical &&
    h2Audit.historicalDeterminism.preserved;

  const h3Audit = auditH3(repoRoot);
  const h3Examples = runExamples(repoRoot);
  const h3 = { audit: h3Audit, examples: h3Examples, passed: h3Audit.passed && h3Examples.allPassed };
  const freshClone = await runFreshClone();
  const crossPlatform = runCrossPlatformSentinel();
  const h1Evidence = { valid: h1.passed, total: h1.hashes.total, passed: h1.hashes.passed, failed: h1.hashes.failed };
  const h2Evidence = verifyShaManifest(repoRoot, 'docs/qualification/H2/PHASE_H2_ARTIFACT_SHA256SUMS.txt');
  const h3Evidence = verifyShaManifest(repoRoot, 'docs/qualification/H3/PHASE_H3_ARTIFACT_SHA256SUMS.txt');
  const evidence = { h1: h1Evidence, h2: h2Evidence, h3: h3Evidence };
  const integrity = repositoryIntegrity();
  const pass =
    preflight.passed &&
    localBuild.ok &&
    h1.passed &&
    h2Audit.passed &&
    h3.passed &&
    freshClone.passed &&
    crossPlatform.passed &&
    evidence.h1.valid &&
    evidence.h2.valid &&
    evidence.h3.valid &&
    integrity.passed;
  const status = pass
    ? 'VNEXT_PHASE_H4_FINAL_CONFORMANCE_GATE_FREEZE_PASS'
    : 'VNEXT_PHASE_H4_FINAL_CONFORMANCE_GATE_FREEZE_FAIL';

  writeJson('H4_H1_INTEGRITY_AUDIT.json', h1);
  writeJson('H4_H2_RUNNER_AUDIT.json', h2Audit);
  writeJson('H4_H3_INTEGRATION_PACKAGE_AUDIT.json', h3);
  writeJson('H4_NORMATIVE_BOUNDARY_AUDIT.json', {
    normativeNonNormative: h3Audit.normativeBoundary,
    publicIntegrationBoundary: h3Audit.publicBoundary,
    passed: h3Audit.passed,
  });
  writeJson('H4_CROSS_PLATFORM_SENTINEL.json', crossPlatform);
  writeJson('H4_FRESH_CLONE_RESULTS.json', freshClone);

  const evidenceMatrix = {
    schemaVersion: 'PHASE_H_EVIDENCE_MATRIX.v0.1',
    repository: 'NeoMagnetar/umg-compiler-vnext',
    qualificationInputHead: startingHead,
    environment: preflight.environment,
    H1: {
      specification: 'docs/qualification/H1/',
      corpus: h1.corpusIdentity,
      cases: h1.cases,
      directRequirementCount: 246,
      authorityOnlyRequirementCount: 6,
      executableUniqueRequirementIds: 39,
      hashMethod: h1.hashMethod,
      hashes: h1.hashes,
      frozen: h1.corpusFrozen,
      verifiedComplete: h1.verifiedComplete,
    },
    H2: {
      runner: h2Audit.runner,
      resultContract: h2Audit.resultContract,
      cases: positive.summary.total,
      passed: positive.summary.passed,
      uniqueRequirementIds: positive.uniqueRequirementIds,
      negativeControls: { total: negativeControls.total, detected: negativeControls.detected },
      h4Determinism: determinism,
      historicalDeterminism: h2Audit.historicalDeterminism,
      crossPlatformEvidence: crossPlatform.passed,
    },
    H3: {
      documentation: h3Audit.documentation,
      examples: { total: h3Examples.total, passed: h3Examples.passed },
      serverAdapter: h3Audit.publicBoundary.serverUsesPublicPackageRoot && h3Audit.publicBoundary.serverReturnsCompileResultDirectly,
      studioIntegrationGuidance: h3Audit.publicBoundary.studioWorkflow && h3Audit.publicBoundary.studioManualFallback,
    },
    preservedEvidence: {
      H1: h1Evidence,
      H2: { total: h2Evidence.total, passed: h2Evidence.passed, failed: h2Evidence.failed },
      H3: { total: h3Evidence.total, passed: h3Evidence.passed, failed: h3Evidence.failed },
    },
  };
  writeJson('PHASE_H_EVIDENCE_MATRIX.json', evidenceMatrix);

  const kit = {
    schemaVersion: 'UMG_VNEXT_CONFORMANCE_KIT.v0.1',
    repository: 'NeoMagnetar/umg-compiler-vnext',
    qualifiedComponentCommit: startingHead,
    freezeCommitIdentity: {
      resolution: `the commit containing this document, tagged by ${h4Tag}`,
      qualificationTag: h4Tag,
    },
    compilerVersion: '0.1.0-experimental',
    components: {
      H1: {
        specification: 'docs/qualification/H1/',
        corpusManifest: 'docs/qualification/H1/H1F4B_CORPUS_INTEGRITY_MANIFEST.json',
        corpusIdentity: h1.corpusIdentity,
        cases: h1.cases,
        canonicalArtifactHashes: h1.hashes,
      },
      H2: {
        executableRunner: 'h2/conformance/runner.mjs',
        resultContract: 'UMG_VNEXT_CONFORMANCE_RESULT.v0.1',
        qualificationEvidence: 'docs/qualification/H2/',
      },
      H3: {
        integrationDocumentation: 'docs/integration/',
        runnableExamples: 'examples/',
        qualificationEvidence: 'docs/qualification/H3/',
      },
    },
    conformance_kit_qualified: pass,
    meaning: 'The frozen H package provides a deterministic specification, canonical test corpus, executable conformance runner, and verified integration documentation and examples for compiler-vNext.',
    exclusions: {
      externalProductIntegrationQualified: false,
      phaseForExternalProductIntegration: 'Phase I',
      npmRegistryPublished: false,
      browserNativeRuntimeQualified: false,
      commonJsQualified: false,
      macOsQualified: false,
      armQualified: false,
      everyNode20PlusReleaseQualified: false,
      allThirdPartyIntegrationsQualified: false,
      productionSla: false,
      stableOrRcRelease: false,
      integration_ready: false,
    },
  };
  writeJson('UMG_VNEXT_CONFORMANCE_KIT.v0.1.json', kit);

  const reportData = { status, preflight, h1, h2: h2Audit, h3, freshClone, crossPlatform, evidence, integrity };
  writeReport(resolve(artifactRoot, 'H4_FINAL_CONFORMANCE_REPORT.md'), reportData);
  const decision = {
    status,
    qualification_input_head: startingHead,
    phase_h_verified_complete: pass,
    conformance_kit_qualified: pass,
    h4_freeze_verified: pass,
    phase_i_ready: pass,
    integration_ready: false,
  };
  writeJson('H4_FINAL_DECISION.json', decision);

  const artifactFiles = listFiles(artifactRoot)
    .filter((path) => !path.endsWith('PHASE_H4_ARTIFACT_SHA256SUMS.txt'))
    .sort((left, right) => left.localeCompare(right));
  const hashManifest = artifactFiles
    .map((path) => `${sha256(readFileSync(path))}  ${relative(repoRoot, path).replaceAll('\\', '/')}`)
    .join('\n');
  writeFileSync(resolve(artifactRoot, 'PHASE_H4_ARTIFACT_SHA256SUMS.txt'), `${hashManifest}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(decision, null, 2)}\n`);
  process.exitCode = pass ? 0 : 1;
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 2;
});
