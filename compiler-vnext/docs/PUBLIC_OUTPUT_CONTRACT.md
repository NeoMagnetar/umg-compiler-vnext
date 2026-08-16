# compiler-vnext Public Output Contract

This document freezes the v0.1 public output boundary for `compiler-vnext`.
`RuntimeSpec` is the executor-facing source of truth. `Trace` is forensic
explanation, not executable authority.

## CompileResult Responsibility

`CompileResult` is the canonical public envelope. It always contains:

- `schemaVersion`
- `compilerVersion`
- `status`
- `runtime`
- `trace`
- `hasErrors`
- `diagnostics`

Success contract:

- `status = "success"`
- `hasErrors = false`
- `runtime != null`
- `trace != null`
- no error diagnostics

Failure contract:

- `status = "failure"`
- `hasErrors = true`
- `runtime = null`
- at least one error diagnostic

Failure variants:

- structural failure: `trace = null`
- semantic or resolution failure: `trace != null`

No partial executable `RuntimeSpec` may escape on failure.

## Diagnostic Ownership

For B4A, diagnostic field design is frozen:

- `CompileResult.diagnostics` is the canonical aggregate diagnostic list
- `Trace.diagnostics` must equal `CompileResult.diagnostics` whenever `Trace` exists
- `RuntimeSpec.diagnostics` must equal `CompileResult.diagnostics` on success
- `RuntimeSpec.diagnostics` may contain warnings
- `RuntimeSpec.diagnostics` must never contain an error diagnostic

## RuntimeSpec Responsibility

The executor-facing required field set is frozen exactly as:

- `schemaVersion`
- `compilerVersion`
- `sleeveId`
- `sleeveName`
- `controllerNeoStackId`
- `compiledAt`
- `activeNeoStackIds`
- `resolvedNeoBlocks`
- `promptParts`
- `diagnostics`
- `runtimeHash`
- `resetPlan`

Field classification:

- identity and provenance: `schemaVersion`, `compilerVersion`, `sleeveId`, `sleeveName`, `controllerNeoStackId`, `compiledAt`
- executable: `activeNeoStackIds`, `resolvedNeoBlocks`, `promptParts`, `resetPlan`
- observability: `diagnostics`
- integrity: `runtimeHash`

No additions or removals are in scope for B4A.

## ResolvedNeoBlock

`resolvedNeoBlocks` contains active NeoBlocks only, in deterministic authored
structural order.

Each resolved NeoBlock freezes:

- `state = "active"`
- `postRunState = "ready"`
- `primeDirectiveId` is required
- `secondaryDirectiveId` appears only when selected
- `activeTriggerIds` is non-empty
- `lanes` remain in canonical MOLT authority order

## ResolvedLane

Each resolved lane has two distinct surfaces:

- `scoped`: effective scoped and Overlay contributions
- `rows`: effective local Base, selected Bundle, generated Directive, or evaluated Trigger geometry

`geometrySource` is frozen as:

- Trigger lane: `evaluated-trigger-lane`
- Directive lane: `generated-directive-lane`
- selected Bundle lane: `bundle` plus `bundleId`
- ordinary lane: `base`

Scoped cognition never changes `geometrySource`.

## ResolvedMoltBlock Provenance

Local:

- `sourceMode = "local"`
- `sourceId = block id`
- no `sourceScope`
- no `overlayId`
- no `mergeId`

Scoped:

- `sourceMode = "scoped"`
- `sourceId = attachment id`
- `sourceScope` required
- no `overlayId`
- no `mergeId`

Overlay:

- `sourceMode = "overlay"`
- `sourceId = attachment id`
- `sourceScope` required
- `overlayId` required
- no `mergeId`

Merge:

- `sourceMode = "merge"`
- `sourceId = merge id`
- `mergeId = sourceId`
- no `sourceScope`
- no `overlayId`

Repeated MOLT block ids are legal when provenance differs.

## PromptPart Flattening And Order

`resolvedNeoBlocks` are structured executable cognition. `promptParts` are the
deterministic flat generation sequence of exactly that cognition.

Frozen rules:

- no contribution may be invented
- no effective generation contribution may be omitted
- explicitly duplicated scoped or Overlay contributions are not deduplicated
- ordering is active NeoStack traversal, then NeoBlock authored order, then MOLT authority order, then scoped contributions, then local geometry
- local geometry order is ascending row, then left-to-right authored peer order

Position metadata is frozen as location metadata only:

- `laneOrder` = canonical MOLT lane position
- `scopeLayer` = flattening and location metadata only
- `row` and `column` = resolved positional metadata

These fields do not create a new priority or weighting system.

## ResetPlan

`ResetPlan` is declarative. The compiler does not perform host runtime mutation.

Frozen contract:

- `targetState = "ready"`
- `neoStackIds = activeNeoStackIds`
- `neoBlockIds = resolvedNeoBlocks ids in resolved order`

## Trace Boundary

`Trace` records forensic explanation, validation events, state outcomes, and
post-run reset declaration. It does not replace `RuntimeSpec` as executable
authority.

## Internal Output Validation

The schema registry already defines:

- `runtime-spec.schema.json`
- `trace.schema.json`
- `compile-result.schema.json`

B4A extends validation to internally constructed public output objects:

- `RuntimeSpec`
- `Trace`
- `CompileResult`

If an internally constructed public output violates the frozen contract, the
compiler fails closed with:

- `status = "failure"`
- `hasErrors = true`
- `runtime = null`
- diagnostic code `INTERNAL_OUTPUT_CONTRACT_VIOLATION`

`trace` may be `null` in that safe failure.

## Deferred Work

Explicitly deferred beyond B4A:

- B4B: Trace and Diagnostic registry redesign
- B5: runtimeHash policy redesign
