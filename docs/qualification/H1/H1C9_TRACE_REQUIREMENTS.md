# H1-C9 Trace Requirements

## TRACE ENVELOPE

- ID: `UMG-CONF-TRACE-001`
  - Normative Statement: `Trace` must always follow the registered public envelope with required fields: `schemaVersion`, `compilerVersion`, `sleeveId`, `compiledAt`, `terminalStage`, `events`, `diagnostics`, `finalNeoStackStates`, and `finalNeoBlockStates`.
  - Authority: `docs/TRACE_CONTRACT.md`, `schemas/trace.schema.json`, `schemas/umg-compiler-vnext.schema.json`
  - Observable Conformance Evidence: `test/public-output-contract.mjs`
  - Notes/Exclusions: This is envelope-level visibility only; event payload semantics are governed by registry contracts.

- ID: `UMG-CONF-TRACE-002`
  - Normative Statement: Trace payload uses only the registered top-level fields and does not allow additional top-level public keys.
  - Authority: `schemas/umg-compiler-vnext.schema.json`, `docs/TRACE_CONTRACT.md`
  - Observable Conformance Evidence: `test/public-output-contract.mjs`, schema validation paths in `src/public-output-contract.ts`
  - Notes/Exclusions: Unknown top-level keys are schema violations, not extension behavior.

- ID: `UMG-CONF-TRACE-003`
  - Normative Statement: `Trace.schemaVersion` must use the registered trace schema identifier and `Trace.terminalStage` must be one of `intake`, `semantic`, `resolution`, `output`, or `post_run`.
  - Authority: `schemas/trace.schema.json`, `schemas/umg-compiler-vnext.schema.json`, `docs/TRACE_CONTRACT.md`
  - Observable Conformance Evidence: `schemas/SCHEMA_REGISTRY.json`, `test/trace-registry-contract.mjs`
  - Notes/Exclusions: `terminalStage` values are restricted in pass/failure outcome rules below.

- ID: `UMG-CONF-TRACE-004`
  - Normative Statement: In successful compiles and non-structural failures, `Trace.diagnostics` must equal `CompileResult.diagnostics`.
  - Authority: `docs/PUBLIC_OUTPUT_CONTRACT.md`, `src/public-output-contract.ts`
  - Observable Conformance Evidence: `test/public-output-contract.mjs`, `test/trace-registry-contract.mjs`
  - Notes/Exclusions: Per-code diagnostic schema and payload details are deferred to `H1-C10`.

- ID: `UMG-CONF-TRACE-005`
  - Normative Statement: Trace output must include a final state snapshot for both NeoStacks and NeoBlocks through `finalNeoStackStates` and `finalNeoBlockStates`, with state values limited to frozen runtime-state vocabulary.
  - Authority: `docs/TRACE_CONTRACT.md`, `schemas/umg-compiler-vnext.schema.json`
  - Observable Conformance Evidence: `test/trace-registry-contract.mjs`, `test/trace-emission-coverage.mjs`
  - Notes/Exclusions: Detailed mapping rules for governance/state transitions remain in H1-C4.

## TRACE STAGE MODEL

- ID: `UMG-CONF-TRACE-006`
  - Normative Statement: Trace stages are frozen exactly as `intake`, `semantic`, `resolution`, `output`, and `post_run`; these are the only legal `TraceEvent.stage` and `Trace.terminalStage` values.
  - Authority: `docs/TRACE_CONTRACT.md`, `schemas/umg-compiler-vnext.schema.json`
  - Observable Conformance Evidence: `test/trace-registry-contract.mjs`, `schemas/TRACE_EVENT_REGISTRY.json`
  - Notes/Exclusions: This model does not define execution semantics, only trace publication stages.

- ID: `UMG-CONF-TRACE-007`
  - Normative Statement: Structural failure path is not represented by a stage; it returns `trace = null` rather than any terminal `trace.terminalStage`.
  - Authority: `docs/TRACE_CONTRACT.md`, `test/public-output-contract.mjs`
  - Observable Conformance Evidence: `fixtures/` semantic vs structural expected outputs, structural failure case in `test/public-output-contract.mjs`
  - Notes/Exclusions: Structural compile errors are handled by contract closure in CompileResult semantics.

