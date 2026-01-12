import type { Block, PriorityGroup, TraceEvent, PriorityCandidate, PriorityResolutionContext } from "./types.js";

const PRIORITY_GROUP_ORDER: PriorityGroup[] = ["Override", "Explicit", "Default", "Fallback"];

export function getGroupRank(group: PriorityGroup): number {
  const idx = PRIORITY_GROUP_ORDER.indexOf(group);
  return idx === -1 ? 2 : idx;
}

export function getEffectiveGroup(block: Block): PriorityGroup {
  return block.priorityGroup ?? "Default";
}

export interface ResolveByPriorityContext {
  moltType: string;
  stackId?: string;
  reason: string;
}

export type TracePushFn = (evt: Omit<TraceEvent, "id" | "timestamp">) => void;

export interface ResolveByPriorityResult {
  winner?: Block;
  error?: {
    code: "PRIORITY_AMBIGUOUS" | "NO_CANDIDATES";
    message: string;
    candidateIds: string[];
  };
  traceEvent: Omit<TraceEvent, "id" | "timestamp">;
}

export function resolveByPriority(
  candidates: Block[],
  context: ResolveByPriorityContext,
  tracePush: TracePushFn
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
      message: `Priority resolution failed: no candidates provided. Context: ${context.reason}`,
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
      message: `Priority resolution: single candidate ${winner.id} selected. Context: ${context.reason}`,
      relatedBlockIds: [winner.id],
      priorityContext: ctx,
      priorityCandidates: [{
        id: winner.id,
        priorityGroup: getEffectiveGroup(winner),
        priorityOrder: winner.priorityOrder,
      }],
      priorityWinnerId: winner.id,
    };
    tracePush(traceEvent);
    return { winner, traceEvent };
  }

  const priorityCandidates: PriorityCandidate[] = candidates.map(b => ({
    id: b.id,
    priorityGroup: getEffectiveGroup(b),
    priorityOrder: b.priorityOrder,
  }));

  const sorted = [...candidates].sort((a, b) => {
    const groupA = getGroupRank(getEffectiveGroup(a));
    const groupB = getGroupRank(getEffectiveGroup(b));
    if (groupA !== groupB) return groupA - groupB;

    const orderA = a.priorityOrder;
    const orderB = b.priorityOrder;
    if (orderA !== undefined && orderB !== undefined) {
      const orderDiff = orderA - orderB;
      if (orderDiff !== 0) return orderDiff;
    }

    return a.id.localeCompare(b.id);
  });

  const topGroup = getEffectiveGroup(sorted[0]);
  const topGroupBlocks = sorted.filter(b => getEffectiveGroup(b) === topGroup);

  if (topGroupBlocks.length === 1) {
    const winner = topGroupBlocks[0];
    const traceEvent: Omit<TraceEvent, "id" | "timestamp"> = {
      kind: "priority_resolution",
      severity: "info",
      code: "INFO_PRIORITY_RESOLVED_BY_GROUP",
      message: `Priority resolution: ${winner.id} selected (group=${topGroup}). Context: ${context.reason}`,
      relatedBlockIds: candidates.map(c => c.id),
      priorityContext: ctx,
      priorityCandidates,
      priorityWinnerId: winner.id,
    };
    tracePush(traceEvent);
    return { winner, traceEvent };
  }

  const allHaveOrder = topGroupBlocks.every(b => b.priorityOrder !== undefined);
  if (allHaveOrder) {
    const winner = topGroupBlocks[0];
    const traceEvent: Omit<TraceEvent, "id" | "timestamp"> = {
      kind: "priority_resolution",
      severity: "info",
      code: "INFO_PRIORITY_RESOLVED_BY_ORDER",
      message: `Priority resolution: ${winner.id} selected (group=${topGroup}, order=${winner.priorityOrder}). Context: ${context.reason}`,
      relatedBlockIds: candidates.map(c => c.id),
      priorityContext: ctx,
      priorityCandidates,
      priorityWinnerId: winner.id,
    };
    tracePush(traceEvent);
    return { winner, traceEvent };
  }

  const hasMixedOrMissingOrder = topGroupBlocks.some(b => b.priorityOrder === undefined);
  if (hasMixedOrMissingOrder) {
    const ambiguousIds = topGroupBlocks.map(b => b.id);
    const traceEvent: Omit<TraceEvent, "id" | "timestamp"> = {
      kind: "priority_resolution",
      severity: "error",
      code: "ERR_PRIORITY_AMBIGUOUS",
      message: `Priority resolution failed: ${ambiguousIds.length} blocks in group ${topGroup} lack priorityOrder. IDs: [${ambiguousIds.join(", ")}]. Context: ${context.reason}`,
      relatedBlockIds: ambiguousIds,
      priorityContext: ctx,
      priorityCandidates,
    };
    tracePush(traceEvent);
    return {
      error: {
        code: "PRIORITY_AMBIGUOUS",
        message: `Ambiguous priority: ${ambiguousIds.length} blocks in group ${topGroup} without priorityOrder`,
        candidateIds: ambiguousIds,
      },
      traceEvent,
    };
  }

  const winner = sorted[0];
  const traceEvent: Omit<TraceEvent, "id" | "timestamp"> = {
    kind: "priority_resolution",
    severity: "info",
    code: "INFO_PRIORITY_RESOLVED_BY_ID",
    message: `Priority resolution: ${winner.id} selected (group=${topGroup}, id tie-break). Context: ${context.reason}`,
    relatedBlockIds: candidates.map(c => c.id),
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

    const groupA = getGroupRank(getEffectiveGroup(a));
    const groupB = getGroupRank(getEffectiveGroup(b));
    if (groupA !== groupB) return groupA - groupB;

    const overrideA = priorityOverrides?.get(aId);
    const overrideB = priorityOverrides?.get(bId);
    const orderA = overrideA ?? a.priorityOrder;
    const orderB = overrideB ?? b.priorityOrder;
    
    if (orderA !== undefined && orderB !== undefined) {
      return orderA - orderB;
    }
    if (orderA !== undefined) return -1;
    if (orderB !== undefined) return 1;

    return aId.localeCompare(bId);
  });
}
