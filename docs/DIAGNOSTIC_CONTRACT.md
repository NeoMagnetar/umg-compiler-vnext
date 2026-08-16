# Diagnostic Contract

`CompilerDiagnostic` is a frozen public machine contract in `compiler-vnext v0.1`.

Exact Diagnostic Registry version identity and compatibility policy are frozen
in [VERSION_COMPATIBILITY_CONTRACT.md](VERSION_COMPATIBILITY_CONTRACT.md).

## Shape

```ts
interface CompilerDiagnostic {
  code: DiagnosticCode
  level: 'error' | 'warning'
  stage: 'structural' | 'semantic' | 'resolution' | 'output' | 'internal'
  subject: {
    kind:
      | 'compiler'
      | 'sleeve'
      | 'selection'
      | 'molt_block'
      | 'neoblock'
      | 'neostack'
      | 'secondary_directive'
      | 'bundle'
      | 'merge'
      | 'scoped_attachment'
      | 'overlay'
      | 'governance'
      | 'runtime'
      | 'trace'
      | 'compile_result'
    id?: string
  }
  message: string
  path?: string
  details?: Record<string, unknown>
}
```

## Stage Meanings

- `structural`: input JSON shape and JSON Schema validation.
- `semantic`: canonical authored-surface validation before resolution.
- `resolution`: deterministic route/state/configuration resolution failures.
- `output`: internal public-output contract violations.
- `internal`: unexpected compiler implementation failure.

No additional stages are part of `v0.1`.

## Subject Meanings

- `subject.kind` is a machine contract and always required.
- `subject.id` is required when a stable canonical id exists for the subject of the diagnostic.
- Malformed structural `sleeve` and `selection` documents may omit `subject.id`.
- Structural validation of `runtime`, `trace`, and `compile_result` may also omit `subject.id` when the authored id is unavailable.

## Stability Rules

- `code` is stable and is the primary branching key for integrations.
- `level` is stable.
- `stage` is stable.
- `subject.kind` is stable.
- Registry-declared `requiredDetailKeys` are stable.
- `message` is human-readable prose and is not a stable branching API.
- `path` is a deterministic location hint, not canonical identity.
- `details` may gain additional non-required keys later without redefining the diagnostic.

Integrations should branch on `code`, `level`, `stage`, `subject.kind`, and documented detail keys. They should not parse `message`.

## Registry Authority

The authoritative registry lives in:

- [src/diagnostic-registry.ts](../src/diagnostic-registry.ts)

The machine-readable mirror lives in:

- [schemas/DIAGNOSTIC_REGISTRY.json](../schemas/DIAGNOSTIC_REGISTRY.json)

Tests enforce that the TypeScript registry and JSON registry remain equivalent.

## Producer Boundaries

- Structural diagnostics come from `schema-validation.ts`.
- Semantic diagnostics come from canonical Sleeve and Selection validation.
- Resolution diagnostics come from `resolveSleeve`.
- Output diagnostics come from public-output contract enforcement.
- Internal diagnostics are limited to `INTERNAL_COMPILER_ERROR`.

`INTERNAL_OUTPUT_CONTRACT_VIOLATION` always uses:

- `stage = output`
- `level = error`
- `subject.kind = compile_result`

`INTERNAL_COMPILER_ERROR` always uses:

- `stage = internal`
- `level = error`
- `subject.kind = compiler`

## Output Integration

- `CompileResult.diagnostics` is the canonical aggregate.
- `Trace.diagnostics` must equal `CompileResult.diagnostics`.
- Successful `RuntimeSpec.diagnostics` must equal `CompileResult.diagnostics`.
- Successful `RuntimeSpec` values cannot contain `error` diagnostics.

## Trace Deferral

`B4B1` freezes diagnostic registry shape, levels, stages, subjects, and required detail keys.

It does not yet freeze:

- Trace event stage taxonomy
- Trace event subject taxonomy
- `RESOLUTION_ERROR` / `RESOLUTION_WARNING` trace events
- Trace payload registry

That work is deferred to `B4B2`.
