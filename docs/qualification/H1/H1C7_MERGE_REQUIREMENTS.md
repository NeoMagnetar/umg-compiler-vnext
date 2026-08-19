# H1-C7 Merge Requirements

This chapter defines normative requirements for `UMG-CONF-MERGE-###` only.

## MERGE IDENTITY / AUTHORING

- ID: `UMG-CONF-MERGE-001`  
  Normative Statement: Merge is a local authored provenance declaration.  
  Authority: `docs/MERGE_CONTRACT.md`  
  Observable Conformance Evidence: `test/merge-contract.mjs`, `fixtures/merge-contract.sleeve.json`  
  Notes/Exclusions: This does not introduce runtime transforms or extra schema fields.

- ID: `UMG-CONF-MERGE-002`  
  Normative Statement: Each Merge belongs to one NeoBlock.  
  Authority: `docs/MERGE_CONTRACT.md`  
  Observable Conformance Evidence: `test/merge-contract.mjs`  
  Notes/Exclusions: Merge scope is constrained by NeoBlock ownership.

- ID: `UMG-CONF-MERGE-003`  
  Normative Statement: Each Merge MUST declare all required relation fields: `id`, `sourceBlockIds`, and `resultBlockId`.  
  Authority: `docs/MERGE_CONTRACT.md`  
  Observable Conformance Evidence: `test/merge-contract.mjs` invalid field mutations and `fixtures/merge-contract.sleeve.json`  
  Notes/Exclusions: Structural missing-field behavior follows schema validation.

- ID: `UMG-CONF-MERGE-004`  
  Normative Statement: `sourceBlockIds` must contain at least two entries and entries must be unique.  
  Authority: `docs/MERGE_CONTRACT.md`  
  Observable Conformance Evidence: `test/merge-contract.mjs` (`MERGE_TOO_FEW_SOURCES`, `MERGE_DUPLICATE_SOURCE`)  
  Notes/Exclusions: Unary or duplicated sources are invalid.

- ID: `UMG-CONF-MERGE-005`  
  Normative Statement: Merge result may be used in only one Merge within a single NeoBlock, and a source may be reused by multiple independent Merges when other constraints are satisfied.  
  Authority: `docs/MERGE_CONTRACT.md`  
  Observable Conformance Evidence: `test/merge-contract.mjs` (`DUPLICATE_MERGE_RESULT`) and successful reuse assertions  
  Notes/Exclusions: This does not authorize Merge-of-Merge chaining.

- ID: `UMG-CONF-MERGE-006`  
  Normative Statement: A Merge `resultBlockId` must not equal any `sourceBlockId` in the same declaration.  
  Authority: `docs/MERGE_CONTRACT.md`  
  Observable Conformance Evidence: `test/merge-contract.mjs` (`MERGE_RESULT_IS_SOURCE`)  
  Notes/Exclusions: Merge does not overwrite source content.

## LOCALITY

- ID: `UMG-CONF-MERGE-007`  
  Normative Statement: Merge sources and result are local to the owning NeoBlock and must be pre-authored local MOLT blocks.  
  Authority: `docs/MERGE_CONTRACT.md`  
  Observable Conformance Evidence: `test/merge-contract.mjs` (`INVALID_MERGE_SOURCE`, `INVALID_MERGE_RESULT`)  
  Notes/Exclusions: Merge cannot source or produce non-local blocks in this version.

- ID: `UMG-CONF-MERGE-008`  
  Normative Statement: Merge sources and results cannot be Trigger blocks.  
  Authority: `docs/MERGE_CONTRACT.md`  
  Observable Conformance Evidence: `test/merge-contract.mjs` (`TRIGGER_MERGE_UNSUPPORTED`)  
  Notes/Exclusions: Trigger remains a selection signal only in this model.

- ID: `UMG-CONF-MERGE-009`  
  Normative Statement: Merge results cannot be introduced through `sleeve.scopedMolt`.  
  Authority: `docs/MERGE_CONTRACT.md`  
  Observable Conformance Evidence: `test/merge-contract.mjs` (`MERGE_RESULT_SCOPED_UNSUPPORTED`)  
  Notes/Exclusions: Scoped contribution and Merge provenance remain separate.

