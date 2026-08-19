# H1-C6 Scoped MOLT and Overlay Requirements

This chapter continues the `UMG-CONF-BUNDLE-###` namespace for scoped MOLT and Overlay normative behavior only.

## SCOPED MOLT REQUIREMENTS

- ID: `UMG-CONF-BUNDLE-012`
  - Normative Statement: Scoped MOLT attachments MAY target only MOLT block types `instruction`, `philosophy`, and `blueprint`.
  - Authority: `docs/SEMANTIC_FREEZE_v0.1.md`, `docs/BUNDLE_OVERLAY_CONTRACT.md`
  - Observable Conformance Evidence: `test/bundle-overlay-contract.mjs` (`SCOPED_MOLT_TYPE_UNSUPPORTED`), `fixtures/bundle-overlay.sleeve.json`
  - Notes/Exclusions: Do not add additional scoped types in this H1 family.

- ID: `UMG-CONF-BUNDLE-013`
  - Normative Statement: Any unsupported scoped MOLT type MUST fail closed.
  - Authority: `docs/BUNDLE_OVERLAY_CONTRACT.md`, `docs/SEMANTIC_FREEZE_v0.1.md`
  - Observable Conformance Evidence: `test/bundle-overlay-contract.mjs` invalid-type paths, `fixtures/bundle-overlay.sleeve.json`
  - Notes/Exclusions: Failure codes are defined contractually where stable; full payload shape is deferred.

- ID: `UMG-CONF-BUNDLE-014`
  - Normative Statement: Scoped MOLT `scope` MUST be one of `sleeve` or `neostack`; other scope forms are out of scope for normative status and must fail.
  - Authority: `docs/BUNDLE_OVERLAY_CONTRACT.md`
  - Observable Conformance Evidence: `test/bundle-overlay-contract.mjs` (`UNKNOWN_SCOPED_NEOSTACK` and related failures), `fixtures/bundle-overlay.sleeve.json`
  - Notes/Exclusions: Dynamic, tag, or query scopes are deferred.

- ID: `UMG-CONF-BUNDLE-015`
  - Normative Statement: `neostack` scope applies to the targeted NeoStack and its descendants; `sleeve` scope is broader than `neostack`.
  - Authority: `docs/BUNDLE_OVERLAY_CONTRACT.md`
  - Observable Conformance Evidence: `test/bundle-overlay-contract.mjs` (`scopedIds` propagation checks), `fixtures/bundle-overlay.sleeve.json`
  - Notes/Exclusions: This is a scope propagation rule, not an authority ordering rule.

- ID: `UMG-CONF-BUNDLE-016`
  - Normative Statement: Effective scoped ordering is broad-to-narrow (`sleeve` contributions before `neostack` contributions).
  - Authority: `docs/BUNDLE_OVERLAY_CONTRACT.md`
  - Observable Conformance Evidence: `test/bundle-overlay-contract.mjs` (`scopedIds` order checks for `NB.TARGET` and `NB.DESC` lanes), `fixtures/bundle-overlay.sleeve.json`
  - Notes/Exclusions: Do not treat scope depth as hidden Priority.

- ID: `UMG-CONF-BUNDLE-017`
  - Normative Statement: Multiple authored scoped attachments at the same scope depth MUST preserve authored attachment order.
  - Authority: `docs/BUNDLE_OVERLAY_CONTRACT.md`
  - Observable Conformance Evidence: `test/bundle-overlay-contract.mjs` `scopedSourceIds` ordering checks, `fixtures/bundle-overlay.sleeve.json`
  - Notes/Exclusions: Authored ordering is contribution sequencing only.

- ID: `UMG-CONF-BUNDLE-018`
  - Normative Statement: Scoped attachment IDs indicate provenance only and MUST NOT create Priority, weighting, or any semantic authority.
  - Authority: `docs/BUNDLE_OVERLAY_CONTRACT.md`
  - Observable Conformance Evidence: `test/bundle-overlay-contract.mjs` (`scopedMolt` ID rewrites with equivalent runtime geometry), `fixtures/bundle-overlay.sleeve.json`
  - Notes/Exclusions: ID changes are not selection/ranking controls.

- ID: `UMG-CONF-BUNDLE-019`
  - Normative Statement: Scoped MOLT is additive context and MUST NOT replace Base or Bundle geometry.
  - Authority: `docs/BUNDLE_OVERLAY_CONTRACT.md`
  - Observable Conformance Evidence: `test/bundle-overlay-contract.mjs` (`activeScopedMolt` assertions under base/bundle-bearing sleeves), `fixtures/requests/bundle-overlay-base.selection.json`
  - Notes/Exclusions: Scoped MOLT contributes alongside base/bundle geometry.

## OVERLAY REQUIREMENTS

