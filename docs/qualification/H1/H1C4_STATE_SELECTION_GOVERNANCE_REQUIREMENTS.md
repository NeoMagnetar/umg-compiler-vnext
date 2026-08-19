# H1-C4 State, Selection, and Governance OFF Requirements

## Scope

This chapter defines authoritative normative requirements for:

- `UMG-CONF-STATE-###` (state and selection behavior)
- `UMG-CONF-GOV-###` (Governance OFF semantics)

It is grounded by the documented precedence model:
`SEMANTIC_CANON -> STRUCTURAL_CONTRACT -> PUBLIC_OBSERVABLE_CONTRACT -> QUALIFICATION_EVIDENCE -> IMPLEMENTATION_DETAIL`.

## State / Selection Requirements

- ID: `UMG-CONF-STATE-001`
  - Normative Statement: Implementations MUST recognize the effective state vocabulary `ready`, `active`, `off`, and `disabled` for `trace.finalNeoStackStates` / `trace.finalNeoBlockStates`.
  - Authority: `schemas/umg-compiler-vnext.schema.json` (`finalNeoStackStates` / `finalNeoBlockStates` enums), `test/state-selection-contract.mjs`, `test/governance-contract.mjs`.
  - Observable Conformance Evidence: state assertion checks in `test/state-selection-contract.mjs` and governance tests that read final states for off/disabled outcomes.
  - Notes/Exclusions: This requirement is observable-state vocabulary only; it does not encode runtime prompt or scoring policy.

- ID: `UMG-CONF-STATE-002`
  - Normative Statement: Authoring selection for active execution MUST be represented through `selection.activeNeoStackIds` and `selection.activeNeoBlockIds`; targets present in those arrays are candidates for execution if they are structurally valid and not blocked.
- ID: `UMG-CONF-STATE-003`
  - Normative Statement: In absence of blocking conditions, selected targets in execution routes MUST be executable and reflected as `active` in final state.
  - Authority: `test/state-selection-contract.mjs` (successful closed route case), `schemas/umg-compiler-vnext.schema.json` (`resolvedNeoBlock.state` fixed to `active` for runtime entries), `test/public-output-contract.mjs`.
  - Observable Conformance Evidence: successful cases in `fixtures/state-selection.sleeve.json` with closed selection and matching final runtime entries.
  - Notes/Exclusions: Does not force exact emitted ordering of prompts, only execution state/resultant inclusion in runtime.

- ID: `UMG-CONF-STATE-004`
  - Normative Statement: Selection with missing ancestry (e.g., selecting a target while excluding required ancestor NeoStack) MUST fail with a target-not-executable condition (`SELECTION_MISSING_ANCESTOR` via contract diagnostics) and MUST NOT produce an active target.
  - Authority: `test/state-selection-contract.mjs`.
  - Observable Conformance Evidence: missing-ancestor scenario in the contract fixture (`state-selection-closed` minus `NS.PARENT`), expected diagnostic and trace evidence.
  - Notes/Exclusions: This is a route-validity failure case, not a syntax/structure error.

- ID: `UMG-CONF-STATE-005`
  - Normative Statement: A `NeoBlock` selection whose parent `NeoStack` is not selected is non-executable and MUST emit `SELECTION_NEOBLOCK_CONTAINER_NOT_SELECTED` failure diagnostics.
  - Authority: `test/state-selection-contract.mjs`, `docs/SEMANTIC_FREEZE_v0.1.md` (state and selection freeze), `test/diagnostic-emission-coverage.mjs`.
  - Observable Conformance Evidence: container-not-selected contract fixture in `state-selection-contract.mjs`; diagnostic-code coverage for selection container mismatch.
  - Notes/Exclusions: Does not define recovery behavior for this branch.

- ID: `UMG-CONF-STATE-006`
  - Normative Statement: Unknown selection IDs in active/disabled arrays MUST be rejected as invalid-selection structural failures.
  - Authority: selection validation in `test/diagnostic-emission-coverage.mjs` (`UNKNOWN_ACTIVE_NEOSTACK`, `UNKNOWN_ACTIVE_NEOBLOCK`, `UNKNOWN_DISABLED_NEOSTACK`, `UNKNOWN_DISABLED_NEOBLOCK`), `schemas/umg-compiler-vnext.schema.json` (`CompileSelection` arrays).
  - Observable Conformance Evidence: explicit diagnostic-emission fixtures for unknown active/disabled IDs.
  - Notes/Exclusions: This chunk treats unknown-ID failures as diagnostic/validation obligations, not runtime output shape obligations.

