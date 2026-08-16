import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import type { ErrorObject, ValidateFunction } from 'ajv';
import type { DiagnosticCode, DiagnosticSubject } from './diagnostic-registry.js';
import { errorDiagnostic } from './errors.js';
import type { CompileResult, CompileSelection, CompilerDiagnostic, RuntimeSpec, Sleeve, Trace } from './types.js';
import {
  COMPILE_RESULT_SCHEMA_VERSION,
  RUNTIME_SCHEMA_VERSION,
  SELECTION_SCHEMA_VERSION,
  SLEEVE_SCHEMA_VERSION,
  TRACE_SCHEMA_VERSION,
} from './version-contract.js';

const require = createRequire(import.meta.url);
const Ajv2020 = require('ajv/dist/2020').default as typeof import('ajv/dist/2020.js').default;
const addFormats = require('ajv-formats').default as typeof import('ajv-formats').default;

type DocumentKind = 'sleeve' | 'selection' | 'runtime' | 'trace' | 'compileResult';

interface StructuralValidationSuccess<T> {
  ok: true;
  diagnostics: [];
  value: T;
}

interface StructuralValidationFailure {
  ok: false;
  diagnostics: CompilerDiagnostic[];
}

export type StructuralValidationResult<T> =
  | StructuralValidationSuccess<T>
  | StructuralValidationFailure;

interface ValidatorSet {
  sleeve: ValidateFunction<Sleeve>;
  selection: ValidateFunction<CompileSelection>;
  runtime: ValidateFunction<RuntimeSpec>;
  trace: ValidateFunction<Trace>;
  compileResult: ValidateFunction<CompileResult>;
}

let validators: ValidatorSet | undefined;

function loadSchema(path: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(fileURLToPath(new URL(`../schemas/${path}`, import.meta.url)), 'utf8'),
  ) as Record<string, unknown>;
}

function getValidators(): ValidatorSet {
  if (validators) return validators;

  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    validateFormats: true,
  });
  addFormats(ajv);

  ajv.addSchema(loadSchema('umg-compiler-vnext.schema.json'));

  validators = {
    sleeve: ajv.compile<Sleeve>(loadSchema('sleeve.schema.json')),
    selection: ajv.compile<CompileSelection>(loadSchema('compile-selection.schema.json')),
    runtime: ajv.compile<RuntimeSpec>(loadSchema('runtime-spec.schema.json')),
    trace: ajv.compile<Trace>(loadSchema('trace.schema.json')),
    compileResult: ajv.compile<CompileResult>(loadSchema('compile-result.schema.json')),
  };

  return validators;
}

function decodePointerToken(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

function pointerToPath(instancePath: string): string | undefined {
  const tokens = instancePath
    .split('/')
    .slice(1)
    .map(decodePointerToken);

  if (tokens.length === 0) return undefined;

  let path = '';
  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      path += `[${token}]`;
    } else {
      path += path ? `.${token}` : token;
    }
  }
  return path;
}

function appendPath(base: string | undefined, child: string | undefined): string | undefined {
  if (!child) return base;
  if (!base) return child;
  return /^\[\d+\]$/.test(child) ? `${base}${child}` : `${base}.${child}`;
}

function valueAtPointer(input: unknown, instancePath: string): unknown {
  const tokens = instancePath
    .split('/')
    .slice(1)
    .map(decodePointerToken);

  let current = input;
  for (const token of tokens) {
    if (current === null || typeof current !== 'object') return undefined;
    if (Array.isArray(current)) {
      const index = Number(token);
      current = Number.isInteger(index) ? current[index] : undefined;
      continue;
    }
    current = (current as Record<string, unknown>)[token];
  }
  return current;
}

function sortDiagnostics(diagnostics: CompilerDiagnostic[]): CompilerDiagnostic[] {
  return diagnostics.slice().sort((a, b) => {
    const pathCompare = (a.path ?? '').localeCompare(b.path ?? '');
    if (pathCompare !== 0) return pathCompare;
    const codeCompare = a.code.localeCompare(b.code);
    if (codeCompare !== 0) return codeCompare;
    return a.message.localeCompare(b.message);
  });
}

