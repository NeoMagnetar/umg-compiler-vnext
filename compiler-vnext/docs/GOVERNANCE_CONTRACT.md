# compiler-vnext Governance Contract

This document freezes the Phase B3B2 Governance interaction contract at the
public `compiler-vnext` boundary.

## Core Model

- Governance remains extra-MOLT.
- Governance is OFF-only.
- Governance can exist only through `sleeve.governance`.
- Governance can become active only through explicit
  `selection.activeGovernanceRuleIds` membership.
- Governance cannot be synthesized by Merge, Bundle, Overlay, scoped MOLT,
  Prime Directives, Secondary Directives, or any other MOLT composition path.

## Rule Shape

Every Governance rule must target at least one NeoStack or NeoBlock through:

- `offNeoStackIds`
- `offNeoBlockIds`

Empty Governance rules are invalid and must fail with a stable semantic
diagnostic.

## Activation

`activeGovernanceRuleIds` is membership only.

- unknown active Governance IDs fail closed
- duplicate active Governance IDs fail closed
- inactive declared Governance rules are inert
- caller activation-array order creates no Priority

Governance rule declaration order is deterministic provenance order only. It is
not Priority, authority, weighting, or a winner-selection system.

## Provenance

Multiple applicable Governance rules accumulate.

- no hidden winner
- no Priority
- no weights
- all applicable Governance rule IDs remain inspectable through
  `governanceRuleIds`

If the singular compatibility alias is retained:

- `governanceRuleId` is only the first authored applicable Governance rule
- it is not a winner
- it does not override `governanceRuleIds`

## Effective State

Effective compile state uses this exact precedence:

1. `off`
2. `disabled`
3. `active`
4. `ready`

Governance `off` always dominates authored or caller `disabled`.

## Propagation

NeoStack Governance OFF propagates downward:

- parent NeoStack `off` -> descendant NeoStacks `off`
- parent NeoStack `off` -> descendant NeoBlocks `off`

Direct NeoBlock Governance OFF is local:

- it does not OFF the containing NeoStack
- it does not OFF peer NeoBlocks
- it does not OFF sibling stacks
- it does not OFF child stacks

The Controller NeoStack may be Governance OFF.

## Composition Boundaries

Governance OFF cannot be bypassed by:

- Bundle
- Overlay
- Merge
- scoped MOLT

These systems cannot restore OFF cognition.

## Compile Locality

Governance is temporary per compile.

- active Governance may make a target `off` for one compile
- the next compile may return that same target to underlying authored or caller
  state if Governance is inactive

Governance does not mutate authored sleeve state.
