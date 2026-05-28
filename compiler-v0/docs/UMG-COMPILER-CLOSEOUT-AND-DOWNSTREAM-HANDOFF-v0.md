# UMG Compiler v0 Closeout and Downstream Handoff

Status: closeout_complete_for_current_alignment_cycle
Scope: compiler-v0 canon-alignment closeout and downstream handoff
Audience: MCP, Envoy, Hermes, Block Library, repo maintainers

## 1. Final State Summary

UMG Compiler v0 is now aligned as a deterministic resolver and artifact generator within the current transitional architecture.

Current aligned state:
- compiler v0 acts as a deterministic resolver and artifact generator
- RuntimeSpec is explicitly non-executing
- Trace is explicitly audit/provenance, not permission
- validation commands are green:
  - `npm run build`
  - `npm run contract`
  - `npm run snapshot`
  - `npm test`

Important framing:
- the repo still contains both sleeve-path and canonical-IR-path surfaces
- this closeout does not claim the architecture is fully unified
- it does claim the current v0 behavior is materially better bounded, better traced, and better tested than the starting point of the cycle

## 2. Completed Lane Ledger

Completed alignment/repair/documentation lanes and commit hashes:

- `UMG_COMPILER_CONTRACT_SPEC_v0`
  - `2d281eb` — Add UMG compiler v0 contract spec lane
- `UMG_COMPILER_VALIDATION_TOOLCHAIN_REPAIR`
  - no standalone commit
  - outcome was operational repair via deterministic local install and diagnosis, not package-file change
- `UMG_COMPILER_TEST_SCRIPT_REPAIR`
  - `2d71dd1` — Wire compiler v0 priority test script
- `UMG_COMPILER_SNAPSHOT_DRIFT_DECISION`
  - `46e5f0c` — Refresh compiler v0 snapshots after validation repair
- `UMG_COMPILER_MOLT_REGISTRY_ALIGNMENT`
  - `3dac532` — Add MOLT registry alignment tests
- `UMG_COMPILER_OFF_STATE_ALIGNMENT`
  - `a56cc82` — Align compiler v0 Off state traceability
- `UMG_COMPILER_MERGE_ACTION_ALIGNMENT`
  - `3792563` — Align compiler v0 Merge action traceability
- `UMG_COMPILER_PRIORITY_CONFLICT_SITE_ALIGNMENT`
  - `6f1aaef` — Align compiler v0 priority conflict-site handling
- `UMG_COMPILER_GOVERNANCE_TRIGGER_ALIGNMENT`
  - `b5ea402` — Align compiler v0 governance trigger handling
- `UMG_COMPILER_RUNTIMESPEC_TRACE_ALIGNMENT`
  - `a942028` — Align compiler v0 RuntimeSpec Trace boundaries
- `UMG_COMPILER_DETERMINISM_FIXTURE_ALIGNMENT`
  - `de90513` — Strengthen compiler v0 determinism fixture coverage
- `UMG_COMPILER_DOCS_AND_MIGRATION_NOTES`
  - `1629ea1` — Document compiler v0 canon alignment migration notes

## 3. Current Guarantees

The following are now validated or explicitly documented as current guarantees:

- seven v0 MOLT types are accepted:
  - `trigger`
  - `directive`
  - `instruction`
  - `subject`
  - `primary`
  - `philosophy`
  - `blueprint`
- Merge / Off are rejected as MOLT types
- Off exclusion is traceable
- Merge action is traceable
- cross-MOLT merge is guarded by default
- Priority is treated as conflict-site tie-breaking
- single-candidate cases are not treated as priority conflict resolution
- Governance exclusions are traceable
- Trigger context is treated as eligibility-gate-only context
- RuntimeSpec boundary metadata is present
- Trace audit/provenance boundary is present
- semantic determinism helpers exist
- validation scripts are wired and passing

## 4. Known Remaining Drift

The following drift remains known and intentionally unresolved in this cycle:

- sleeve path still returns top-level `runtime`
- IR path returns `runtimeSpec`
- volatile fields still exist in raw output
- some provenance remains message-text based rather than fully structured fields
- `role=off` remains legacy/provisional compatibility
- cross-MOLT merge still has an advanced override escape hatch
- IR path does not yet enforce all sleeve-path laws deeply
- shared RuntimeSpec schema still does not cover every sleeve-output surface

