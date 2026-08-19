# H1-C2 Foundational, Input, and Structural Requirements

This chapter publishes the first normative requirement set for H1, limited to:

- `UMG-CONF-GLOBAL-###`
- `UMG-CONF-INPUT-###`
- `UMG-CONF-STRUCT-###`

## Global Requirements

- ID: `UMG-CONF-GLOBAL-001`
  - Normative Statement: Conformance SHALL follow the precedence ladder: `SEMANTIC_CANON -> STRUCTURAL_CONTRACT -> PUBLIC_OBSERVABLE_CONTRACT -> QUALIFICATION_EVIDENCE -> IMPLEMENTATION_DETAIL`.
  - Authority: `docs/qualification/H1/H1B_AUTHORITY_PRECEDENCE_MATRIX.md`
  - Observable Conformance Evidence: `test/public-output-contract.mjs`, `test/version-compatibility-contract.mjs`
  - Notes/Exclusions: This selects governance when claims overlap; it does not define domain-specific semantics.

- ID: `UMG-CONF-GLOBAL-002`
  - Normative Statement: Core conformance in H1 is interface-neutral; non-Node implementations are not required to reproduce the Node CLI transport for conformance.
  - Authority: `docs/qualification/H1/H1B1_RUNTIME_HASH_PRECEDENCE.md`, H1 task decision context
  - Observable Conformance Evidence: `test/public-output-contract.mjs` for core output obligations; `test/cli-contract.mjs` for CLI-only expectations.
  - Notes/Exclusions: CLI transport remains a separate compatibility surface.

- ID: `UMG-CONF-GLOBAL-003`
  - Normative Statement: This H1 conformance line applies to the published `0.1.0-experimental` compatibility surface and does not introduce additional release/version policy.
  - Authority: `docs/SEMANTIC_FREEZE_v0.1.md`, `schemas/COMPATIBILITY_MATRIX.json`, `test/version-compatibility-contract.mjs`
  - Observable Conformance Evidence: Version and manifest assertions in `test/version-compatibility-contract.mjs`.
  - Notes/Exclusions: Does not constrain future versioning beyond this manifest.

- ID: `UMG-CONF-GLOBAL-004`
  - Normative Statement: Implementations MUST treat published schemas as structural contracts and MUST NOT infer complete semantics from structural conformance alone.
  - Authority: `schemas/SCHEMA_REGISTRY.json` (`importantBoundary`), `schemas/umg-compiler-vnext.schema.json`, `schemas/README.md`
  - Observable Conformance Evidence: Structural validation plus separate contract checks in tests.
  - Notes/Exclusions: Preserves two-tier model: structural vs behavioral semantics.

- ID: `UMG-CONF-GLOBAL-005`
  - Normative Statement: Conformance MAY NOT depend on internal implementation details not present in public contracts.
  - Authority: `docs/qualification/H1/H1B_AUTHORITY_PRECEDENCE_MATRIX.md`, `schemas/umg-compiler-vnext.schema.json`
  - Observable Conformance Evidence: Public output and schema contracts bound by tests; no internal helper or ordering requirements are asserted for conformance.
  - Notes/Exclusions: Internal performance or storage choices remain implementation freedom.

## Input Requirements

- ID: `UMG-CONF-INPUT-001`
  - Normative Statement: Compile outputs MUST use `compilerVersion` matching the active canonical compiler identity (`0.1.0-experimental`).
  - Authority: `test/version-compatibility-contract.mjs`, `schemas/COMPATIBILITY_MATRIX.json`
  - Observable Conformance Evidence: Assertions for `result.compilerVersion` and manifest version equality across tested outputs.
  - Notes/Exclusions: Does not require or forbid specific runtime feature sets by internal version semantics.

- ID: `UMG-CONF-INPUT-002`
  - Normative Statement: Supported sleeve inputs MUST declare `schemaVersion = "umg.compiler-vnext.sleeve.v0.1"`; all other sleeve versions MUST NOT be treated as supported.
  - Authority: `schemas/SCHEMA_REGISTRY.json`, `schemas/umg-compiler-vnext.schema.json`, `test/version-compatibility-contract.mjs`
  - Observable Conformance Evidence: Accepts list in compatibility manifest and explicit unsupported sleeve-version mutation tests.
  - Notes/Exclusions: Legacy input conversion is not required (`autoUpgradeLegacyInput: false`).

- ID: `UMG-CONF-INPUT-003`
  - Normative Statement: Supported selection inputs MUST declare `schemaVersion = "umg.compiler-vnext.selection.v0.1"`; all other selection versions MUST NOT be treated as supported.
  - Authority: `schemas/SCHEMA_REGISTRY.json`, `schemas/umg-compiler-vnext.schema.json`, `test/version-compatibility-contract.mjs`
  - Observable Conformance Evidence: Accepts list in compatibility manifest and explicit unsupported selection-version mutation tests.
  - Notes/Exclusions: Does not infer compatibility from semver and does not admit unknown future versions.

- ID: `UMG-CONF-INPUT-004`
  - Normative Statement: Unsupported input versions MUST produce `status = "failure"` with `hasErrors = true` and diagnostic identity `UNSUPPORTED_SLEEVE_SCHEMA` or `UNSUPPORTED_SELECTION_SCHEMA` as applicable.
  - Authority: `test/version-compatibility-contract.mjs`
  - Observable Conformance Evidence: Unsupported version loops and asserted failure conditions in the compatibility contract test.
  - Notes/Exclusions: Human-readable diagnostic text is not mandated.

