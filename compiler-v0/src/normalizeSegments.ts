import type { Block, Stack, Segment, MoltType, TraceEvent } from "./types.js";

const SAFE_MOLT_SET = new Set<MoltType>(["instruction", "subject", "philosophy", "blueprint"]);
const RESTRICTED_MOLT_SET = new Set<MoltType>(["trigger", "directive", "primary"]);

export interface NormalizeResult {
  normalizedStacks: Stack[];
  errors: Array<Omit<TraceEvent, "id" | "timestamp">>;
  notes: Array<Omit<TraceEvent, "id" | "timestamp">>;
}

export function normalizeSegments(
  stacks: Stack[],
  blocksById: Map<string, Block>
): NormalizeResult {
  const errors: NormalizeResult["errors"] = [];
  const notes: NormalizeResult["notes"] = [];
  const normalizedStacks: Stack[] = [];

  for (const stack of stacks) {
    const segments = stack.segments ?? [];
    const claimedBlockIds = new Set<string>();
    const validSegments: Segment[] = [];

    for (const seg of segments) {
      if (seg.kind === "merge") {
        if (seg.blockIds.length < 2) {
          errors.push({
            kind: "validation_failed",
            severity: "error",
            code: "ERR_MERGE_TOO_FEW_BLOCKS",
            message: `Merge segment ${seg.id} must have at least 2 blocks.`,
            relatedStackIds: [stack.id],
          });
          continue;
        }

        const resultBlock = blocksById.get(seg.resultBlockId);
        if (!resultBlock) {
          errors.push({
            kind: "validation_failed",
            severity: "error",
            code: "ERR_MERGE_RESULT_BLOCK_MISSING",
            message: `Merge segment ${seg.id} references missing resultBlockId: ${seg.resultBlockId}`,
            relatedStackIds: [stack.id],
            relatedBlockIds: [seg.resultBlockId],
          });
          continue;
        }

        const sourceMoltTypes = new Set<MoltType>();
        for (const bid of seg.blockIds) {
          const blk = blocksById.get(bid);
          if (blk) sourceMoltTypes.add(blk.moltType);
        }

        const hasRestrictedMolt = [...sourceMoltTypes].some(m => RESTRICTED_MOLT_SET.has(m));
        const isCrossMolt = sourceMoltTypes.size > 1;

        if (isCrossMolt && hasRestrictedMolt && !seg.resultMoltType) {
          errors.push({
            kind: "validation_failed",
            severity: "error",
            code: "ERR_MERGE_RESULT_MOLT_TYPE_REQUIRED",
            message: `Cross-MOLT merge ${seg.id} with restricted types requires explicit resultMoltType.`,
            relatedStackIds: [stack.id],
          });
          continue;
        }

        if (seg.resultMoltType === "primary") {
          errors.push({
            kind: "validation_failed",
            severity: "error",
            code: "ERR_MERGE_PRIMARY_RESULT_FORBIDDEN",
            message: `Primary result merges are forbidden in v0: segment ${seg.id}`,
            relatedStackIds: [stack.id],
          });
          continue;
        }

        const effectiveResultMolt = seg.resultMoltType ?? resultBlock.moltType;
        if (resultBlock.moltType !== effectiveResultMolt) {
          errors.push({
            kind: "validation_failed",
            severity: "error",
            code: "ERR_MERGE_RESULT_MOLT_TYPE_MISMATCH",
            message: `Merge ${seg.id} resultBlock moltType (${resultBlock.moltType}) does not match resultMoltType (${effectiveResultMolt}).`,
            relatedStackIds: [stack.id],
            relatedBlockIds: [seg.resultBlockId],
          });
          continue;
        }
      }

      let hasOverlap = false;
      for (const bid of seg.blockIds) {
        if (claimedBlockIds.has(bid)) {
          errors.push({
            kind: "validation_failed",
            severity: "error",
            code: "ERR_SEGMENT_OVERLAP",
            message: `Block ${bid} claimed by multiple segments in stack ${stack.id}.`,
            relatedStackIds: [stack.id],
            relatedBlockIds: [bid],
          });
          hasOverlap = true;
        }
      }

      if (hasOverlap) continue;

      for (const bid of seg.blockIds) {
        claimedBlockIds.add(bid);
      }
      validSegments.push(seg);
    }

    const uncoveredBlockIds = stack.blockIds.filter(bid => !claimedBlockIds.has(bid));
    for (const bid of uncoveredBlockIds) {
      const implicitBundle: Segment = {
        id: `implicit_bundle_${stack.id}_${bid}`,
        kind: "bundle",
        stackId: stack.id,
        blockIds: [bid],
      };
      validSegments.push(implicitBundle);
      notes.push({
        kind: "note",
        severity: "info",
        code: "INFO_IMPLICIT_BUNDLE",
        message: `Created implicit singleton bundle for block ${bid} in stack ${stack.id}.`,
        relatedStackIds: [stack.id],
        relatedBlockIds: [bid],
      });
    }

    normalizedStacks.push({
      ...stack,
      segments: validSegments,
    });
  }

  return { normalizedStacks, errors, notes };
}