## 5. Open Questions

Preserved here without silent resolution:

- whether sleeve output top-level `runtime` should be renamed/aliased to `runtimeSpec`
- whether volatile trace ids/timestamps should become null/stable
- whether `compiledAt` should remain raw output
- whether Off should move from `role=off` to a dedicated state field
- whether governance/off exclusions should share structured exclusion records
- whether merge provenance should move from message text to structured trace fields
- whether cross-MOLT merge should remain advanced-gated or be removed
- whether IR path should enforce equivalent MOLT/Governance/Trigger/Merge laws more deeply
- whether a shared RuntimeSpec schema should cover sleeve and IR outputs together

## 6. Downstream Handoff Targets

### 6.1 UMG MCP Server contract alignment
Consume:
- compiler contract doc
- migration notes
- non-executing RuntimeSpec metadata
- Trace audit/provenance records
- deterministic normalization policy
- MOLT registry rejection behavior
- Off/Merge/Priority/Governance/Trigger boundaries

Do not assume:
- RuntimeSpec means execution
- Trace means permission
- trigger means authority
- priority can override governance or Off
- Merge is a MOLT type
- Off is a MOLT type
- cross-MOLT merge is settled canon

### 6.2 UMG Envoy runtime consumption alignment
Consume:
- compiler contract doc
- migration notes
- non-executing RuntimeSpec metadata
- Trace audit/provenance records
- deterministic normalization policy
- MOLT registry rejection behavior
- Off/Merge/Priority/Governance/Trigger boundaries

Do not assume:
- RuntimeSpec means execution
- Trace means permission
- trigger means authority
- priority can override governance or Off
- Merge is a MOLT type
- Off is a MOLT type
- cross-MOLT merge is settled canon

### 6.3 Hermes portability retesting
Consume:
- compiler contract doc
- migration notes
- non-executing RuntimeSpec metadata
- Trace audit/provenance records
- deterministic normalization policy
- MOLT registry rejection behavior
- Off/Merge/Priority/Governance/Trigger boundaries

Do not assume:
- RuntimeSpec means execution
- Trace means permission
- trigger means authority
- priority can override governance or Off
- Merge is a MOLT type
- Off is a MOLT type
- cross-MOLT merge is settled canon

### 6.4 Block Library package/card/retrieval contracts
Consume:
- compiler contract doc
- migration notes
- non-executing RuntimeSpec metadata where compiler outputs are embedded or referenced
- Trace audit/provenance records where applicable
- deterministic normalization policy
- MOLT registry rejection behavior
- Off/Merge/Priority/Governance/Trigger boundaries where library metadata influences compilation

Do not assume:
- RuntimeSpec means execution
- Trace means permission
- trigger means authority
- priority can override governance or Off
- Merge is a MOLT type
- Off is a MOLT type
- cross-MOLT merge is settled canon

## 7. Recommended Next Project Lanes

Recommended next lanes outside this repo/compiler cycle:
- `UMG_MCP_COMPILER_CONTRACT_CONSUMPTION_PLAN`
- `UMG_ENVOY_COMPILER_OUTPUT_CONSUMPTION_ALIGNMENT`
- `HERMES_COMPILER_PORTABILITY_RETEST`
- `UMG_BLOCK_LIBRARY_COMPILER_CONTRACT_MAPPING`
- `UMG_COMPILER_IR_LAW_PARITY_PLAN`

## 8. Validation Closeout

Validation commands for the closeout lane:
- `git status --short`
- `npm run build`
- `npm run contract`
- `npm run snapshot`
- `npm test`
- `git status --short`
- `git log --oneline -12`

Expected closeout condition:
- working tree clean after docs-only commit
- validation commands green
- no unexpected snapshot churn from docs-only work

## 9. Practical Closeout Summary

For maintainers and downstream consumers:
- treat compiler v0 as canon-aligned enough for disciplined downstream contract consumption
- do not mistake that for “architecture fully finished”
- rely on the contract doc and migration notes, not old assumptions
- consume RuntimeSpec and Trace as non-executing artifacts
- apply the documented semantic determinism normalization policy when comparing outputs
- treat the preserved open questions as live design boundaries, not solved facts