function schemaVersionCode(kind: DocumentKind): DiagnosticCode {
  switch (kind) {
    case 'sleeve':
      return 'UNSUPPORTED_SLEEVE_SCHEMA';
    case 'selection':
      return 'UNSUPPORTED_SELECTION_SCHEMA';
    case 'runtime':
      return 'UNSUPPORTED_RUNTIME_SCHEMA';
    case 'trace':
      return 'UNSUPPORTED_TRACE_SCHEMA';
    case 'compileResult':
      return 'UNSUPPORTED_COMPILE_RESULT_SCHEMA';
  }
}

function schemaVersionValue(kind: DocumentKind): string {
  switch (kind) {
    case 'sleeve':
      return SLEEVE_SCHEMA_VERSION;
    case 'selection':
      return SELECTION_SCHEMA_VERSION;
    case 'runtime':
      return RUNTIME_SCHEMA_VERSION;
    case 'trace':
      return TRACE_SCHEMA_VERSION;
    case 'compileResult':
      return COMPILE_RESULT_SCHEMA_VERSION;
  }
}

function documentSubject(kind: DocumentKind, input: unknown): DiagnosticSubject {
  if (kind === 'sleeve') {
    const id = (input as { id?: unknown } | null)?.id;
    return typeof id === 'string' && id.length > 0 ? { kind, id } : { kind };
  }
  if (kind === 'runtime' || kind === 'trace') {
    const sleeveId = (input as { sleeveId?: unknown } | null)?.sleeveId;
    return typeof sleeveId === 'string' && sleeveId.length > 0 ? { kind, id: sleeveId } : { kind };
  }
  if (kind === 'compileResult') {
    const runtimeSleeveId = (input as { runtime?: { sleeveId?: unknown } | null } | null)?.runtime?.sleeveId;
    if (typeof runtimeSleeveId === 'string' && runtimeSleeveId.length > 0) {
      return { kind: 'compile_result', id: runtimeSleeveId };
    }
    const traceSleeveId = (input as { trace?: { sleeveId?: unknown } | null } | null)?.trace?.sleeveId;
    return typeof traceSleeveId === 'string' && traceSleeveId.length > 0
      ? { kind: 'compile_result', id: traceSleeveId }
      : { kind: 'compile_result' };
  }
  return { kind };
}

