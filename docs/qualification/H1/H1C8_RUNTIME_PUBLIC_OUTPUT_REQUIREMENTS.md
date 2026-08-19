# H1-C8 Runtime and Public Output Requirements

This chapter defines normative requirements for `UMG-CONF-RUNTIME-###` and `UMG-CONF-OBS-###`.

## TOP-LEVEL COMPILE RESULT

- ID: `UMG-CONF-RUNTIME-001`
  - Normative Statement: `CompileResult` is the canonical public compiler output envelope and must be validated against the registered public schema.
  - Authority: `docs/PUBLIC_OUTPUT_CONTRACT.md`, `docs/SEMANTIC_FREEZE_v0.1.md`, `schemas/SCHEMA_REGISTRY.json`, `schemas/compile-result.schema.json`
  - Observable Conformance Evidence: `test/public-output-contract.mjs`, `schemas/compile-result.schema.json`
  - Notes/Exclusions: This requirement is about public envelope shape and does not define execution semantics.

- ID: `UMG-CONF-RUNTIME-002`
  - Normative Statement: `CompileResult.status` is only `success` or `failure`, and `hasErrors` must exactly reflect error presence semantics for that status.
  - Authority: `docs/PUBLIC_OUTPUT_CONTRACT.md`, `src/public-output-contract.ts`
  - Observable Conformance Evidence: `test/public-output-contract.mjs` success/failure assertions
  - Notes/Exclusions: `hasErrors=true` does not by itself define diagnostic payload content.

- ID: `UMG-CONF-RUNTIME-003`
  - Normative Statement: A successful compile MUST expose a non-null `runtime` and non-null `trace`.
  - Authority: `docs/PUBLIC_OUTPUT_CONTRACT.md`, `src/public-output-contract.ts`
  - Observable Conformance Evidence: `fixtures/expected/normal.compile-result.json`
  - Notes/Exclusions: Runtime output shape and ordering remain governed by RuntimeSpec and PromptPart contracts.

- ID: `UMG-CONF-RUNTIME-004`
  - Normative Statement: A failed compile MUST expose `runtime = null` and `hasErrors = true`; failure may still include a trace object where supported by failure path.
  - Authority: `docs/PUBLIC_OUTPUT_CONTRACT.md`, `src/compile.ts`, `test/public-output-contract.mjs`
  - Observable Conformance Evidence: `fixtures/expected/multi-secondary-error.compile-result.json`, `test/failure-contract.mjs`
  - Notes/Exclusions: Structural failures may use `trace = null` while semantic/resolution failures carry trace.

- ID: `UMG-CONF-RUNTIME-005`
  - Normative Statement: Successful public output must satisfy registered public schema contracts for `CompileResult`, `RuntimeSpec`, and `Trace` if present; malformed internal output must fail closed rather than leak partial executable data.
  - Authority: `docs/SEMANTIC_FREEZE_v0.1.md`, `schemas/SCHEMA_REGISTRY.json`, `src/public-output-contract.ts`
  - Observable Conformance Evidence: `test/public-output-contract.mjs` contract checks
  - Notes/Exclusions: Diagnostic payload depth is deferred to `UMG-CONF-DIAG`.

- ID: `UMG-CONF-RUNTIME-006`
  - Normative Statement: Internal contract violations in final output construction are surfaced as `INTERNAL_OUTPUT_CONTRACT_VIOLATION` failure, not as partial success.
  - Authority: `docs/PUBLIC_OUTPUT_CONTRACT.md`, `src/compile.ts`, `src/public-output-contract.ts`
  - Observable Conformance Evidence: `test/public-output-contract.mjs` forced contract mutation checks and `compile.ts` finalize guardrails
  - Notes/Exclusions: This is a fail-safe behavior, not a new failure-cause taxonomy.

- ID: `UMG-CONF-RUNTIME-007`
  - Normative Statement: `schemaVersion`, `compilerVersion`, and `status` in the public envelope must be explicitly present and non-empty.
  - Authority: `docs/PUBLIC_OUTPUT_CONTRACT.md`, `schemas/compile-result.schema.json`
  - Observable Conformance Evidence: `test/public-output-contract.mjs`, `src/types.ts`, schema validation
  - Notes/Exclusions: Version policy itself remains in `VERSION_COMPATIBILITY_CONTRACT.md`.