- ID: `UMG-CONF-INPUT-005`
  - Normative Statement: Implementations MUST apply exact-manifest compatibility only (`exactManifestMembership: true`, `inferFromSemver: false`, `acceptUnknownFutureVersion: false`).
  - Authority: `schemas/COMPATIBILITY_MATRIX.json`, `test/version-compatibility-contract.mjs`
  - Observable Conformance Evidence: Direct assertions of manifest policy flags and unknown-version lookup failures.
  - Notes/Exclusions: Does not define package management policy.

- ID: `UMG-CONF-INPUT-006`
  - Normative Statement: Missing required input fields or invalid enum/field types in sleeve or selection inputs MUST result in compile failure with an error-level diagnostic.
  - Authority: `schemas/umg-compiler-vnext.schema.json`, `test/failure-contract.mjs`
  - Observable Conformance Evidence: Missing-name, invalid enum, and malformed-trigger-type failure cases with asserted error diagnostics.
  - Notes/Exclusions: This is structural validation scope; semantic edge cases remain in domain families.

## Structural Requirements

- ID: `UMG-CONF-STRUCT-001`
  - Normative Statement: Conforming implementations MUST expose and enforce registry version `umg.compiler-vnext.schema-registry.v0.1` and the documented per-kind schema mappings.
  - Authority: `schemas/SCHEMA_REGISTRY.json`, `test/version-compatibility-contract.mjs`
  - Observable Conformance Evidence: Registry-version and per-kind `schemaVersion` assertions.
  - Notes/Exclusions: This requirement concerns contract metadata and version binding only.

- ID: `UMG-CONF-STRUCT-002`
  - Normative Statement: Emitted compile results MUST have schema `umg.compiler-vnext.compile-result.v0.1`.
  - Authority: `schemas/umg-compiler-vnext.schema.json`, `schemas/compile-result.schema.json`, `test/version-compatibility-contract.mjs`
  - Observable Conformance Evidence: `schemaVersion` assertions on all exercised compile results.
  - Notes/Exclusions: Does not require internal generation strategy.

- ID: `UMG-CONF-STRUCT-003`
  - Normative Statement: Emitted `runtime` and `trace` documents, when present, MUST use the `runtime`/`trace` schema versions from the active compatibility manifest.
  - Authority: `schemas/COMPATIBILITY_MATRIX.json`, `schemas/umg-compiler-vnext.schema.json`, `test/version-compatibility-contract.mjs`
  - Observable Conformance Evidence: Version assertions for successful and failure-with-trace outputs.
  - Notes/Exclusions: Does not mandate semantic payload content.

- ID: `UMG-CONF-STRUCT-004`
  - Normative Statement: Public schema-defined objects with `additionalProperties: false` MUST reject unknown fields.
  - Authority: `schemas/umg-compiler-vnext.schema.json`, `test/failure-contract.mjs`
  - Observable Conformance Evidence: Unknown top-level field injection and failure with `UNKNOWN_FIELD`.
  - Notes/Exclusions: Scope is schema object boundaries only.

- ID: `UMG-CONF-STRUCT-005`
  - Normative Statement: A structural failure path MUST return `runtime = null` and `trace = null`.
  - Authority: `test/public-output-contract.mjs`, `test/failure-contract.mjs`
  - Observable Conformance Evidence: Structural failure case (`incomplete sleeve`) and explicit structural validation cases.
  - Notes/Exclusions: Non-structural failures may carry trace diagnostics.

- ID: `UMG-CONF-STRUCT-006`
  - Normative Statement: Successful outputs MUST include non-null `runtime` and `trace`; failure outputs MUST have `runtime = null` and MAY include trace only when trace-producing validation stages are reached.
  - Authority: `test/public-output-contract.mjs`, `test/public-output-contract.mjs`
  - Observable Conformance Evidence: Fixture assertions for success and failure output shapes.
  - Notes/Exclusions: Trace presence behavior is split across structural vs semantic failure modes as encoded in tests.

- ID: `UMG-CONF-STRUCT-007`
  - Normative Statement: Compile result documents MUST include required fields `schemaVersion`, `compilerVersion`, `status`, `runtime`, `trace`, `hasErrors`, `diagnostics` and conform to their schema-defined types/shapes.
  - Authority: `schemas/umg-compiler-vnext.schema.json`, `schemas/compile-result.schema.json`, `test/public-output-contract.mjs`
  - Observable Conformance Evidence: Structural validation plus explicit contract checks for compile result shape.
  - Notes/Exclusions: Does not require particular diagnostics ordering.

- ID: `UMG-CONF-STRUCT-008`
  - Normative Statement: Failure results MUST carry at least one error-level diagnostic and MAY include warning diagnostics when applicable.
  - Authority: `test/failure-contract.mjs`
  - Observable Conformance Evidence: `hasErrors` and diagnostic-level checks in failure helper functions.
  - Notes/Exclusions: Specific warning/ error sets and message text are determined by domain-specific requirements.

DEFERRED_ITEMS:
- item: Exact CLI argument semantics, exit code matrix, and user-facing transport behavior.
  - reason deferred: Out-of-scope for H1-C2; CLI is a separate compatibility family.
  - expected later H1 family: `UMG-CONF-CLI-###`
- item: Complete malformed-JSON and CLI-file-read failure behavior.
  - reason deferred: Requires CLI surface and I/O mechanics in dedicated CLI chapter.
  - expected later H1 family: `UMG-CONF-CLI-###`
- item: Exhaustive unsupported-schema-version behavior matrix beyond tested representative cases.
  - reason deferred: Requires expanded compatibility corpus and governance decision in dedicated versioning corpus work.
  - expected later H1 family: `UMG-CONF-COMPAT-###`