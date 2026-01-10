import type { RuntimeBundle, Block } from "./types.js";

export interface ComposeActiveOrderInput {
  activeIds: string[];
  bundles: RuntimeBundle[];
  blocksById: Map<string, Block>;
  priorityOverrides: Map<string, number>;
}

export function composeActiveOrder(input: ComposeActiveOrderInput): string[] {
  const { activeIds, bundles, blocksById, priorityOverrides } = input;

  if (activeIds.length === 0) {
    return [];
  }

  const activeSet = new Set(activeIds);
  const result: string[] = [];
  const usedIds = new Set<string>();

  for (const bundle of bundles) {
    if (bundle.intent === "ranked" || bundle.intent === undefined) {
      for (const blockId of bundle.blockIds) {
        if (activeSet.has(blockId) && !usedIds.has(blockId)) {
          result.push(blockId);
          usedIds.add(blockId);
        }
      }
    }
  }

  const nonBundledIds = activeIds.filter(id => !usedIds.has(id));

  const getEffectivePriority = (blockId: string): number => {
    if (priorityOverrides.has(blockId)) {
      return priorityOverrides.get(blockId)!;
    }
    const block = blocksById.get(blockId);
    return block?.priorityOrder ?? 0;
  };

  nonBundledIds.sort((a, b) => {
    const prioA = getEffectivePriority(a);
    const prioB = getEffectivePriority(b);
    if (prioB !== prioA) return prioB - prioA;
    return a.localeCompare(b);
  });

  for (const id of nonBundledIds) {
    if (!usedIds.has(id)) {
      result.push(id);
      usedIds.add(id);
    }
  }

  return result;
}
