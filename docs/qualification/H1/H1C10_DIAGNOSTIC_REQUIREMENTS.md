# H1-C10 Diagnostic Requirements

This document defines the frozen compiler-vnext v0.1 diagnostic contract under
`UMG-CONF-DIAG-###`.

## DIAGNOSTIC MACHINE CONTRACT

- ID: `UMG-CONF-DIAG-001`
  - Normative Statement: `CompilerDiagnostic` is a frozen public machine contract with required fields `code`, `level`, `stage`, `subject`, and `message`; optional fields are `path` and `details`.
  - Authority: `docs/DIAGNOSTIC_CONTRACT.md`, `schemas/umg-compiler-vnext.schema.json`
  - Observable Conformance Evidence: `test/public-output-contract.mjs`
  - Notes/Exclusions: `additionalProperties` is forbidden for diagnostics via schema; this is a public shape requirement.

- ID: `UMG-CONF-DIAG-002`
  - Normative Statement: `code` is a registered diagnostic code; a conforming implementation must emit only v0.1 registered codes for compiler failures.
  - Authority: `src/diagnostic-registry.ts`, `schemas/DIAGNOSTIC_REGISTRY.json`, `test/diagnostic-registry-contract.mjs`
  - Observable Conformance Evidence: registry conformance test, emitted-code scan in diagnostic tests
  - Notes/Exclusions: Diagnostic codes are version-scoped through `DIAGNOSTIC_REGISTRY_VERSION`.

- ID: `UMG-CONF-DIAG-003`
  - Normative Statement: `level` must be exactly one of the stable level set `{error, warning}` and `warning` is currently the only non-failing level.
  - Authority: `docs/DIAGNOSTIC_CONTRACT.md`, `src/diagnostic-registry.ts`, `schemas/DIAGNOSTIC_REGISTRY.json`
  - Observable Conformance Evidence: `src/diagnostic-registry.ts`, `test/public-output-contract.mjs`
  - Notes/Exclusions: No additional levels are part of v0.1 conformance.

- ID: `UMG-CONF-DIAG-004`
  - Normative Statement: `stage` must be exactly one of `structural`, `semantic`, `resolution`, `output`, `internal`; a compiler failure diagnostic must use the authoritative registry-defined stage.
  - Authority: `docs/DIAGNOSTIC_CONTRACT.md`, `src/diagnostic-registry.ts`, `schemas/DIAGNOSTIC_REGISTRY.json`
  - Observable Conformance Evidence: `test/diagnostic-registry-contract.mjs`, `test/failure-contract.mjs`
  - Notes/Exclusions: Do not map these to Trace stages.

- ID: `UMG-CONF-DIAG-005`
  - Normative Statement: `subject.kind` is required and must be one of the registered subject kinds.
  - Authority: `docs/DIAGNOSTIC_CONTRACT.md`, `src/diagnostic-registry.ts`
  - Observable Conformance Evidence: `test/diagnostic-registry-contract.mjs`, `test/diagnostic-emission-coverage.mjs`
  - Notes/Exclusions: This requirement covers only v0.1 registered subject kinds.

- ID: `UMG-CONF-DIAG-006`
  - Normative Statement: `subject.id` is required except where the registry stage/subject-kind exemption permits omission (malformed structural documents and select subject kinds), including structural `sleeve` documents and optional id subject kinds `compiler`, `selection`, `runtime`, `trace`, `compile_result`.
  - Authority: `src/diagnostic-registry.ts`, `docs/DIAGNOSTIC_CONTRACT.md`
  - Observable Conformance Evidence: `test/diagnostic-registry-contract.mjs`
  - Notes/Exclusions: When present, `subject.id` must be a non-empty string.

- ID: `UMG-CONF-DIAG-007`
  - Normative Statement: `message` is mandatory human-readable prose and may be used for presentation, but integrations must not parse exact text for control flow.
  - Authority: `docs/DIAGNOSTIC_CONTRACT.md`, `schemas/umg-compiler-vnext.schema.json`
  - Observable Conformance Evidence: `src/public-output-contract.ts` (stability requirements), `test/public-output-contract.mjs`
  - Notes/Exclusions: Message wording stability is explicitly deferred except as non-normative presentation guidance.

- ID: `UMG-CONF-DIAG-008`
  - Normative Statement: `path` is an optional deterministic hint only; it is not a canonical diagnostic identity component.
  - Authority: `docs/DIAGNOSTIC_CONTRACT.md`, `schema-validation.ts`-driven outputs reflected in tests
  - Observable Conformance Evidence: `test/public-output-contract.mjs`, `test/failure-contract.mjs`
  - Notes/Exclusions: Path should not be used as stable branching logic.

