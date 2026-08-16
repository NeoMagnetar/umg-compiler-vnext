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