- ID: `UMG-CONF-TRACE-008`
  - Normative Statement: Terminal stage for semantic failure is `semantic`; terminal stage for resolution failure is `resolution`; terminal stage for success is `post_run`.
  - Authority: `docs/TRACE_CONTRACT.md`, `src/public-output-contract.ts`
  - Observable Conformance Evidence: `test/trace-registry-contract.mjs`, `test/public-output-contract.mjs`
  - Notes/Exclusions: `output` and intermediate success-at-resolution endpoints are invalid for these families.

## EVENT REGISTRY AND SHAPE

- ID: `UMG-CONF-TRACE-009`
  - Normative Statement: Only event types present in the registered Trace Event Registry are valid public event identities in `Trace.events`.
  - Authority: `schemas/TRACE_EVENT_REGISTRY.json`, `src/trace-event-registry.ts`, `docs/TRACE_CONTRACT.md`
  - Observable Conformance Evidence: `test/trace-registry-contract.mjs`
  - Notes/Exclusions: Registry source-of-truth is the published registry, with schema tests as evidence for implementation alignment.

- ID: `UMG-CONF-TRACE-010`
  - Normative Statement: `TraceEvent` required shape is frozen as `seq`, `type`, `stage`, `subject`, and `data`; `subjectId` is not part of the public trace event shape.
  - Authority: `docs/TRACE_CONTRACT.md`, `schemas/TRACE_EVENT_REGISTRY.json`, `schemas/umg-compiler-vnext.schema.json`
  - Observable Conformance Evidence: `test/trace-registry-contract.mjs`, `src/public-output-contract.ts`
  - Notes/Exclusions: No additional required event keys are promoted outside registry entry requirements.

- ID: `UMG-CONF-TRACE-011`
  - Normative Statement: `TraceEvent.seq` is normative as a contiguous deterministic sequence starting at `1` and increasing by `1` per event.
  - Authority: `docs/TRACE_CONTRACT.md`, `src/public-output-contract.ts`
  - Observable Conformance Evidence: `test/trace-registry-contract.mjs`
  - Notes/Exclusions: Does not require any particular event count beyond run outcome.

- ID: `UMG-CONF-TRACE-012`
  - Normative Statement: `TraceEvent.subject.kind` must be allowed for the event type by registry metadata; subject-id presence follows registry `subjectIdPolicy` (`required`, `optional`, `forbidden`).
  - Authority: `schemas/TRACE_EVENT_REGISTRY.json`, `src/trace-event-registry.ts`, `docs/TRACE_CONTRACT.md`
  - Observable Conformance Evidence: `test/trace-registry-contract.mjs`, `test/trace-emission-coverage.mjs`
  - Notes/Exclusions: Registry governs identity-level subject rules; payload payload meanings remain in family requirements.

- ID: `UMG-CONF-TRACE-013`
  - Normative Statement: For each emitted event, all `requiredDataKeys` defined in its registry entry must be present in `event.data`.
  - Authority: `docs/TRACE_CONTRACT.md`, `schemas/TRACE_EVENT_REGISTRY.json`, `src/public-output-contract.ts`
  - Observable Conformance Evidence: `test/trace-registry-contract.mjs`, `test/trace-emission-coverage.mjs`
  - Notes/Exclusions: Additional documented keys may be present when frozen; this requirement does not norm every additional field.

- ID: `UMG-CONF-TRACE-014`
  - Normative Statement: Event stage ordering is monotonic in the registry order (`intake`→`semantic`→`resolution`→`output`→`post_run`) and must not regress to earlier stages.
  - Authority: `docs/TRACE_CONTRACT.md`, `src/trace-event-registry.ts`, `src/public-output-contract.ts`
  - Observable Conformance Evidence: `test/trace-registry-contract.mjs`
  - Notes/Exclusions: This does not freeze any implementation traversal strategy behind the emitted order.

## EVENT FAMILIES (HIERARCHICAL TRACE COVERAGE)

