# H1-C12 Version Compatibility + Failure Conformance Requirements

This chapter defines deterministic, scope-constrained requirements for:
- `UMG-CONF-COMPAT-###` (version compatibility and identity boundaries)
- `UMG-CONF-FAIL-###` (failure-classification and compatibility failure boundaries)

Status: COMPLETE

## VERSION IDENTITY

- ID: `UMG-CONF-COMPAT-001`
  - Normative Statement: For this frozen build, compatibility and public-version contracts are anchored to `compilerVersion = "0.1.0-experimental"` and must reject unknown compilerVersion values as out-of-family input for this version contract.
  - Authority: `docs/VERSION_COMPATIBILITY_CONTRACT.md`, `src/version-contract.ts`, `test/version-compatibility-contract.mjs`
  - Observable Conformance Evidence: `test/version-compatibility-contract.mjs` checks `COMPILER_VERSION`, package version, and `getCompilerCompatibility(COMPILER_VERSION)`.
  - Notes/Exclusions: This does not freeze future branch-advancement policy.

- ID: `UMG-CONF-COMPAT-002`
  - Normative Statement: Compatibility is explicit-only and is defined by `schemas/COMPATIBILITY_MATRIX.json`; compatibility is never inferred from SemVer shape, prefix similarity, or version-prefix heuristics.
  - Authority: `docs/VERSION_COMPATIBILITY_CONTRACT.md`, `schemas/COMPATIBILITY_MATRIX.json`, `src/compatibility.ts`, `test/version-compatibility-contract.mjs`
  - Observable Conformance Evidence: matrix policy fields `inferFromSemver=false` and integration tests against unsupported versions.
  - Notes/Exclusions: This does not infer future compatibility in the absence of an explicit manifest entry.

- ID: `UMG-CONF-COMPAT-003`
  - Normative Statement: For `compilerVersion="0.1.0-experimental"`, accepted input schema identities are exactly `umg.compiler-vnext.sleeve.v0.1` for sleeve and `umg.compiler-vnext.selection.v0.1` for selection.
  - Authority: `docs/VERSION_COMPATIBILITY_CONTRACT.md`, `schemas/COMPATIBILITY_MATRIX.json`, `src/version-contract.ts`, `src/schema-validation.ts`, `test/version-compatibility-contract.mjs`, `test/failure-contract.mjs`
  - Observable Conformance Evidence: explicit accept lists and tests for unsupported `sleeve`/`selection` identities.
  - Notes/Exclusions: This does not include any implicit migration from legacy or near-match versions.

- ID: `UMG-CONF-COMPAT-004`
  - Normative Statement: For `compilerVersion="0.1.0-experimental"`, emitted public artifact identities are fixed: `RuntimeSpec.schemaVersion="umg.compiler-vnext.runtime.v0.1"`, `Trace.schemaVersion="umg.compiler-vnext.trace.v0.1"`, and `CompileResult.schemaVersion="umg.compiler-vnext.compile-result.v0.1"`.
  - Authority: `docs/VERSION_COMPATIBILITY_CONTRACT.md`, `schemas/COMPATIBILITY_MATRIX.json`, `src/version-contract.ts`, `src/compile.ts`, `test/version-compatibility-contract.mjs`, `test/public-output-contract.mjs`
  - Observable Conformance Evidence: version compatibility checks and public-output tests for emitted identity fields on compiled fixtures.
  - Notes/Exclusions: Failed compiles may still produce `runtime=null`.

- ID: `UMG-CONF-COMPAT-005`
  - Normative Statement: `schemaRegistry`, `diagnosticRegistry`, `traceEventRegistry`, and `runtimeHashProfile` identities are fixed by compatibility entry and must match the frozen registry versions for this compiler.
  - Authority: `docs/VERSION_COMPATIBILITY_CONTRACT.md`, `schemas/COMPATIBILITY_MATRIX.json`, `src/version-contract.ts`, `test/version-compatibility-contract.mjs`
  - Observable Conformance Evidence: matrix assertions against `SCHEMA_REGISTRY_VERSION`, `DIAGNOSTIC_REGISTRY_VERSION`, `TRACE_EVENT_REGISTRY_VERSION`, and `RUNTIME_HASH_PROFILE_VERSION`.
  - Notes/Exclusions: Registry behavior content is governed by their own contracts.

