import type { Block, MoltType, TraceEvent } from "./types.js";

const MOLT_ORDER: MoltType[] = [
  "trigger",
  "directive",
  "instruction",
  "subject",
  "primary",
  "philosophy",
  "blueprint",
];

export interface StackOrderInput {
  stackId: string;
  domainKey?: string;
  blockIds: string[];
}

export interface AuthorityStackResult {
  stackId: string;
  domainKey?: string;
  orderedBlockIds: string[];
  byMoltType: Record<MoltType, string[]>;
}

export interface ResolveAuthorityResult {
  stacks: AuthorityStackResult[];
  notes: Array<Omit<TraceEvent, "id" | "timestamp">>;
}

export function resolveAuthority(
  stackInputs: StackOrderInput[],
  blocksById: Map<string, Block>,
  priorityOverrides: Map<string, number>
): ResolveAuthorityResult {
  const notes: ResolveAuthorityResult["notes"] = [];
  const stacks: AuthorityStackResult[] = [];

  const getEffectivePriority = (blockId: string): number => {
    if (priorityOverrides.has(blockId)) {
      return priorityOverrides.get(blockId)!;
    }
    const block = blocksById.get(blockId);
    return block?.priorityOrder ?? 0;
  };

  for (const input of stackInputs) {
    const byMoltType = Object.fromEntries(
      MOLT_ORDER.map(t => [t, [] as string[]])
    ) as Record<MoltType, string[]>;

    for (const blockId of input.blockIds) {
      const block = blocksById.get(blockId);
      if (block) {
        byMoltType[block.moltType].push(blockId);
      }
    }

    for (const molt of MOLT_ORDER) {
      byMoltType[molt].sort((a, b) => {
        const prioA = getEffectivePriority(a);
        const prioB = getEffectivePriority(b);
        if (prioB !== prioA) return prioB - prioA;
        return a.localeCompare(b);
      });
    }

    const orderedBlockIds: string[] = [];
    for (const molt of MOLT_ORDER) {
      orderedBlockIds.push(...byMoltType[molt]);
    }

    stacks.push({
      stackId: input.stackId,
      domainKey: input.domainKey,
      orderedBlockIds,
      byMoltType,
    });
  }

  stacks.sort((a, b) => a.stackId.localeCompare(b.stackId));

  return { stacks, notes };
}
