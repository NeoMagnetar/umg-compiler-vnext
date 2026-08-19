# H1-C5 Directive and Bundle Requirements

This chapter defines only `UMG-CONF-DIR-###` and `UMG-CONF-BUNDLE-###` requirements.

Scope exclusions:
- This document does not normatively specify scoped MOLT, Overlay, Merge, RuntimeSpec, Trace, diagnostics payloads, or compatibility.
- Scoped MOLT and Overlay composition are acknowledged as independent and deferred to the next H1 family.
- Merge is a separate composition mechanism, referenced only for non-conflicting exclusion context.

## PRIME DIRECTIVE REQUIREMENTS

- ID: `UMG-CONF-DIR-001`  
  Normative Statement: Each NeoBlock MUST have exactly one `primeDirectiveId` field.  
  Authority: `docs/DIRECTIVE_GEOMETRY_CONTRACT.md`, `docs/SEMANTIC_FREEZE_v0.1.md`, `docs/qualification/H1/H1C3_MOLT_GEOMETRY_REQUIREMENTS.md`  
  Observable Conformance Evidence: `test/directive-geometry-contract.mjs`, `fixtures/dealership.sleeve.json`, `fixtures/requests/normal.selection.json`, `fixtures/expected/normal.compile-result.json`  
  Notes/Exclusions: This requirement is purely cardinality; it does not assert any ordering semantics.

- ID: `UMG-CONF-DIR-002`  
  Normative Statement: `primeDirectiveId` MUST reference a local MOLT block with type `directive` in the same sleeve.  
  Authority: `docs/DIRECTIVE_GEOMETRY_CONTRACT.md`, `docs/SEMANTIC_FREEZE_v0.1.md`  
  Observable Conformance Evidence: `test/directive-geometry-contract.mjs` (INVALID_PRIME_DIRECTIVE path), `fixtures/dealership.sleeve.json`, `fixtures/requests/normal.selection.json`  
  Notes/Exclusions: This is a direct reference check; cross-sleeve references are outside this requirement family.

- ID: `UMG-CONF-DIR-003`  
  Normative Statement: Prime Directive geometry MUST use `baseGeometry.directive` row 1 and must contain only the Prime directive block.  
  Authority: `docs/DIRECTIVE_GEOMETRY_CONTRACT.md`, `docs/qualification/H1/H1C3_MOLT_GEOMETRY_REQUIREMENTS.md`, `docs/SEMANTIC_FREEZE_v0.1.md`  
  Observable Conformance Evidence: `test/directive-geometry-contract.mjs` (`DIRECTIVE_BASE_GEOMETRY_CANON_VIOLATION`), `fixtures/merge-directive.sleeve.json`, `fixtures/requests/merge-directive.selection.json`  
  Notes/Exclusions: This is a geometry-vocabulary requirement; it is not a lane priority rule.

- ID: `UMG-CONF-DIR-004`  
  Normative Statement: A directive that is Prime must NOT also appear as a Secondary Directive reference in `secondaryDirectives`.  
  Authority: `docs/DIRECTIVE_GEOMETRY_CONTRACT.md`, `docs/SEMANTIC_FREEZE_v0.1.md`  
  Observable Conformance Evidence: `test/directive-geometry-contract.mjs` (`PRIME_AS_SECONDARY_DIRECTIVE`), `fixtures/merge-directive.sleeve.json`, `fixtures/requests/merge-directive.selection.json`, `fixtures/expected/merge-directive.compile-result.json`  
  Notes/Exclusions: Merge source/result is a separate mechanism and is not used to satisfy Secondary participation here.

- ID: `UMG-CONF-DIR-005`  
  Normative Statement: Secondary Directive relations MUST include explicit `id`, `directiveBlockId`, and `triggerBlockId`.  
  Authority: `docs/DIRECTIVE_GEOMETRY_CONTRACT.md`, `docs/SEMANTIC_FREEZE_v0.1.md`  
  Observable Conformance Evidence: `fixtures/dealership.sleeve.json`, `fixtures/requests/secondary-b.selection.json`, `test/directive-geometry-contract.mjs`  
  Notes/Exclusions: This requirement only constrains explicit relation shape, not ordering.

