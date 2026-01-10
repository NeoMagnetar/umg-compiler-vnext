import type {
  RuntimeNeoBlock,
  RuntimeBundle,
  MoltType,
  Block,
  ActiveSelections,
} from "./types.js";

const MOLT_ORDER: MoltType[] = [
  "trigger",
  "directive",
  "instruction",
  "subject",
  "primary",
  "philosophy",
  "blueprint",
];

export interface RuntimeStackInfo {
  stackId: string;
  domainKey?: string;
  orderedBlockIds: string[];
}

export interface AppliedMerge {
  segmentId: string;
  stackId: string;
}

export interface BuildNeoBlocksInput {
  runtimeStacks: RuntimeStackInfo[];
  bundles: RuntimeBundle[];
  appliedMerges: AppliedMerge[];
  blocksById: Map<string, Block>;
  primaryByStackId: Record<string, string>;
  directiveByStackId: Record<string, string[]>;
  instructionByStackId: Record<string, string[]>;
}

export interface BuildNeoBlocksResult {
  neoBlocks: RuntimeNeoBlock[];
  neoBlockIdByStackId: Record<string, string>;
}

export function buildNeoBlocks(input: BuildNeoBlocksInput): BuildNeoBlocksResult {
  const { runtimeStacks, bundles, appliedMerges, blocksById, primaryByStackId, directiveByStackId, instructionByStackId } = input;

  const neoBlocks: RuntimeNeoBlock[] = [];
  const neoBlockIdByStackId: Record<string, string> = {};

  for (const st of runtimeStacks) {
    const neoBlockId = `nb_${st.stackId}`;

    const byMoltType = Object.fromEntries(
      MOLT_ORDER.map(t => [t, [] as string[]])
    ) as Record<MoltType, string[]>;

    for (const blockId of st.orderedBlockIds) {
      const block = blocksById.get(blockId);
      if (block) {
        byMoltType[block.moltType].push(blockId);
      }
    }

    const bundleIds = bundles
      .filter(b => b.stackId === st.stackId)
      .map(b => b.segmentId)
      .sort((a, b) => a.localeCompare(b));

    const mergeIds = appliedMerges
      .filter(m => m.stackId === st.stackId)
      .map(m => m.segmentId)
      .sort((a, b) => a.localeCompare(b));

    const selectedPrimaryId = primaryByStackId[st.stackId];

    const active: ActiveSelections = {
      triggerIds: byMoltType.trigger,
      directiveIds: directiveByStackId[st.stackId] ?? byMoltType.directive,
      instructionIds: instructionByStackId[st.stackId] ?? byMoltType.instruction,
      subjectIds: byMoltType.subject,
      primaryId: selectedPrimaryId,
      philosophyIds: byMoltType.philosophy,
      blueprintIds: byMoltType.blueprint,
    };

    neoBlocks.push({
      id: neoBlockId,
      stackId: st.stackId,
      orderedBlockIds: st.orderedBlockIds,
      byMoltType,
      bundleIds,
      mergeIds,
      selectedPrimaryId,
      active,
    });

    neoBlockIdByStackId[st.stackId] = neoBlockId;
  }

  neoBlocks.sort((a, b) => a.id.localeCompare(b.id));

  return { neoBlocks, neoBlockIdByStackId };
}