- ID: `UMG-CONF-RUNTIME-008`
  - Normative Statement: `CompileResult.compilerVersion` and `CompileResult.trace.compilerVersion` and `CompileResult.runtime.compilerVersion` (when present) must agree.
  - Authority: `src/public-output-contract.ts`, `docs/PUBLIC_OUTPUT_CONTRACT.md`
  - Observable Conformance Evidence: `test/public-output-contract.mjs` runtime/trace compile-result consistency checks
  - Notes/Exclusions: This is an output identity consistency requirement, not execution versioning.

- ID: `UMG-CONF-RUNTIME-009`
  - Normative Statement: `RuntimeSpec.compilerVersion` must equal `CompileResult.compilerVersion`; `sleeveId`, `compiledAt` and runtime identity fields must remain consistent with the source sleeve/selection when the runtime is produced.
  - Authority: `src/public-output-contract.ts`, `docs/PUBLIC_OUTPUT_CONTRACT.md`
  - Observable Conformance Evidence: `fixtures/expected/normal.compile-result.json`, contract validation paths in `test/public-output-contract.mjs`
  - Notes/Exclusions: Exact identity policy is controlled by schema and selection contracts.

- ID: `UMG-CONF-RUNTIME-010`
  - Normative Statement: `RuntimeSpec.diagnostics` must equal `CompileResult.diagnostics`; diagnostics may contain warnings, and must never contain error diagnostics.
  - Authority: `docs/PUBLIC_OUTPUT_CONTRACT.md`, `src/public-output-contract.ts`
  - Observable Conformance Evidence: `test/public-output-contract.mjs` (forced runtime warning/error validation)
  - Notes/Exclusions: Diagnostic code semantics are deferred to UMG-CONF-DIAG.

- ID: `UMG-CONF-RUNTIME-011`
  - Normative Statement: `RuntimeSpec.runtimeHash` is a required public integrity field on successful `RuntimeSpec`, and successful output must preserve that field.
  - Authority: `docs/PUBLIC_OUTPUT_CONTRACT.md`, `schemas/runtime-spec.schema.json`
  - Observable Conformance Evidence: `src/public-output-contract.ts`, `test/public-output-contract.mjs`
  - Notes/Exclusions: Hash computation algorithm and canonicalization details are deferred to UMG-CONF-HASH.

## RUNTIMESPEC IDENTITY

- ID: `UMG-CONF-RUNTIME-012`
  - Normative Statement: Required runtime identity fields are frozen and public: `schemaVersion`, `sleeveId`, `sleeveName`, `controllerNeoStackId`, `compiledAt`, and `compilerVersion`.
  - Authority: `docs/PUBLIC_OUTPUT_CONTRACT.md`, `docs/SEMANTIC_FREEZE_v0.1.md`, `schemas/runtime-spec.schema.json`
  - Observable Conformance Evidence: `fixtures/expected/normal.compile-result.json`
  - Notes/Exclusions: This is an identity/pointer contract, not authority policy.

- ID: `UMG-CONF-RUNTIME-013`
  - Normative Statement: `RuntimeSpec.sleeveId`, `sleeveName`, and `controllerNeoStackId` must correspond to the authoritative sleeve input identifiers used for compilation.
  - Authority: `src/compile.ts`, `docs/PUBLIC_OUTPUT_CONTRACT.md`
  - Observable Conformance Evidence: `test/public-output-contract.mjs` and successful fixture checks
  - Notes/Exclusions: These are strict field correspondences at public boundary level.

- ID: `UMG-CONF-RUNTIME-014`
  - Normative Statement: `compiledAt` in RuntimeSpec and Trace must equal the caller-supplied selection timestamp used for compilation.
  - Authority: `docs/PUBLIC_OUTPUT_CONTRACT.md`, `src/compile.ts`
  - Observable Conformance Evidence: `fixtures/expected/normal.compile-result.json`
  - Notes/Exclusions: Timestamp formatting and timezone normalization are schema-level not semantics-level here.