- ID: `UMG-CONF-DIR-006`  
  Normative Statement: `directiveBlockId` in a Secondary Directive MUST reference a local MOLT block of type `directive`.  
  Authority: `docs/DIRECTIVE_GEOMETRY_CONTRACT.md`, `docs/SEMANTIC_FREEZE_v0.1.md`  
  Observable Conformance Evidence: `test/directive-geometry-contract.mjs` (`INVALID_SECONDARY_DIRECTIVE_BLOCK`), `fixtures/dealership.sleeve.json`  
  Notes/Exclusions: Non-directive targets are rejected as semantic validation failures.

- ID: `UMG-CONF-DIR-007`  
  Normative Statement: `triggerBlockId` in a Secondary Directive MUST reference a local MOLT block of type `trigger`.  
  Authority: `docs/DIRECTIVE_GEOMETRY_CONTRACT.md`, `docs/SEMANTIC_FREEZE_v0.1.md`  
  Observable Conformance Evidence: `test/directive-geometry-contract.mjs` (`INVALID_SECONDARY_TRIGGER_BLOCK`), `fixtures/dealership.sleeve.json`  
  Notes/Exclusions: Trigger type validation is independent of runtime result and does not establish external truth.

- ID: `UMG-CONF-DIR-008`  
  Normative Statement: One Trigger MAY NOT bind to more than one Secondary Directive relation.  
  Authority: `docs/DIRECTIVE_GEOMETRY_CONTRACT.md`, `docs/SEMANTIC_FREEZE_v0.1.md`  
  Observable Conformance Evidence: `test/directive-geometry-contract.mjs` (`TRIGGER_BOUND_TO_MULTIPLE_SECONDARIES`), `fixtures/dealership.sleeve.json`, `fixtures/requests/secondary-b.selection.json`  
  Notes/Exclusions: This constraint applies at relation-definition time, not at trace order selection time.

- ID: `UMG-CONF-DIR-009`  
  Normative Statement: Non-Prime local Directives MUST participate explicitly via supported participation paths; otherwise the relation fails with `ORPHAN_LOCAL_DIRECTIVE` in conformance behavior.  
  Authority: `docs/DIRECTIVE_GEOMETRY_CONTRACT.md`, `docs/SEMANTIC_FREEZE_v0.1.md`, `docs/qualification/H1/H1C3_MOLT_GEOMETRY_REQUIREMENTS.md`  
  Observable Conformance Evidence: `test/directive-geometry-contract.mjs` (`ORPHAN_LOCAL_DIRECTIVE`), `fixtures/dealership.sleeve.json`, `fixtures/requests/secondary-b.selection.json`  
  Notes/Exclusions: Merge participation is outside this chapter’s normative scope and is treated as a separate composition mechanism.

- ID: `UMG-CONF-DIR-010`  
  Normative Statement: Duplicate Secondary Directive `id` values MUST fail with `DUPLICATE_SECONDARY_DIRECTIVE_ID`.  
  Authority: `docs/DIRECTIVE_GEOMETRY_CONTRACT.md`, `test/directive-geometry-contract.mjs`  
  Observable Conformance Evidence: `test/directive-geometry-contract.mjs` (duplicate relation id case), `fixtures/merge-directive.sleeve.json`, `fixtures/requests/merge-directive.selection.json`  
  Notes/Exclusions: Identity uniqueness here is for relation declaration and does not imply precedence.

