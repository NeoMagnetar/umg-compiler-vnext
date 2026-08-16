# compiler-vnext State And Selection Contract

This document freezes the Phase B1 integration-candidate state and selection
behavior at the public `compiler-vnext` boundary.

## Effective State Precedence

Effective compile state uses this exact precedence:

1. `off`
2. `disabled`
3. `active`
4. `ready`

Definitions:

- `off` = Governance prohibition
- `disabled` = human or configuration exclusion when Governance has not made the
  target `off`
- `active` = explicitly selected and successfully resolved
- `ready` = valid and available but not participating in the compile

`error` is a diagnostic/result condition, not a runtime state.

## Ancestor Propagation

Effective state propagates down the NeoStack tree:

- parent `off` -> descendant NeoStacks `off` -> descendant NeoBlocks `off`
- parent `disabled` -> descendant NeoStacks `disabled` -> descendant NeoBlocks
  `disabled`

Governance always dominates human/configuration disable.

This is effective compile state only. Authored child state is not mutated.

## Explicit Selection Fails Closed

Impossible explicit selection is rejected with structured diagnostics and:

- `status = "failure"`
- `hasErrors = true`
- `runtime = null`

The compiler does not silently drop impossible selected targets.

## NeoStack Selection Closure

Selected NeoStack routes must be ancestor-closed.

Example:

- selecting `NS.WARRANTY` without selecting `NS.ROOT` and `NS.SERVICE` fails

The compiler validates the supplied route. It does not infer missing ancestors.

## NeoBlock Container Law

If a NeoBlock is explicitly selected:

- its containing NeoStack must exist
- its containing NeoStack must be selected
- its containing NeoStack must be executable

The compiler does not auto-select the missing container NeoStack.

## Multiple Secondary Directive Matches

`compiler-vnext` does not support implicit coexistence of multiple
simultaneously matching Secondary Directives in this schema/compiler version.

Current rule:

- 0 matches -> Prime only
- 1 match -> Prime + selected Secondary
- 2+ matches -> `MULTIPLE_SECONDARY_DIRECTIVE_MATCH`

Multiple matches are invalid unless a future version defines an explicit
coexistence construct.

## Phase A Failure Invariant

Phase A failure invariants remain authoritative:

- structured diagnostics on expected invalid input
- no partial executable `RuntimeSpec` on failure
- `runtime = null` on failed compile