## ACTIVE / RESOLVED COGNITION

- ID: `UMG-CONF-OBS-001`
  - Normative Statement: `activeNeoStackIds` lists the resolved active NeoStacks for successful RuntimeSpec and anchors active execution context.
  - Authority: `docs/PUBLIC_OUTPUT_CONTRACT.md`, `docs/SEMANTIC_FREEZE_v0.1.md`
  - Observable Conformance Evidence: `test/public-output-contract.mjs`, `fixtures/expected/normal.compile-result.json`
  - Notes/Exclusions: Selection and inactive topology semantics are defined in prior H1 and C4/C5/C6/C7 behavior docs.

- ID: `UMG-CONF-OBS-002`
  - Normative Statement: `resolvedNeoBlocks` contains active NeoBlocks in deterministic resolved order.
  - Authority: `docs/PUBLIC_OUTPUT_CONTRACT.md`, `src/public-output-contract.ts`
  - Observable Conformance Evidence: `test/public-output-contract.mjs` and ordered fixture checks
  - Notes/Exclusions: Does not re-specify runtime selection algorithm.

- ID: `UMG-CONF-OBS-003`
  - Normative Statement: Each resolved NeoBlock must include `id`, `name`, `state = "active"`, `postRunState = "ready"`, and `primeDirectiveId`.
  - Authority: `schemas/umg-compiler-vnext.schema.json`, `docs/PUBLIC_OUTPUT_CONTRACT.md`
  - Observable Conformance Evidence: `fixtures/expected/normal.compile-result.json`
  - Notes/Exclusions: State evolution policy remains in state/govereance sections.

- ID: `UMG-CONF-OBS-004`
  - Normative Statement: `secondaryDirectiveId` is optional and present only when a Secondary Directive participates in resolved cognition; `activeTriggerIds` must be present as resolved active trigger set for that NeoBlock.
  - Authority: `docs/PUBLIC_OUTPUT_CONTRACT.md`, `schemas/umg-compiler-vnext.schema.json`
  - Observable Conformance Evidence: `fixtures/expected/normal.compile-result.json`
  - Notes/Exclusions: This is output projection of established directive-selection semantics.

- ID: `UMG-CONF-OBS-005`
  - Normative Statement: `resolvedNeoBlocks[].lanes` must expose all resolved lanes with canonical authority ordering and no duplicate lane types.
  - Authority: `docs/PUBLIC_OUTPUT_CONTRACT.md`, `src/public-output-contract.ts`
  - Observable Conformance Evidence: `src/public-output-contract.ts` lane-order validation and fixture runtime lane arrays
  - Notes/Exclusions: It is an observability contract; lane ordering semantics follow `MOLT_AUTHORITY_ORDER`.

- ID: `UMG-CONF-OBS-006`
  - Normative Statement: `ResolvedLane.scoped` contributes additive scoped/overlay content and does not alter `geometrySource`; local lane geometry in `rows` contributes additive resolved rows from effective geometry.
  - Authority: `docs/PUBLIC_OUTPUT_CONTRACT.md`, `docs/H1/H1C6_SCOPED_MOLT_OVERLAY_REQUIREMENTS.md`
  - Observable Conformance Evidence: `fixtures/expected/normal.compile-result.json`, scoped/overlay success fixtures
  - Notes/Exclusions: Additivity semantics are preserved from C6 and must not be redefined here.

- ID: `UMG-CONF-OBS-007`
  - Normative Statement: `geometrySource` must be one of `base`, `bundle`, `generated-directive-lane`, `evaluated-trigger-lane`, with `bundleId` present only when `geometrySource = "bundle"`.
  - Authority: `docs/PUBLIC_OUTPUT_CONTRACT.md`, `src/public-output-contract.ts`
  - Observable Conformance Evidence: `test/public-output-contract.mjs` runtime contract checks and fixture lanes
  - Notes/Exclusions: Geometry selection mechanics remain in C3/C5/C7.

## PROMPT PARTS