- ID: `UMG-CONF-DIR-011`  
  Normative Statement: Secondary selection MUST depend only on the caller-provided `selection.triggerState`; compiler must not infer external trigger truth or implicit trigger activation.  
  Authority: `docs/DIRECTIVE_GEOMETRY_CONTRACT.md`, `test/failure-contract.mjs`, `docs/SEMANTIC_FREEZE_v0.1.md`  
  Observable Conformance Evidence: `fixtures/requests/normal.selection.json`, `fixtures/requests/secondary-b.selection.json`, `fixtures/requests/secondary-c.selection.json`, `fixtures/requests/multi-secondary-error.selection.json`, `test/state-selection-contract.mjs` (`MULTIPLE_SECONDARY_DIRECTIVE_MATCH`)  
  Notes/Exclusions: Unknown trigger IDs are handled by selection validation (`UNKNOWN_TRIGGER_STATE_ID`) outside this selection outcome model.

- ID: `UMG-CONF-DIR-012`  
  Normative Statement: Selection model for Secondary Directives MUST be cardinality-based:
  - 0 matches: Prime-only execution remains active
  - 1 match: Prime plus that one Secondary become active for that NeoBlock
  - 2+ matches: compile failure with `MULTIPLE_SECONDARY_DIRECTIVE_MATCH`  
  Authority: `docs/DIRECTIVE_GEOMETRY_CONTRACT.md`, `test/state-selection-contract.mjs`, `test/failure-contract.mjs`  
  Observable Conformance Evidence: `fixtures/requests/normal.selection.json` (0 match), `fixtures/requests/secondary-c.selection.json` (1 match), `fixtures/requests/multi-secondary-error.selection.json` (`MULTIPLE_SECONDARY_DIRECTIVE_MATCH`), `fixtures/expected/normal.compile-result.json`, `fixtures/expected/secondary-c.compile-result.json`, `fixtures/expected/multi-secondary-error.compile-result.json`  
  Notes/Exclusions: This does not impose row-order winner semantics.

- ID: `UMG-CONF-DIR-013`  
  Normative Statement: Directive matching and failure behavior MUST NOT infer priority or weighting from NeoBlock row numbers, declaration order, or array order; no hidden ranking channel is introduced by directive geometry.  
  Authority: `docs/DIRECTIVE_GEOMETRY_CONTRACT.md`, `docs/qualification/H1/H1C1_CONFORMANCE_SPEC_SKELETON.md`  
  Observable Conformance Evidence: `test/state-selection-contract.mjs` (`MULTIPLE_SECONDARY_DIRECTIVE_MATCH`), `test/directive-geometry-contract.mjs` (shuffled selection selection fixture), `fixtures/requests/secondary-b.selection.json`  
  Notes/Exclusions: Selection outcome model remains cardinality-only and code-based.

## BUNDLE REQUIREMENTS

- ID: `UMG-CONF-BUNDLE-001`  
  Normative Statement: Bundles are NeoBlock-local composition objects and must be declared on the owning NeoBlock.  
  Authority: `docs/BUNDLE_OVERLAY_CONTRACT.md`, `docs/SEMANTIC_FREEZE_v0.1.md`  
  Observable Conformance Evidence: `fixtures/bundle-overlay.sleeve.json`, `test/bundle-overlay-contract.mjs`  
  Notes/Exclusions: Bundle scope does not escape NeoBlock boundary by itself.

- ID: `UMG-CONF-BUNDLE-002`  
  Normative Statement: Each Bundle MUST declare exactly one `moltType`.  
  Authority: `docs/BUNDLE_OVERLAY_CONTRACT.md`, `test/bundle-overlay-contract.mjs`  
  Observable Conformance Evidence: `test/bundle-overlay-contract.mjs` (molt type mutation to `trigger`/`directive` -> `INVALID_ENUM_VALUE`), `fixtures/bundle-overlay.sleeve.json`  
  Notes/Exclusions: The legal value set is still constrained by MOLT lane authority.

