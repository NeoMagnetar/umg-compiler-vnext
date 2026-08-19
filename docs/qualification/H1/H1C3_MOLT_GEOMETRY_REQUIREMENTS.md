# H1-C3 MOLT + Geometry Requirements

## Scope

This chapter defines the first normative requirements for:

- `UMG-CONF-MOLT-###` (MOLT authority and lane model)
- `UMG-CONF-GEOM-###` (NeoStack / NeoBlock recursive geometry topology)

It is constrained by prior H1 authority and precedence artifacts and does not yet introduce any CLI, runtime, trace, or CLI-specific requirements.

## MOLT Requirements

- ID: `UMG-CONF-MOLT-001`
  - Normative Statement: Implementations MUST recognize only the MOLT block types defined for vNext (`trigger`, `directive`, `instruction`, `subject`, `primary`, `philosophy`, `blueprint`) when validating MOLT block identity.
  - Authority: `docs/SEMANTIC_FREEZE_v0.1.md` (MOLT authority), `schemas/umg-compiler-vnext.schema.json` (`MoltBlock.type` enum).
  - Observable Conformance Evidence: `test/directive-geometry-contract.mjs` (resolved directive lane assertions), schema validation through `test/public-output-contract.mjs`.
  - Notes/Exclusions: This requirement is structural identity; it does not prescribe semantic preference between these lanes.

- ID: `UMG-CONF-MOLT-002`
  - Normative Statement: Unknown lane or block-type fields in MOLT structures MUST be rejected as schema-invalid input rather than silently coerced.
  - Authority: `schemas/umg-compiler-vnext.schema.json` (`additionalProperties: false` on `MoltBlock`), `test/failure-contract.mjs` (`UNKNOWN_FIELD`, `INVALID_ENUM_VALUE` pathways).
  - Observable Conformance Evidence: `fixtures/invalid` + `test/failure-contract.mjs`.
  - Notes/Exclusions: Applies to input validation and not to runtime warning or trace formatting.

- ID: `UMG-CONF-MOLT-003`
  - Normative Statement: MOLT blocks MUST include required identity and content fields (`id`, `type`, `content`) when used as valid authored inputs.
  - Authority: `schemas/umg-compiler-vnext.schema.json` (`MoltBlock.required`).
  - Observable Conformance Evidence: schema-bound assertions and fixture-driven tests that mutate missing fields to fail with explicit diagnostics.
  - Notes/Exclusions: Does not require additional authored fields to be semantics-bearing.

- ID: `UMG-CONF-MOLT-004`
  - Normative Statement: MOLT source-mode and MOLT source provenance/attachment metadata in resolved/compiled output MUST, where present, conform to canonical vocabulary (`local`, `scoped`, `overlay`, `merge` and defined `sourceScope`).
  - Authority: `schemas/umg-compiler-vnext.schema.json` (`ResolvedMoltBlock.sourceMode`, `PromptPart.sourceMode`, `PromptPart.sourceScope`).
  - Observable Conformance Evidence: structural/contract validation in `test/public-output-contract.mjs`.
  - Notes/Exclusions: This is a structural output contract, not an exhaustive behavioral proof of source precedence.

- ID: `UMG-CONF-MOLT-005`
  - Normative Statement: Scoped MOLT attachment scope references MUST use only the scoped kinds defined by the schema (`sleeve` and `neostack`) with their required payload fields.
  - Authority: `schemas/umg-compiler-vnext.schema.json` (`ScopeRef`).
  - Observable Conformance Evidence: `test/failure-contract.mjs` for invalid `scope.kind` and unknown scoped references; `test/directive-geometry-contract.mjs` for valid attachment behavior.
  - Notes/Exclusions: Does not define policy of which scope to prefer; only structural vocabulary and shape.

- ID: `UMG-CONF-MOLT-006`
  - Normative Statement: `Priority`, generalized `weight`, `PrimaryShell`, `Snap`, and `Persona` are NOT part of the current vNext MOLT lane authority.
  - Authority: Absence in `docs/SEMANTIC_FREEZE_v0.1.md` and `schemas/umg-compiler-vnext.schema.json` lane/type definitions.
  - Observable Conformance Evidence: schema enum constraints and negative vocabulary checks (no legacy lane constants defined or accepted by contract tests).
  - Notes/Exclusions: Implementations may maintain internal hints, but these are not conformance obligations.