- ID: `UMG-CONF-STATE-007`
  - Normative Statement: Unknown or malformed selected NeoBlocks must not be treated as executable; when selection references a structurally valid-but-unmappable target (for example, missing parent mapping), the target MUST not execute and must remain non-active in effective output-state terms.
  - Authority: `test/qualification-container-unknown-regression.mjs`, `test/state-selection-contract.mjs`.
  - Observable Conformance Evidence: `SELECTION_NEOBLOCK_CONTAINER_UNKNOWN` fixture and `NEOBLOCK_WITHOUT_NEOSTACK`/container mismatch behavior.
  - Notes/Exclusions: This is a failure-behavior category; not a success-state definition.

- ID: `UMG-CONF-STATE-008`
  - Normative Statement: Duplicate IDs in state/selection identity lists MUST be rejected by structural validation.
  - Authority: `schemas/umg-compiler-vnext.schema.json` (`uniqueItems: true` on active/disabled governance/selection arrays), `test/governance-contract.mjs` (duplicate governance IDs).
  - Observable Conformance Evidence: duplicate governance rule failure with `STRUCTURAL_SCHEMA_VIOLATION` and trace-null behavior (`state-selection` selection arrays are the same collection class under contract).
  - Notes/Exclusions: Failure form may be structural-validation rather than semantic selection-specific.

- ID: `UMG-CONF-STATE-009`
  - Normative Statement: Final-state output for target candidates must distinguish blocked states from active ones using `ready`, `active`, `off`, `disabled`; blocked execution must not be reported as active.
  - Authority: `schemas/umg-compiler-vnext.schema.json`, `test/state-selection-contract.mjs`, `test/governance-contract.mjs`.
  - Observable Conformance Evidence: trace final state assertions for ready/active/off/disabled target comparisons.
  - Notes/Exclusions: This is a conformance observation; exact per-target diagnostic message text is not normative.

- ID: `UMG-CONF-STATE-010`
  - Normative Statement: `off` and `disabled` are explicit blocking states, and conformance MUST NOT infer latent hidden Priority/weighting semantics from plain selection or state-array ordering.
  - Authority: `docs/SEMANTIC_FREEZE_v0.1.md` (state/selection freeze), absence of `priority`/weight constructs in schema and tests, `test/governance-contract.mjs` (ORDER independence checks where governance effects are set-based).
  - Observable Conformance Evidence: deterministic expected results under reordered governance rule selection; no contract test encodes hidden weighting in state arrays.
  - Notes/Exclusions: This statement constrains interpretation, not internal scheduling mechanics.

## Governance Requirements

- ID: `UMG-CONF-GOV-001`
  - Normative Statement: Governance is extra-MOLT and is represented through the sleeve `governance` array and rule IDs, not through MOLT lanes.
  - Authority: `docs/SEMANTIC_FREEZE_v0.1.md` (governance semantics), `schemas/umg-compiler-vnext.schema.json` (`GovernanceRule`, `governance` sleeve property).
  - Observable Conformance Evidence: `fixtures/state-selection.sleeve.json` and `fixtures/dealership.sleeve.json` governance fields.
  - Notes/Exclusions: Does not imply governance participates in MOLT lane resolution order.

- ID: `UMG-CONF-GOV-002`
  - Normative Statement: Governance in this domain is OFF-only, expressed via `offNeoStackIds` and/or `offNeoBlockIds` within active governance rules.
  - Authority: `schemas/umg-compiler-vnext.schema.json` (`offNeoStackIds`, `offNeoBlockIds`), `docs/SEMANTIC_FREEZE_v0.1.md` (governance semantics), `test/state-selection.sleeve.json`.
  - Observable Conformance Evidence: state/gov fixtures and off-state assertions in `test/governance-contract.mjs`.
  - Notes/Exclusions: Other governance-like effects are not part of the current OFF-focused requirements.

- ID: `UMG-CONF-GOV-003`
  - Normative Statement: Governance is activated only via explicit membership in `selection.activeGovernanceRuleIds`.
  - Authority: `schemas/umg-compiler-vnext.schema.json` (`activeGovernanceRuleIds`), `test/governance-contract.mjs`.
  - Observable Conformance Evidence: fixture comparison where removing/omitting governance declaration has no governance-derived off effect.
- ID: `UMG-CONF-GOV-004`
  - Normative Statement: Inactive governance rules (declared but not selected) MUST be inert and MUST NOT change target state.
  - Authority: `test/governance-contract.mjs` (`withoutGovernance` baseline fixture), `test/governance-off` fixture behavior.
  - Observable Conformance Evidence: compile outputs with/without active governance selected in governance contract fixture set.
  - Notes/Exclusions: Runtime hash equality in these fixtures indicates governance has no semantic effect when not active.

