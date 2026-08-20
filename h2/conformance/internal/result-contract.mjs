import { canonicalize } from './canonicalize.mjs';

function pushDiagnostic(diagnostics, path, message) {
  diagnostics.push({ path, message });
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function validateConformanceResult(result) {
  const diagnostics = [];

  if (!isPlainObject(result)) {
    pushDiagnostic(diagnostics, '$', 'result must be an object');
    return { ok: false, diagnostics };
  }

  if (result.schemaVersion !== 'UMG_VNEXT_CONFORMANCE_RESULT.v0.1') {
    pushDiagnostic(diagnostics, 'schemaVersion', 'wrong result schemaVersion');
  }

  if (typeof result.generatedAt !== 'string') {
    pushDiagnostic(diagnostics, 'generatedAt', 'missing generatedAt');
  }

  if (!isPlainObject(result.summary)) {
    pushDiagnostic(diagnostics, 'summary', 'missing summary object');
  } else {
    for (const key of ['total', 'passed', 'failed', 'skipped']) {
      if (typeof result.summary[key] !== 'number' || !Number.isInteger(result.summary[key])) {
        pushDiagnostic(diagnostics, `summary.${key}`, `summary.${key} must be an integer`);
      }
    }
    if (typeof result.summary.conformant !== 'boolean') {
      pushDiagnostic(diagnostics, 'summary.conformant', 'summary.conformant must be boolean');
    }
  }

  if (!Array.isArray(result.cases)) {
    pushDiagnostic(diagnostics, 'cases', 'missing cases array');
  } else {
    for (const [index, testCase] of result.cases.entries()) {
      const prefix = `cases[${index}]`;
      if (!isPlainObject(testCase)) {
        pushDiagnostic(diagnostics, prefix, 'case must be an object');
        continue;
      }
      if (typeof testCase.caseId !== 'string') pushDiagnostic(diagnostics, `${prefix}.caseId`, 'missing caseId');
      if (typeof testCase.expectedStatus !== 'string') pushDiagnostic(diagnostics, `${prefix}.expectedStatus`, 'missing expectedStatus');
      if (typeof testCase.actualStatus !== 'string') pushDiagnostic(diagnostics, `${prefix}.actualStatus`, 'missing actualStatus');
      if (typeof testCase.executionStatus !== 'string') pushDiagnostic(diagnostics, `${prefix}.executionStatus`, 'missing executionStatus');
      if (!isPlainObject(testCase.inputIntegrity)) {
        pushDiagnostic(diagnostics, `${prefix}.inputIntegrity`, 'missing inputIntegrity');
      }
      if (!isPlainObject(testCase.comparison)) {
        pushDiagnostic(diagnostics, `${prefix}.comparison`, 'missing comparison object');
      }
    }
  }

  return { ok: diagnostics.length === 0, diagnostics };
}

export function stableResultFingerprint(result) {
  return canonicalize(result);
}