- ID: `UMG-CONF-OBS-008`
  - Normative Statement: `promptParts` is the deterministic flat sequence of effective cognition derived from resolved output and must include one prompt part per resolved contribution.
  - Authority: `docs/PUBLIC_OUTPUT_CONTRACT.md`, `src/public-output-contract.ts`
  - Observable Conformance Evidence: `test/public-output-contract.mjs`, `fixtures/expected/normal.compile-result.json`
  - Notes/Exclusions: This is a flattening-surface requirement; internal traversal strategy is not frozen here.

- ID: `UMG-CONF-OBS-009`
  - Normative Statement: Each PromptPart must include frozen location fields `neoStackId`, `neoBlockId`, `laneOrder`, `scopeLayer`, `row`, and `column`, and these fields represent observable location metadata only.
  - Authority: `docs/PUBLIC_OUTPUT_CONTRACT.md`, `schemas/umg-compiler-vnext.schema.json`
  - Observable Conformance Evidence: `test/public-output-contract.mjs`, fixture promptParts payloads
  - Notes/Exclusions: Numeric conventions for these coordinates are not promoted to canonical semantics.

- ID: `UMG-CONF-OBS-010`
  - Normative Statement: PromptPart provenance requires `sourceMode` and `sourceId`; these fields remain publicly exposed for observability and do not introduce authority.
  - Authority: `docs/PUBLIC_OUTPUT_CONTRACT.md`, `src/public-output-contract.ts`
  - Observable Conformance Evidence: `fixtures/expected/normal.compile-result.json` and merge/scoped examples
  - Notes/Exclusions: Detailed registry of these provenance fields is in UMG-CONF-PROV if defined later.

- ID: `UMG-CONF-OBS-011`
  - Normative Statement: For a part in local provenance, `sourceMode="local"` and `sourceId` MUST identify the block itself.
  - Authority: `docs/PUBLIC_OUTPUT_CONTRACT.md`, `schemas/umg-compiler-vnext.schema.json`
  - Observable Conformance Evidence: `fixtures/expected/normal.compile-result.json` local prompt parts
  - Notes/Exclusions: Local mode cannot include scoped/overlay/merge-only provenance channels.

- ID: `UMG-CONF-OBS-012`
  - Normative Statement: Scoped and overlay prompt parts require provenance `sourceScope`; overlay parts additionally require `overlayId`; merge parts require `mergeId`.
  - Authority: `docs/PUBLIC_OUTPUT_CONTRACT.md`, `src/public-output-contract.ts`, `src/types.ts`
  - Observable Conformance Evidence: `test/public-output-contract.mjs` contract failures for invalid runtime provenance and merge test fixtures
  - Notes/Exclusions: Specific scope-layer numeric values are not normative.

## RESET PLAN

- ID: `UMG-CONF-RUNTIME-015`
  - Normative Statement: `RuntimeSpec.resetPlan` is required on successful RuntimeSpec and includes `targetState = "ready"` and the deterministic plan IDs for reset declaration.
  - Authority: `docs/PUBLIC_OUTPUT_CONTRACT.md`, `src/public-output-contract.ts`
  - Observable Conformance Evidence: `test/public-output-contract.mjs`, fixture resetPlan values
  - Notes/Exclusions: Reset execution mechanics are outside compiler output obligations.

- ID: `UMG-CONF-RUNTIME-016`
  - Normative Statement: `resetPlan.neoStackIds` must equal `activeNeoStackIds`, and `resetPlan.neoBlockIds` must equal `resolvedNeoBlocks` IDs in resolved order.
  - Authority: `docs/PUBLIC_OUTPUT_CONTRACT.md`, `src/public-output-contract.ts`
  - Observable Conformance Evidence: `test/public-output-contract.mjs` runtime contract negative test
  - Notes/Exclusions: This validates public surface consistency only.

- ID: `UMG-CONF-RUNTIME-017`
  - Normative Statement: Public runtime output must not expose implementation-only governance/runtime side effects; it is declarative state declaration only.
  - Authority: `docs/PUBLIC_OUTPUT_CONTRACT.md`
  - Observable Conformance Evidence: `test/public-output-contract.mjs` contract validations
  - Notes/Exclusions: No executor protocol is specified in H1-C8.