- ID: `UMG-CONF-TRACE-015`
  - Normative Statement: Trace must include intake provenance events through `SOURCE_VALIDATED` and `ROUTE_SELECTION_RECEIVED` when selection routing information is present.
  - Authority: `schemas/TRACE_EVENT_REGISTRY.json`, `test/trace-registry-contract.mjs`
  - Observable Conformance Evidence: `test/trace-emission-coverage.mjs` (route rationale fixture)
  - Notes/Exclusions: Family presence is event-type specific; event payloads remain registry-defined.

- ID: `UMG-CONF-TRACE-016`
  - Normative Statement: NeoStack resolution activity is observable via registered `NEOSTACK_*` event types and NeoBlock resolution activity via registered `NEOBLOCK_*` event types.
  - Authority: `docs/TRACE_CONTRACT.md`, `schemas/TRACE_EVENT_REGISTRY.json`
  - Observable Conformance Evidence: `test/trace-registry-contract.mjs`, `test/trace-emission-coverage.mjs`
  - Notes/Exclusions: Exact count and branching are governed by authored input and route.

- ID: `UMG-CONF-TRACE-017`
  - Normative Statement: Trigger and directive-selection resolution activity is observable through `TRIGGER_EVALUATED`, `PRIME_DIRECTIVE_APPLIED`, and `SECONDARY_DIRECTIVE_SELECTED` with frozen stage/value semantics from registry.
  - Authority: `docs/TRACE_CONTRACT.md`, `schemas/TRACE_EVENT_REGISTRY.json`
  - Observable Conformance Evidence: `test/trace-emission-coverage.mjs`, secondary-directive related fixtures in tests
  - Notes/Exclusions: Priority, winner, and tie-break inference remain excluded from Trace requirements.

- ID: `UMG-CONF-TRACE-018`
  - Normative Statement: Base/Bundle geometry resolution activity is represented by registered geometry events: `BASE_GEOMETRY_APPLIED`, `BUNDLE_APPLIED`, and `GEOMETRY_RESOLVED`.
  - Authority: `schemas/TRACE_EVENT_REGISTRY.json`, `docs/TRACE_CONTRACT.md`
  - Observable Conformance Evidence: `test/trace-registry-contract.mjs`
  - Notes/Exclusions: Geometry semantics remain normative in H1-C3/C5/C6/C7, not redefined here.

- ID: `UMG-CONF-TRACE-019`
  - Normative Statement: Scoped and Overlay cognition contribution is observable through `SCOPED_MOLT_APPLIED` and `OVERLAY_APPLIED` respectively, with registry-forced data keys.
  - Authority: `schemas/TRACE_EVENT_REGISTRY.json`, `docs/TRACE_CONTRACT.md`
  - Observable Conformance Evidence: `test/trace-registry-contract.mjs`, relevant scoped/overlay fixtures
  - Notes/Exclusions: This is additive observability, not authoritative runtime mutation.

- ID: `UMG-CONF-TRACE-020`
  - Normative Statement: Merge validation must be observable with `MERGE_VALIDATED` and its required registry metadata.
  - Authority: `schemas/TRACE_EVENT_REGISTRY.json`, `docs/TRACE_CONTRACT.md`
  - Observable Conformance Evidence: `test/trace-registry-contract.mjs`, merge fixtures
  - Notes/Exclusions: Merge authority/placement/placement-dormancy rules are defined in H1-C7.

- ID: `UMG-CONF-TRACE-021`
  - Normative Statement: Governance application is traceable by registered `GOVERNANCE_RULE_APPLIED`; absence of this event indicates no governance declaration in that run.
  - Authority: `schemas/TRACE_EVENT_REGISTRY.json`, `docs/TRACE_CONTRACT.md`
  - Observable Conformance Evidence: `test/trace-emission-coverage.mjs`
  - Notes/Exclusions: Governance semantics are covered in H1-C4.

- ID: `UMG-CONF-TRACE-022`
  - Normative Statement: Successful output publication is marked by exactly one `RUNTIME_COMPILED` output-stage event and exactly one `POST_RUN_RESET_DECLARED` post-run event.
  - Authority: `docs/TRACE_CONTRACT.md`, `src/public-output-contract.ts`
  - Observable Conformance Evidence: `test/trace-registry-contract.mjs`, success cases in `fixtures/expected/*.compile-result.json`
  - Notes/Exclusions: Runtime payloads and reset-plan behavior are constrained in H1-C8.