- ID: `UMG-CONF-MERGE-010`  
  Normative Statement: Merge results cannot be introduced through Overlay attachments.  
  Authority: `docs/MERGE_CONTRACT.md`  
  Observable Conformance Evidence: `test/merge-contract.mjs` (`MERGE_RESULT_SCOPED_UNSUPPORTED`)  
  Notes/Exclusions: Overlay content cannot define Merge source/result membership.

## AUTHORITY CONSERVATION

- ID: `UMG-CONF-MERGE-011`  
  Normative Statement: Merge conserves authority and does not create new authority above its source ceiling.  
  Authority: `docs/MERGE_CONTRACT.md`  
  Observable Conformance Evidence: `test/merge-contract.mjs` (`MRG.MRG.DOWNWARD` pass, `MERGE_AUTHORITY_ESCALATION` fail)  
  Notes/Exclusions: The authority ceiling is the highest-authority source among valid sources.

- ID: `UMG-CONF-MERGE-012`  
  Normative Statement: Same-ceiling results are valid, as are downward-authority results, while upward-authority results are invalid.  
  Authority: `docs/MERGE_CONTRACT.md`  
  Observable Conformance Evidence: `test/merge-contract.mjs` (`directive + philosophy -> directive`, `instruction + philosophy -> instruction`, `directive + blueprint -> instruction`, `instruction + philosophy -> directive`)  
  Notes/Exclusions: The result is not a winner-selection choice.

## PLACEMENT

- ID: `UMG-CONF-MERGE-013`  
  Normative Statement: Declaring a Merge alone does not place the result; placement must be through authored local structures.  
  Authority: `docs/MERGE_CONTRACT.md`  
  Observable Conformance Evidence: `test/merge-contract.mjs` base/bundle/overlay placement checks  
  Notes/Exclusions: Merge validates provenance separately from placement.

- ID: `UMG-CONF-MERGE-014`  
  Normative Statement: Valid Merge placement surfaces are: `primeDirectiveId`, `secondaryDirectives[].directiveBlockId`, Base Geometry, and Bundle rows.  
  Authority: `docs/MERGE_CONTRACT.md`  
  Observable Conformance Evidence: `fixtures/merge-contract.sleeve.json`, `fixtures/requests/merge-contract-base.selection.json`, `fixtures/requests/merge-contract-bundle.selection.json`  
  Notes/Exclusions: No other placement vector is normative in this family.

- ID: `UMG-CONF-MERGE-015`  
  Normative Statement: An unplaced result MUST fail with `MERGE_RESULT_NOT_PLACED`; a placed result may remain dormant when inactive in a compile.  
  Authority: `docs/MERGE_CONTRACT.md`  
  Observable Conformance Evidence: `test/merge-contract.mjs` (`MERGE_RESULT_NOT_PLACED`), base vs bundle scenarios  
  Notes/Exclusions: Bundle-only placement is valid even when the Bundle is inactive for the current compile.

## SOURCE ACTIVATION

- ID: `UMG-CONF-MERGE-016`  
  Normative Statement: Merge source validity does not depend on source activation in RuntimeSpec.  
  Authority: `docs/MERGE_CONTRACT.md`  
  Observable Conformance Evidence: `test/merge-contract.mjs` active/inactive selection scenarios with stable merge traces  
  Notes/Exclusions: Activation still governs effective output when governance/selection gates apply.

- ID: `UMG-CONF-MERGE-017`  
  Normative Statement: Scoped/Overlay contributions do not implicitly become Merge sources.  
  Authority: `docs/MERGE_CONTRACT.md`  
  Observable Conformance Evidence: `test/merge-contract.mjs` overlay scenario assertions where merge `sources` are unchanged  
  Notes/Exclusions: Composition channels remain independent.

## DEPENDENCY LIMITS

- ID: `UMG-CONF-MERGE-018`  
  Normative Statement: Merge-of-Merge acyclic chaining is unsupported (`MERGE_CHAIN_UNSUPPORTED`) and cyclic Merge dependencies fail with `MERGE_CYCLE`; both are fail-closed.  
  Authority: `docs/MERGE_CONTRACT.md`  
  Observable Conformance Evidence: `test/merge-contract.mjs` (`MRG.MRG.REUSE` chain fail, two-way and multi-merge cycle assertions)  
  Notes/Exclusions: No recursive Merge evaluation semantics are defined.

