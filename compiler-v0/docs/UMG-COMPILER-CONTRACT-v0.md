# UMG Compiler Contract v0

Status: working_contract_spec
Scope: compiler-v0 transitional contract lane
Authority: planning and alignment aid, not silent canon resolution

## 1. Purpose

UMG Compiler is a deterministic resolver and RuntimeSpec / Trace generator.

The compiler emits artifacts only.

The compiler does **not**:
- execute tools
- mutate runtime state
- publish packages
- grant permission
- act as an agent
- treat RuntimeSpec as execution
- treat Trace as permission

Compiler outputs are downstream-facing specification and audit artifacts only.

## 2. Accepted Input Shapes

### 2.1 Sleeve compile input (retained transitional path)

Current source-level compile input is a Sleeve-shaped JSON surface consumed by `compileSleeve`.

Observed fields include:
- sleeve id / name / version
- blocks
- stacks
- optional triggers
- optional governance bindings

Current block-level input includes:
- `id`
- `title?`
- `moltType`
- `role?`
- `priorityGroup?`
- `priorityOrder?`
- `content`
- `tags?`

Current stack-level input includes:
- `id`
- `name?`
- `domainKey?`
- `blockIds`
- `segments?`

### 2.2 Canonical IR input

Current graph-level compile input is Canonical IR consumed by `compileIr`.

Observed fields include:
- `ir_version`
- `ir_id`
- `source`
- `priority_profile?`
- `nodes`
- `edges`
- `routes?`
- `gates?`
- `bundles?`
- `overlays?`
- `merge_recipes?`
- `capabilities?`
- `states?`
- `source_map?`
- `diagnostics`

### 2.3 MOLT block requirements

Valid v0 MOLT types are only:
- Trigger
- Directive
- Instruction
- Subject
- Primary
- Philosophy
- Blueprint

Unknown MOLT types must produce deterministic errors.

### 2.4 Governance declarations

Current sleeve-path governance declarations include:
- scope
- rule list
- conditions
- target filters
- effects

Current observed effects include:
- forbid
- require
- prefer
- override_priority
- limit

This contract does not silently bless every existing effect as final canon; it records current accepted input behavior.

### 2.5 Trigger state

Current trigger state is an external active/inactive surface:
- `activeTriggerIds`

Trigger state is input eligibility context, not authority or meaning.

### 2.6 Merge action / recipe inputs

Current sleeve-path merge input is segment-based:
- merge segment id
- stack id
- block ids
- result block id
- optional result MOLT type
- optional `override.allowAdvanced`

Current IR path also reserves `merge_recipes`.

### 2.7 Off / exclusion state

Current implementation retains legacy/provisional Off behavior as block role-based exclusion.

Contract intent:
- Off is state/exclusion, not semantic type
- current role-based handling is provisional, not idealized final canon

### 2.8 Optional package / library references

Current observed optional references include:
- canonical IR `source.library_sources`
- canonical IR source/source-map references

No stronger package/library contract is silently declared here.

## 3. Canonical Output Shape

Compiler output should be read as artifact emission only.

### 3.1 Core artifact surfaces
- RuntimeSpec
- Trace
- errors
- warnings
- diagnostics
- compile status / `hasErrors`

### 3.2 Transitional current outputs

Current sleeve path returns:
- `runtime`
- `trace`
- `hasErrors`

Current canonical IR path returns:
- `runtimeSpec`
- `trace`
- `diagnostics`

### 3.3 Stable versus provisional reading

More stable in direction:
- RuntimeSpec / Trace naming on canonical IR path
- schema validation surfaces
- deterministic ordering intent
- explicit RuntimeSpec non-execution metadata
- explicit Trace audit/provenance wording

More provisional:
- richer sleeve-path `runtime` object shape
- prompt/index/display-adjacent surfaces embedded in sleeve compile output
- exact error/warning/diagnostic unification across both paths
- sleeve-path top-level field name remains `runtime`

## 4. Transitional Path Policy

The repo currently contains two overlapping compiler paths.