- ID: `UMG-CONF-GOV-005`
  - Normative Statement: Unknown active governance IDs MUST fail closed and must not proceed as if they were no-op or inert.
  - Authority: `test/governance-contract.mjs` (`UNKNOWN_ACTIVE_GOVERNANCE_RULE`), `test/diagnostic-emission-coverage.mjs` (`UNKNOWN_ACTIVE_GOVERNANCE_RULE` coverage).
  - Observable Conformance Evidence: explicit assertions for unknown active-governance ID failure.
  - Notes/Exclusions: Failure classification and messaging are diagnostic obligations.

- ID: `UMG-CONF-GOV-006`
  - Normative Statement: Duplicate active governance IDs MUST fail closed as a structural validation violation.
  - Authority: `schemas/umg-compiler-vnext.schema.json` (`uniqueItems: true` for activeGovernanceRuleIds), `test/governance-contract.mjs`.
  - Observable Conformance Evidence: explicit duplicate ID test expecting `STRUCTURAL_SCHEMA_VIOLATION` with null trace.
  - Notes/Exclusions: applies to governance ID activation list, not to arbitrary provenance list display.

- ID: `UMG-CONF-GOV-007`
  - Normative Statement: Multiple governance rules may apply cumulatively for a target, and resulting off blocks/stacks reflect the union of all applicable OFF effects.
  - Authority: `test/governance-contract.mjs` (multiple sibling/neostack/neoblock combinations).
  - Observable Conformance Evidence: cases with GOV.RIGHT.OFF combinations and sibling stack/block effects where target remains OFF under combined activation.
  - Notes/Exclusions: This does not mandate precedence by rule position.

- ID: `UMG-CONF-GOV-008`
  - Normative Statement: Governance declaration order is deterministic and should be treated as fixed provenance ordering for traceability, not as weighted priority, winner selection, or ranking authority.
  - Authority: `test/governance-contract.mjs` expected `GOVERNANCE_RULE_APPLIED` ordering assertions with `selectionA`/`selectionB`, `docs/SEMANTIC_FREEZE_v0.1.md`.
  - Observable Conformance Evidence: explicit order-preservation assertions in governance contract test.
  - Notes/Exclusions: This is ordering-as-traceability only; no winner-selection semantics are conferred by declaration order.

- ID: `UMG-CONF-GOV-009`
  - Normative Statement: Governance OFF effects are dominant over active/ready states for target reachability where both apply in an execution route.
  - Authority: `test/state-selection-contract.mjs`, `test/governance-contract.mjs` (governance + disabled conflicts, ancestor effects).
  - Observable Conformance Evidence: target effective-state expectations showing `governance_off` over other statuses.
  - Notes/Exclusions: Dominance is defined on effective executability and observed final state in current tests.

- ID: `UMG-CONF-GOV-010`
  - Normative Statement: Governance OFF on a `NeoStack` MUST propagate to descendants unless explicitly targeted by an overriding descendant-specific effect in the same rule set.
  - Authority: `fixtures/state-selection.sleeve.json` (parent OFF rule), `test/state-selection-contract.mjs`, `test/governance-contract.mjs` (ancestor governance assertions).
  - Observable Conformance Evidence: ancestor OFF behavior checks for `NS.CHILD` and related block states.
  - Notes/Exclusions: This requirement is propagation to descendants, not cross-scope authority merging.

- ID: `UMG-CONF-GOV-011`
  - Normative Statement: Governance OFF targeting a `NeoBlock` is local to that block (or explicit target relationship), without requiring stack-wide ancestor effects beyond stated targets.
  - Authority: `fixtures/state-selection.sleeve.json`, `test/governance-contract.mjs` (`NB.PARENT.RIGHT` and `NB.CHILD.DESCENDANT` scoped examples).
  - Observable Conformance Evidence: sibling/child-targeted rule cases distinguish stack propagation vs block-local OFF.
  - Notes/Exclusions: Locality is target-specific in contract evidence; does not preclude explicit stack propagation when intended by separate stack rules.

- ID: `UMG-CONF-GOV-012`
  - Normative Statement: The controller `NeoStack` may be selected as OFF by governance and remain valid when so selected.
  - Authority: `test/governance-contract.mjs` (`GOV.ROOT.OFF`), `docs/SEMANTIC_FREEZE_v0.1.md`.
  - Observable Conformance Evidence: explicit root-STACK OFF case in governance contract.
  - Notes/Exclusions: this is OFF-control behavior, not a recommendation for full controller replacement.

- ID: `UMG-CONF-GOV-013`
  - Normative Statement: Governance OFF must be evaluated as a compile-local control effect and must not be bypassed by Bundle, Overlay, Merge, or scoped MOLT attachment behavior.
  - Authority: `test/governance-contract.mjs` (`BUNDLE/OVERLAY/SCOPED_MOLT` checks in presence of active GOVERNANCE OFF).
  - Observable Conformance Evidence: cases where governance OFF on service drive target prevents bundle/overlay/scoped activity from keeping it executable.
  - Notes/Exclusions: This requirement is about OFF override, not complete suppression of unrelated non-target outputs.