- ID: `UMG-CONF-DIAG-009`
  - Normative Statement: `details` is optional; whenever a diagnostic code has `requiredDetailKeys`, every listed key must be present and non-undefined at emission.
  - Authority: `src/diagnostic-registry.ts`, `schemas/DIAGNOSTIC_REGISTRY.json`, `test/diagnostic-registry-contract.mjs`
  - Observable Conformance Evidence: `test/diagnostic-emission-coverage.mjs`
  - Notes/Exclusions: Additional non-required detail keys may be present if contract version permits.

## REGISTRY AUTHORITY MODEL

- ID: `UMG-CONF-DIAG-010`
  - Normative Statement: `src/diagnostic-registry.ts` is the implementation authority; `schemas/DIAGNOSTIC_REGISTRY.json` is the machine-readable mirror.
  - Authority: `docs/DIAGNOSTIC_CONTRACT.md`, `src/diagnostic-registry.ts`, `schemas/DIAGNOSTIC_REGISTRY.json`
  - Observable Conformance Evidence: registry version and structural equality assertions in `test/diagnostic-registry-contract.mjs`
  - Notes/Exclusions: Registry tests are executable equivalence evidence; they do not supersede the contract and source-of-truth docs.

- ID: `UMG-CONF-DIAG-011`
  - Normative Statement: For each registered code, registry-stable fields are `code`, `level`, `stage`, `allowedSubjectKinds`, `summary`, and `requiredDetailKeys`; these are part of the normative contract where they are frozen by registry.
  - Authority: `schemas/DIAGNOSTIC_REGISTRY.json`, `docs/DIAGNOSTIC_CONTRACT.md`
  - Observable Conformance Evidence: `test/diagnostic-registry-contract.mjs`
  - Notes/Exclusions: `summary` is stable text for diagnosis context but not a canonical machine branch key.

- ID: `UMG-CONF-DIAG-012`
  - Normative Statement: Diagnostic emission must align stage and subject to registry entry definitions; an emitted diagnostic with wrong `(code, level, stage, subject.kind)` is non-conformant.
  - Authority: `src/diagnostic-registry.ts`, `src/public-output-contract.ts`
  - Observable Conformance Evidence: `test/diagnostic-registry-contract.mjs`
  - Notes/Exclusions: Stage and subject kind are part of the stable identity surface.

- ID: `UMG-CONF-DIAG-013`
  - Normative Statement: The v0.1 registry must remain complete and equivalent between implementation and mirror representation.
  - Authority: `test/diagnostic-registry-contract.mjs`, `src/diagnostic-registry.ts`, `schemas/DIAGNOSTIC_REGISTRY.json`
  - Observable Conformance Evidence: explicit equality checks in registry test
  - Notes/Exclusions: Registry migration/versioning is governed by version contract documents.

## STAGE SEMANTICS AND BOUNDARIES

- ID: `UMG-CONF-DIAG-014`
  - Normative Statement: `structural` diagnostics describe input-document and JSON Schema validation failures and may appear when compiler input or output schemas are malformed.
  - Authority: `docs/DIAGNOSTIC_CONTRACT.md`
  - Observable Conformance Evidence: `test/failure-contract.mjs` structural failure cases
  - Notes/Exclusions: Structural malformed `sleeve`/`selection` may omit `subject.id` when canonical identity is unavailable.

- ID: `UMG-CONF-DIAG-015`
  - Normative Statement: `semantic` diagnostics describe authored-surface validation failures (canonical sleeve/selection semantics) and run before resolution-time execution.
  - Authority: `docs/DIAGNOSTIC_CONTRACT.md`, `test/failure-contract.mjs`
  - Observable Conformance Evidence: `test/diagnostic-emission-coverage.mjs`, semantic validation test cases
  - Notes/Exclusions: Semantic failures are resolved independently from output/resolve failures.

- ID: `UMG-CONF-DIAG-016`
  - Normative Statement: `resolution` diagnostics describe deterministic selection/governance/state/authority resolution failures.
  - Authority: `docs/DIAGNOSTIC_CONTRACT.md`, `src/resolve.ts`, `test/failure-contract.mjs`
  - Observable Conformance Evidence: resolution failure fixture assertions
  - Notes/Exclusions: Resolution does not redefine semantic validation rules.