function describeType(value: unknown): string {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function diagnosticsFromSchemaErrors(
  kind: DocumentKind,
  input: unknown,
  errors: readonly ErrorObject[] | null | undefined,
): CompilerDiagnostic[] {
  if (!errors?.length) return [];

  const subject = documentSubject(kind, input);
  const diagnostics = errors.map((error) => {
    const basePath = pointerToPath(error.instancePath);
    const params = error.params as Record<string, unknown>;
    const actualValue = valueAtPointer(input, error.instancePath);

    switch (error.keyword) {
      case 'additionalProperties': {
        const field = String(params.additionalProperty ?? 'unknown');
        const path = appendPath(basePath, field);
        return errorDiagnostic(
          'UNKNOWN_FIELD',
          `Unknown field ${field} is not allowed.`,
          subject,
          path,
          { documentKind: kind, field },
        );
      }

      case 'required': {
        const missingProperty = String(params.missingProperty ?? 'unknown');
        const path = appendPath(basePath, missingProperty);
        return errorDiagnostic(
          'MISSING_REQUIRED_FIELD',
          `Missing required field ${missingProperty}.`,
          subject,
          path,
          { documentKind: kind, missingProperty },
        );
      }

      case 'enum':
        return errorDiagnostic(
          'INVALID_ENUM_VALUE',
          `Field must use an allowed enum value; received ${JSON.stringify(actualValue)}.`,
          subject,
          basePath,
          { documentKind: kind, received: actualValue },
        );

      case 'const':
        if (basePath === 'schemaVersion') {
          return errorDiagnostic(
            schemaVersionCode(kind),
            `Expected ${schemaVersionValue(kind)}; received ${JSON.stringify(actualValue)}.`,
            subject,
            basePath,
            { documentKind: kind, received: actualValue },
          );
        }
        return errorDiagnostic(
          'INVALID_CONST_VALUE',
          `Field must match the required constant value; received ${JSON.stringify(actualValue)}.`,
          subject,
          basePath,
          { documentKind: kind, received: actualValue },
        );

      case 'type':
        return errorDiagnostic(
          'INVALID_FIELD_TYPE',
          `Field has invalid type; expected ${String(params.type ?? 'unknown')} but received ${describeType(actualValue)}.`,
          subject,
          basePath,
          {
            documentKind: kind,
            expectedType: params.type,
            receivedType: describeType(actualValue),
          },
        );

      case 'format':
        return errorDiagnostic(
          'INVALID_FIELD_FORMAT',
          `Field has invalid format; expected ${String(params.format ?? 'unknown')}.`,
          subject,
          basePath,
          { documentKind: kind, format: params.format },
        );

      case 'minimum':
        return errorDiagnostic(
          'INVALID_NUMERIC_RANGE',
          `Field must be greater than or equal to ${String(params.limit ?? 'the minimum')}.`,
          subject,
          basePath,
          { documentKind: kind, minimum: params.limit },
        );

      case 'minItems':
        if (basePath?.endsWith('.sourceBlockIds')) {
          return errorDiagnostic(
            'MERGE_TOO_FEW_SOURCES',
            'Merge requires at least two unique source blocks.',
            subject,
            basePath,
            { documentKind: kind, minimumItems: params.limit },
          );
        }
        return errorDiagnostic(
          'ARRAY_TOO_SHORT',
          `Array must contain at least ${String(params.limit ?? 'the minimum number of')} items.`,
          subject,
          basePath,
          { documentKind: kind, minimumItems: params.limit },
        );

      case 'uniqueItems':
        if (basePath?.endsWith('.sourceBlockIds')) {
          return errorDiagnostic(
            'MERGE_DUPLICATE_SOURCE',
            'Merge source IDs must be unique.',
            subject,
            basePath,
            { documentKind: kind },
          );
        }
        return errorDiagnostic(
          'STRUCTURAL_SCHEMA_VIOLATION',
          error.message ?? 'Value violates the structural schema.',
          subject,
          basePath,
          { documentKind: kind, keyword: error.keyword },
        );

      case 'minLength':
        return errorDiagnostic(
          'STRING_TOO_SHORT',
          `String must contain at least ${String(params.limit ?? 'the minimum number of')} characters.`,
          subject,
          basePath,
          { documentKind: kind, minimumLength: params.limit },
        );

      case 'oneOf':
        return errorDiagnostic(
          'INVALID_UNION_SHAPE',
          'Value does not match any supported structural shape.',
          subject,
          basePath,
          { documentKind: kind },
        );

      default:
        return errorDiagnostic(
          'STRUCTURAL_SCHEMA_VIOLATION',
          error.message ?? 'Value violates the structural schema.',
          subject,
          basePath,
          { documentKind: kind, keyword: error.keyword },
        );
    }
  });

  const deduped = new Map<string, CompilerDiagnostic>();
  for (const diagnostic of diagnostics) {
    const key = `${diagnostic.code}|${diagnostic.path ?? ''}|${diagnostic.message}`;
    deduped.set(key, diagnostic);
  }
  return sortDiagnostics([...deduped.values()]);
}

function structurallyValidate<T>(
  kind: DocumentKind,
  input: unknown,
  validator: ValidateFunction<T>,
): StructuralValidationResult<T> {
  const valid = validator(input);
  if (valid) {
    return { ok: true, diagnostics: [], value: input as T };
  }

  return {
    ok: false,
    diagnostics: diagnosticsFromSchemaErrors(kind, input, validator.errors),
  };
}

export function structurallyValidateSleeve(input: unknown): StructuralValidationResult<Sleeve> {
  return structurallyValidate('sleeve', input, getValidators().sleeve);
}

export function structurallyValidateSelection(input: unknown): StructuralValidationResult<CompileSelection> {
  return structurallyValidate('selection', input, getValidators().selection);
}

export function structurallyValidateRuntimeSpec(input: unknown): StructuralValidationResult<RuntimeSpec> {
  return structurallyValidate('runtime', input, getValidators().runtime);
}

export function structurallyValidateTrace(input: unknown): StructuralValidationResult<Trace> {
  return structurallyValidate('trace', input, getValidators().trace);
}

export function structurallyValidateCompileResult(input: unknown): StructuralValidationResult<CompileResult> {
  return structurallyValidate('compileResult', input, getValidators().compileResult);
}
