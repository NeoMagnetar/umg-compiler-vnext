#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { canonicalize, sha256Canonical } from './internal/canonicalize.mjs';
import {
  gitRevParse,
  gitShowBlobBuffer,
  gitShowBlobText,
  readGitJson,
  sha256BufferUpper,
  verifyGitBlobHash,
} from './internal/git.mjs';
import { loadSubjectApi } from './internal/subject.mjs';
import { materializeContractWorkspace } from './internal/temp-workspace.mjs';
import { validateConformanceResult } from './internal/result-contract.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const defaultCorpusRoot = resolve(__dirname, '..', '..');
const EXPECTED_CASE_IDS = [
  'CC-001',
  'CC-002A',
  'CC-002B',
  'CC-003A',
  'CC-004',
  'CC-005',
  'CC-006',
  'CC-007',
  'CC-008',
  'CC-009B',
  'CC-009C',
  'CC-009D',
  'CC-009E',
];

function usage() {
  return [
    'Usage:',
    '  node h2/conformance/runner.mjs [--subject-root <dir>] [--json] [--output <file>]',
    '',
    'Options:',
    '  --help            Show this help text.',
    '  --json            Emit machine-readable JSON to stdout unless --output is used.',
    '  --output <file>   Write JSON output to the given file.',
    '  --subject-root    Subject/compiler root to test. Defaults to the current repository root.',
  ].join('\n');
}