- ID: `UMG-CONF-DIAG-017`
  - Normative Statement: `output` diagnostics are constrained to public-output contract violations and must be limited to the registered `INTERNAL_OUTPUT_CONTRACT_VIOLATION`.
  - Authority: `docs/DIAGNOSTIC_CONTRACT.md`, `src/errors.ts`
  - Observable Conformance Evidence: `test/diagnostic-registry-contract.mjs`, malformed finalize test in `test/diagnostic-emission-coverage.mjs`
  - Notes/Exclusions: Output contract failures remain separate from compile validation failures.

- ID: `UMG-CONF-DIAG-018`
  - Normative Statement: `internal` is reserved for unexpected compiler implementation failures and is limited by registry to `INTERNAL_COMPILER_ERROR`.
  - Authority: `docs/DIAGNOSTIC_CONTRACT.md`, `src/errors.ts`
  - Observable Conformance Evidence: `test/diagnostic-registry-contract.mjs`, defensive case in `test/diagnostic-emission-coverage.mjs`
  - Notes/Exclusions: `internal` is explicitly separate from structured input/semantic/resolve failures.

## FAILURE & AGGREGATION BEHAVIOR

- ID: `UMG-CONF-DIAG-019`
  - Normative Statement: Error-level diagnostics are canonical failure signals; where failure is reported as expected structured outcome, compile returns diagnostics instead of uncaught exceptions.
  - Authority: `docs/DIAGNOSTIC_CONTRACT.md`, `test/failure-contract.mjs`, `test/public-output-contract.mjs`
  - Observable Conformance Evidence: malformed input structural cases and hostile path access fixture
  - Notes/Exclusions: This does not redefine compile terminal state requirements already specified in `H1-C8`.

- ID: `UMG-CONF-DIAG-020`
  - Normative Statement: Warnings may co-exist with success outcomes and do not, by themselves, invalidate successful RuntimeSpec construction.
  - Authority: `docs/DIAGNOSTIC_CONTRACT.md`, `test/public-output-contract.mjs`
  - Observable Conformance Evidence: warning validation path in `test/diagnostic-emission-coverage.mjs`
  - Notes/Exclusions: Successful `RuntimeSpec` must still satisfy no-error rule for its own diagnostic set.

- ID: `UMG-CONF-DIAG-021`
  - Normative Statement: For successful compile outcomes, `RuntimeSpec` and `CompileResult` diagnostics must be error-free; for successful RuntimeSpec, warning-only diagnostics remain permissible.
  - Authority: `src/public-output-contract.ts`, `test/public-output-contract.mjs`
  - Observable Conformance Evidence: runtime and compile success conformance assertions
  - Notes/Exclusions: Error-level diagnostics in RuntimeSpec are invalid for success.

- ID: `UMG-CONF-DIAG-022`
  - Normative Statement: Diagnostic aggregation is canonical and consistent:
    - `CompileResult.diagnostics` is the authoritative aggregate,
    - `Trace.diagnostics` must equal `CompileResult.diagnostics`,
    - `RuntimeSpec.diagnostics` must equal `CompileResult.diagnostics` for successful outputs.
  - Authority: `docs/DIAGNOSTIC_CONTRACT.md`, `docs/H1/H1C8_RUNTIME_PUBLIC_OUTPUT_REQUIREMENTS.md`, `src/public-output-contract.ts`
  - Observable Conformance Evidence: `test/diagnostic-registry-contract.mjs`, `test/public-output-contract.mjs`, `test/trace-registry-contract.mjs`
  - Notes/Exclusions: This is a trace/runtime data-equality requirement; event ordering is not restated here.

## DIAGNOSTIC COVERAGE

- ID: `UMG-CONF-DIAG-023`
  - Normative Statement: Conformance requires proof that every registered code has a producer path or explicit reserved disposition, and that emitted diagnostics are all registered.
  - Authority: `test/diagnostic-emission-coverage.mjs`, `test/diagnostic-registry-contract.mjs`
  - Observable Conformance Evidence: full registry/code coverage assertions in diagnostic emission coverage test
  - Notes/Exclusions: Coverage requirement does not require one unique malformed-input permutation per code.

- ID: `UMG-CONF-DIAG-024`
  - Normative Statement: `DIAGNOSTIC_REGISTRY` must remain complete across source and mirror and maintain the same count and set for v0.1 (`98` codes at current HEAD).
  - Authority: `test/diagnostic-registry-contract.mjs`, `schemas/DIAGNOSTIC_REGISTRY.json`
  - Observable Conformance Evidence: equality and count checks in registry tests
  - Notes/Exclusions: Versioned registry migration handled by compatibility contract.

## FULL DIAGNOSTIC CATALOG