### 4.1 `compileIr`
`compileIr` is the clearest current candidate for canonical future output alignment because it already emits:
- `runtimeSpec`
- `trace`
- `diagnostics`

### 4.2 `compileSleeve`
`compileSleeve` is retained as a current source-level compiler / compatibility path.

It should be treated as:
- active transitional path
- not yet the clean final contract surface
- a likely upstream/source compiler that may eventually emit the same canonical RuntimeSpec / Trace contract more directly

### 4.3 Contract direction

Contract direction for v0 planning is:
- do not remove working paths casually
- do not silently treat sleeve-path output shape as final forever contract
- move toward one canonical RuntimeSpec / Trace contract
- preserve explicit migration language while the repo remains transitional

## 5. MOLT Registry Contract

Valid v0 MOLT types are only:
- Trigger
- Directive
- Instruction
- Subject
- Primary
- Philosophy
- Blueprint

Rules:
- Merge is not a MOLT type.
- Off is not a MOLT type.
- Unknown MOLT types must produce deterministic errors.
- Registry law should be reflected consistently across type definitions, runtime validation, schemas, tests, and docs.

## 6. Off Contract

Off is state/exclusion, not semantic type.

Contract rules:
- Off excludes participation.
- Off remains traceable.
- Off does not change block meaning.
- Off does not become authority.
- Off must not be modeled as a MOLT type.

Current implementation note:
- existing role-based Off handling is legacy/provisional if retained
- future alignment may move Off into a clearer state/exclusion model
- current trace event:
  - `INFO_BLOCK_EXCLUDED_OFF_STATE`

## 7. Merge Contract

Merge is a constrained synthesis action.

Contract rules:
- Merge is not a MOLT type.
- Same-type merge may be supported.
- Cross-type merge remains future/open unless explicitly feature-gated.
- Merge output must declare one valid output MOLT type if promoted to a block.
- Merge provenance must be traceable.
- Suppressed or replaced inputs must remain audit-visible in Trace.

Current aligned behavior:
- same-type merge is supported
- cross-type merge is guarded by default
- advanced cross-type use currently requires:
  - `override.allowAdvanced=true`
- current trace event:
  - `INFO_MERGE_APPLIED`

## 8. Priority Contract

Priority applies only at explicit conflict sites.

A conflict site requires:
- eligible elements
- not Off
- allowed by Governance
- same scope
- same MOLT type
- same output slot
- mutually incompatible in that synthesis pass

Priority rules:
- Priority does not create authority.
- Priority does not change meaning.
- Priority does not create strategy.
- Priority does not simulate ethics.
- Priority does not replace governance.
- Priority is tie-breaking only.

Current aligned behavior:
- single-candidate cases are not treated as conflict resolution
- real conflict-site traces use:
  - `INFO_PRIORITY_RESOLVED`
- single-candidate traces use:
  - `INFO_PRIORITY_NOT_NEEDED`

## 9. Governance Contract

Governance runs before downstream resolution where applicable.

Governance may:
- permit participation
- constrain participation
- suppress participation
- disable participation
- reject participation

Governance does **not**:
- add meaning
- add semantic authority
- silently disappear from audit surfaces

Governance effects must appear in Trace.

This contract records current implementation behavior while preserving canon pressure toward inspectable, boring, binding governance.

Current aligned trace behavior includes:
- governance exclusion trace event:
  - `INFO_BLOCK_EXCLUDED_GOVERNANCE`
- skipped trigger-gated rule trace event:
  - `WARN_GOVERNANCE_RULE_SKIPPED`

## 10. Trigger Contract

Trigger is an eligibility gate.

Trigger rules:
- Trigger adds no meaning.
- Trigger adds no authority.
- Trigger cannot override Governance.
- Trigger cannot override Off.
- Active/inactive trigger states must be traceable.

Current aligned behavior:
- trigger state is eligibility-only context
- trigger cannot revive governance-forbidden blocks
- trigger cannot revive Off blocks
- trigger context is traceable through rule-skip and completion events

Open note:
- unresolved trigger evaluation semantics must remain explicitly open
- this contract does not silently resolve scoring/boolean/route semantics

