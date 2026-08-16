import {
  getDiagnosticRegistryEntry,
  type DiagnosticCode,
  type DiagnosticStage,
  type DiagnosticSubject,
  type DiagnosticSubjectKind,
} from './diagnostic-registry.js';
import type { CompilerDiagnostic } from './types.js';

const OPTIONAL_ID_SUBJECT_KINDS = new Set<DiagnosticSubjectKind>([
  'compiler',
  'selection',
  'runtime',
  'trace',
  'compile_result',
]);

function subjectRequiresId(subject: DiagnosticSubject, stage: DiagnosticStage): boolean {
  if (subject.kind === 'sleeve' && stage === 'structural') return false;
  return !OPTIONAL_ID_SUBJECT_KINDS.has(subject.kind);
}

function createDiagnostic(
  code: DiagnosticCode,
  message: string,
  subject: DiagnosticSubject,
  path?: string,
  details?: Record<string, unknown>,
): CompilerDiagnostic {
  const entry = getDiagnosticRegistryEntry(code);
  if (!entry.allowedSubjectKinds.includes(subject.kind)) {
    throw new Error(`Diagnostic ${code} cannot use subject kind ${subject.kind}.`);
  }
  if (!subject.id && subjectRequiresId(subject, entry.stage)) {
    throw new Error(`Diagnostic ${code} requires subject.id for subject kind ${subject.kind}.`);
  }
  if (subject.id !== undefined && subject.id.length === 0) {
    throw new Error(`Diagnostic ${code} subject.id must be non-empty when supplied.`);
  }
  for (const key of entry.requiredDetailKeys) {
    if (details?.[key] === undefined) {
      throw new Error(`Diagnostic ${code} requires details.${key}.`);
    }
  }

  return {
    code,
    level: entry.level,
    stage: entry.stage,
    subject,
    message,
    path,
    details,
  };
}

export function errorDiagnostic(
  code: DiagnosticCode,
  message: string,
  subject: DiagnosticSubject,
  path?: string,
  details?: Record<string, unknown>,
): CompilerDiagnostic {
  const entry = getDiagnosticRegistryEntry(code);
  if (entry.level !== 'error') {
    throw new Error(`Diagnostic ${code} is registered as ${entry.level}, not error.`);
  }
  return createDiagnostic(code, message, subject, path, details);
}

export function warningDiagnostic(
  code: DiagnosticCode,
  message: string,
  subject: DiagnosticSubject,
  path?: string,
  details?: Record<string, unknown>,
): CompilerDiagnostic {
  const entry = getDiagnosticRegistryEntry(code);
  if (entry.level !== 'warning') {
    throw new Error(`Diagnostic ${code} is registered as ${entry.level}, not warning.`);
  }
  return createDiagnostic(code, message, subject, path, details);
}

export function internalCompilerErrorDiagnostic(): CompilerDiagnostic {
  return createDiagnostic(
    'INTERNAL_COMPILER_ERROR',
    'Unexpected internal compiler failure.',
    { kind: 'compiler' },
  );
}

export function internalOutputContractViolationDiagnostic(
  details?: Record<string, unknown>,
): CompilerDiagnostic {
  return createDiagnostic(
    'INTERNAL_OUTPUT_CONTRACT_VIOLATION',
    'Internal public output contract violation.',
    { kind: 'compile_result' },
    undefined,
    details,
  );
}