- ID: `UMG-CONF-BUNDLE-020`
  - Normative Statement: Overlay contribution is temporary explicit additive scoped cognition.
  - Authority: `docs/BUNDLE_OVERLAY_CONTRACT.md`
  - Observable Conformance Evidence: `test/bundle-overlay-contract.mjs` active/inactive `activeOverlayIds` scenarios, `fixtures/bundle-overlay.sleeve.json`
  - Notes/Exclusions: Runtime output persistence is excluded from this chapter.

- ID: `UMG-CONF-BUNDLE-021`
  - Normative Statement: Overlay attachments MUST obey the same scoped MOLT type and scope constraints as scoped MOLT.
  - Authority: `docs/BUNDLE_OVERLAY_CONTRACT.md`
  - Observable Conformance Evidence: `test/bundle-overlay-contract.mjs` unsupported overlay content paths, `fixtures/bundle-overlay.sleeve.json`
  - Notes/Exclusions: This covers contribution validity only.

- ID: `UMG-CONF-BUNDLE-022`
  - Normative Statement: Overlay MUST NOT delete, replace, suppress, or mutate authored local geometry.
  - Authority: `docs/BUNDLE_OVERLAY_CONTRACT.md`, `docs/SEMANTIC_FREEZE_v0.1.md`
  - Observable Conformance Evidence: `test/bundle-overlay-contract.mjs` authored row preservation under active overlay scenarios, `fixtures/requests/bundle-overlay-overlays-ab.selection.json`
  - Notes/Exclusions: Overlay can only add scoped contributions.

- ID: `UMG-CONF-BUNDLE-023`
  - Normative Statement: Overlay MUST NOT change lane MOLT type.
  - Authority: `docs/BUNDLE_OVERLAY_CONTRACT.md`
  - Observable Conformance Evidence: `test/bundle-overlay-contract.mjs` lane type checks, `fixtures/requests/bundle-overlay-overlays-ab.selection.json`
  - Notes/Exclusions: Type is inherited from authored/local lane and selected MOLT content.

- ID: `UMG-CONF-BUNDLE-024`
  - Normative Statement: Overlay does not create semantic authority.
  - Authority: `docs/BUNDLE_OVERLAY_CONTRACT.md`
  - Observable Conformance Evidence: `test/bundle-overlay-contract.mjs` inactive/active overlay scenarios where authority still follows directives/governance, `fixtures/requests/bundle-overlay-sibling-overlay.selection.json`
  - Notes/Exclusions: Authority precedence remains in separate governance/selections mechanisms.

- ID: `UMG-CONF-BUNDLE-025`
  - Normative Statement: Overlay does not independently select NeoStacks or NeoBlocks; selection context comes from normal selection and directive governance.
  - Authority: `docs/BUNDLE_OVERLAY_CONTRACT.md`
  - Observable Conformance Evidence: `test/bundle-overlay-contract.mjs` (`OV.SIBLING` active with unselected target unchanged), `fixtures/requests/bundle-overlay-sibling-overlay.selection.json`
  - Notes/Exclusions: Overlay affects selected scopes only after selection is established.

- ID: `UMG-CONF-BUNDLE-026`
  - Normative Statement: Overlay cannot restore OFF cognition, cannot restore DISABLED cognition, and cannot bypass Governance.
  - Authority: `docs/BUNDLE_OVERLAY_CONTRACT.md`, `docs/SEMANTIC_FREEZE_v0.1.md`
  - Observable Conformance Evidence: `test/bundle-overlay-contract.mjs` (`SELECTION_TARGET_NOT_EXECUTABLE` under active overlay context), `fixtures/requests/bundle-overlay-overlays-ab.selection.json`
  - Notes/Exclusions: Governance and OFF/DISABLED semantics are enforced independently from overlay.

- ID: `UMG-CONF-BUNDLE-027`
  - Normative Statement: `selection.activeOverlayIds` is membership-only and caller-provided array ordering does not establish semantic ordering.
  - Authority: `docs/BUNDLE_OVERLAY_CONTRACT.md`
  - Observable Conformance Evidence: `test/bundle-overlay-contract.mjs` (`overlays-ab` vs `overlays-ba` equivalence), `fixtures/requests/bundle-overlay-overlays-ab.selection.json`, `fixtures/requests/bundle-overlay-overlays-ba.selection.json`
  - Notes/Exclusions: This requirement covers only ordering semantics for active overlay IDs.

- ID: `UMG-CONF-BUNDLE-028`
  - Normative Statement: Sleeve overlay declaration order governs ordering among active overlays; within one Overlay, broad-to-narrow ordering applies and same-depth attachments preserve authored order.
  - Authority: `docs/BUNDLE_OVERLAY_CONTRACT.md`
  - Observable Conformance Evidence: `test/bundle-overlay-contract.mjs` scoped/overlay ordering assertions, `fixtures/bundle-overlay.sleeve.json`
  - Notes/Exclusions: Ordering remains composition semantics only.

