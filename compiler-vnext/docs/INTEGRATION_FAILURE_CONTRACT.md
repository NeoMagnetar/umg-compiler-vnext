# compiler-vnext Integration Failure Contract

This document records the Phase A P0 fail-closed behavior implemented at the
public `compiler-vnext` boundary.

## Validation Ordering

The public compile path now runs in this order:

1. JSON parse where the CLI reads files
2. Structural JSON Schema validation
3. Semantic validation
4. Resolution
5. `RuntimeSpec` and `Trace` emission on success

The public library API applies the same structural-first rule to direct object
inputs. Malformed objects do not bypass the schema gate.

## CompileResult Success Invariant

On success, `CompileResult` has:

- `schemaVersion = "umg.compiler-vnext.compile-result.v0.1"`
- `compilerVersion = "0.1.0-experimental"`
- `status = "success"`
- `hasErrors = false`
- `runtime != null`
- `trace != null`
- no error-level diagnostics

## CompileResult Failure Invariant

On failure, `CompileResult` has:

- `schemaVersion = "umg.compiler-vnext.compile-result.v0.1"`
- `compilerVersion = "0.1.0-experimental"`
- `status = "failure"`
- `hasErrors = true`
- `runtime = null`
- at least one error-level diagnostic

`Trace` is:

- `null` for structural failures that prevent coherent source construction
- present for semantic and resolution failures when meaningful derivation exists

No failed compile exposes a partial or executable `RuntimeSpec`.

## Fail-Closed Rule

The compiler rejects:

- unknown fields where schema uses `additionalProperties: false`
- missing required fields
- invalid enum or const values
- wrong scalar or container types
- malformed scoped objects
- semantic reference violations after structural validation

Expected invalid user input returns structured failure output. It does not
throw raw exceptions through the public compile API.

Unexpected internal failures also fail closed with:

- `status = "failure"`
- `runtime = null`
- diagnostic code `INTERNAL_COMPILER_ERROR`

## Unknown Trigger State Keys

Every key in `selection.triggerState` must reference an existing `trigger`
MOLT block in the sleeve.

Rejected conditions:

- unknown trigger id -> `UNKNOWN_TRIGGER_STATE_ID`
- known non-trigger MOLT id -> `TRIGGER_STATE_TYPE_MISMATCH`

Both conditions fail the compile and return `runtime = null`.

## Invalid Scope Behavior

Supported authored scope kinds in this compiler version are:

- `sleeve`
- `neostack`

Rejected conditions:

- malformed or unknown `scope.kind`
- missing `neoStackId` for `neostack` scope
- unknown `neoStackId`

Malformed scoped attachments are not silently ignored.

## State And Selection Contract

`compiler-vnext` freezes effective compile state precedence as:

- `off`
- `disabled`
- `active`
- `ready`

Impossible explicit selection fails closed. The compiler does not silently drop:

- selected NeoStacks blocked by `off` or `disabled`
- selected NeoStacks missing selected ancestors
- selected NeoBlocks whose container NeoStack is missing, unselected, `off`, or `disabled`

The compiler does not infer missing route ancestors or auto-select missing containers.

## Multiple Secondary Directive Matches

`compiler-vnext` does not support implicit coexistence of multiple simultaneously
matching Secondary Directives in this schema/compiler version.

Current rule:

- 0 matching Secondary Directives -> Prime only
- 1 matching Secondary Directive -> Prime + selected Secondary
- 2+ matching Secondary Directives -> `MULTIPLE_SECONDARY_DIRECTIVE_MATCH`

Multiple matches are invalid unless a future version defines an explicit
coexistence construct.

## CLI Exit Codes

Compile command behavior:

- success -> canonical `CompileResult` JSON on stdout, exit `0`
- expected structural, semantic, or resolution failure -> canonical
  `CompileResult` JSON on stdout, exit `1`
- usage, file IO, JSON parse failure, or unrecoverable CLI tooling failure ->
  stderr error output, exit `2`

When stdout is used for canonical JSON output, no arbitrary prose is mixed into
that stream.
