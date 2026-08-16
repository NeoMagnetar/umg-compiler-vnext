# compiler-vnext Trace Contract

This document freezes the public `Trace` contract for `compiler-vnext` v0.1.
`Trace` is an observability artifact. It explains what the compiler accepted,
rejected, resolved, and declared. It does not replace `RuntimeSpec` as
executable authority.

Exact Trace version identity and registry compatibility policy are frozen in
[VERSION_COMPATIBILITY_CONTRACT.md](VERSION_COMPATIBILITY_CONTRACT.md).

## Trace Responsibility

`Trace` exists to provide:

- intake provenance for the canonical compile inputs
- semantic diagnostic visibility for authored-surface validation
- resolution visibility for state, selection, and cognition resolution
- output visibility for successful `RuntimeSpec` construction
- post-run visibility for declarative reset intent

`Trace` is never a host execution plan. `RuntimeSpec` remains the executor-facing
artifact.

## Required Fields

The required `Trace` field set is frozen exactly as:

- `schemaVersion`
- `compilerVersion`
- `sleeveId`
- `compiledAt`
- `terminalStage`
- `events`
- `diagnostics`
- `finalNeoStackStates`
- `finalNeoBlockStates`

No extra top-level `Trace` fields are part of the public contract in B4B2.

## Trace Stages

`TraceStage` is frozen as:

- `intake`
- `semantic`
- `resolution`
- `output`
- `post_run`

Meaning:

- `intake`: canonical inputs and caller route metadata
- `semantic`: canonical authored-surface diagnostics
- `resolution`: state, selection, configuration, and cognition resolution
- `output`: successful `RuntimeSpec` construction
- `post_run`: declarative reset handling

Structural failure is not a `TraceStage`. Structural failure returns `trace = null`.

## terminalStage

`terminalStage` uses `TraceStage`, but valid public terminal values are frozen as:

- semantic failure: `semantic`
- resolution failure: `resolution`
- successful compile: `post_run`

Invalid public terminal forms:

- `intake`
- `output`
- successful traces terminating at `resolution`
- successful traces terminating at `output`

## TraceEvent Shape

Each `TraceEvent` is frozen as:

```ts
TraceEvent {
  seq: number
  type: TraceEventType
  stage: TraceStage
  subject: DiagnosticSubject
  data: Record<string, unknown>
}
```

The experimental `subjectId` field is removed from the public contract.

## Structured Subject

`TraceEvent.subject` uses the same frozen `DiagnosticSubject` structure:

```ts
DiagnosticSubject {
  kind: DiagnosticSubjectKind
  id?: string
}
```

Subject presence rules are controlled by the Trace Event Registry:

- some event kinds require `subject.id`
- some allow optional `subject.id`
- some forbid `subject.id`

## Event Registry

The authoritative source registry lives in:

- `src/trace-event-registry.ts`

The machine-readable mirror lives in:

- `schemas/TRACE_EVENT_REGISTRY.json`

Each registry entry freezes:

- `stage`
- `allowedSubjectKinds`
- `subjectIdPolicy`
- `summary`
- `requiredDataKeys`

No public Trace event type may be emitted unless it is registered there.

## Payload Registry

The registry defines minimum payload keys for every event type. Additional
documented keys may appear, but required keys are frozen and enforced by the
public output validator.

Notable payload rules:

- diagnostic events require `diagnosticIndex` and `code`
- source intake events freeze route/count summary keys
- resolution events freeze minimum state, selection, geometry, merge, and scoped payload keys
- `RUNTIME_COMPILED` freezes runtime summary counts plus `runtimeHash`
- `POST_RUN_RESET_DECLARED` freezes `neoStackIds`, `neoBlockIds`, and `targetState`

## Diagnostic-Event Linkage

Diagnostic event linkage is frozen exactly:

- `VALIDATION_ERROR`
- `VALIDATION_WARNING`
- `RESOLUTION_ERROR`
- `RESOLUTION_WARNING`

