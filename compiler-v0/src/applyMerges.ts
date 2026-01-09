import type { Block, Stack, MergeSegment, TraceEvent } from "./types.js";

export interface MergeResult {
  mergedStacks: Stack[];
  notes: Array<Omit<TraceEvent, "id" | "timestamp">>;
}

export function applyMerges(
  stacks: Stack[],
  blocksById: Map<string, Block>
): MergeResult {
  const notes: MergeResult["notes"] = [];
  const mergedStacks: Stack[] = [];

  for (const stack of stacks) {
    const segments = stack.segments ?? [];
    const mergeSegments = segments.filter((s): s is MergeSegment => s.kind === "merge");

    if (mergeSegments.length === 0) {
      mergedStacks.push(stack);
      continue;
    }

    let currentBlockIds = [...stack.blockIds];

    for (const merge of mergeSegments) {
      const mergeBlockSet = new Set(merge.blockIds);
      const newBlockIds: string[] = [];
      let replaced = false;

      for (const bid of currentBlockIds) {
        if (mergeBlockSet.has(bid)) {
          if (!replaced) {
            newBlockIds.push(merge.resultBlockId);
            replaced = true;
            notes.push({
              kind: "note",
              severity: "info",
              code: "INFO_MERGE_APPLIED",
              message: `Merge ${merge.id}: replaced [${merge.blockIds.join(", ")}] with ${merge.resultBlockId} in stack ${stack.id}.`,
              relatedStackIds: [stack.id],
              relatedBlockIds: [merge.resultBlockId, ...merge.blockIds],
            });
          }
        } else {
          newBlockIds.push(bid);
        }
      }

      currentBlockIds = newBlockIds;
    }

    const nonMergeSegments = segments.filter(s => s.kind !== "merge");

    mergedStacks.push({
      ...stack,
      blockIds: currentBlockIds,
      segments: nonMergeSegments,
    });
  }

  return { mergedStacks, notes };
}