## STATE / GOVERNANCE BOUNDARY

- ID: `UMG-CONF-MERGE-019`  
  Normative Statement: Merge does not restore OFF or DISABLED cognition and does not bypass Governance.  
  Authority: `docs/MERGE_CONTRACT.md`, `docs/SEMANTIC_FREEZE_v0.1.md`  
  Observable Conformance Evidence: `test/merge-contract.mjs` (`SELECTION_TARGET_NOT_EXECUTABLE`) under governance-off path  
  Notes/Exclusions: Merge cannot override executable-state rules.

## COMPOSITION NON-EQUIVALENCE

- ID: `UMG-CONF-MERGE-020`  
  Normative Statement: Merge is distinct from Bundle, Overlay, and Governance; Merge does not place itself, does not synthesize result content, and does not create authority.  
  Authority: `docs/MERGE_CONTRACT.md`, `docs/BUNDLE_OVERLAY_CONTRACT.md`, `docs/SEMANTIC_FREEZE_v0.1.md`  
  Observable Conformance Evidence: `test/merge-contract.mjs` prompt part assertions showing explicit placement and unchanged local/overlay behavior  
  Notes/Exclusions: This chapter is about composition semantics only; merge output provenance payloads are deferred.

## REQUIREMENT SUMMARY
- MERGE count: 20
- total: 20

## MERGE AUTHORITY MODEL
- Authority order: `directive`, `instruction`, `subject`, `primary`, `philosophy`, `blueprint`
- Ceiling calculation: highest-authority source among valid sources
- Same ceiling: legal
- Downward: legal
- Upward: legal only if non-upward? invalid; invalid path fails `MERGE_AUTHORITY_ESCALATION`

## MERGE PLACEMENT MODEL
- Valid placement surfaces: `primeDirectiveId`, `secondaryDirectives[].directiveBlockId`, Base Geometry, Bundle
- Declaration-only behavior: Merge declaration alone does not place result
- Dormant placed result: valid when parent authored structure is inactive

## MERGE DEPENDENCY MODEL
- Independent merges: multiple independent Merge declarations may exist in a NeoBlock when result identity and source rules hold
- Acyclic chain: fail-closed with `MERGE_CHAIN_UNSUPPORTED`
- Cycle: fail-closed with `MERGE_CYCLE`

## DEFERRED_ITEMS
- RuntimeSpec provenance fields (`sourceMode = merge`, `mergeId`)
- `MERGE_VALIDATED` trace sequencing/payload (`authorityCeiling`, `authorityCheck`)
- diagnostic payload detail requirements
- exhaustive malformed Merge matrix

## CANON_DECISIONS_REQUIRED
- none identified

## CONFLICTS_FOUND
- none

## SEMANTIC_CHANGES
- none

## REPORT
- H1C7_STATUS: COMPLETE
- SOURCE_HEAD: `764ac06fdbb14c74ee5afe5cd799ec261ea047b0`
- MERGE_REQUIREMENTS: 20
- TOTAL_REQUIREMENTS: 20
- AUTHORITY_ORDER: `directive` > `instruction` > `subject` > `primary` > `philosophy` > `blueprint`
- AUTHORITY_CEILING_MODEL: highest source authority among valid sources; result must be same or lower
- PLACEMENT_MODEL: Merge declares provenance only; explicit placement in Prime/Secondary/Base/Bundle required
- DEPENDENCY_MODEL: Merge-of-Merge acyclic chains unsupported and cycle dependency rejected, both fail-closed
- STATE_GOVERNANCE_BOUNDARY: Merge cannot restore OFF/DISABLED and cannot bypass Governance
- DEFERRED_ITEMS: RuntimeSpec Merge provenance fields, MERGE_VALIDATED trace requirements, diagnostic payload requirements, exhaustive malformed Merge matrix
- CANON_DECISIONS_REQUIRED: none identified
- CONFLICTS_FOUND: none
- SEMANTIC_CHANGES: none
- FILES_CHANGED: `docs/qualification/H1/H1C7_MERGE_REQUIREMENTS.md`