- ID: `UMG-CONF-COMPAT-006`
  - Normative Statement: Compatibility policy for this compiler requires exact manifest membership and does not allow unknown-future-version acceptance.
  - Authority: `docs/VERSION_COMPATIBILITY_CONTRACT.md`, `schemas/COMPATIBILITY_MATRIX.json`
  - Observable Conformance Evidence: assertions that `getCompilerCompatibility('0.1.0')`, `getCompilerCompatibility('0.1.1')`, and `getCompilerCompatibility('0.1.0-rc.1')` return undefined.
  - Notes/Exclusions: This requirement is a current-manifest boundary, not a promise about later releases.

- ID: `UMG-CONF-COMPAT-007`
  - Normative Statement: The compatibility policy does not perform `autoUpgradeLegacyInput`; unsupported legacy/near-match schema values must fail, not be migrated.
  - Authority: `docs/VERSION_COMPATIBILITY_CONTRACT.md`, `schemas/COMPATIBILITY_MATRIX.json`
  - Observable Conformance Evidence: compatibility policy field `autoUpgradeLegacyInput=false` in manifest and version contract test assertions.
  - Notes/Exclusions: Input transforms not owned by this contract remain outside scope.

- ID: `UMG-CONF-COMPAT-008`
  - Normative Statement: `SCHEMA_REGISTRY_VERSION` is the registry authority for public schema identities; runtime/trace compile-result document identities must use identities from the active registry entries and must fail-closed otherwise.
  - Authority: `schemas/SCHEMA_REGISTRY.json`, `docs/SEMANTIC_FREEZE_v0.1.md`, `src/schema-validation.ts`
  - Observable Conformance Evidence: registry document identity cross-check in `test/version-compatibility-contract.mjs` and structural validation mismatch diagnostics.
  - Notes/Exclusions: Does not grant compatibility to unregistered identities.

- ID: `UMG-CONF-COMPAT-009`
  - Normative Statement: Unknown or unsupported public schema identities are unsupported input, and no compatibility mapping may reinterpret an unsupported identity as a supported one.
  - Authority: `docs/VERSION_COMPATIBILITY_CONTRACT.md`, `schemas/COMPATIBILITY_MATRIX.json`, `src/schema-validation.ts`
  - Observable Conformance Evidence: unsupported `sleeve`, `selection`, `runtime`, `trace`, and `compileResult` mutation cases in `test/version-compatibility-contract.mjs` and structural failure assertions in `test/failure-contract.mjs`.
  - Notes/Exclusions: Runtime/trace compatibility checks are structural; semantic semantics are separate families.

- ID: `UMG-CONF-COMPAT-010`
  - Normative Statement: The compiler MUST not infer compatibility by major/minor/patch boundaries; only identities explicitly declared in matrix/registry are in scope.
  - Authority: `docs/VERSION_COMPATIBILITY_CONTRACT.md`, `schemas/COMPATIBILITY_MATRIX.json`
  - Observable Conformance Evidence: contract language and test list containing non-matching near-match versions (`v0.2`, `v1`, `v0.10`, suffix forms).
  - Notes/Exclusions: does not define a migration strategy for future manifests.

- ID: `UMG-CONF-COMPAT-011`
  - Normative Statement: `compileResult.schemaVersion` and `trace.schemaVersion` identity fields are part of fail-closed identity compatibility; mismatch is treated as internal output-contract failure rather than successful compatibility.
  - Authority: `docs/VERSION_COMPATIBILITY_CONTRACT.md`, `test/version-compatibility-contract.mjs`, `src/compile.ts`
  - Observable Conformance Evidence: finalize checks compare identity values before returning success.
  - Notes/Exclusions: mismatch is surfaced as output-conformity failure, not permissive remap.

- ID: `UMG-CONF-COMPAT-012`
  - Normative Statement: Compatibility boundaries are versioned by the frozen manifest and must align across `compile.ts` entry-point behavior and exported compatibility helpers.
  - Authority: `src/compatibility.ts`, `src/version-contract.ts`, `test/version-compatibility-contract.mjs`, `docs/SEMANTIC_FREEZE_v0.1.md`
  - Observable Conformance Evidence: `compatibilityManifestAsJson()` equality and export consistency checks.
  - Notes/Exclusions: this does not imply any transport compatibility for non-core interfaces.

## SCHEMA REGISTRY ENFORCEMENT