## REQUIREMENT SUMMARY
- RUNTIME count: 17
- OBS count: 12
- total: 29

## SUCCESS MODEL
- status: `success`
- runtime: non-null `RuntimeSpec`
- trace: non-null `Trace`
- hasErrors: `false`

## FAILURE MODEL
- status: `failure`
- runtime: `null`
- trace: may be `null` for structural failure; typically non-null for semantic/resolution failure
- hasErrors: `true`

## RUNTIMESPEC PUBLIC SURFACE
- Required/Observable fields: `schemaVersion`, `compilerVersion`, `sleeveId`, `sleeveName`, `controllerNeoStackId`, `compiledAt`, `activeNeoStackIds`, `resolvedNeoBlocks`, `promptParts`, `diagnostics`, `runtimeHash`, `resetPlan`
- RuntimeSpec observables: `activeNeoStackIds`, `resolvedNeoBlocks`, `promptParts`, `resetPlan`, `runtimeHash`
- Canonical resolved outputs: `resolvedNeoBlocks[].state`, `resolvedNeoBlocks[].postRunState`, lanes, `geometrySource`, `bundleId` when applicable

## PROVENANCE SURFACE
- Normative:
  - `sourceMode`
  - `sourceId`
  - `sourceScope` (when non-local provenance)
  - `overlayId` (overlay provenance)
  - `mergeId` (merge provenance)
- Deferred:
  - Whether any provenance fields map to executor-weighted precedence
  - Any additional canonicalization semantics for provenance identity tokens

## IMPLEMENTATION DETAILS NOT PROMOTED
- Exact integer conventions used for `laneOrder`, `scopeLayer`, `row`, and `column`
- Trace event vocabulary, ordering, and payload semantics
- RuntimeHash algorithm and canonicalization method
- Specific executor transport interfaces (CLI, HTTP, files)
- Full malformed internal-output matrix

## DEFERRED_ITEMS
- Trace event semantics
- Diagnostic registry/payload structure and cross-domain diagnostics payload details
- RuntimeHash algorithm/profile
- CLI transport requirements
- Unresolved PromptPart numeric flattening conventions (`laneOrder`, `scopeLayer`, `row`, `column`)
- Exhaustive malformed internal-output matrix

## CANON_DECISIONS_REQUIRED
- none identified

## CONFLICTS_FOUND
- none

## SEMANTIC_CHANGES
- none

## REPORT
- H1C8_STATUS: COMPLETE
- SOURCE_HEAD: `764ac06fdbb14c74ee5afe5cd799ec261ea047b0`
- RUNTIME_REQUIREMENTS: 17
- OBS_REQUIREMENTS: 6
- TOTAL_REQUIREMENTS: 23
- SUCCESS_MODEL: success with non-null runtime/trace, hasErrors=false
- FAILURE_MODEL: failure with runtime=null, hasErrors=true, trace optional by failure path
- RUNTIMESPEC_PUBLIC_FIELDS: `schemaVersion`, `compilerVersion`, `sleeveId`, `sleeveName`, `controllerNeoStackId`, `compiledAt`, `activeNeoStackIds`, `resolvedNeoBlocks`, `promptParts`, `diagnostics`, `runtimeHash`, `resetPlan`
- PROVENANCE_SURFACE:
  - Normative: `sourceMode`, `sourceId`, `sourceScope`, `overlayId`, `mergeId`
  - Deferred: authority weighting or precedence interpretation
- IMPLEMENTATION_DETAILS_NOT_PROMOTED: coordinate numeric conventions, trace event details, runtimeHash internals, CLI transport
- DEFERRED_ITEMS: Trace event semantics, diagnostic payload registry, hash algorithm/profile, CLI transport, PromptPart numeric flattening, exhaustive malformed-output matrix
- CANON_DECISIONS_REQUIRED: none identified
- CONFLICTS_FOUND: none
- SEMANTIC_CHANGES: none
- FILES_CHANGED: `docs/qualification/H1/H1C8_RUNTIME_PUBLIC_OUTPUT_REQUIREMENTS.md`
