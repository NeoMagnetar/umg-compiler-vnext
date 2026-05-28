# UMG Compiler v0 Migration Notes

Status: post-alignment handoff notes
Scope: v0 canon-alignment lanes completed through determinism fixture alignment
Audience: Envoy, MCP, Hermes, Block Library, downstream runtime/tooling consumers

## 1. Purpose

These notes describe how the current compiler v0 behavior has been tightened across the canon-alignment lanes, what downstream consumers should rely on now, and what remains explicitly open.

This document does **not** redefine canon. It records the current aligned implementation and migration-relevant behavior.

## 2. Completed Alignment Lanes

Completed lanes so far:
- `UMG_COMPILER_CONTRACT_SPEC_v0`
- `UMG_COMPILER_MOLT_REGISTRY_ALIGNMENT`
- `UMG_COMPILER_OFF_STATE_ALIGNMENT`
- `UMG_COMPILER_MERGE_ACTION_ALIGNMENT`
- `UMG_COMPILER_PRIORITY_CONFLICT_SITE_ALIGNMENT`
- `UMG_COMPILER_GOVERNANCE_TRIGGER_ALIGNMENT`
- `UMG_COMPILER_RUNTIMESPEC_TRACE_ALIGNMENT`
- `UMG_COMPILER_DETERMINISM_FIXTURE_ALIGNMENT`

## 3. Old Behavior vs Current Aligned Behavior

### 3.1 MOLT registry
Old / weakly implied:
- MOLT rules were present in code but not explicitly proven by dedicated regression coverage.

Current aligned behavior:
- valid v0 MOLT types are only:
  - `trigger`
  - `directive`
  - `instruction`
  - `subject`
  - `primary`
  - `philosophy`
  - `blueprint`
- `merge` / `Merge` as `moltType` are rejected deterministically
- `off` / `Off` as `moltType` are rejected deterministically
- unknown MOLT values are rejected deterministically

Downstream implication:
- consumers should not accept Merge or Off as block MOLT types from compiler output or source assumptions

### 3.2 Off state
Old behavior:
- Off existed operationally via `role === "off"`
- exclusion happened, but traceability was thinner

Current aligned behavior:
- Off is still retained as legacy/provisional input compatibility via `role=off`
- Off is not a MOLT type
- Off blocks are excluded from active participation
- Off exclusion is traceable through:
  - `INFO_BLOCK_EXCLUDED_OFF_STATE`

Downstream implication:
- consumers should treat `role=off` as legacy/provisional exclusion compatibility, not semantic authority or active content

### 3.3 Merge
Old behavior:
- merge segments existed as actions
- cross-MOLT merge was more permissive
- merge trace was less explicit

Current aligned behavior:
- Merge remains an action, not a MOLT type
- same-type merge is supported
- cross-MOLT merge is guarded by default
- advanced cross-MOLT use now requires:
  - `override.allowAdvanced=true`
- merge trace now surfaces:
  - input block ids
  - result block id
  - effective result MOLT type
  - source MOLT types

Downstream implication:
- do not assume cross-MOLT merge is normal/default behavior
- do assume merge provenance is traceable

### 3.4 Priority
Old behavior:
- priority traces could make even single-candidate cases look like a conflict resolution
- loser suppression was less explicit in trace wording

Current aligned behavior:
- priority is framed as conflict-site tie-breaking only
- single-candidate cases now emit:
  - `INFO_PRIORITY_NOT_NEEDED`
- real conflict-site cases emit:
  - `INFO_PRIORITY_RESOLVED`
  - explicit suppressed loser ids in the message

Downstream implication:
- consumers should treat priority traces as conflict-site audit data, not semantic authority or strategy

### 3.5 Governance / Trigger
Old behavior:
- governance ran early enough, but traceability for exclusions and trigger-gated rule skipping was less explicit

Current aligned behavior:
- governance-forbidden blocks are explicitly traceable through:
  - `INFO_BLOCK_EXCLUDED_GOVERNANCE`
- trigger-gated governance rule skips are traceable through:
  - `WARN_GOVERNANCE_RULE_SKIPPED`
- trigger remains an eligibility gate only
- trigger cannot revive Off or governance-forbidden blocks

Downstream implication:
- consumers should treat trigger state as eligibility context only, never as semantic authority

### 3.6 RuntimeSpec / Trace boundary
Old behavior:
- some wording and output surfaces could still be read too casually as “runtime/execution” rather than non-executing compiler artifacts

