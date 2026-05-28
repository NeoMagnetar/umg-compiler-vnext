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

More provisional:
- richer sleeve-path `runtime` object shape
- prompt/index/display-adjacent surfaces embedded in sleeve compile output
- exact error/warning/diagnostic unification across both paths

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

## 7. Merge Contract

Merge is a constrained synthesis action.

Contract rules:
- Merge is not a MOLT type.
- Same-type merge may be supported.
- Cross-type merge remains future/open unless explicitly feature-gated.
- Merge output must declare one valid output MOLT type if promoted to a block.
- Merge provenance must be traceable.
- Suppressed or replaced inputs must remain audit-visible in Trace.

Transitional note:
- current implementation contains optional cross-type merge support surfaces
- this contract does not treat that as settled canon approval

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

## 10. Trigger Contract

Trigger is an eligibility gate.

Trigger rules:
- Trigger adds no meaning.
- Trigger adds no authority.
- Trigger cannot override Governance.
- Trigger cannot override Off.
- Active/inactive trigger states must be traceable.

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

## 15. Transitional Implementation Notes

This contract lane is not a broad rewrite lane.

It exists to:
- define the compiler boundary clearly
- keep RuntimeSpec and Trace non-executing
- name the relationship between sleeve-path and canonical-IR-path compilation
- reduce silent drift during later implementation lanes

## 16. Recommended Follow-Through

After this contract/spec lane, the next implementation lane should be:
- `UMG_COMPILER_MOLT_REGISTRY_ALIGNMENT`

Recommended narrow scope for that lane:
- schema-level rejection of Merge as `moltType`
- schema-level rejection of Off as `moltType`
- deterministic unknown-type errors
- tests/fixtures proving valid seven MOLT types pass
- documentation reinforcing registry law