- ID: `UMG-CONF-BUNDLE-029`
  - Normative Statement: Authored scoped MOLT contributions (sleeve scope and scoped attachments) precede active Overlay contributions, with duplicates preserved and never hidden-deduplicated.
  - Authority: `docs/BUNDLE_OVERLAY_CONTRACT.md`
  - Observable Conformance Evidence: `test/bundle-overlay-contract.mjs` `scopedIds` vs `overlayIds` sequencing and duplicate fixture cases, `fixtures/bundle-overlay.sleeve.json`
  - Notes/Exclusions: Distinct provenance remains distinct even with duplicate references.

- ID: `UMG-CONF-BUNDLE-030`
  - Normative Statement: An overlay absent from `selection.activeOverlayIds` is inert; an active overlay scoped entirely to an unselected READY region is inert for that compile.
  - Authority: `docs/BUNDLE_OVERLAY_CONTRACT.md`
  - Observable Conformance Evidence: `test/bundle-overlay-contract.mjs` base-only and sibling-overlay inactive-path cases, `fixtures/requests/bundle-overlay-overlays-ab.selection.json`, `fixtures/requests/bundle-overlay-sibling-overlay.selection.json`
  - Notes/Exclusions: Inertness is compile-specific and does not alter authored model.

- ID: `UMG-CONF-BUNDLE-031`
  - Normative Statement: Scoped/Overlay composition introduces no persistent per-MOLT state.
  - Authority: `docs/BUNDLE_OVERLAY_CONTRACT.md`, `docs/SEMANTIC_FREEZE_v0.1.md`
  - Observable Conformance Evidence: `test/bundle-overlay-contract.mjs` deterministic outputs across repeated invocation variants, `fixtures/requests/bundle-overlay-base.selection.json`
  - Notes/Exclusions: This restriction is for composition behavior only.

## REQUIREMENT SUMMARY
- Previous BUNDLE requirement count: 11
- New scoped/Overlay requirement count: 20
- Resulting total BUNDLE-family requirement count: 31

## SCOPED ORDER MODEL
- Authored scoped ordering: keep authored same-depth `scopedMolt` order
- Scope propagation: `sleeve` first, then `neostack` to descendants
- Same-depth ordering: authored order is preserved

## OVERLAY ORDER MODEL
- Authored scoped vs Overlay: authored scoped contributions precede overlay contributions
- Between active Overlays: sleeve declaration order in `overlays`
- Within one Overlay: broad-to-narrow scope, then same-depth authored attachment order
- Caller activeOverlayIds ordering: membership-only, no semantic ordering

## ADDITIVE-ONLY BOUNDARY
- MAY add: scoped/overlay contributions that extend the effective geometry under active selection
- MAY NOT replace: local Base Geometry, local Bundle replacement behavior, or lane MOLT type
- MAY NOT revive: OFF or DISABLED cognition
- MAY NOT mutate: authored local geometry
- MAY NOT bypass: governance and selection off/disabled checks
- MAY NOT create: new NeoStack/NeoBlock selection authority
- MAY NOT deduplicate: distinct explicit attachments with distinct provenance
- MAY NOT persist: per-MOLT state across overlays/scopes

## DEFERRED_ITEMS
- RuntimeSpec provenance fields and sourceMode sourceScope scopeLayer details
- Trace event sequencing and payload requirements
- Diagnostic payload details beyond contract-level code presence
- Merge-result scoped restrictions
- exhaustive malformed scoped/Overlay matrix

## CANON_DECISIONS_REQUIRED
- none identified

## CONFLICTS_FOUND
- none identified

## SEMANTIC_CHANGES
- none

## REPORT
- H1C6_STATUS: COMPLETE
- SOURCE_HEAD: `764ac06fdbb14c74ee5afe5cd799ec261ea047b0`
- PREVIOUS_BUNDLE_REQUIREMENTS: 11
- NEW_SCOPED_OVERLAY_REQUIREMENTS: 20
- TOTAL_BUNDLE_FAMILY_REQUIREMENTS: 31
- SCOPED_TYPES: `instruction`, `philosophy`, `blueprint`
- SCOPED_ORDER_MODEL: broad-to-narrow with same-depth authored order
- OVERLAY_ORDER_MODEL: authored scoped first; then active overlays by sleeve declaration order, each broad-to-narrow with same-depth order; activeOverlayIds order is membership-only
- ADDITIVE_ONLY_BOUNDARY: scoped/Overlay contributions are additive and must not replace local geometry/authority/state
- DEFERRED_ITEMS: RuntimeSpec provenance fields, sourceScope/scopeLayer, Trace requirements, diagnostic payload details, Merge-result scoped restrictions, exhaustive malformed scoped/overlay matrix
- CANON_DECISIONS_REQUIRED: none identified
- CONFLICTS_FOUND: none
- SEMANTIC_CHANGES: none
- FILES_CHANGED: `docs/qualification/H1/H1C6_SCOPED_MOLT_OVERLAY_REQUIREMENTS.md`