- ID: `UMG-CONF-TRACE-023`
  - Normative Statement: A successful trace must end with `RUNTIME_COMPILED` followed by `POST_RUN_RESET_DECLARED`; no event may follow `POST_RUN_RESET_DECLARED`.
  - Authority: `docs/TRACE_CONTRACT.md`, `test/trace-registry-contract.mjs`
  - Observable Conformance Evidence: `test/trace-registry-contract.mjs`
  - Notes/Exclusions: Does not assert internal phase timings or buffering behavior.

- ID: `UMG-CONF-TRACE-024`
  - Normative Statement: `RUNTIME_COMPILED` and `POST_RUN_RESET_DECLARED` are required success terminal events and are not emitted on semantic or resolution failures.
  - Authority: `docs/TRACE_CONTRACT.md`, `test/trace-registry-contract.mjs`
  - Observable Conformance Evidence: `test/trace-registry-contract.mjs` semantic and resolution cases
  - Notes/Exclusions: This requirement binds by outcome and stage model above.

## DIAGNOSTIC LINKAGE (TRACE-SPECIFIC)

- ID: `UMG-CONF-TRACE-025`
  - Normative Statement: For semantic failure traces, each semantic diagnostic maps exactly to ordered `VALIDATION_*` events using registry linkage (`diagnosticIndex`, `code`) and matching `stage`, `subject`, and count order.
  - Authority: `docs/TRACE_CONTRACT.md`, `src/public-output-contract.ts`
  - Observable Conformance Evidence: `test/trace-registry-contract.mjs`
  - Notes/Exclusions: Full diagnostic payload schema and code meaning are deferred to `H1-C10`.

- ID: `UMG-CONF-TRACE-026`
  - Normative Statement: For resolution failures and successful compiles that still include warnings, each resolution diagnostic maps exactly to ordered `RESOLUTION_*` events using registry linkage (`diagnosticIndex`, `code`) and matching `stage`, `subject`, and order.
  - Authority: `docs/TRACE_CONTRACT.md`, `src/public-output-contract.ts`
  - Observable Conformance Evidence: `test/trace-registry-contract.mjs`
  - Notes/Exclusions: Resolution warning presence does not imply failure.

## FINAL STATE SNAPSHOTS

- ID: `UMG-CONF-TRACE-027`
  - Normative Statement: `finalNeoStackStates` and `finalNeoBlockStates` must cover all authored NeoStacks and NeoBlocks in the sleeve.
  - Authority: `schemas/umg-compiler-vnext.schema.json`, `docs/TRACE_CONTRACT.md`
  - Observable Conformance Evidence: `test/trace-registry-contract.mjs`, state coverage assertions in tests
  - Notes/Exclusions: Values indicate pre-reset compiler state at terminal trace point.

- ID: `UMG-CONF-TRACE-028`
  - Normative Statement: On success, final state maps must reflect active states from resolved runtime objects; on semantic failure they reflect canonical authored baseline (ready/disabled only); on resolution failure they reflect effective state reached before termination.
  - Authority: `docs/TRACE_CONTRACT.md`, `src/public-output-contract.ts`
  - Observable Conformance Evidence: `test/trace-registry-contract.mjs`, success and resolution fixture checks
  - Notes/Exclusions: Runtime reset intent is represented separately by `POST_RUN_RESET_DECLARED`, not by mutation of these maps.

## IMPLEMENTATION DETAIL VS NORMATIVE TRACE MODEL

- Registry authority controls public event identity and frozen required fields.
- The set/order of required event invocations in internal loops is implementation-specific and not promoted to normative contract.
- Numeric row/depth/debug details not currently frozen in the public contract are not promoted.

## REQUIREMENT SUMMARY
- TRACE count: 28

## TRACE ENVELOPE MODEL
- Required public fields: `schemaVersion`, `compilerVersion`, `sleeveId`, `compiledAt`, `terminalStage`, `events`, `diagnostics`, `finalNeoStackStates`, `finalNeoBlockStates`