- ID: `UMG-CONF-GOV-014`
  - Normative Statement: Governance must be sourced from the invocation request (`selection.activeGovernanceRuleIds`); compile behavior must not rely on external mutable sleeve-time defaults outside explicit request context.
  - Authority: `schemas/umg-compiler-vnext.schema.json` (`selection.activeGovernanceRuleIds`), `test/state-selection-contract.mjs`, `test/governance-contract.mjs`.
  - Observable Conformance Evidence: governance-only behavior only when requested IDs are present in fixture selections.
  - Notes/Exclusions: This is a source-of-authority requirement; provenance storage details deferred.

- ID: `UMG-CONF-GOV-015`
  - Normative Statement: Governance evaluation and OFF effects MUST NOT mutate authored sleeve state; they influence compiled effective state only.
  - Authority: `test/governance-contract.mjs` (governance-only behavior variants), `fixtures/state-selection.sleeve.json` (authored state remains stable under varying selections).
  - Observable Conformance Evidence: repeated fixture execution with different `selection.activeGovernanceRuleIds`.
  - Notes/Exclusions: Does not constrain intermediate internal resolver data structures.

- ID: `UMG-CONF-GOV-016`
  - Normative Statement: Provenance fields (`governanceRuleIds`, `directGovernanceRuleIds`, `inheritedGovernanceRuleIds`) are evidence fields for diagnostics/trace; this chunk does NOT elevate every field shape/ordering expectation to mandatory normative output unless separately defined.
  - Authority: `test/governance-contract.mjs` helper usage and validation fixtures; H1-C3 provenance-care guidance.
  - Observable Conformance Evidence: explicit helper assertions in governance contract currently consume these fields in specific tests.
  - Notes/Exclusions: Full field-level normative obligations are deferred (see `DEFERRED_ITEMS`).

## Requirement Summary

- STATE count: 10
- GOV count: 16
- total: 26

## Effective State Precedence

- `off` (explicit governance OFF or explicit off source) dominates `disabled`, which dominates `active`/`ready` for effective execution viability in this frozen conformance profile.

## Governance Non-Authority

- Governance declaration/effect ordering is deterministic provenance ordering only.
- It does NOT define hidden Priority.
- It does NOT define weighting.
- It does NOT define winner selection.
- It does NOT define a MOLT authority lane.

## Deferred Items

- `Provenance field-level output requirements`  
  - reason deferred: requires dedicated Trace/Diagnostic evidence partition outside this state-only chunk.
- `Trace-event requirements for governance (including full `GOVERNANCE_RULE_APPLIED` and provenance payload constraints)`  
  - reason deferred: belongs to Trace family work.
- `Diagnostic payload requirements for governance (`blockingReason` / `blockingSource` shape guarantees beyond representative cases)`  
  - reason deferred: belongs to Diagnostic family work.
- `Exhaustive malformed selection matrix (unknown IDs, malformed ancestry, malformed state interactions beyond representative fixtures)`  
  - reason deferred: requires broadened failure matrix in dedicated failure/pathological families.

## Report Header

H1C4_STATUS: COMPLETE
SOURCE_HEAD: 764ac06fdbb14c74ee5afe5cd799ec261ea047b0
STATE_REQUIREMENTS: 10
GOV_REQUIREMENTS: 16
TOTAL_REQUIREMENTS: 26
EFFECTIVE_STATE_PRECEDENCE: `off` > `disabled` > `active`/`ready` (governance OFF dominance observed; disabled blocks execution; active requires executable selection and ancestry)
GOVERNANCE_PROPAGATION: NeoStack governance OFF propagates to descendants; NeoBlock governance OFF applies to targeted block scope unless additional declared behavior applies.
GOVERNANCE_COMPILE_LOCALITY: Governance is sourced from the active selection’s `activeGovernanceRuleIds` for each compile invocation; no separate global runtime toggles are assumed.
GOVERNANCE_NON_AUTHORITY: No hidden Priority, no weighting, no winner-selection semantics, no MOLT authority lane.
DEFERRED_ITEMS: Provenance field-level output obligations, trace-events, diagnostic payload details, exhaustive malformed-selection matrix.
CANON_DECISIONS_REQUIRED: none identified in this chunk
CONFLICTS_FOUND: none
SEMANTIC_CHANGES: none
FILES_CHANGED: docs/qualification/H1/H1C4_STATE_SELECTION_GOVERNANCE_REQUIREMENTS.md
