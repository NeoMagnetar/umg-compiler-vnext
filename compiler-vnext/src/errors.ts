import type { CompilerDiagnostic } from './types.js';

export function errorDiagnostic(
  code: string,
  message: string,
  path?: string,
  details?: Record<string, unknown>,
): CompilerDiagnostic {
  return { code, level: 'error', message, path, details };
}

export function warningDiagnostic(
  code: string,
  message: string,
  path?: string,
  details?: Record<string, unknown>,
): CompilerDiagnostic {
  return { code, level: 'warning', message, path, details };
}

export function internalCompilerErrorDiagnostic(): CompilerDiagnostic {
  return {
    code: 'INTERNAL_COMPILER_ERROR',
    level: 'error',
    message: 'Unexpected internal compiler failure.',
  };
}

export function internalOutputContractViolationDiagnostic(
  details?: Record<string, unknown>,
): CompilerDiagnostic {
  return {
    code: 'INTERNAL_OUTPUT_CONTRACT_VIOLATION',
    level: 'error',
    message: 'Internal public output contract violation.',
    details,
  };
}