## TRACE STAGE MODEL
- Registered/frozen stages: `intake` → `semantic` → `resolution` → `output` → `post_run`
- Structural failure: `trace = null`
- Semantic failure terminal stage: `semantic`
- Resolution failure terminal stage: `resolution`
- Success terminal stage: `post_run`

## TRACE EVENT AUTHORITY MODEL
- Event identity and required metadata are governed by `TRACE_EVENT_REGISTRY` (versioned in `schemas/TRACE_EVENT_REGISTRY.json`).
- All emitted types must be registered.
- Registry-required `requiredDataKeys` and `subjectIdPolicy` are part of stable public identity contract.
- Test coverage validates implementation emits only registry-typed events and validates registry parity.

## TRACE ORDERING MODEL
- Normative event invariant: contiguous `seq` starting at `1`.
- Normative event stage invariant: monotonic non-decreasing by TraceStage order.
- Normative terminal ordering: for success, last events are `RUNTIME_COMPILED` then `POST_RUN_RESET_DECLARED`; this is a contract invariant.

## SUCCESS TRACE MODEL
- status: `success`
- runtime: non-null
- trace: non-null
- terminalStage: `post_run`
- final events: `RUNTIME_COMPILED`, `POST_RUN_RESET_DECLARED`
- state maps: active values for active runtime objects; successful reset declaration present in `POST_RUN_RESET_DECLARED.data`

## FAILURE TRACE MODEL
- structural failure: `status=failure`, `runtime=null`, `trace=null`
- semantic failure: `status=failure`, `terminalStage=semantic`, no resolution/output/post-run events, no `RUNTIME_COMPILED` / `POST_RUN_RESET_DECLARED`
- resolution failure: `status=failure`, `terminalStage=resolution`, no output/post-run events, no `RUNTIME_COMPILED` / `POST_RUN_RESET_DECLARED`

## DEFERRED_ITEMS
- Detailed diagnostic payload and diagnostic registry semantics.
- RuntimeHash internals and profile behavior.
- CLI transport.
- Trace event payload schema details beyond registry-required keys.
- Exhaustive malformed internal-trace-output matrix.

## CANON_DECISIONS_REQUIRED
- none identified

## CONFLICTS_FOUND
- none

## SEMANTIC_CHANGES
- none

## REPORT
- H1C9_STATUS: COMPLETE
- SOURCE_HEAD: `764ac06fdbb14c74ee5afe5cd799ec261ea047b0`
- TRACE_REQUIREMENTS: 28
- TOTAL_REQUIREMENTS: 28
- TRACE_PUBLIC_FIELDS: `schemaVersion`, `compilerVersion`, `sleeveId`, `compiledAt`, `terminalStage`, `events`, `diagnostics`, `finalNeoStackStates`, `finalNeoBlockStates`
- TRACE_STAGES: intake, semantic, resolution, output, post_run
- EVENT_REGISTRY_AUTHORITY: `docs/TRACE_CONTRACT.md` + `schemas/TRACE_EVENT_REGISTRY.json` (+ `src/trace-event-registry.ts` as canonical source code mirror); tests assert emitted-event parity
- TRACE_ORDERING_MODEL: contiguous seq, monotonic stages, success terminal event pair order constraints
- SUCCESS_TRACE_MODEL: terminalStage=post_run, includes runtime compiled + post-run reset declaration
- FAILURE_TRACE_MODEL: structural `trace=null`; semantic terminal=semantic; resolution terminal=resolution
- IMPLEMENTATION_DETAILS_NOT_PROMOTED: implementation traversal order, helper-call sequence, incidental per-event optional fields not required by registry
- DEFERRED_ITEMS: diagnostic payload semantics, RuntimeHash internals, CLI, exhaustive malformed-trace matrix, payload-only semantics beyond registry contracts
- CANON_DECISIONS_REQUIRED: none
- CONFLICTS_FOUND: none
- SEMANTIC_CHANGES: none
- FILES_CHANGED: `docs/qualification/H1/H1C9_TRACE_REQUIREMENTS.md`