Current aligned behavior:
- sleeve-path `runtime.meta` now declares:
  - `artifactKind: "runtime_spec"`
  - `nonExecuting: true`
  - `boundaryNote: "RuntimeSpec is a non-executing compiler artifact and does not grant permission or perform execution."`
- IR-path RuntimeSpec state carries equivalent boundary metadata
- IR trace wording explicitly says audit/provenance and not permission/execution

Downstream implication:
- RuntimeSpec must be treated as specification only
- Trace must be treated as audit/provenance only

### 3.7 Determinism
Old behavior:
- semantic determinism was partly present but normalized ad hoc in tests

Current aligned behavior:
- semantic determinism helper policy is explicit
- reusable test helper exists for volatile-field normalization
- repeated sleeve and IR compiles are checked for semantic equality once explicitly volatile fields are normalized

Downstream implication:
- deterministic comparison should normalize only documented volatile fields, not hide meaningful semantic drift

## 4. Snapshot Changes and Why They Happened

Snapshot updates across the alignment lanes were intentional and deterministic.

Main reasons snapshots changed:
- clearer priority conflict-site wording
- explicit merge provenance wording
- explicit governance exclusion notes
- explicit RuntimeSpec non-executing metadata in sleeve output

These changes were not random churn; they tracked meaningfully improved compiler audit/output boundaries.

## 5. What Downstream Systems Should Rely On Now

### 5.1 Stable enough to consume now
- v0 seven-type MOLT registry law
- Merge not being a MOLT type
- Off not being a MOLT type
- Off exclusion traceability
- governance exclusion traceability
- trigger as eligibility-gate-only behavior in the current model
- merge trace provenance wording
- priority conflict-site wording
- RuntimeSpec non-executing metadata
- Trace audit/provenance boundary
- deterministic semantic comparison helper policy

### 5.2 Still transitional
- sleeve output top-level field name remains `runtime`
- canonical IR output uses `runtimeSpec`
- some provenance remains primarily message-text based rather than strongly structured fields
- volatile fields are still present in raw output and normalized in semantic comparison rather than eliminated outright

## 6. Downstream Handoff Targets

### 6.1 UMG MCP Server contract alignment
Should consume:
- compiler output contract
- RuntimeSpec non-execution metadata
- Trace audit/provenance records
- deterministic comparison policy
- rejected MOLT type behavior
- Off/Merge/Priority/Governance/Trigger boundaries

### 6.2 UMG Envoy runtime consumption alignment
Should consume:
- compiler output contract
- RuntimeSpec non-execution metadata
- Trace audit/provenance records
- deterministic comparison policy
- rejected MOLT type behavior
- Off/Merge/Priority/Governance/Trigger boundaries

### 6.3 Hermes portability retesting
Should consume/check:
- compiler output contract
- RuntimeSpec non-execution metadata
- Trace audit/provenance records
- deterministic comparison policy
- rejected MOLT type behavior
- Off/Merge/Priority/Governance/Trigger boundaries

### 6.4 Block Library package/card/retrieval contracts
Should consume/check:
- compiler output contract
- deterministic comparison policy
- rejected MOLT type behavior
- Off/Merge/Priority/Governance/Trigger boundaries where library metadata influences compilation

## 7. Open Questions Preserved

Do not silently resolve these based on current implementation:
- whether sleeve output top-level `runtime` should be renamed/aliased to `runtimeSpec`
- whether volatile trace ids/timestamps should become null/stable
- whether `compiledAt` should remain raw output
- whether Off should move from `role=off` to a dedicated state field
- whether governance/off exclusions should share structured exclusion records
- whether merge provenance should move from message text to structured trace fields
- whether cross-MOLT merge should remain advanced-gated or be removed
- whether IR path should enforce equivalent MOLT/Governance/Trigger/Merge laws more deeply
- whether a shared RuntimeSpec schema should cover sleeve and IR outputs together

## 8. Practical Consumer Guidance

If you are a downstream consumer today:
- trust compiler output as deterministic semantic artifacts, not execution
- normalize only documented volatile fields when comparing outputs
- do not treat Trace as permission or approval
- do not treat RuntimeSpec as execution or runtime mutation
- expect current sleeve-path compatibility surfaces to remain transitional
- prefer explicit event codes and boundary metadata over legacy assumptions