- ID: `UMG-CONF-BUNDLE-003`  
  Normative Statement: `trigger` and `directive` MUST NOT be legal Bundle `moltType` values.  
  Authority: `docs/BUNDLE_OVERLAY_CONTRACT.md`, `docs/SEMANTIC_FREEZE_v0.1.md`  
  Observable Conformance Evidence: `test/bundle-overlay-contract.mjs` (`INVALID_ENUM_VALUE`), `fixtures/bundle-overlay.sleeve.json`  
  Notes/Exclusions: This is a prohibited-type restriction, not a replacement for base MOLT lane behavior.

- ID: `UMG-CONF-BUNDLE-004`  
  Normative Statement: Bundle rows MUST contain only local MOLT blocks that match the Bundle `moltType`; type violations fail with `LANE_MEMBER_TYPE_MISMATCH`.  
  Authority: `docs/BUNDLE_OVERLAY_CONTRACT.md`, `test/bundle-overlay-contract.mjs`  
  Observable Conformance Evidence: `fixtures/bundle-overlay.sleeve.json`, `test/bundle-overlay-contract.mjs` (`LANE_MEMBER_TYPE_MISMATCH`)  
  Notes/Exclusions: Non-local references and other malformed content are handled by schema/validation paths outside this requirement.

- ID: `UMG-CONF-BUNDLE-005`  
  Normative Statement: Bundle rows and lane indices MUST follow valid MOLT geometry rules (`row` as positive integers with contiguous, unique, non-empty rows).  
  Authority: `docs/SEMANTIC_FREEZE_v0.1.md`, `docs/BUNDLE_OVERLAY_CONTRACT.md`, `docs/qualification/H1/H1C3_MOLT_GEOMETRY_REQUIREMENTS.md`, `test/directive-geometry-contract.mjs`  
  Observable Conformance Evidence: `test/directive-geometry-contract.mjs` (geometry failure matrix), `fixtures/bundle-overlay.sleeve.json`  
  Notes/Exclusions: Geometry constraints are inherited from general MOLT/geometry contracts.

- ID: `UMG-CONF-BUNDLE-006`  
  Normative Statement: Bundle selection is explicit through the selected Secondary Directive relation using the per-lane `bundles` map.  
  Authority: `docs/BUNDLE_OVERLAY_CONTRACT.md`, `test/bundle-overlay-contract.mjs`, `docs/DIRECTIVE_GEOMETRY_CONTRACT.md`  
  Observable Conformance Evidence: `fixtures/bundle-overlay.sleeve.json`, `fixtures/requests/bundle-overlay-secondary-b.selection.json` and `test/bundle-overlay-contract.mjs`  
  Notes/Exclusions: Active Bundle selection does not bypass relation validity checks.

- ID: `UMG-CONF-BUNDLE-007`  
  Normative Statement: Bundle selection is lane-specific; a selected Secondary may replace base geometry only for lanes explicitly mapped in that Secondary relation.  
  Authority: `docs/BUNDLE_OVERLAY_CONTRACT.md`, `test/bundle-overlay-contract.mjs`  
  Observable Conformance Evidence: `fixtures/bundle-overlay.sleeve.json`, `fixtures/requests/bundle-overlay-secondary-b.selection.json`, `test/bundle-overlay-contract.mjs`  
  Notes/Exclusions: This does not imply precedence among lanes.

- ID: `UMG-CONF-BUNDLE-008`  
  Normative Statement: If a selected Secondary omits a lane key, effective geometry for that lane MUST fall back to Base Geometry.  
  Authority: `docs/BUNDLE_OVERLAY_CONTRACT.md`, `test/bundle-overlay-contract.mjs`  
  Observable Conformance Evidence: `fixtures/bundle-overlay.sleeve.json`, `fixtures/requests/bundle-overlay-secondary-b.selection.json`, `test/bundle-overlay-contract.mjs` (`delete findSecondary(...).bundles.blueprint`)  
  Notes/Exclusions: Fallback is geometry-source fallback only.