- ID: `UMG-CONF-COMPAT-013`
  - Normative Statement: A public artifact claiming a registered schema identity must satisfy the registered schema contract for that identity, including const `schemaVersion`, and structural validation failures are unsupported-identity failures.
  - Authority: `schemas/SCHEMA_REGISTRY.json`, `schemas/umg-compiler-vnext.schema.json`, `src/schema-validation.ts`
  - Observable Conformance Evidence: structural validation returns `UNSUPPORTED_*_SCHEMA` in invalid-identity cases.
  - Notes/Exclusions: This is schema conformance, not semantic cross-version conversion.

- ID: `UMG-CONF-COMPAT-014`
  - Normative Statement: One registered schema identity must never be interpreted as another; schema type is a contract boundary.
  - Authority: `src/schema-validation.ts`, `schemas/SCHEMA_REGISTRY.json`
  - Observable Conformance Evidence: identity-specific const checks in structural validators and `test/version-compatibility-contract.mjs` coverage of each const identity.
  - Notes/Exclusions: This does not define internal object aliasing for transient diagnostics.

## COMPATIBILITY MATRIX

- ID: `UMG-CONF-COMPAT-015`
  - Normative Statement: Compatibility-relevant combinations are only those present in `schemas/COMPATIBILITY_MATRIX.json`; compatibility checks use exact manifest membership and explicit accepts/emits mapping.
  - Authority: `schemas/COMPATIBILITY_MATRIX.json`, `docs/VERSION_COMPATIBILITY_CONTRACT.md`, `test/version-compatibility-contract.mjs`
  - Observable Conformance Evidence: manifest deep-equality assertions against exported `COMPATIBILITY_MANIFEST`.
  - Notes/Exclusions: does not invent combinations not written in matrix.

- ID: `UMG-CONF-COMPAT-016`
  - Normative Statement: For this manifest, supported combinations are: no migration path, exact-version input acceptance for `0.1.0-experimental`, and explicit emitted identities as listed in `compatibilityManifest.compilerVersions["0.1.0-experimental"]`.
  - Authority: `schemas/COMPATIBILITY_MATRIX.json`
  - Observable Conformance Evidence: compatibility test reads active entry and asserts exact arrays and emitted versions.
  - Notes/Exclusions: does not promise that any unsupported combination is recoverable.

- ID: `UMG-CONF-COMPAT-017`
  - Normative Statement: Rejected combinations include unknown compiler versions, unsupported `schemaVersion` strings, and future/nearmatch identities not in manifest.
  - Authority: `docs/VERSION_COMPATIBILITY_CONTRACT.md`, `test/version-compatibility-contract.mjs`
  - Observable Conformance Evidence: explicit unsupported compiler version and unsupported schema identity tests.
  - Notes/Exclusions: classification is a manifest boundary and does not alter semantic validation for supported combinations.

## FAILURE BOUNDARY

- ID: `UMG-CONF-FAIL-001`
  - Normative Statement: Compile must enforce fail-closed ordering of validation stages: structural JSON/schema validation precedes semantic checks, which precedes resolution.
  - Authority: `docs/INTEGRATION_FAILURE_CONTRACT.md`, `src/validate.ts`, `src/compile.ts`
  - Observable Conformance Evidence: parse/validate order comments and behavior in `test/version-compatibility-contract.mjs`, `test/failure-contract.mjs`.
  - Notes/Exclusions: this does not govern CLI input parsing details.

- ID: `UMG-CONF-FAIL-002`
  - Normative Statement: Structural failures (schema/parse/unknown fields) must fail with `status="failure"`, `runtime=null`, and `trace=null`.
  - Authority: `docs/INTEGRATION_FAILURE_CONTRACT.md`, `docs/PUBLIC_OUTPUT_CONTRACT.md`, `src/compile.ts`, `src/schema-validation.ts`, `test/version-compatibility-contract.mjs`, `test/failure-contract.mjs`
  - Observable Conformance Evidence: structural fixtures in failure tests asserting trace null and runtime null on structural schema failures.
  - Notes/Exclusions: this includes malformed `selection`/`sleeve` documents and malformed output object shape when structurally invalid.

