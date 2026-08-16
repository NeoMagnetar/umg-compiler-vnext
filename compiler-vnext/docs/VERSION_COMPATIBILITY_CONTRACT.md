# compiler-vnext Version Compatibility Contract

This document freezes the final v0.1 version and compatibility contract for
`compiler-vnext`.

Compatibility is explicit, not inferred.

## Current Compiler Identity

- compiler version: `0.1.0-experimental`
- package version: `0.1.0-experimental`
- stable / RC promotion: deferred until qualification

The package version must match `compilerVersion` exactly for this frozen build.

## Explicit Compatibility Only

Compatibility exists only when explicitly listed in:

- `schemas/COMPATIBILITY_MATRIX.json`

No compatibility is implied because:

- major matches
- minor matches
- prefixes look similar
- a SemVer range would usually include it

Future versions require an explicit compatibility-manifest entry and
conformance testing.

## Accepted Input Schemas

The current compiler accepts exactly:

- Sleeve: `umg.compiler-vnext.sleeve.v0.1`
- Selection: `umg.compiler-vnext.selection.v0.1`

Unknown, future, legacy, or near-match schema versions fail closed with:

- `UNSUPPORTED_SLEEVE_SCHEMA`
- `UNSUPPORTED_SELECTION_SCHEMA`

These are structural boundary failures and therefore produce:

- `status = "failure"`
- `runtime = null`
- `trace = null`

## No Implicit Migration

`compiler-vnext` does not perform silent compatibility migration.

Unsupported inputs are not adapted by:

- field renaming
- schema coercion
- role translation
- old Priority conversion
- old PrimaryShell conversion
- old generic Block conversion
- legacy stack conversion

Legacy content must pass through an explicit migration layer before it reaches
the compiler.

## Emitted Output Identity

For compiler version `0.1.0-experimental`, emitted public versions are frozen as:

- RuntimeSpec: `umg.compiler-vnext.runtime.v0.1`
- Trace: `umg.compiler-vnext.trace.v0.1`
- CompileResult: `umg.compiler-vnext.compile-result.v0.1`

All emitted public artifacts also freeze:

- `CompileResult.compilerVersion = "0.1.0-experimental"`
- `RuntimeSpec.compilerVersion = "0.1.0-experimental"`
- `Trace.compilerVersion = "0.1.0-experimental"`

Consumers must not infer compatibility with future output schemas.

## Frozen Registry And Profile Versions

- schema registry: `umg.compiler-vnext.schema-registry.v0.1`
- Diagnostic Registry: `umg.compiler-vnext.diagnostic-registry.v0.1`
- Trace Event Registry: `umg.compiler-vnext.trace-event-registry.v0.1`
- runtime-hash profile: `umg.compiler-vnext.runtime-hash.v0.1`
- compatibility manifest: `umg.compiler-vnext.compatibility.v0.1`

The current compatibility manifest binds compiler version
`0.1.0-experimental` to those exact registry and profile versions.

## Version Policy

`compilerVersion` identifies a declared compiler-contract implementation.

During remaining internal qualification:

- tests, docs, or tooling changes that do not alter the public contract do not automatically require a compiler-version change
- any repair that changes accepted or rejected canonical behavior, RuntimeSpec semantics, Diagnostic contract, Trace contract, or runtimeHash behavior requires explicit version and compatibility review before integration

SemVer inference is disabled. Stable / RC promotion is outside B5B.

## Breaking-Change Policy

Breaking change to any frozen public contract requires a new explicit version and
compatibility-manifest update.

This includes:

- schema changes
- Diagnostic Registry changes
- Trace Event Registry changes
- runtime-hash profile changes

No silent in-place breaking changes are permitted within the frozen v0.1
contract set.