| CODE | LEVEL | STAGE | SUMMARY | ALLOWED SUBJECT KIND(S) | REQUIRED DETAIL KEYS | TRIGGER CONDITION |
|---|---|---|---|---|---|---|
| ACTIVE_NEOSTACK_OUTSIDE_CONTROLLER_TREE | error | resolution | A selected NeoStack is outside the Controller NeoStack tree. | neostack | selectedNeoStackId, controllerNeoStackId, blockingReason, blockingSource | Resolver condition; validated in `test/diagnostic-emission-coverage.mjs` |
| ARRAY_TOO_SHORT | error | structural | An array failed a structural minimum length requirement. | sleeve, selection, runtime, trace, compile_result | documentKind, minimumItems | Structural array size violation in schema/contracts |
| BUNDLE_REFERENCE_TYPE_MISMATCH | error | semantic | A Secondary Directive references a Bundle for the wrong lane type. | secondary_directive | None | Semantic validation of directive/bundle lane compatibility |
| CONTROLLER_HAS_PARENT | error | semantic | The Controller NeoStack is not the apex of the tree. | sleeve | None | Semantic validation of controller-tree canonicality |
| CONTROLLER_NOT_SELECTED | error | semantic | The compile selection omitted the Controller NeoStack. | selection | None | Semantic validation of selection requirements |
| DIRECTIVE_BASE_GEOMETRY_CANON_VIOLATION | error | semantic | Directive Base Geometry violates the Prime/Secondary Directive canon. | neoblock | primeDirectiveId, authoredRows | C1-C8 directive-canon validation context |
| DUPLICATE_BUNDLE_ID | error | semantic | Bundle IDs are duplicated inside one NeoBlock. | neoblock | duplicateIds | Validation of uniqueness constraints |
| DUPLICATE_GEOMETRY_MEMBER | error | semantic | A lane geometry repeats a block member. | neoblock, bundle | duplicateBlockIds | Geometry semantic validation |
| DUPLICATE_GEOMETRY_ROW | error | semantic | A lane geometry repeats a row number. | neoblock, bundle | duplicateRows | Geometry semantic validation |
| DUPLICATE_GLOBAL_ID | error | semantic | Canonical object IDs are duplicated across the Sleeve. | sleeve | duplicateIds | Canonical global ID validation |
| DUPLICATE_LOCAL_MOLT_ID | error | semantic | A NeoBlock repeats a local MOLT block id. | neoblock | duplicateIds | NeoBlock local MOLT uniqueness validation |
| DUPLICATE_MERGE_ID | error | semantic | Merge relation IDs are duplicated inside one NeoBlock. | neoblock | duplicateIds | Merge declaration validation |
| DUPLICATE_MERGE_RESULT | error | semantic | More than one Merge declaration targets the same result block. | neoblock | resultBlockId, mergeIds | Merge placement/uniqueness validation |
| DUPLICATE_MODULE_ROW | error | semantic | A NeoStack repeats a module row number. | neostack | duplicateRows | NeoStack structural semantic validation |
| DUPLICATE_MODULE_ROW_MEMBER | error | semantic | A NeoStack repeats a member inside one parent geometry. | neostack | duplicateIds | NeoStack member uniqueness validation |
| DUPLICATE_OVERLAY_ID | error | semantic | Overlay IDs are duplicated. | overlay | duplicateIds | Overlay declaration validation |
| DUPLICATE_SECONDARY_DIRECTIVE_ID | error | semantic | Secondary Directive relation IDs are duplicated inside one NeoBlock. | neoblock | duplicateIds | Secondary Directive uniqueness validation |
| DUPLICATE_SELECTION_ID | error | semantic | A selection id list contains duplicates. | selection | duplicateIds | Selection uniqueness validation |
| EMPTY_GEOMETRY | error | semantic | A lane geometry is missing all rows. | neoblock, bundle | None | Geometry semantic validation |
| EMPTY_GEOMETRY_ROW | error | semantic | A lane geometry row is missing all members. | neoblock, bundle | None | Geometry semantic validation |
| EMPTY_MODULE_ROW | error | semantic | A NeoStack row is missing all members. | neostack | None | NeoStack semantic validation |
| GOVERNANCE_RULE_NO_TARGETS | error | semantic | A Governance rule does not target any NeoStack or NeoBlock. | governance | None | Governance semantic validation |
| INTERNAL_COMPILER_ERROR | error | internal | The compiler failed unexpectedly. | compiler | None | Defensive runtime exception capture |
| INTERNAL_OUTPUT_CONTRACT_VIOLATION | error | output | The compiler produced output that violates the public output contract. | compile_result | None | Finalization/contract check boundary |
| INVALID_COMPILED_AT | error | semantic | The selection compiledAt value is not a valid ISO-8601 timestamp. | selection | None | Selection-time semantic date validation |
| INVALID_CONST_VALUE | error | structural | A field failed a structural const requirement. | sleeve, selection, runtime, trace, compile_result | documentKind, received | Schema validation |
| INVALID_ENUM_VALUE | error | structural | A field failed a structural enum requirement. | sleeve, selection, runtime, trace, compile_result | documentKind, received | Schema validation |
| INVALID_FIELD_FORMAT | error | structural | A field failed a structural format requirement. | sleeve, selection, runtime, trace, compile_result | documentKind, format | Schema validation |
| INVALID_FIELD_TYPE | error | structural | A field failed a structural type requirement. | sleeve, selection, runtime, trace, compile_result | documentKind, expectedType, receivedType | Schema validation |
| INVALID_GEOMETRY_ROW | error | semantic | A lane geometry row number is not a positive integer. | neoblock, bundle | None | Geometry semantic validation |
| INVALID_MERGE_RESULT | error | semantic | A Merge result does not reference a local pre-authored result block. | merge | None | Merge declaration/result validation |
| INVALID_MERGE_SOURCE | error | semantic | A Merge source does not reference a local MOLT block. | merge | None | Merge declaration/source validation |
| INVALID_MODULE_ROW | error | semantic | A NeoStack row number is not a positive integer. | neostack | None | NeoStack semantic validation |
| INVALID_NUMERIC_RANGE | error | structural | A numeric field failed a structural minimum requirement. | sleeve, selection, runtime, trace, compile_result | documentKind, minimum | Schema validation |
| INVALID_PRIME_DIRECTIVE | error | semantic | A NeoBlock primeDirectiveId is not one local Directive block. | neoblock | None | Directive reference validation |
| INVALID_ROUTE_RATIONALE | error | semantic | The selection routeRationale value is not a JSON object. | selection | None | Selection semantic validation |
| INVALID_SECONDARY_DIRECTIVE_BLOCK | error | semantic | A Secondary Directive does not reference a local Directive block. | secondary_directive | None | Directive relation validation |
| INVALID_SECONDARY_TRIGGER_BLOCK | error | semantic | A Secondary Directive does not reference a local Trigger block. | secondary_directive | None | Trigger reference validation |
| INVALID_UNION_SHAPE | error | structural | A value does not match any supported structural union shape. | sleeve, selection, runtime, trace, compile_result | documentKind | Schema validation |
| LANE_MEMBER_TYPE_MISMATCH | error | semantic | A lane member has the wrong MOLT type for the lane. | neoblock, bundle | blockId, actualType, expectedType | Geometry semantic validation |
| MERGE_AUTHORITY_ESCALATION | error | semantic | A Merge attempts to produce higher authority than its sources allow. | merge | sourceTypes, resultType, highestAuthorizedType | Merge authority boundary validation |
| MERGE_CHAIN_UNSUPPORTED | error | semantic | A Merge references the result of another Merge. | merge | dependencyMergeIds, sourceBlockIds | Merge dependency validation |
| MERGE_CYCLE | error | semantic | A NeoBlock declares a cyclic Merge dependency. | neoblock | mergeIds, resultBlockIds | Merge graph validation |
| MERGE_DUPLICATE_SOURCE | error | structural | A Merge declaration repeats a source block id. | sleeve, selection, runtime, trace, compile_result | None | Merge schema/structure validation |
| MERGE_RESULT_IS_SOURCE | error | semantic | A Merge result is also listed as a Merge source. | merge | resultBlockId | Merge declaration rule validation |
| MERGE_RESULT_NOT_PLACED | error | semantic | A Merge result is not placed through Prime/Secondary Directive, Base Geometry, or a Bundle. | merge | resultBlockId | Merge placement validation |
| MERGE_RESULT_SCOPED_UNSUPPORTED | error | semantic | A Merge result is referenced through scopedMolt or Overlay attachments. | scoped_attachment | blockId, attachmentId, sourceKind, ownerNeoBlockId | Scope/overlay prohibition in Merge contracts |
| MERGE_TOO_FEW_SOURCES | error | structural | A Merge declaration has fewer than two source block ids. | sleeve, selection, runtime, trace, compile_result | documentKind, minimumItems | Merge declaration structural validation |
| MISSING_REQUIRED_FIELD | error | structural | A required field is missing. | sleeve, selection, runtime, trace, compile_result | documentKind, missingProperty | Structural schema validation |
| MULTIPLE_NEOSTACK_PARENTS | error | semantic | A NeoStack appears beneath more than one parent. | neostack | parents | NeoStack parent graph validation |
| MULTIPLE_SECONDARY_DIRECTIVE_MATCH | error | resolution | More than one Secondary Directive matched one active NeoBlock. | neoblock | secondaryDirectiveIds | Resolution tie resolution validation |
| NEOBLOCK_IN_MULTIPLE_NEOSTACKS | error | semantic | A NeoBlock appears in more than one NeoStack. | neostack | neoStacks | NeoBlock placement validation |
| NEOBLOCK_WITHOUT_NEOSTACK | error | semantic | A NeoBlock is not placed in any NeoStack. | neoblock | None | Placement semantic validation |
| NEOSTACK_CYCLE | error | semantic | A NeoStack cycle exists in the parent tree. | neostack | None | NeoStack graph semantic validation |
| NO_TRIGGER_MATCH_FOR_ACTIVE_NEOBLOCK | error | resolution | An active NeoBlock has no true Trigger state. | neoblock | neoBlockId, triggerBlockIds | Resolution trigger matching |
| NONCONTIGUOUS_GEOMETRY_ROWS | error | semantic | Lane geometry rows are not one-based contiguous integers. | neoblock, bundle | actualRows, expectedRows | Geometry semantic validation |
| NONCONTIGUOUS_MODULE_ROWS | error | semantic | NeoStack rows are not one-based contiguous integers. | neostack | actualRows, expectedRows | NeoStack semantic validation |
| NONLOCAL_GEOMETRY_MEMBER | error | semantic | A lane geometry references a non-local MOLT block. | neoblock, bundle | None | Geometry semantic validation |
| ORPHAN_LOCAL_DIRECTIVE | error | semantic | A non-Prime local Directive is not connected to a Secondary Directive or Merge. | neoblock | directiveBlockIds | Directive/orphan validation |
| ORPHAN_NEOSTACK | error | semantic | A NeoStack is not properly parented beneath the Controller NeoStack. | neostack | controllerNeoStackId, reason | NeoStack placement semantic validation |
| PRIME_AS_SECONDARY_DIRECTIVE | error | semantic | A Prime Directive is also declared as a Secondary Directive. | secondary_directive | None | Directive relation conflict validation |
| REQUIRED_BASE_LANE_MISSING | error | semantic | A required Base Geometry lane is missing from a NeoBlock. | neoblock | None | Base geometry lane validation |
| REQUIRED_MOLT_MISSING | error | semantic | A required local MOLT authority is missing from a NeoBlock. | neoblock | moltType | Directive authority presence validation |
| SCOPED_MOLT_TYPE_UNSUPPORTED | error | semantic | A scopedMolt or Overlay attachment references an unsupported MOLT type. | scoped_attachment | None | Scoped/overlay attachment validation |
| SELECTION_MISSING_ANCESTOR | error | resolution | A selected NeoStack is missing a selected ancestor. | neostack | selectedNeoStackId, missingAncestorNeoStackId, expectedPath, blockingReason, blockingSource | Resolution ancestry validation |
| SELECTION_NEOBLOCK_CONTAINER_NOT_EXECUTABLE | error | resolution | A selected NeoBlock is inside a selected but non-executable containing NeoStack. | neoblock | targetId, targetKind, containerNeoStackId, blockingObjectId, blockingReason, blockingSource | Resolution containment/executability |
| SELECTION_NEOBLOCK_CONTAINER_NOT_SELECTED | error | resolution | A selected NeoBlock is missing a selected containing NeoStack. | neoblock | targetId, targetKind, containerNeoStackId, blockingObjectId, blockingReason, blockingSource | Resolution containment validation |
| SELECTION_NEOBLOCK_CONTAINER_UNKNOWN | error | resolution | A selected NeoBlock is not placed in any NeoStack. | neoblock | targetId, targetKind, blockingReason, blockingSource | Resolution containment validation |
| SELECTION_TARGET_NOT_EXECUTABLE | error | resolution | A selected target has an effective state that prevents execution. | neostack, neoblock | targetId, targetKind, effectiveState, blockingReason, blockingSource | Resolution state validation |
| STRING_TOO_SHORT | error | structural | A string failed a structural minimum length requirement. | sleeve, selection, runtime, trace, compile_result | documentKind, minimumLength | Structural schema validation |
| STRUCTURAL_SCHEMA_VIOLATION | error | structural | A value failed structural JSON Schema validation. | sleeve, selection, runtime, trace, compile_result | documentKind, keyword | Structural schema validation |
| TRIGGER_BOUND_TO_MULTIPLE_SECONDARIES | error | semantic | One Trigger is bound to multiple Secondary Directives. | neoblock | triggerBlockIds | Secondary relation semantic validation |
| TRIGGER_MERGE_UNSUPPORTED | error | semantic | A Merge uses Trigger blocks, which are outside compiler-vnext Merge semantics. | merge | None | Merge semantic validation |
| TRIGGER_STATE_TYPE_MISMATCH | error | semantic | A triggerState entry references a non-trigger MOLT block. | molt_block | actualType, expectedType | Selection trigger-state semantic validation |
| UNKNOWN_ACTIVE_GOVERNANCE_RULE | error | semantic | The selection references an unknown active Governance rule. | governance | None | Selection validation for active governance ids |
| UNKNOWN_ACTIVE_NEOBLOCK | error | semantic | The selection references an unknown active NeoBlock. | neoblock | None | Selection validation for active neoblock ids |
| UNKNOWN_ACTIVE_NEOSTACK | error | semantic | The selection references an unknown active NeoStack. | neostack | None | Selection validation for active neostack ids |
| UNKNOWN_ACTIVE_OVERLAY | error | semantic | The selection references an unknown active Overlay. | overlay | None | Selection validation for active overlay ids |
| UNKNOWN_BUNDLE_REFERENCE | error | semantic | A Secondary Directive references an unknown Bundle. | secondary_directive | None | Secondary validation for bundle ids |
| UNKNOWN_CHILD_NEOSTACK | error | semantic | A NeoStack references an unknown child NeoStack. | neostack | None | NeoStack graph validation |
| UNKNOWN_CONTROLLER_NEOSTACK | error | semantic | The Sleeve controllerNeoStackId does not reference an authored NeoStack. | sleeve | None | Sleeve semantic controller validation |
| UNKNOWN_DISABLED_NEOBLOCK | error | semantic | The selection references an unknown disabled NeoBlock. | neoblock | None | Selection disabled-neoblock validation |
| UNKNOWN_DISABLED_NEOSTACK | error | semantic | The selection references an unknown disabled NeoStack. | neostack | None | Selection disabled-neostack validation |
| UNKNOWN_FIELD | error | structural | An unexpected field is present. | sleeve, selection, runtime, trace, compile_result | documentKind, field | Structural schema validation |
| UNKNOWN_GOVERNANCE_NEOBLOCK_TARGET | error | semantic | A Governance rule targets an unknown NeoBlock. | governance | None | Governance target validation |
| UNKNOWN_GOVERNANCE_NEOSTACK_TARGET | error | semantic | A Governance rule targets an unknown NeoStack. | governance | None | Governance target validation |
| UNKNOWN_LOCAL_MOLT_BLOCK | error | semantic | A NeoBlock references an unknown local MOLT block. | neoblock | None | Local MOLT reference validation |
| UNKNOWN_MOLT_BLOCK | error | semantic | A lane geometry references an unknown MOLT block. | neoblock, bundle | None | Geometry reference validation |
| UNKNOWN_NEOBLOCK_IN_NEOSTACK | error | semantic | A NeoStack references an unknown NeoBlock. | neostack | None | NeoStack membership validation |
| UNKNOWN_SCOPED_MOLT_BLOCK | error | semantic | A scopedMolt or Overlay attachment references an unknown MOLT block. | scoped_attachment | None | Scoped/overlay reference validation |
| UNKNOWN_SCOPED_NEOSTACK | error | semantic | A scopedMolt or Overlay attachment references an unknown NeoStack scope. | scoped_attachment | None | Scoped/overlay reference validation |
| UNKNOWN_TRIGGER_STATE_ID | error | semantic | A triggerState entry references an unknown MOLT block id. | molt_block | None | Trigger-state validation |
| UNREACHABLE_LOCAL_MOLT_BLOCK | warning | semantic | A local MOLT block is unreachable from authored runtime surfaces. | neoblock | blockIds | Reachability validation |
| UNSUPPORTED_COMPILE_RESULT_SCHEMA | error | structural | The CompileResult schemaVersion is unsupported. | compile_result | documentKind, received | CompileResult schema compatibility check |
| UNSUPPORTED_RUNTIME_SCHEMA | error | structural | The RuntimeSpec schemaVersion is unsupported. | runtime | documentKind, received | Runtime schema compatibility check |
| UNSUPPORTED_SELECTION_SCHEMA | error | structural | The CompileSelection schemaVersion is unsupported. | selection | documentKind, received | Selection schema compatibility check |
| UNSUPPORTED_SLEEVE_SCHEMA | error | structural | The Sleeve schemaVersion is unsupported. | sleeve | documentKind, received | Sleeve schema compatibility check |
| UNSUPPORTED_TRACE_SCHEMA | error | structural | The Trace schemaVersion is unsupported. | trace | documentKind, received | Trace schema compatibility check |

