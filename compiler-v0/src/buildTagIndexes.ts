import type { Block, MoltType, RuntimeNeoBlock, RuntimeTagIndexes } from "./types.js";

export interface RuntimeStackInfo {
  stackId: string;
  domainKey?: string;
  orderedBlockIds: string[];
}

export interface BuildTagIndexesInput {
  blocksById: Map<string, Block>;
  runtimeStacks: RuntimeStackInfo[];
  neoBlocks: RuntimeNeoBlock[];
}

function normalizeTag(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function normalizeBlockTags(block: Block): string[] {
  const raw = block.tags ?? [];
  const normalized = raw.map(normalizeTag).filter(t => t.length > 0);
  return [...new Set(normalized)].sort();
}

function getActiveBlockIds(neoBlock: RuntimeNeoBlock): Set<string> {
  const active = new Set<string>();
  const a = neoBlock.active;
  for (const id of a.triggerIds) active.add(id);
  for (const id of a.directiveIds) active.add(id);
  for (const id of a.instructionIds) active.add(id);
  for (const id of a.subjectIds) active.add(id);
  if (a.primaryId) active.add(a.primaryId);
  for (const id of a.philosophyIds) active.add(id);
  for (const id of a.blueprintIds) active.add(id);
  return active;
}

export function buildTagIndexes(input: BuildTagIndexesInput): RuntimeTagIndexes {
  const { blocksById, runtimeStacks, neoBlocks } = input;

  const tagsByBlockId: Record<string, string[]> = {};
  const blockIdsByTag: Record<string, string[]> = {};
  const blockIdsByTagByStackId: Record<string, Record<string, string[]>> = {};
  const activeBlockIdsByTagByStackId: Record<string, Record<string, string[]>> = {};
  const blockIdsByTagByMoltType: Record<MoltType, Record<string, string[]>> = {
    trigger: {},
    directive: {},
    instruction: {},
    subject: {},
    primary: {},
    philosophy: {},
    blueprint: {},
  };
  const allTagsSet = new Set<string>();

  const neoBlockByStackId = new Map<string, RuntimeNeoBlock>();
  for (const nb of neoBlocks) {
    neoBlockByStackId.set(nb.stackId, nb);
  }

  for (const st of runtimeStacks) {
    const stackId = st.stackId;
    blockIdsByTagByStackId[stackId] = {};
    activeBlockIdsByTagByStackId[stackId] = {};

    const neoBlock = neoBlockByStackId.get(stackId);
    const activeIds = neoBlock ? getActiveBlockIds(neoBlock) : new Set<string>();

    for (const blockId of st.orderedBlockIds) {
      const block = blocksById.get(blockId);
      if (!block) continue;

      const tags = normalizeBlockTags(block);
      if (tags.length === 0) continue;

      tagsByBlockId[blockId] = tags;

      for (const tag of tags) {
        allTagsSet.add(tag);

        if (!blockIdsByTag[tag]) blockIdsByTag[tag] = [];
        blockIdsByTag[tag].push(blockId);

        if (!blockIdsByTagByStackId[stackId][tag]) {
          blockIdsByTagByStackId[stackId][tag] = [];
        }
        blockIdsByTagByStackId[stackId][tag].push(blockId);

        if (activeIds.has(blockId)) {
          if (!activeBlockIdsByTagByStackId[stackId][tag]) {
            activeBlockIdsByTagByStackId[stackId][tag] = [];
          }
          activeBlockIdsByTagByStackId[stackId][tag].push(blockId);
        }

        const moltType = block.moltType;
        if (!blockIdsByTagByMoltType[moltType][tag]) {
          blockIdsByTagByMoltType[moltType][tag] = [];
        }
        blockIdsByTagByMoltType[moltType][tag].push(blockId);
      }
    }
  }

  const allTagsSorted = [...allTagsSet].sort();

  return {
    tagsByBlockId,
    blockIdsByTag,
    blockIdsByTagByStackId,
    activeBlockIdsByTagByStackId,
    blockIdsByTagByMoltType,
    allTagsSorted,
  };
}
