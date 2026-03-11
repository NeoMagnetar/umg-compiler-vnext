# UMG Compiler Pass 1 — Exact Code Patches

This file contains the **pass-1 exact code patch set** for the current `NeoMagCustoms/umg-compiler` source.

## Scope of this pass

Only fix:

- priority semantics
- effective priority override threading
- selector consistency between ranked and alternates paths
- type comment consistency

Do **not** change:

- governance semantics
- hierarchy gating
- bundle semantics beyond priority usage
- MOLT role model
- compiler phase order

---

## Source-grounded findings this patch addresses

### Current live issues

1. `priority.ts` currently resolves ties inside a group using `orderA - orderB`, which means **lower numeric order wins**.
2. `types.ts` currently documents `priorityOrder` as **“1 = highest, lower wins”**.
3. `selectPrimary.ts`, `selectDirective.ts`, `selectInstruction.ts`, `selectSubject.ts`, and `selectBlueprint.ts` all call `resolveByPriority(...)` **without passing `priorityOverrides`** in alternates mode.
4. `resolveAuthority.ts` already uses `sortByPriorityGroupAndOrder(..., priorityOverrides)`, so ranked ordering and alternates are currently inconsistent.

This patch makes **higher numeric `priorityOrder` win everywhere**, while keeping existing `PriorityGroup` precedence.

---

# 1) Replace `compiler-v0/src/priority.ts`

Replace the file contents with this:

```ts
import type {
  Block,
  PriorityCandidate,
  PriorityGroup,
  PriorityResolutionContext,
  TraceEvent,
} from "./types.js";

export type TracePushFn = (evt: Omit<TraceEvent, "id" | "timestamp">) => void;

const PRIORITY_GROUP_ORDER: PriorityGroup[] = [
  "Override",
  "Explicit",
  "Default",
  "Fallback",
];

export function getGroupRank(group: PriorityGroup): number {
  const idx = PRIORITY_GROUP_ORDER.indexOf(group);
  return idx === -1 ? PRIORITY_GROUP_ORDER.length : idx;
}

export function getEffectiveGroup(block: Block): PriorityGroup {
  return block.priorityGroup ?? "Default";
}

export interface ResolveByPriorityResult {
  winner?: Block;
  error?: {
    code: "NO_CANDIDATES";
    message: string;
    candidateIds: string[];
  };
  traceEvent: Omit<TraceEvent, "id" | "timestamp">;
}

export function compareBlocksByPriority(
  a: Block,
  b: Block,
  priorityOverrides?: Map<string, number>
): number {
  const groupA = getGroupRank(getEffectiveGroup(a));
  const groupB = getGroupRank(getEffectiveGroup(b));

  // Lower rank = stronger group
  if (groupA !== groupB) return groupA - groupB;

  const orderA = priorityOverrides?.get(a.id) ?? a.priorityOrder;
  const orderB = priorityOverrides?.get(b.id) ?? b.priorityOrder;

  // Higher numeric order = stronger
  if (orderA !== undefined && orderB !== undefined && orderA !== orderB) {
    return orderB - orderA;
  }

  // Explicit numeric priority beats undefined
  if (orderA !== undefined && orderB === undefined) return -1;
  if (orderA === undefined && orderB !== undefined) return 1;

  // Stable deterministic fallback
  return a.id.localeCompare(b.id);
}

export function resolveByPriority(
  candidates: Block[],
  context: {
    moltType: string;
    stackId?: string;
    reason: string;
  },
  tracePush: TracePushFn,
  priorityOverrides?: Map<string, number>
): ResolveByPriorityResult {
  const ctx: PriorityResolutionContext = {
    moltType: context.moltType as any,
    stackId: context.stackId,
    reason: context.reason,
  };

  if (candidates.length === 0) {
    const traceEvent: Omit<TraceEvent, "id" | "timestamp"> = {
      kind: "priority_resolution",
      severity: "error",
      code: "ERR_PRIORITY_NO_CANDIDATES",
      message: `Priority resolution failed: no candidates provided.\nContext: ${context.reason}`,
      priorityContext: ctx,
      priorityCandidates: [],
    };
    tracePush(traceEvent);
    return {
      error: {
        code: "NO_CANDIDATES",
        message: "No candidates provided for priority resolution",
        candidateIds: [],
      },
      traceEvent,
    };
  }

  if (candidates.length === 1) {
    const winner = candidates[0];
    const traceEvent: Omit<TraceEvent, "id" | "timestamp"> = {
      kind: "priority_resolution",
      severity: "info",
      code: "INFO_PRIORITY_SINGLE_CANDIDATE",
      message: `Priority resolution: single candidate ${winner.id} selected.\nContext: ${context.reason}`,
      relatedBlockIds: [winner.id],
      priorityContext: ctx,
      priorityCandidates: [
        {
          id: winner.id,
          priorityGroup: getEffectiveGroup(winner),
          priorityOrder: priorityOverrides?.get(winner.id) ?? winner.priorityOrder,
        },
      ],
      priorityWinnerId: winner.id,
    };
    tracePush(traceEvent);
    return { winner, traceEvent };
  }

  const priorityCandidates: PriorityCandidate[] = candidates.map((b) => ({
    id: b.id,
    priorityGroup: getEffectiveGroup(b),
    priorityOrder: priorityOverrides?.get(b.id) ?? b.priorityOrder,
  }));

  const sorted = [...candidates].sort((a, b) =>
    compareBlocksByPriority(a, b, priorityOverrides)
  );

  const winner = sorted[0];

  const traceEvent: Omit<TraceEvent, "id" | "timestamp"> = {
    kind: "priority_resolution",
    severity: "info",
    code: "INFO_PRIORITY_RESOLVED",
    message: `Priority resolution: ${winner.id} selected.\nContext: ${context.reason}`,
    relatedBlockIds: candidates.map((c) => c.id),
    priorityContext: ctx,
    priorityCandidates,
    priorityWinnerId: winner.id,
  };

  tracePush(traceEvent);
  return { winner, traceEvent };
}

export function sortByPriorityGroupAndOrder(
  blockIds: string[],
  blocksById: Map<string, Block>,
  priorityOverrides?: Map<string, number>
): string[] {
  return [...blockIds].sort((aId, bId) => {
    const a = blocksById.get(aId);
    const b = blocksById.get(bId);
    if (!a || !b) return aId.localeCompare(bId);
    return compareBlocksByPriority(a, b, priorityOverrides);
  });
}
```