- ID: `UMG-CONF-FAIL-003`
  - Normative Statement: Semantic failures must return `runtime=null`, `hasErrors=true`, and non-null trace with terminal stage semantic.
  - Authority: `docs/INTEGRATION_FAILURE_CONTRACT.md`, `docs/H1/H1C9_TRACE_REQUIREMENTS.md`, `docs/H1/H1C8_RUNTIME_PUBLIC_OUTPUT_REQUIREMENTS.md`
  - Observable Conformance Evidence: semantic failure tests and trace-stage assertions in public-output/trace contracts.
  - Notes/Exclusions: final state maps for semantic failure are constrained to ready/disabled only in this contract.

- ID: `UMG-CONF-FAIL-004`
  - Normative Statement: Resolution failures must return `runtime=null`, `hasErrors=true`, and non-null trace with terminal stage resolution.
  - Authority: `docs/INTEGRATION_FAILURE_CONTRACT.md`, `docs/H1/H1C9_TRACE_REQUIREMENTS.md`
  - Observable Conformance Evidence: resolution failure scenario (`multi-secondary-error`) in `test/failure-contract.mjs` and `test/public-output-contract.mjs`.
  - Notes/Exclusions: does not redefine selection algorithms.

- ID: `UMG-CONF-FAIL-005`
  - Normative Statement: Output-contract incompatibility must fail closed with `status="failure"`, `runtime=null`, `INTERNAL_OUTPUT_CONTRACT_VIOLATION`, and must not produce successful runtime output.
  - Authority: `docs/INTEGRATION_FAILURE_CONTRACT.md`, `docs/PUBLIC_OUTPUT_CONTRACT.md`, `docs/VERSION_COMPATIBILITY_CONTRACT.md`, `src/compile.ts`, `src/public-output-contract.ts`
  - Observable Conformance Evidence: output-contract mutation checks in `test/public-output-contract.mjs` and finalize guard behavior in `src/compile.ts`.
  - Notes/Exclusions: trace may be null or present depending on where the violation is detected.

- ID: `UMG-CONF-FAIL-006`
  - Normative Statement: Unexpected internal compiler exceptions must be surfaced as structured `INTERNAL_COMPILER_ERROR` and are failure-boundary-internal, not semantic/resolution invalidity.
  - Authority: `docs/INTEGRATION_FAILURE_CONTRACT.md`, `docs/H1/H1C10_DIAGNOSTIC_REQUIREMENTS.md`, `src/compile.ts`, `src/errors.ts`
  - Observable Conformance Evidence: `compile.ts` catch path constructs `INTERNAL_COMPILER_ERROR` failure when thrown exceptions escape expected validation paths.
  - Notes/Exclusions: exact exception type/stack is not promoted.

- ID: `UMG-CONF-FAIL-007`
  - Normative Statement: Expected invalid input must emit structured diagnostics and structured non-success envelopes, never raw uncaught exceptions.
  - Authority: `docs/INTEGRATION_FAILURE_CONTRACT.md`, `test/failure-contract.mjs`
  - Observable Conformance Evidence: malformed input tests assert `status=failure`, structured diagnostic lists, and absence of uncaught process abort in same execution path.
  - Notes/Exclusions: this does not preclude host-level transport exceptions outside the core compiler API.

- ID: `UMG-CONF-FAIL-008`
  - Normative Statement: No failed compile may expose a partial executable `RuntimeSpec` (`runtime` MUST be null on all failure outcomes).
  - Authority: `docs/INTEGRATION_FAILURE_CONTRACT.md`, `docs/PUBLIC_OUTPUT_CONTRACT.md`, `src/public-output-contract.ts`, `test/public-output-contract.mjs`
  - Observable Conformance Evidence: tests enforce `expected.runtime === null` for all failure fixtures.
  - Notes/Exclusions: failure trace content may remain available for semantic and resolution paths.

- ID: `UMG-CONF-FAIL-009`
  - Normative Statement: Failure outcomes must not silently fall back to a different compatible schema/version, and incompatible input must not be coerced into a supported interpretation.
  - Authority: `docs/VERSION_COMPATIBILITY_CONTRACT.md`, `src/schema-validation.ts`, `docs/INTEGRATION_FAILURE_CONTRACT.md`
  - Observable Conformance Evidence: `UNSUPPORTED_*_SCHEMA` cases and explicit mismatch checks for unsupported fields.
  - Notes/Exclusions: does not define any migration tooling.