For every such event:

- `event.data.diagnosticIndex` points to `Trace.diagnostics[diagnosticIndex]`
- `event.data.code == Trace.diagnostics[diagnosticIndex].code`
- `event.stage == Trace.diagnostics[diagnosticIndex].stage`
- `event.subject == Trace.diagnostics[diagnosticIndex].subject`
- event type must match diagnostic stage and level

No message parsing is used for diagnostic linkage.

## Semantic vs Resolution Diagnostic Events

Semantic diagnostics must emit exactly one ordered `VALIDATION_*` event each.

Resolution diagnostics must emit exactly one ordered `RESOLUTION_*` event each.

This applies to:

- resolution failure
- successful compile results that still contain resolution warnings

Resolution diagnostics must never be relabeled as `VALIDATION_ERROR`.

## seq Contract

`Trace.events[*].seq` is frozen as exactly contiguous:

- first event: `seq = 1`
- every next event: `seq = previous index + 1`

Invalid forms:

- duplicates
- gaps
- zero
- negative values
- out-of-order numbering

## Stage Ordering

Event stages must remain monotonic:

- `intake`
- `semantic`
- `resolution`
- `output`
- `post_run`

Public traces may not return to an earlier stage.

## Success Terminal Events

A successful Trace must:

- use `terminalStage = post_run`
- contain exactly one `RUNTIME_COMPILED`
- contain exactly one `POST_RUN_RESET_DECLARED`
- end with `RUNTIME_COMPILED`, then `POST_RUN_RESET_DECLARED`

No event may follow `POST_RUN_RESET_DECLARED`.

## Semantic Failure Behavior

A semantic failure Trace must:

- use `terminalStage = semantic`
- contain no resolution-stage events
- contain no `RUNTIME_COMPILED`
- contain no `POST_RUN_RESET_DECLARED`

Its final state maps represent the canonical authored baseline:

- `ready`
- or authored `disabled`

Semantic failure does not invent `active` or `off` states.

## Resolution Failure Behavior

A resolution failure Trace must:

- use `terminalStage = resolution`
- include the attempted resolution events that actually occurred
- include `RESOLUTION_ERROR` for each resolution error
- include `RESOLUTION_WARNING` for each resolution warning
- contain no `RUNTIME_COMPILED`
- contain no `POST_RUN_RESET_DECLARED`

Its final state maps represent the effective state reached by resolution before
the compile terminated.

## Structural Failure

Structural input failure preserves the B4A rule:

- `trace = null`

The compiler does not synthesize fake Trace history for stages it never reached.

## Final State Map Meaning

`finalNeoStackStates` and `finalNeoBlockStates` are frozen as a snapshot of
compiler state at the furthest completed semantic/resolution point before any
host executes `ResetPlan`.

Meaning by outcome:

- semantic failure: canonical authored baseline only
- resolution failure: effective resolved state reached before failure
- success: active components remain `active`

`POST_RUN_RESET_DECLARED` is declarative future intent. It does not mutate the
Trace state maps.

## ResetPlan Relationship

On success:

- `RUNTIME_COMPILED` summarizes the emitted `RuntimeSpec`
- `POST_RUN_RESET_DECLARED.data` must equal `RuntimeSpec.resetPlan`

`ResetPlan` belongs to `RuntimeSpec`. `Trace` only records that it was declared.

## Integration Consumer Guidance

Consumers should treat the surfaces as:

- `RuntimeSpec`: executable source of truth
- `Trace`: audit and forensic source of truth
- `diagnostics`: canonical compile diagnostic list

Recommended consumer behavior:

- key event handling by `type`, not free-form strings
- trust `subject.kind` plus optional `subject.id`
- use `diagnosticIndex` to join diagnostic events to `Trace.diagnostics`
- treat `terminalStage` as the authoritative completion/failure boundary
- treat final state maps as pre-reset compiler state, not host runtime state