- ID: `UMG-CONF-MOLT-007`
  - Normative Statement: Use/Aim/Need MUST NOT be interpreted as current MOLT lanes or ranking channels for directive/selection behavior in vNext conformance.
  - Authority: `docs/SEMANTIC_FREEZE_v0.1.md` (current vNext frozen domains), `schemas/umg-compiler-vnext.schema.json` (absence from `MoltBlock.type` and schema lane enums), `test/directive-geometry-contract.mjs` fixture behavior.
  - Observable Conformance Evidence: fixture inputs and expected outputs in `fixtures/directive-geometry.sleeve.json` and geometric contract tests.
  - Notes/Exclusions: Excludes legacy v0 concepts unless separately canonized later.

- ID: `UMG-CONF-MOLT-008`
  - Normative Statement: Persona MUST NOT be treated as an input MOLT lane in conformance terms.
  - Authority: `schemas/umg-compiler-vnext.schema.json` (`MoltBlock.type` enum), `docs/SEMANTIC_FREEZE_v0.1.md` (frozen domain set).
  - Observable Conformance Evidence: schema validation layer and absence of Persona-driven lane assertions in contract tests.
  - Notes/Exclusions: Does not prevent internal implementation notes from storing Persona metadata if internal only.

## Geometry Requirements

- ID: `UMG-CONF-GEOM-001`
  - Normative Statement: The compiler graph root MUST be the sleeve `controllerNeoStackId`, which MUST reference an existing `NeoStack`.
  - Authority: `schemas/umg-compiler-vnext.schema.json` (`Sleeve.controllerNeoStackId` required), `docs/SEMANTIC_FREEZE_v0.1.md` (`NeoStack topology`), `test/failure-contract.mjs` (`UNKNOWN_CONTROLLER_NEOSTACK`).
  - Observable Conformance Evidence: invalid-controller test case in `test/directive-geometry-contract.mjs`.
  - Notes/Exclusions: This binds validation-level correctness; does not prescribe business rules beyond topology.

- ID: `UMG-CONF-GEOM-002`
  - Normative Statement: `NeoStack` topology MUST be represented recursively through `neoBlockRows` and `childStackRows`, allowing nested `NeoStack` children.
  - Authority: `schemas/umg-compiler-vnext.schema.json` (`NeoStack`/`NeoBlock` definitions), `docs/SEMANTIC_FREEZE_v0.1.md` (`recursive geometry`).
  - Observable Conformance Evidence: `fixtures/directive-geometry.sleeve.json` (nested stack layout) and related assertions in `test/directive-geometry-contract.mjs`.
  - Notes/Exclusions: This is topology representation only; policy ordering/selection rules are handled in other families.

- ID: `UMG-CONF-GEOM-003`
  - Normative Statement: Parent/child topology relationships SHOULD be explicit and acyclic; multiple parents, orphan stacks, and cycle formations are conformance failures when asserted by existing contract tests.
  - Authority: `docs/SEMANTIC_FREEZE_v0.1.md` (`NeoStack topology`), `schemas/umg-compiler-vnext.schema.json` (`NeoStackRow.neoStackIds`/`NeoStack.childStackRows`), `test/directive-geometry-contract.mjs`, `test/failure-contract.mjs`.
  - Observable Conformance Evidence: `CONTROLLER_HAS_PARENT`, `NEOSTACK_CYCLE`, `ORPHAN_NEOSTACK`, `MULTIPLE_NEOSTACK_PARENTS` cases in contract test mutations.
  - Notes/Exclusions: Failure taxonomy is derived from test corpus, not from an independent graph-normalization theorem.

- ID: `UMG-CONF-GEOM-004`
  - Normative Statement: NeoBlock placement is hierarchical, with each `NeoBlock` referenced by authored stack rows and not shared outside allowed containment constraints.
  - Authority: `schemas/umg-compiler-vnext.schema.json` (`NeoBlock`, `NeoStack`, `moltBlockIds` and row references), `test/directive-geometry-contract.mjs`.
  - Observable Conformance Evidence: `NEOBLOCK_WITHOUT_NEOSTACK` and `NEOBLOCK_IN_MULTIPLE_NEOSTACKS` checks.
  - Notes/Exclusions: This does not require a specific traversal algorithm beyond established test outputs.

- ID: `UMG-CONF-GEOM-005`
  - Normative Statement: NeoStack/NeoBlock geometry rows are authored with positive integer row indices and non-empty item lists for selected row structures.
  - Authority: `schemas/umg-compiler-vnext.schema.json` (`row` minimum constraints, `minItems`), `test/failure-contract.mjs` and `test/directive-geometry-contract.mjs`.
  - Observable Conformance Evidence: tests that intentionally mutate invalid row values/empty rows to failure (`DUPLICATE_MODULE_ROW`, `NONCONTIGUOUS_MODULE_ROWS` class behavior).
  - Notes/Exclusions: Full canonical row-order determinism is partially inferred from behavior tests (see `UMG-CONF-GEOM-008`).

