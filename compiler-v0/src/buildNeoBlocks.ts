import type {
  RuntimeNeoBlock,
  RuntimeBundle,
  MoltType,
  Block,
  ActiveSelections,
} from "./types.js";
import { composeActiveOrder } from "./composeActiveOrder.js";

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
  blueprintByStackId: Record<string, string[]>;
  subjectByStackId: Record<string, string[]>;
  priorityOverrides: Map<string, number>;
}

export interface BuildNeoBlocksResult {
  neoBlocks: RuntimeNeoBlock[];
  neoBlockIdByStackId: Record<string, string>;
}

export function buildNeoBlocks(input: BuildNeoBlocksInput): BuildNeoBlocksResult {
  const {
    runtimeStacks,
    bundles,
    appliedMerges,
    blocksById,
    primaryByStackId,
    directiveByStackId,
    instructionByStackId,
    blueprintByStackId,
    subjectByStackId,
    priorityOverrides,
  } = input;

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

    const stackBundles = bundles.filter(b => b.stackId === st.stackId);

    const bundleIds = stackBundles
      .map(b => b.segmentId)
      .sort((a, b) => a.localeCompare(b));

    const mergeIds = appliedMerges
      .filter(m => m.stackId === st.stackId)
      .map(m => m.segmentId)
      .sort((a, b) => a.localeCompare(b));

    const selectedPrimaryId = primaryByStackId[st.stackId];

    const rawDirectiveIds = directiveByStackId[st.stackId] ?? byMoltType.directive;
    const rawInstructionIds = instructionByStackId[st.stackId] ?? byMoltType.instruction;
    const rawSubjectIds = subjectByStackId[st.stackId] ?? byMoltType.subject;
    const rawBlueprintIds = blueprintByStackId[st.stackId] ?? byMoltType.blueprint;

    const active: ActiveSelections = {
      triggerIds: byMoltType.trigger,
      directiveIds: composeActiveOrder({
        activeIds: rawDirectiveIds,
        bundles: stackBundles,
        blocksById,
        priorityOverrides,
      }),
      instructionIds: composeActiveOrder({
        activeIds: rawInstructionIds,
        bundles: stackBundles,
        blocksById,
        priorityOverrides,
      }),
      subjectIds: composeActiveOrder({
        activeIds: rawSubjectIds,
        bundles: stackBundles,
        blocksById,
        priorityOverrides,
      }),
      primaryId: selectedPrimaryId,
      philosophyIds: byMoltType.philosophy,
      blueprintIds: composeActiveOrder({
        activeIds: rawBlueprintIds,
        bundles: stackBundles,
        blocksById,
        priorityOverrides,
      }),
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