- ID: `UMG-CONF-BUNDLE-009`  
  Normative Statement: Omitted local MOLT blocks under an active Bundle for a lane MUST NOT become OFF/DISABLED, and MUST NOT alter executable state outside this lane’s geometric replacement.  
  Authority: `docs/BUNDLE_OVERLAY_CONTRACT.md`, `test/bundle-overlay-contract.mjs`  
  Observable Conformance Evidence: `fixtures/bundle-overlay.sleeve.json`, `fixtures/requests/bundle-overlay-secondary-b.selection.json`, `test/bundle-overlay-contract.mjs`  
  Notes/Exclusions: State effects are governed by Governance/selection contracts, not this bundle mechanism.

- ID: `UMG-CONF-BUNDLE-010`  
  Normative Statement: Bundles do not synthesize new MOLT content, do not convert MOLT type, do not create authority, and do not independently select NeoBlocks or NeoStacks.  
  Authority: `docs/BUNDLE_OVERLAY_CONTRACT.md`, `docs/SEMANTIC_FREEZE_v0.1.md`  
  Observable Conformance Evidence: `test/bundle-overlay-contract.mjs`, `fixtures/bundle-overlay.sleeve.json`, `fixtures/requests/bundle-overlay-base.selection.json`, `fixtures/requests/overlays-ab.selection.json`  
  Notes/Exclusions: Bundle behavior is geometry override only, with no standalone selection authority.

- ID: `UMG-CONF-BUNDLE-011`  
  Normative Statement: Bundle behavior MUST NOT infer winner/rank from row numbers, declaration order, or ordered trigger state evaluation.  
  Authority: `docs/BUNDLE_OVERLAY_CONTRACT.md`, `docs/DIRECTIVE_GEOMETRY_CONTRACT.md`, `test/bundle-overlay-contract.mjs`  
  Observable Conformance Evidence: `fixtures/requests/bundle-overlay-overlays-ab.selection.json`, `fixtures/requests/bundle-overlay-overlays-ba.selection.json`, `test/bundle-overlay-contract.mjs`  
  Notes/Exclusions: Inactive or unordered overlays and scope are excluded to the next H1 family.

## REQUIREMENT SUMMARY
- DIR count: 13
- BUNDLE count: 11
- total: 24

## SECONDARY_MATCH_MODEL
- 0 matches: Prime-only geometry selection path
- 1 match: Prime + matching Secondary Directive geometry
- 2+ matches: failure with `MULTIPLE_SECONDARY_DIRECTIVE_MATCH`

## BUNDLE_FALLBACK_MODEL
- selected Bundle on lane: selected lane geometry source is `bundle` for that lane
- no selected Bundle on lane: geometry source is `base`
- omitted block effect: omitted blocks do not become OFF/DISABLED and do not introduce execution state changes; geometry simply does not include them

## DEFERRED_ITEMS
- scoped MOLT
- Overlay ordering and full overlay interaction matrix
- full diagnostic payload requirements
- Trace sequencing requirements
- exhaustive Bundle malformed/invalid-membership matrix
- merge- and runtime-composition interactions beyond local bundle-local substitution

## CANON_DECISIONS_REQUIRED
- none identified

## CONFLICTS_FOUND
- none

## SEMANTIC_CHANGES
- none

## REPORT
- H1C5_STATUS: COMPLETE
- SOURCE_HEAD: `764ac06fdbb14c74ee5afe5cd799ec261ea047b0`
- DIR_REQUIREMENTS: 13
- BUNDLE_REQUIREMENTS: 11
- TOTAL_REQUIREMENTS: 24
- SECONDARY_MATCH_MODEL: `0 matches => Prime only`, `1 match => Prime + one Secondary`, `2+ matches => MULTIPLE_SECONDARY_DIRECTIVE_MATCH`
- BUNDLE_FALLBACK_MODEL: `selected lane => bundle`, `omitted lane => base fallback`, `omitted block effect => non-state, non-authority`
- FILES_CHANGED: `docs/qualification/H1/H1C5_DIRECTIVE_BUNDLE_REQUIREMENTS.md`