## 11. RuntimeSpec Contract

RuntimeSpec is non-executing.

RuntimeSpec:
- describes resolved downstream-facing specification only
- does not grant permission
- does not imply actual tool execution
- does not itself execute
- does not mutate runtime state

Current aligned behavior:
- sleeve-path `runtime.meta` includes explicit non-executing RuntimeSpec boundary metadata
- IR-path `runtimeSpec.state` includes equivalent non-executing RuntimeSpec boundary metadata

Any wording suggesting execution should be treated as legacy drift and corrected over time.

## 12. Trace Contract

Trace is audit/provenance.

Trace rules:
- Trace is not permission.
- Trace is not execution.
- Trace must not expose hidden chain-of-thought.
- Trace should record:
  - selected outcomes
  - suppressed outcomes
  - Off/exclusion outcomes
  - governance effects
  - merge effects
  - priority decisions
  - trigger-relevant decisions
  - errors
  - warnings

Current aligned behavior includes explicit records or deterministic messages for:
- Off exclusion
- governance exclusion
- merge application
- priority conflict-site resolution
- trigger-gated governance skip
- compile completion trigger context

## 13. Determinism Contract

Identical semantic input should produce identical semantic output.

Determinism requirements:
- volatile timestamps must be absent, null, stable, or excluded from deterministic comparison
- volatile ids must be absent, stable, or excluded from deterministic comparison
- stable ordering rules must be explicit
- deterministic tie-breaks must be named

Current v0 semantic comparison policy:
- sleeve-path `runtime.meta.compiledAt` is volatile and excluded from semantic determinism checks
- sleeve-path trace event `id` and `timestamp` are volatile and excluded from semantic determinism checks
- IR-path `trace.events[*].event_id` is normalized during semantic determinism checks
- normalization helpers must strip or replace only explicitly volatile fields, not meaningful semantic content

Observed stable-order intent currently includes:
- fixed MOLT ordering
- stable priority-group ordering
- explicit numeric priority ordering
- lexical id fallback ordering
- sorted stack/governance iteration in key places

## 14. Open Questions

Preserve without silent resolution:
- exact RuntimeSpec final field set
- exact Trace final field set
- exact CIR minimum field set
- exact Trigger gate record fields
- exact Directive scope record fields
- exact Merge action record fields
- exact Governance inspectability fields
- minimum valid NeoBlock schema
- robust NeoBlock schema
- NeoStack schema
- bounded exception model
- cross-type Merge policy
- whether sleeve output top-level `runtime` should be renamed/aliased to `runtimeSpec`
- whether volatile trace ids/timestamps should become null/stable
- whether `compiledAt` should remain raw output
- whether Off should move from `role=off` to a dedicated state field
- whether governance/off exclusions should share structured exclusion records
- whether merge provenance should move from message text to structured trace fields
- whether IR path should enforce equivalent MOLT/Governance/Trigger/Merge laws more deeply
- whether a shared RuntimeSpec schema should cover sleeve and IR outputs together

## 15. Transitional Implementation Notes

This contract lane is not a broad rewrite lane.

It exists to:
- define the compiler boundary clearly
- keep RuntimeSpec and Trace non-executing
- name the relationship between sleeve-path and canonical-IR-path compilation
- reduce silent drift during later implementation lanes

## 16. Downstream Handoff Targets

Primary downstream alignment targets:
- UMG MCP Server contract alignment
- UMG Envoy runtime consumption alignment
- Hermes portability retesting
- Block Library package/card/retrieval contracts

Each downstream target should consume or respect:
- compiler output contract
- RuntimeSpec non-execution metadata
- Trace audit/provenance records
- deterministic comparison policy
- rejected MOLT type behavior
- Off/Merge/Priority/Governance/Trigger boundaries

## 17. Migration / Follow-Through Notes

Migration/handoff notes now live in:
- `compiler-v0/docs/UMG-COMPILER-MIGRATION-NOTES-v0.md`

That document records:
- old behavior vs aligned behavior
- downstream implications
- snapshot update reasons
- remaining open questions
