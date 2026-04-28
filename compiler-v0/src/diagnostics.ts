export interface DiagnosticEntry {
  code: string;
  message: string;
  path?: string;
  details?: unknown;
}

export interface DiagnosticsOutput {
  ok: boolean;
  status: "ok" | "error";
  errors: DiagnosticEntry[];
  warnings: DiagnosticEntry[];
  info: DiagnosticEntry[];
}

export function makeDiagnostics(): DiagnosticsOutput {
  return {
    ok: true,
    status: "ok",
    errors: [],
    warnings: [],
    info: [],
  };
}

export function finalizeDiagnostics(diagnostics: DiagnosticsOutput): DiagnosticsOutput {
  const ok = diagnostics.errors.length === 0;
  return {
    ...diagnostics,
    ok,
    status: ok ? "ok" : "error",
  };
}

export function pushError(diagnostics: DiagnosticsOutput, code: string, message: string, path?: string, details?: unknown) {
  diagnostics.errors.push({ code, message, path, details });
}

export function pushWarning(diagnostics: DiagnosticsOutput, code: string, message: string, path?: string, details?: unknown) {
  diagnostics.warnings.push({ code, message, path, details });
}

export function pushInfo(diagnostics: DiagnosticsOutput, code: string, message: string, path?: string, details?: unknown) {
  diagnostics.info.push({ code, message, path, details });
}