function parseArgs(argv) {
  const options = {
    json: false,
    output: null,
    subjectRoot: defaultCorpusRoot,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--output') {
      const next = argv[index + 1];
      if (!next) throw new Error('--output requires a file path');
      options.output = resolve(process.cwd(), next);
      index += 1;
    } else if (arg.startsWith('--output=')) {
      options.output = resolve(process.cwd(), arg.slice('--output='.length));
    } else if (arg === '--subject-root') {
      const next = argv[index + 1];
      if (!next) throw new Error('--subject-root requires a directory path');
      options.subjectRoot = resolve(process.cwd(), next);
      index += 1;
    } else if (arg.startsWith('--subject-root=')) {
      options.subjectRoot = resolve(process.cwd(), arg.slice('--subject-root='.length));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function normalizePath(path) {
  return path.replaceAll('\\', '/');
}

function loadFixtureCaseMapForRoot(root) {
  const fixtureCasesUrl = pathToFileURL(resolve(root, 'test', 'fixture-cases.mjs')).href;
  return import(fixtureCasesUrl).then(({ compileCases }) => {
    const selectionSnapshotMap = new Map();
    const caseSnapshotMap = new Map();
    for (const testCase of compileCases) {
      selectionSnapshotMap.set(normalizePath(testCase.selectionPath), normalizePath(testCase.expectedPath));
      if (testCase.sleevePath) {
        caseSnapshotMap.set(
          `${normalizePath(testCase.sleevePath)}::${normalizePath(testCase.selectionPath)}`,
          normalizePath(testCase.expectedPath),
        );
      }
    }
    return { selectionSnapshotMap, caseSnapshotMap };
  });
}

function compareMaybeCanonical(expected, actual) {
  if (expected === null || expected === undefined) {
    return { status: 'not_applicable', expected: null, actual: actual ?? null, equal: null };
  }
  const equal = canonicalize(expected) === canonicalize(actual);
  return {
    status: equal ? 'match' : 'mismatch',
    expected,
    actual,
    equal,
  };
}

function makeCode(label, details = {}) {
  return { label, ...details };
}

function compareHashes(expectedHash, actualHash) {
  const expected = expectedHash ? expectedHash.toUpperCase() : null;
  const actual = actualHash ? actualHash.toUpperCase() : null;
  if (expected === null) {
    return { status: 'not_applicable', expected, actual, equal: null };
  }
  return {
    status: expected === actual ? 'match' : 'mismatch',
    expected,
    actual,
    equal: expected === actual,
  };
}

function compareCollections(expected, actual) {
  const left = expected ? canonicalize(expected) : null;
  const right = actual ? canonicalize(actual) : null;
  if (left === null) {
    return { status: 'not_applicable', expected: null, actual: actual ?? null, equal: null };
  }
  return {
    status: left === right ? 'match' : 'mismatch',
    expected,
    actual,
    equal: left === right,
  };
}

async function createContext({ corpusRoot = defaultCorpusRoot, subjectRoot = corpusRoot } = {}) {
  const [subjectApi, selectionSnapshotMap] = await Promise.all([
    loadSubjectApi(subjectRoot),
    loadFixtureCaseMapForRoot(corpusRoot),
  ]);

  const manifest = readGitJson(corpusRoot, 'docs/qualification/H1/H1F4B_CORPUS_INTEGRITY_MANIFEST.json');
  const currentHead = gitRevParse(subjectRoot, 'HEAD');

  return {
    corpusRoot,
    subjectRoot,
    currentHead,
    manifest,
    subjectApi,
    selectionSnapshotMap,
    contractWorkspace: null,
  };
}

function ensureContractWorkspace(context) {
  if (!context.contractWorkspace) {
    context.contractWorkspace = materializeContractWorkspace({
      corpusRoot: context.corpusRoot,
      subjectRoot: context.subjectRoot,
    });
  }
  return context.contractWorkspace;
}

function readCanonicalJsonCase(corpusRoot, casePath) {
  return JSON.parse(gitShowBlobText(corpusRoot, casePath));
}

function verifyManifestIntegrity(manifest) {
  const checks = [];
  let ok = true;

  if (manifest.corpusIdentity !== 'umg.compiler-vnext.corpus.v0.1') {
    ok = false;
    checks.push(makeCode('bad_corpus_identity', { actual: manifest.corpusIdentity }));
  }

  if (manifest.caseCount !== manifest.cases.length) {
    ok = false;
    checks.push(makeCode('case_count_mismatch', { expected: manifest.caseCount, actual: manifest.cases.length }));
  }

  const seen = new Set();
  const actualCaseIds = manifest.cases.map((testCase) => testCase.caseId);
  if (actualCaseIds.length !== EXPECTED_CASE_IDS.length || actualCaseIds.some((caseId, index) => caseId !== EXPECTED_CASE_IDS[index])) {
    ok = false;
    checks.push(makeCode('case_id_sequence_mismatch', { expected: EXPECTED_CASE_IDS, actual: actualCaseIds }));
  }

  for (const testCase of manifest.cases) {
    if (seen.has(testCase.caseId)) {
      ok = false;
      checks.push(makeCode('duplicate_case_id', { caseId: testCase.caseId }));
    }
    seen.add(testCase.caseId);
  }

  return { ok, checks };
}

function evaluateCompileResultContracts(subjectApi, result) {
  const schema = subjectApi.structurallyValidateCompileResult(result);
  const contract = subjectApi.validateCompileResultContract(result);
  const diagnostics = [];

  if (!schema.ok) {
    diagnostics.push(makeCode('compile_result_schema_invalid', { diagnostics: schema.diagnostics }));
  }

  if (contract.diagnostics.length > 0) {
    diagnostics.push(makeCode('compile_result_contract_invalid', { diagnostics: contract.diagnostics }));
  }

  if (result.runtime) {
    const runtimeSchema = subjectApi.structurallyValidateRuntimeSpec(result.runtime);
    const runtimeContract = subjectApi.validateRuntimeSpecContract(result.runtime);
    if (!runtimeSchema.ok) {
      diagnostics.push(makeCode('runtime_schema_invalid', { diagnostics: runtimeSchema.diagnostics }));
    }
    if (runtimeContract.diagnostics.length > 0) {
      diagnostics.push(makeCode('runtime_contract_invalid', { diagnostics: runtimeContract.diagnostics }));
    }
  }

  if (result.trace) {
    const traceSchema = subjectApi.structurallyValidateTrace(result.trace);
    const traceContract = subjectApi.validateTraceContract(result.trace);
    if (!traceSchema.ok) {
      diagnostics.push(makeCode('trace_schema_invalid', { diagnostics: traceSchema.diagnostics }));
    }
    if (traceContract.diagnostics.length > 0) {
      diagnostics.push(makeCode('trace_contract_invalid', { diagnostics: traceContract.diagnostics }));
    }
  }

  return diagnostics;
}

function inferSnapshotPath(context, caseRecord) {
  const manifestSnapshot =
    caseRecord.expectedOutcome?.model === 'golden_file' ? caseRecord.expectedOutcome.path : null;
  const selectionKey = `${normalizePath(caseRecord.inputSleeve.path)}::${normalizePath(caseRecord.compileSelection.path)}`;
  const selectionSnapshot =
    context.selectionSnapshotMap.caseSnapshotMap.get(selectionKey) ??
    context.selectionSnapshotMap.selectionSnapshotMap.get(normalizePath(caseRecord.compileSelection.path)) ??
    null;
  return manifestSnapshot ?? selectionSnapshot;
}

function collectCaseArtifactChecks(context, caseRecord) {
  const checks = [];
  const expectedOutcome = caseRecord.expectedOutcome ?? null;

  checks.push(verifyGitBlobHash(context.corpusRoot, caseRecord.inputSleeve.path, caseRecord.inputSleeve.sha256));
  checks.push(verifyGitBlobHash(context.corpusRoot, caseRecord.compileSelection.path, caseRecord.compileSelection.sha256));

  if (expectedOutcome?.model === 'golden_file' && expectedOutcome.path && expectedOutcome.sha256) {
    checks.push(verifyGitBlobHash(context.corpusRoot, expectedOutcome.path, expectedOutcome.sha256));
  }

  if (expectedOutcome?.model === 'assertion_contract' && Array.isArray(expectedOutcome.testFiles)) {
    for (const testFile of expectedOutcome.testFiles) {
      checks.push(verifyGitBlobHash(context.corpusRoot, testFile.path, testFile.sha256));
    }
  }

  if (caseRecord.runtimeHashVectorFixture) {
    checks.push(
      verifyGitBlobHash(
        context.corpusRoot,
        caseRecord.runtimeHashVectorFixture.path,
        caseRecord.runtimeHashVectorFixture.sha256,
      ),
    );
  }

  return checks;
}

function buildCaseIdentity(caseRecord) {
  return {
    caseId: caseRecord.caseId,
    requirementIds: {
      primary: [...caseRecord.primaryRequirementsProven],
      secondary: [...caseRecord.secondaryRequirementsSupported],
      relatedAuthority: [...caseRecord.relatedAuthorityRequirements],
    },
  };
}

function summarizeContractResults(contractResults) {
  return contractResults.map((entry) => ({
    testFile: entry.testFile,
    passed: entry.passed,
    exitCode: entry.exitCode,
    stdout: entry.stdout,
    stderr: entry.stderr,
  }));
}

function runContractFile(workspaceRoot, testFile) {
  const spawned = spawnSync(process.execPath, [normalizePath(testFile)], {
    cwd: workspaceRoot,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024,
  });

  return {
    testFile: normalizePath(testFile),
    passed: spawned.status === 0,
    exitCode: spawned.status ?? null,
    signal: spawned.signal ?? null,
    stdout: spawned.stdout ?? '',
    stderr: spawned.stderr ?? '',
  };
}

async function runSuite(context, { includeContractTests = true } = {}) {
  const manifestIntegrity = verifyManifestIntegrity(context.manifest);
  const caseResults = [];
  const contractResultsByFile = new Map();
  const start = Date.now();

  if (includeContractTests) {
    ensureContractWorkspace(context);
  }

  for (const caseRecord of context.manifest.cases) {
    const inputSleeve = readCanonicalJsonCase(context.corpusRoot, caseRecord.inputSleeve.path);
    const selection = readCanonicalJsonCase(context.corpusRoot, caseRecord.compileSelection.path);
    const snapshotPath = inferSnapshotPath(context, caseRecord);
    const expectedSnapshot = snapshotPath ? readCanonicalJsonCase(context.corpusRoot, snapshotPath) : null;

    const artifactChecks = collectCaseArtifactChecks(context, caseRecord);
    const sleeveHash = artifactChecks[0];
    const selectionHash = artifactChecks[1];
    const expectedOutcomeHash = caseRecord.expectedOutcome?.model === 'golden_file' ? artifactChecks[2] : null;
    const referencedTestFileChecks =
      caseRecord.expectedOutcome?.model === 'assertion_contract' ? artifactChecks.slice(2) : [];
    const auxiliarySnapshot = snapshotPath && caseRecord.expectedOutcome?.model !== 'golden_file'
      ? {
          path: snapshotPath,
          sha256: sha256BufferUpper(gitShowBlobBuffer(context.corpusRoot, snapshotPath)),
        }
      : null;

    let actual = null;
    let compileDiagnostics = [];
    let compileError = null;
    try {
      actual = context.subjectApi.compileSleeve(inputSleeve, selection);
      compileDiagnostics = evaluateCompileResultContracts(context.subjectApi, actual);
    } catch (error) {
      compileError = error instanceof Error ? error.message : String(error);
      compileDiagnostics = [makeCode('compile_threw', { message: compileError })];
    }

    const actualCanonical = actual ? canonicalize(actual) : null;
    const actualCanonicalHash = actual ? sha256Canonical(actual) : null;
    const expectedCanonicalHash = expectedSnapshot ? sha256Canonical(expectedSnapshot) : null;
    const expectedRuntimeHash = expectedSnapshot?.runtime?.runtimeHash ?? null;
    const actualRuntimeHash = actual?.runtime?.runtimeHash ?? null;

    const comparison = {
      model: caseRecord.expectedOutcome.model,
      snapshotPath,
      canonical: compareMaybeCanonical(expectedSnapshot, actual),
      diagnostics: compareCollections(expectedSnapshot?.diagnostics ?? null, actual?.diagnostics ?? null),
      trace: compareCollections(expectedSnapshot?.trace ?? null, actual?.trace ?? null),
      runtimeProjection: compareCollections(expectedSnapshot?.runtime ?? null, actual?.runtime ?? null),
      runtimeHash: compareHashes(expectedRuntimeHash, actualRuntimeHash),
    };

    let contractResults = [];
    if (includeContractTests && caseRecord.expectedOutcome.model === 'assertion_contract') {
      const contractFiles = caseRecord.expectedOutcome.testFiles?.map((entry) => normalizePath(entry.path)) ?? [];
      for (const testFile of contractFiles) {
        if (!contractResultsByFile.has(testFile)) {
          const workspace = ensureContractWorkspace(context);
          contractResultsByFile.set(testFile, runContractFile(workspace.root, testFile));
        }
        contractResults.push(contractResultsByFile.get(testFile));
      }
    }

    const contractPassed = contractResults.every((entry) => entry.passed);
    const inputIntegrityVerified =
      sleeveHash.ok &&
      selectionHash.ok &&
      (expectedOutcomeHash ? expectedOutcomeHash.ok : true) &&
      referencedTestFileChecks.every((entry) => entry.ok) &&
      (auxiliarySnapshot ? !!auxiliarySnapshot.sha256 : true);
    const compilePassed =
      actual !== null &&
      compileDiagnostics.length === 0 &&
      ((caseRecord.successOrFailure === 'success' && actual.status === 'success') ||
        (caseRecord.successOrFailure === 'failure' && actual.status === 'failure'));
    const snapshotPassed =
      expectedSnapshot === null ? true : comparison.canonical.equal === true && comparison.runtimeHash.equal !== false;
    const executionPassed = inputIntegrityVerified && compilePassed && snapshotPassed && contractPassed && compileError === null;

    caseResults.push({
      ...buildCaseIdentity(caseRecord),
      expectedStatus: caseRecord.successOrFailure,
      actualStatus: actual?.status ?? 'threw',
      inputIntegrity: {
        sleeve: sleeveHash,
        selection: selectionHash,
        expectedOutcome: expectedOutcomeHash,
        referencedArtifacts: referencedTestFileChecks,
        auxiliarySnapshot,
        verified: inputIntegrityVerified,
      },
      executionStatus: executionPassed ? 'passed' : 'failed',
      expectedCanonicalResultHash: expectedCanonicalHash,
      actualCanonicalResultHash: actualCanonicalHash,
      expectedRuntimeHash,
      actualRuntimeHash,
      comparison,
      contractResults: summarizeContractResults(contractResults),
      failureReason:
        executionPassed
          ? null
          : compileError ??
            (compileDiagnostics.length > 0 ? JSON.stringify(compileDiagnostics, null, 2) : 'comparison mismatch'),
    });
  }

  const passed = caseResults.filter((item) => item.executionStatus === 'passed').length;
  const failed = caseResults.length - passed;
  const result = {
    schemaVersion: 'UMG_VNEXT_CONFORMANCE_RESULT.v0.1',
    generatedAt: new Date(start).toISOString(),
    subject: {
      root: context.subjectRoot,
      head: context.currentHead,
    },
    corpus: {
      root: context.corpusRoot,
      manifestPath: 'docs/qualification/H1/H1F4B_CORPUS_INTEGRITY_MANIFEST.json',
      identity: context.manifest.corpusIdentity,
      caseCount: context.manifest.caseCount,
      hashMethod: 'sha256 over exact Git blob bytes at HEAD',
      integrity: manifestIntegrity,
    },
    summary: {
      total: caseResults.length,
      passed,
      failed,
      skipped: 0,
      conformant: failed === 0 && manifestIntegrity.ok,
    },
    cases: caseResults,
    manifest: context.manifest,
  };

  const validation = validateConformanceResult(result);
  if (!validation.ok) {
    return {
      ...result,
      validation,
      summary: {
        ...result.summary,
        conformant: false,
      },
    };
  }

  return result;
}

function printHuman(result) {
  const lines = [
    `H2 conformance result: ${result.summary.conformant ? 'PASS' : 'FAIL'}`,
    `cases: ${result.summary.passed}/${result.summary.total} passed`,
    `subject head: ${result.subject.head}`,
    `corpus identity: ${result.corpus.identity}`,
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n\n${usage()}\n`);
    process.exitCode = 2;
    return;
  }

  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  let context;
  let result;
  try {
    context = await createContext({ subjectRoot: options.subjectRoot });
    result = await runSuite(context, { includeContractTests: true });
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
    return;
  } finally {
    if (context?.contractWorkspace) {
      context.contractWorkspace.cleanup();
    }
  }

  if (options.output) {
    mkdirSync(dirname(options.output), { recursive: true });
    writeFileSync(options.output, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  }

  if (options.json && !options.output) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else if (!options.output) {
    printHuman(result);
  }

  process.exitCode = result.summary.conformant ? 0 : 1;
}

if (import.meta.url === pathToFileURL(__filename).href) {
  await main();
}

export { createContext, runSuite };
