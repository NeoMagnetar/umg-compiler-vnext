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

export function findBlockInSleeveById(sleeve: any, blockId: string): { block: any | null; stackId?: string } {
  if (!sleeve) return { block: null };

  const blocks = sleeve.blocks;
  if (Array.isArray(blocks)) {
    for (const block of blocks) {
      if (block.id === blockId) {
        const stackId = findStackForBlockId(sleeve, blockId);
        return { block, stackId };
      }
    }
  }

  const stacks = sleeve.stacks;
  if (Array.isArray(stacks)) {
    for (const stack of stacks) {
      if (Array.isArray(stack.blocks)) {
        for (const block of stack.blocks) {
          if (block.id === blockId) {
            return { block, stackId: stack.id };
          }
        }
      }
    }
  }

  return { block: null };
}

function findStackForBlockId(sleeve: any, blockId: string): string | undefined {
  const stacks = sleeve.stacks;
  if (!Array.isArray(stacks)) return undefined;

  for (const stack of stacks) {
    if (Array.isArray(stack.blockIds) && stack.blockIds.includes(blockId)) {
      return stack.id;
    }
  }
  return undefined;
}

export function updateBlock(json: string, blockId: string, patch: BlockPatch): UpdateResult {
  const { sleeve, error } = parseSleeve(json);
  if (error || !sleeve) {
    return { error: error ?? "Failed to parse sleeve" };
  }

  let found = false;

  const blocks = sleeve.blocks;
  if (Array.isArray(blocks)) {
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
  }

  if (!found) {
    const stacks = sleeve.stacks;
    if (Array.isArray(stacks)) {
      for (const stack of stacks) {
        if (!Array.isArray(stack.blocks)) continue;
        for (let i = 0; i < stack.blocks.length; i++) {
          if (stack.blocks[i].id === blockId) {
            if (patch.title !== undefined) stack.blocks[i].title = patch.title;
            if (patch.content !== undefined) stack.blocks[i].content = patch.content;
            if (patch.tags !== undefined) stack.blocks[i].tags = patch.tags;
            if (patch.moltType !== undefined) stack.blocks[i].moltType = patch.moltType;
            if (patch.priorityOrder !== undefined) stack.blocks[i].priorityOrder = patch.priorityOrder;
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
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
  return findBlockInSleeveById(sleeve, blockId);
}

export function blockExistsInSleeve(json: string, blockId: string): boolean {
  const { block } = findBlockInSleeve(json, blockId);
  return block !== null;
}
