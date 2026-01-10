export interface ParsedSleeve {
  sleeve: any | null;
  error?: string;
}

export interface UpdateResult {
  nextJson?: string;
  error?: string;
}

export interface BlockPatch {
  title?: string;
  content?: string;
  tags?: string[];
  moltType?: string;
  priorityOrder?: number;
}

export function parseSleeve(json: string): ParsedSleeve {
  try {
    const sleeve = JSON.parse(json);
    return { sleeve };
  } catch (e: any) {
    return { sleeve: null, error: e.message ?? "Invalid JSON" };
  }
}

export function updateBlock(json: string, blockId: string, patch: BlockPatch): UpdateResult {
  const { sleeve, error } = parseSleeve(json);
  if (error || !sleeve) {
    return { error: error ?? "Failed to parse sleeve" };
  }

  const stacks = sleeve.stacks;
  if (!Array.isArray(stacks)) {
    return { error: "No stacks array found in sleeve" };
  }

  let found = false;

  for (const stack of stacks) {
    const blocks = stack.blocks;
    if (!Array.isArray(blocks)) continue;

    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].id === blockId) {
        if (patch.title !== undefined) blocks[i].title = patch.title;
        if (patch.content !== undefined) blocks[i].content = patch.content;
        if (patch.tags !== undefined) blocks[i].tags = patch.tags;
        if (patch.moltType !== undefined) blocks[i].moltType = patch.moltType;
        if (patch.priorityOrder !== undefined) blocks[i].priorityOrder = patch.priorityOrder;
        found = true;
        break;
      }
    }
    if (found) break;
  }

  if (!found) {
    return { error: `Block not found: ${blockId}` };
  }

  try {
    const nextJson = JSON.stringify(sleeve, null, 2);
    return { nextJson };
  } catch (e: any) {
    return { error: e.message ?? "Failed to serialize JSON" };
  }
}

export function findBlockInSleeve(json: string, blockId: string): { block: any | null; stackId?: string } {
  const { sleeve, error } = parseSleeve(json);
  if (error || !sleeve) return { block: null };

  const stacks = sleeve.stacks;
  if (!Array.isArray(stacks)) return { block: null };

  for (const stack of stacks) {
    const blocks = stack.blocks;
    if (!Array.isArray(blocks)) continue;

    for (const block of blocks) {
      if (block.id === blockId) {
        return { block, stackId: stack.id };
      }
    }
  }

  return { block: null };
}
