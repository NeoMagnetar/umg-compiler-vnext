# UMG Compiler Pass 1 — Specific Change Map

This file explains **exactly what changes go where** for the first safe compiler update.

## Purpose of pass 1

Stabilize the compiler’s priority behavior before touching governance or hierarchy.

This pass should be small, deliberate, and low-risk.

---

## What was verified from the live source

### `compiler-v0/src/types.ts`
The current source defines:

- `PriorityGroup = "Override" | "Explicit" | "Default" | "Fallback"`
- `priorityOrder?: number; // tie-breaker within same group (1 = highest, lower wins)`

So the source currently documents **lower numeric value as stronger**.

### `compiler-v0/src/priority.ts`
The current source sorts within a priority group using:

```ts
const orderDiff = orderA - orderB;
if (orderDiff !== 0) return orderDiff;
```

So the current comparator also makes **lower number win**.

### `compiler-v0/src/resolveAuthority.ts`
The current source already calls:

```ts
sortByPriorityGroupAndOrder(byMoltType[molt], blocksById, priorityOverrides)
```

So ranked ordering already supports overrides.

### Selector files
The current source for these files:
- `selectPrimary.ts`
- `selectDirective.ts`
- `selectInstruction.ts`
- `selectSubject.ts`
- `selectBlueprint.ts`

all call `resolveByPriority(...)` in alternates mode, but **without** passing `priorityOverrides`.

That means:

- ranked ordering uses overrides
- alternates winner selection ignores overrides

This is the exact inconsistency being fixed in pass 1.

---

# Change map by file

## File 1 — `compiler-v0/src/priority.ts`

### Change type
Full replacement of the comparison utility.

### Why
This file is the source of truth for priority resolution and currently encodes the wrong numeric direction for your intended semantics.

### What to change
Replace the existing file contents with the replacement version in:

`UMG_Compiler_Pass1_Exact_Code_Patches.md`

### Key behavioral changes
- keep group precedence intact
- change numeric direction so **higher number wins**
- support override-aware winner selection
- enforce deterministic fallback
- make `resolveByPriority(...)` and `sortByPriorityGroupAndOrder(...)` agree

### What not to change here
- do not redesign groups
- do not add governance logic
- do not add hierarchy gates

---

## File 2 — `compiler-v0/src/types.ts`

### Change type
One-line comment update only.

### Why
The current comment documents the old behavior and will become wrong after the comparator is fixed.

### Exact change
Replace:

```ts
priorityOrder?: number; // tie-breaker within same group (1 = highest, lower wins)
```

with:

```ts
priorityOrder?: number; // tie-breaker within same group (higher number = stronger)
```

### Do not change
Do not change the type names or structure in this pass.

---

## File 3 — `compiler-v0/src/selectPrimary.ts`

### Change type
One call-site change.

### Why
Alternates winner selection currently ignores `priorityOverrides`.

### Exact change
Find the `resolveByPriority(...)` call in the bundled-primary alternates path and add `priorityOverrides` as the 4th argument.

### Result
Primary alternates now use effective runtime priority, not only raw block priority.

---

## File 4 — `compiler-v0/src/selectDirective.ts`

### Change type
One call-site change.

### Why
Directive alternates currently ignore `priorityOverrides`.

### Exact change
Find the alternates-mode `resolveByPriority(...)` call and add `priorityOverrides` as the 4th argument.

### Result
Directive alternates now resolve consistently with ranked directive ordering.

---

## File 5 — `compiler-v0/src/selectInstruction.ts`

### Change type
One call-site change.

### Why
Instruction alternates currently ignore `priorityOverrides`.

### Exact change
Find the alternates-mode `resolveByPriority(...)` call and add `priorityOverrides` as the 4th argument.

### Result
Instruction alternates now resolve consistently with ranked instruction ordering.

---

## File 6 — `compiler-v0/src/selectSubject.ts`

### Change type
One call-site change.

### Why
Subject alternates currently ignore `priorityOverrides`.

### Exact change
Find the alternates-mode `resolveByPriority(...)` call and add `priorityOverrides` as the 4th argument.

### Result
Subject alternates now resolve consistently with ranked subject ordering.

---

## File 7 — `compiler-v0/src/selectBlueprint.ts`

### Change type
One call-site change.

### Why
Blueprint alternates currently ignore `priorityOverrides`.

### Exact change
Find the alternates-mode `resolveByPriority(...)` call and add `priorityOverrides` as the 4th argument.

### Result
Blueprint alternates now resolve consistently with ranked blueprint ordering.

---

## File 8 — `compiler-v0/src/compile.ts`

### Change type
No code change required in pass 1.

### Why
The current source already passes `governanceResult.priorityOverrides` into:
- `resolveAuthority(...)`
- `selectPrimary(...)`
- `selectDirective(...)`
- `selectInstruction(...)`
- `selectSubject(...)`
- `selectBlueprint(...)`

The inconsistency is inside the selector implementations, not inside `compile.ts`.

### Action
Leave `compile.ts` unchanged in pass 1.

---

# Test plan

## Add these tests now

### 1. Comparator direction test
Verify that within the same group:
- 100 beats 10
- 10 beats 1
- 1 beats undefined

### 2. Group precedence test
Verify that group precedence still wins before numeric comparison.

### 3. Override-aware alternates test
Create two alternate candidates where raw priority picks one winner, then add an override that should flip the winner.

Expected result:
- alternates path now picks the overridden winner

### 4. Ranked vs alternates consistency test
Use equivalent candidates in:
- ranked ordering
- alternates resolution

Expected result:
- same strongest candidate should appear first / win

### 5. Stable tie-break test
Equal effective priorities should always produce the same deterministic winner.

---

# Risk controls for Replit

## Allowed in this pass
- replace `priority.ts`
- change comment in `types.ts`
- add `priorityOverrides` into selector `resolveByPriority(...)` calls
- add or update tests

## Not allowed in this pass
- governance redesign
- `require` enforcement redesign
- `limit` enforcement
- `stackIds` matcher work
- hierarchy gating
- Task Frame integration
- bundle rule redesign
- new MOLT roles

---

# Acceptance checklist

Replit should verify all of these before closing pass 1:

- [ ] `priority.ts` replaced
- [ ] `types.ts` comment updated
- [ ] `selectPrimary.ts` passes `priorityOverrides`
- [ ] `selectDirective.ts` passes `priorityOverrides`
- [ ] `selectInstruction.ts` passes `priorityOverrides`
- [ ] `selectSubject.ts` passes `priorityOverrides`
- [ ] `selectBlueprint.ts` passes `priorityOverrides`
- [ ] tests prove higher-number-wins behavior
- [ ] alternates and ranked paths now agree
- [ ] no broader compiler architecture was changed

---

# Replit top-of-task instruction

Paste this into Replit with the patch file:

```text
Pass 1 only. Keep scope narrow.

Goal:
Stabilize priority semantics across the compiler.

Required:
1. Replace priority.ts with the supplied version.
2. Update the priorityOrder comment in types.ts.
3. Pass priorityOverrides into resolveByPriority(...) in all alternates selector paths.
4. Add tests proving:
   - higher numeric priorityOrder wins
   - explicit numeric beats undefined
   - group precedence still dominates
   - alternates honor overrides
   - ranked and alternates behave consistently

Do not implement yet:
- governance redesign
- hierarchy gating
- bundle containment redesign
- new MOLT roles
- Task Frame integration

Keep changes minimal and safe.
```
