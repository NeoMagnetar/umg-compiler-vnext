import fs from "node:fs";
import path from "node:path";
import Ajv2020Module from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";

import {
  finalizeDiagnostics,
  makeDiagnostics,
  pushError,
  pushInfo,
  type DiagnosticsOutput,
} from "./diagnostics.js";

const schemaDir = path.resolve(import.meta.dirname, "..", "schemas");

function loadSchemaFile(fileName: string): unknown {
  const fullPath = path.join(schemaDir, fileName);
  const raw = fs.readFileSync(fullPath, "utf8");
  const normalized = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  return JSON.parse(normalized);
}

function formatInstancePath(instancePath: string | undefined): string | undefined {
  if (!instancePath) return "$";
  return `$${instancePath}`;
}

function buildAjv() {
  const Ajv2020 = (Ajv2020Module as any).default ?? Ajv2020Module;
  const addFormats = (addFormatsModule as any).default ?? addFormatsModule;
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv;
}

function validateWithSchema(schemaFile: string, data: unknown, codePrefix: string): DiagnosticsOutput {
  const diagnostics = makeDiagnostics();
  const ajv = buildAjv();
  const schema = loadSchemaFile(schemaFile);
  const validate = ajv.compile(schema);
  const ok = validate(data);

  if (!ok) {
    for (const err of validate.errors ?? []) {
      pushError(
        diagnostics,
        `${codePrefix}_SCHEMA_VALIDATION_FAILED`,
        err.message ?? "Schema validation failed.",
        formatInstancePath(err.instancePath),
        {
          keyword: err.keyword,
          params: err.params,
          schemaPath: err.schemaPath,
        }
      );
    }
  } else {
    pushInfo(diagnostics, `${codePrefix}_SCHEMA_VALID`, `${schemaFile} validation passed.`);
  }

  return finalizeDiagnostics(diagnostics);
}

export function validateCanonicalIr(data: unknown): DiagnosticsOutput {
  return validateWithSchema("umg-ir.schema.json", data, "IR");
}

export function validateRuntimeSpec(data: unknown): DiagnosticsOutput {
  return validateWithSchema("runtime-spec.schema.json", data, "RUNTIME_SPEC");
}

export function validateTrace(data: unknown): DiagnosticsOutput {
  return validateWithSchema("trace.schema.json", data, "TRACE");
}