- ID: `UMG-CONF-GEOM-006`
  - Normative Statement: Geometry for a given sleeve/selection pair MUST remain deterministic across equivalent semantically equivalent inputs, including shuffled selection order in equivalent sets.
  - Authority: `test/directive-geometry-contract.mjs` (`structuralShuffled` comparison), `test/public-output-contract.mjs` and `docs/SEMANTIC_FREEZE_v0.1.md`.
  - Observable Conformance Evidence: shuffled selection fixture produces identical `activeNeoStackIds` and `resolvedNeoBlockIds` to canonical fixture output.
  - Notes/Exclusions: This does not claim all unspecified input permutations have been proven; only those demonstrated by the current corpus.

- ID: `UMG-CONF-GEOM-007`
  - Normative Statement: MOLT lane authoring metadata (such as `NeoStack.skill`) MUST NOT alter effective recursive geometry output.
  - Authority: `test/directive-geometry-contract.mjs` (`service.skill` mutation block) as qualification evidence; `schemas/umg-compiler-vnext.schema.json` (`additionalProperties: false` for known structure).
  - Observable Conformance Evidence: direct mutation of `NeoStack.skill` preserving full runtime/trace/runtimeHash equality.
  - Notes/Exclusions: This is currently an implementation-level determinism check and should not be overextended without broader evidence.

- ID: `UMG-CONF-GEOM-008`
  - Normative Statement: Conformance must not equate authored row or stack position with hidden Priority/weight semantics; MOLT ordering behavior is controlled by authoritative rules, not arbitrary weighted preferences.
  - Authority: `docs/SEMANTIC_FREEZE_v0.1.md` (frozen semantic set), absence of Priority/weight constructs in schema and tests, explicit MOLT/type constraints.
  - Observable Conformance Evidence: current canonical fixtures and contract assertions require deterministic outcomes based on authored topology and explicit directives.
  - Notes/Exclusions: Does not prohibit all ordering strategies; it forbids non-conforming weighting semantics for lane/geometry precedence claims.

- ID: `UMG-CONF-GEOM-009`
  - Normative Statement: Geometry resolution events SHOULD preserve parent/child context metadata in trace output (`rowInParent`, `depth`, `rowInNeoStack`) when trace is produced.
  - Authority: `schemas/trace.schema.json` and `schemas/SCHEMA_REGISTRY.json` for trace shape; `test/directive-geometry-contract.mjs` event checks.
  - Observable Conformance Evidence: assertions on `NEOSTACK_ACTIVE` and `NEOBLOCK_SELECTION_ATTEMPTED` event payload fields in `test/directive-geometry-contract.mjs`.
  - Notes/Exclusions: Trace presence for every failure path remains governed by separate public-output/failure contracts.

## Requirement Summary

- MOLT count: 8
- GEOM count: 9
- total: 17

## Deferred Items

- `Ordering semantics for full sibling ordering semantics under all possible malformed topology permutations`
  - reason deferred: only a narrow fixture-backed evidence set currently covers ordering invariants.
  - expected later H1 family: `UMG-CONF-STATE` / `UMG-CONF-STRUCT`

- `Formal proof that MOLT lane ordering is authoritative in all branches of the runtime resolver`
  - reason deferred: requires broader state/selection/runtime proofs and additional cross-domain corpus.
  - expected later H1 family: `UMG-CONF-STATE`, `UMG-CONF-RUNTIME`

- `Complete geometry failure taxonomy for every malformed row/parent-edge permutation`
  - reason deferred: current failure assertions are representative, not exhaustive.
  - expected later H1 family: `UMG-CONF-FAIL`

## Legacy Concept Exclusions

- Priority: excluded
- generalized weights: excluded
- PrimaryShell: excluded
- Snap: excluded
- Persona as MOLT lane: excluded
- Use/Aim/Need as current MOLT lanes: excluded

## Report Header

H1C3_STATUS: COMPLETE
SOURCE_HEAD: 764ac06fdbb14c74ee5afe5cd799ec261ea047b0
MOLT_REQUIREMENTS: 8
GEOM_REQUIREMENTS: 9
TOTAL_REQUIREMENTS: 17
LEGACY_CONCEPT_EXCLUSIONS: Priority, generalized weights, PrimaryShell, Snap, Persona as lane, Use/Aim/Need as MOLT lanes
DEFERRED_ITEMS: row-ordering proof, universal lane-ordering proof, exhaustive malformed geometry failure matrix
CANON_DECISIONS_REQUIRED: none identified in this chunk
CONFLICTS_FOUND: none
SEMANTIC_CHANGES: none
FILES_CHANGED: docs/qualification/H1/H1C3_MOLT_GEOMETRY_REQUIREMENTS.md
