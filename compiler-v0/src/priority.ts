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
