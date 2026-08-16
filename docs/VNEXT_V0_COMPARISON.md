# VNEXT vs V0 Comparison

Date captured: August 16, 2026
Branch: `experiment/compiler-vnext-recursive-geometry`
Scope: local side-by-side experiment only

## 1. Object-model differences

- `compiler-v0` is centered on `Block[]` plus `Stack[]`, with optional triggers and governance bindings attached to a sleeve.
- `compiler-vnext` introduces a richer authored hierarchy: `MoltBlock -> NeoBlock -> NeoStack -> Sleeve`.
- `compiler-vnext` sleeves carry a schema-versioned contract, a `controllerNeoStackId`, explicit `neoBlocks`, explicit `neoStacks`, optional scoped attachments, overlays, and governance rules.
- `compiler-v0` exposes neo structures only as runtime artifacts after compilation; `compiler-vnext` authors them directly.

## 2. State differences

- `compiler-v0` still carries legacy `role=off` handling and governance-driven exclusion inside the compile path.
- `compiler-vnext` authors explicit `ready` and `disabled` states and emits runtime states including `ready`, `active`, `off`, and `disabled`.
- `compiler-vnext` also emits an explicit `resetPlan` that targets post-run return to `ready`.

## 3. Trigger differences

- `compiler-v0` accepts `TriggerState.activeTriggerIds: string[]`.
- `compiler-vnext` moves trigger interpretation outside the compiler and expects explicit boolean trigger state inside `CompileSelection.triggerState`.
- `compiler-vnext` also treats trigger lanes as first-class geometry inside a NeoBlock, rather than as a lighter activation input attached to the older sleeve model.

## 4. Directive differences

- `compiler-v0` resolves directives from flat block collections inside authority-resolved stacks.
- `compiler-vnext` requires exactly one local Prime Directive per NeoBlock and supports optional Secondary Directives as lane selectors.
- `compiler-vnext` directive behavior is therefore structural and lane-aware, not just a selected subset inside a flat stack.

## 5. Bundle differences

- `compiler-v0` supports bundle segments in stacks and already tests alternates versus ranked selection behavior.
- `compiler-vnext` narrows the experiment to same-MOLT-only bundles and makes those bundles part of explicit NeoBlock geometry.
- This is a semantic tightening, not just a refactor of the old bundle code.

## 6. Merge differences

- `compiler-v0` merge handling is segment-based and still contains compatibility logic for cross-MOLT cases and override hooks.
- `compiler-vnext` treats Merge as pre-authored semantic synthesis with authority-conservation checks and explicit provenance.
- `compiler-vnext` is intentionally stricter and does not behave like a generic merge-anything action.

## 7. Geometry differences

- `compiler-v0` orders blocks within stacks and then derives runtime prompt sections, neo blocks, and indexes from that resolved order.
- `compiler-vnext` authors fixed MOLT lanes, row geometry, vertical tiers, and horizontal peers directly in the source model.
- The biggest conceptual shift in this branch is that geometry is no longer mostly a derived ordering story; it is authored canon.

## 8. Governance differences

- `compiler-v0` uses governance bindings and target filters over blocks, stacks, tags, roles, and trigger conditions.
- `compiler-vnext` experiment posture shifts toward Governance OFF outside the ordinary MOLT lanes, plus explicit disabled modules supplied by the caller.
- This reduces hidden revival paths and makes governance effects easier to reason about, but it may break old assumptions in current consumers.

## 9. RuntimeSpec differences

- `compiler-v0` `RuntimeSpec` includes stacks, `blocksByMoltType`, bundles, derived neo structures, promptSpec, indexes, and explicit non-executing metadata.
- `compiler-vnext` `RuntimeSpec` is schema-versioned and centers on `resolvedNeoBlocks`, `promptParts`, diagnostics, `runtimeHash`, and a deterministic `resetPlan`.
- `compiler-vnext` runtime output is more directly shaped for lane/geometry inspection and deterministic equivalence testing.

## 10. Trace differences

- `compiler-v0` trace events are identified objects with severity, code, message, related ids, and optional priority-resolution context.
- `compiler-vnext` trace events are ordered by `seq` and use event types such as activation, scoped-MOLT application, and runtime compilation milestones.
- `compiler-vnext` trace carries final NeoStack and NeoBlock runtime states directly, which `compiler-v0` does not.

## 11. Compatibility risks

- Source schema compatibility is the largest risk. Current `compiler-v0` samples and consumers are built around `blocks[]` and `stacks[]`, not authored `neoBlocks[]` and `neoStacks[]`.
- CLI compatibility is not preserved. `compiler-v0` exposes `umg compile` and `umg compile-ir`, while `compiler-vnext` currently exposes `umg-vnext` plus explicit `validate` and `compile` flows.
- Consumer compatibility is not preserved. Existing code expecting `promptSpec`, `indexes`, `primaryByStackId`, or old trace event shapes will not work unchanged.
- Dependency/runtime compatibility needs review. `compiler-vnext` currently declares TypeScript `^5.8.3` and `@types/node` `^22.15.0`, while `compiler-v0` is on TypeScript `^5.6.3` with `ts-node`.
- Deterministic behavior is proven for the imported fixture pack, but not yet for any live repository adapters or downstream bridges.

## 12. Migration opportunities

- The side-by-side package layout lets the repo evaluate the new geometry model without destabilizing the current compiler.
- A future adapter layer could translate selected `compiler-vnext` output into shapes expected by current tooling for controlled experiments.
- Root-level scripts could later grow opt-in `vnext` commands without changing the default `compiler-v0` route.
- The schema-versioned vNext package creates a cleaner lane for external fixtures, determinism proofs, and canon ratification work.

## 13. Explicit non-migration decisions

- This branch does not replace `compiler-v0`.
- This branch does not repoint root `npm` scripts to `compiler-vnext`.
- This branch does not change the root package name, root bin, or current default compiler export.
- This branch does not update Studio, MCP, Envoy, Hermes, bridge consumers, or any live integration surface.
- This branch treats `compiler-vnext` as an isolated experimental package that must be called explicitly.
