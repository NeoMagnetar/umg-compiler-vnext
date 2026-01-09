import type { Block, Stack, BundleSegment, RuntimeBundle, TraceEvent } from "./types.js";

export interface BundleResult {
  bundles: RuntimeBundle[];
  notes: Array<Omit<TraceEvent, "id" | "timestamp">>;
}

export function applyBundles(
  stacks: Stack[],
  blocksById: Map<string, Block>
): BundleResult {
  const bundles: RuntimeBundle[] = [];
  const notes: BundleResult["notes"] = [];

  for (const stack of stacks) {
    const segments = stack.segments ?? [];
    const bundleSegments = segments.filter((s): s is BundleSegment => s.kind === "bundle");

    for (const bundle of bundleSegments) {
      const liveBlockIds = bundle.blockIds.filter(bid => {
        const blk = blocksById.get(bid);
        return blk && blk.role !== "off";
      });

      if (liveBlockIds.length === 0) continue;

      bundles.push({
        segmentId: bundle.id,
        stackId: stack.id,
        blockIds: liveBlockIds,
      });

      notes.push({
        kind: "note",
        severity: "info",
        code: "INFO_BUNDLE_APPLIED",
        message: `Bundle ${bundle.id} recorded with ${liveBlockIds.length} block(s) in stack ${stack.id}.`,
        relatedStackIds: [stack.id],
        relatedBlockIds: liveBlockIds,
      });
    }
  }

  return { bundles, notes };
}