- ID: `UMG-CONF-FAIL-010`
  - Normative Statement: Failed compatibility checks must not mutate/repair user input into a different supported result; they must terminate in failure with traceability and error diagnostics.
  - Authority: `docs/PUBLIC_OUTPUT_CONTRACT.md`, `docs/INTEGRATION_FAILURE_CONTRACT.md`, `src/compile.ts`
  - Observable Conformance Evidence: no fallback code path in compatibility checks; explicit failure contract tests for unknown versions and structural mismatches.
  - Notes/Exclusions: external adapters may re-issue corrected requests as separate interactions.

## REQUIREMENT SUMMARY

- COMPAT_REQUIREMENTS: 17
- FAIL_REQUIREMENTS: 10
- TOTAL_REQUIREMENTS: 27

## VERSION AUTHORITY MODEL

- Compiler version model: `0.1.0-experimental` is the single active compiler version in scope.
- CompileResult schema version model: `umg.compiler-vnext.compile-result.v0.1`.
- Runtime schema version model: `umg.compiler-vnext.runtime.v0.1`.
- Trace schema version model: `umg.compiler-vnext.trace.v0.1`.
- Runtime hash profile model: `umg.compiler-vnext.runtime-hash.v0.1`.
- Compatibility matrix model: explicit manifest in `schemas/COMPATIBILITY_MATRIX.json` with exact entries for `compilerVersions["0.1.0-experimental"]`.

## SUPPORTED COMPATIBILITY MODEL

- Explicitly supported: `compilerVersion=0.1.0-experimental` with exact input accepts for sleeve/selection v0.1 and exact emitted runtime/trace/compileResult schema IDs.
- Explicitly rejected: unknown compiler versions, unknown/near-match schema versions, unsupported future versions under current manifest policy.
- Unspecified / no guarantee: migration policy across future manifest versions and runtime-policy compatibility guarantees for later branches.

## FAILURE CLASSIFICATION MODEL

- Structural failure: `status="failure"`, `runtime=null`, `trace=null`, UNSUPPORTED_*_SCHEMA/structural diagnostics, no executable runtime.
- Semantic failure: `status="failure"`, `runtime=null`, `trace!=null`, `trace.terminalStage="semantic"`.
- Resolution failure: `status="failure"`, `runtime=null`, `trace!=null`, `trace.terminalStage="resolution"`.
- Output-contract failure: `status="failure"`, `runtime=null`, `diagnostic code=INTERNAL_OUTPUT_CONTRACT_VIOLATION`.
- Internal failure: `status="failure"`, `runtime=null`, `diagnostic code=INTERNAL_COMPILER_ERROR` when non-input failures are uncaught by expected paths.

## FAIL-CLOSED MODEL

- A failed input-compatibility check or public-output check cannot escape as a success envelope.
- A failed compatibility check cannot produce non-null executable runtime output.
- Failed checks cannot be repaired by schema coercion, fallback version remap, automatic upgrade, or silent migration.
- A failure may retain trace only where boundary rules allow (semantic/resolution); structural failures remain `trace=null`.

## INTERFACE-NEUTRALITY MODEL

- Core contract: version compatibility and failure-classification obligations apply to all implementations that expose the core compiler contract.
- Deferred transport/interface concerns: CLI process model, shell exit codes, stdout/stderr formatting, REST/SDK/MCP protocol behavior, and shell transport details are not promoted as contractual requirements in this chapter.

## NON-PROMISES

- No arbitrary backward compatibility.
- No arbitrary forward compatibility.
- No SemVer-based compatibility inference.
- No compatibility migration promise for compiler-v0.
- No automatic migration or silent coercion between identities.
- No silent downgrade/upgrade behavior.
- No compatibility with unspecified future experimental versions.

## DEFERRED_ITEMS

- `UMG-CONF-CORE` requirements.
- `UMG-CONF-CLI` requirements.
- `UMG-CONF-CORPUS` requirements.
- `UMG-CONF-ACCEPT` requirements.
- SDK or MCP/REST transport behavior.
- process exit semantics and CLI formatting.
- migration tooling and future release policy.
- H2 executable conformance runner.
- exhaustive unsupported-version corpus.

## RECURSIVE CONSISTENCY NOTES

- `CANON_DECISIONS_REQUIRED`: none
- `CONFLICTS_FOUND`: none
- `SEMANTIC_CHANGES`: none
- `FILES_CHANGED`: `docs/qualification/H1/H1C12_VERSION_COMPATIBILITY_FAILURE_REQUIREMENTS.md`