---

# 2) Edit `compiler-v0/src/types.ts`

Only change the comment on `priorityOrder`.

### Current
```ts
priorityOrder?: number; // tie-breaker within same group (1 = highest, lower wins)
```

### Replace with
```ts
priorityOrder?: number; // tie-breaker within same group (higher number = stronger)
```

---

# 3) Edit `compiler-v0/src/selectPrimary.ts`

In the `resolveByPriority(...)` call, pass `priorityOverrides` as the 4th argument.

### Current
```ts
const result = resolveByPriority(candidates, {
  moltType: "primary",
  stackId: stack.stackId,
  reason: "select single primary from bundled alternates",
}, tracePush);
```

### Replace with
```ts
const result = resolveByPriority(
  candidates,
  {
    moltType: "primary",
    stackId: stack.stackId,
    reason: "select single primary from bundled alternates",
  },
  tracePush,
  priorityOverrides
);
```

---

# 4) Edit `compiler-v0/src/selectDirective.ts`

In the alternates path, pass `priorityOverrides` into `resolveByPriority(...)`.

### Current
```ts
const result = resolveByPriority(candidates, {
  moltType: "directive",
  stackId: stack.stackId,
  reason: "select single directive from bundled alternates",
}, tracePush);
```

### Replace with
```ts
const result = resolveByPriority(
  candidates,
  {
    moltType: "directive",
    stackId: stack.stackId,
    reason: "select single directive from bundled alternates",
  },
  tracePush,
  priorityOverrides
);
```

---

# 5) Edit `compiler-v0/src/selectInstruction.ts`

In the alternates path, pass `priorityOverrides` into `resolveByPriority(...)`.

### Current
```ts
const result = resolveByPriority(candidates, {
  moltType: "instruction",
  stackId: stack.stackId,
  reason: "select single instruction from bundled alternates",
}, tracePush);
```

### Replace with
```ts
const result = resolveByPriority(
  candidates,
  {
    moltType: "instruction",
    stackId: stack.stackId,
    reason: "select single instruction from bundled alternates",
  },
  tracePush,
  priorityOverrides
);
```

---

# 6) Edit `compiler-v0/src/selectSubject.ts`

In the alternates path, pass `priorityOverrides` into `resolveByPriority(...)`.

### Current
```ts
const result = resolveByPriority(candidates, {
  moltType: "subject",
  stackId: stack.stackId,
  reason: "select single subject from bundled alternates",
}, tracePush);
```

### Replace with
```ts
const result = resolveByPriority(
  candidates,
  {
    moltType: "subject",
    stackId: stack.stackId,
    reason: "select single subject from bundled alternates",
  },
  tracePush,
  priorityOverrides
);
```

---

# 7) Edit `compiler-v0/src/selectBlueprint.ts`

In the alternates path, pass `priorityOverrides` into `resolveByPriority(...)`.

### Current
```ts
const result = resolveByPriority(candidates, {
  moltType: "blueprint",
  stackId: stack.stackId,
  reason: "select single blueprint from bundled alternates",
}, tracePush);
```

### Replace with
```ts
const result = resolveByPriority(
  candidates,
  {
    moltType: "blueprint",
    stackId: stack.stackId,
    reason: "select single blueprint from bundled alternates",
  },
  tracePush,
  priorityOverrides
);
```

---

# 8) No `compile.ts` logic change required in pass 1

`compile.ts` already passes `governanceResult.priorityOverrides` into:

- `resolveAuthority(...)`
- `selectPrimary(...)`
- `selectDirective(...)`
- `selectInstruction(...)`
- `selectSubject(...)`
- `selectBlueprint(...)`

So for pass 1, `compile.ts` does not need structural changes.

---

# 9) Required tests to add

## Test A — higher numeric order wins
Two same-group blocks:
- A = 10
- B = 100

Winner must be B.

## Test B — explicit numeric beats undefined
Two same-group blocks:
- A = undefined
- B = 1

Winner must be B.

## Test C — group precedence still dominates
One stronger group with lower numeric value must still beat one weaker group with higher numeric value.

## Test D — override changes winner
Raw winner is A. Override makes B stronger. Winner must become B.

## Test E — alternates and ranked paths agree
Equivalent candidates through:
- alternates mode
- ranked ordering mode

must agree on strongest candidate at the top.

---

# 10) Pass-1 completion criteria

Pass 1 is complete only if:

- all selectors use the same effective priority semantics
- higher numeric order wins everywhere
- alternates do not ignore overrides
- ranked and alternates are consistent
- tests prove the invariant
- no governance redesign or hierarchy gating was introduced