## REQUIREMENT SUMMARY
- DIAG count: 24
- total: 24

## DIAGNOSTIC STAGE MODEL
- structural: input shape / schema compatibility and validation failures.
- semantic: authored-source and selection-canonical validation failures.
- resolution: route-state-resolution and containment/executability failures.
- output: violations of the public output contract.
- internal: unexpected compiler execution failures.

## DIAGNOSTIC MACHINE CONTRACT
- Stable: `code`, `level`, `stage`, `subject.kind`, `subject.id` policy, required detail key presence.
- Extensible/non-stable: `message` prose, optional non-required `details` keys, optional `path`.

## REGISTRY AUTHORITY MODEL
- Authoritative registry: `src/diagnostic-registry.ts`
- Machine-readable mirror: `schemas/DIAGNOSTIC_REGISTRY.json`
- Human-readable contract: `docs/DIAGNOSTIC_CONTRACT.md`
- Executable evidence: `test/diagnostic-registry-contract.mjs`

## AGGREGATION MODEL
- CompileResult: canonical aggregate diagnostics list for the compile attempt.
- Trace: must equal `CompileResult.diagnostics`.
- RuntimeSpec: for successful compiles must equal `CompileResult.diagnostics` and contain no error-level diagnostics.

## CATALOG COVERAGE
- Total registry codes: 98
- Codes with confirmed trigger mappings: 98
- Codes needing source review: 0
- Warnings: 1 (`UNREACHABLE_LOCAL_MOLT_BLOCK`)
- Errors: 97

## IMPLEMENTATION DETAILS NOT PROMOTED
- Exact wording of `message` prose where not frozen.
- Diagnostic helper call stack, internal module names, and helper ordering.
- Optional detail payload keys beyond required contract.
- Test harness internals and fixture scheduling mechanics.

## DEFERRED_ITEMS
- RuntimeHash
- CLI transport
- version compatibility
- Exhaustive malformed-input corpus for one-to-one coverage
- Additional test trigger provenance where not explicitly established

## DIAGNOSTIC STABLE/DEFERRED MODEL
- STABLE_MACHINE_FIELDS: `code`, `level`, `stage`, `subject.kind`, `subject.id` policy, `message`, `details` required keys, `path` when present
- NON_STABLE_PRESENTATION_FIELDS: exact `message` prose, optional `path` formatting details, optional `details` extras

## CANON_DECISIONS_REQUIRED
- none identified

## CONFLICTS_FOUND
- none

## SEMANTIC_CHANGES
- none

## REPORT
- H1C10_STATUS: COMPLETE
- SOURCE_HEAD: `764ac06fdbb14c74ee5afe5cd799ec261ea047b0`
- DIAG_REQUIREMENTS: 24
- TOTAL_REQUIREMENTS: 24
- REGISTERED_DIAGNOSTIC_CODES: 98
- ERROR_CODES: 97
- WARNING_CODES: 1 (`UNREACHABLE_LOCAL_MOLT_BLOCK`)
- CONFIRMED_TRIGGER_MAPPINGS: all 98 codes mapped through registry contract and emission coverage tests
- SOURCE_REVIEW_REQUIRED: none
- DIAGNOSTIC_STAGES: structural, semantic, resolution, output, internal
- STABLE_MACHINE_FIELDS: `code`, `level`, `stage`, `subject.kind`, `subject.id` policy, required detail keys
- NON_STABLE_PRESENTATION_FIELDS: message prose and optional detail extras
- REGISTRY_AUTHORITY: source registry (`src/diagnostic-registry.ts`) + mirror (`schemas/DIAGNOSTIC_REGISTRY.json`) + public contract (`docs/DIAGNOSTIC_CONTRACT.md`) + evidence (`test/diagnostic-registry-contract.mjs`, emission tests)
- AGGREGATION_MODEL: CompileResult canonical + Trace == CompileResult + RuntimeSpec == CompileResult on success
- CANON_DECISIONS_REQUIRED: none
- CONFLICTS_FOUND: none
- SEMANTIC_CHANGES: none
- FILES_CHANGED: `docs/qualification/H1/H1C10_DIAGNOSTIC_REQUIREMENTS.md`
