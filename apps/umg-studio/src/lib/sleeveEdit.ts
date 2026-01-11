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

export interface NewStackOptions {
  id?: string;
  name?: string;
  domainKey?: string;
}

export interface NewBlockOptions {
  id?: string;
  title?: string;
  moltType: string;
  content?: string;
  tags?: string[];
  priorityOrder?: number;
}

const MOLT_ORDER = [
  "trigger",
  "directive",
  "instruction",
  "subject",
  "primary",
  "philosophy",
  "blueprint"
] as const;

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

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}`;
}

export function addStack(json: string, options: NewStackOptions = {}): UpdateResult {
  const { sleeve, error } = parseSleeve(json);
  if (error || !sleeve) {
    return { error: error ?? "Failed to parse sleeve" };
  }

  if (!Array.isArray(sleeve.stacks)) {
    sleeve.stacks = [];
  }

  const newStack = {
    id: options.id ?? generateId("stack"),
    name: options.name ?? "New Stack",
    domainKey: options.domainKey ?? "default",
    blockIds: [],
    segments: []
  };

  sleeve.stacks.push(newStack);

  try {
    const nextJson = JSON.stringify(sleeve, null, 2);
    return { nextJson };
  } catch (e: any) {
    return { error: e.message ?? "Failed to serialize JSON" };
  }
}

export function renameStack(json: string, stackId: string, name: string): UpdateResult {
  const { sleeve, error } = parseSleeve(json);
  if (error || !sleeve) {
    return { error: error ?? "Failed to parse sleeve" };
  }

  if (!Array.isArray(sleeve.stacks)) {
    return { error: "No stacks in sleeve" };
  }

  const stack = sleeve.stacks.find((s: any) => s.id === stackId);
  if (!stack) {
    return { error: `Stack not found: ${stackId}` };
  }

  stack.name = name;

  try {
    const nextJson = JSON.stringify(sleeve, null, 2);
    return { nextJson };
  } catch (e: any) {
    return { error: e.message ?? "Failed to serialize JSON" };
  }
}

export function getStackName(stack: any): string {
  return stack?.name ?? stack?.id ?? "Unnamed";
}

export function addBlockToStack(json: string, stackId: string, options: NewBlockOptions): UpdateResult {
  const { sleeve, error } = parseSleeve(json);
  if (error || !sleeve) {
    return { error: error ?? "Failed to parse sleeve" };
  }

  if (!Array.isArray(sleeve.blocks)) {
    sleeve.blocks = [];
  }

  if (!Array.isArray(sleeve.stacks)) {
    return { error: "No stacks in sleeve" };
  }

  const stack = sleeve.stacks.find((s: any) => s.id === stackId);
  if (!stack) {
    return { error: `Stack not found: ${stackId}` };
  }

  const newBlock = {
    id: options.id ?? generateId("blk"),
    title: options.title ?? `New ${options.moltType}`,
    moltType: options.moltType,
    priorityOrder: options.priorityOrder ?? 10,
    content: options.content ?? "",
    tags: options.tags ?? []
  };

  sleeve.blocks.push(newBlock);

  if (!Array.isArray(stack.blockIds)) {
    stack.blockIds = [];
  }
  stack.blockIds.push(newBlock.id);

  try {
    const nextJson = JSON.stringify(sleeve, null, 2);
    return { nextJson };
  } catch (e: any) {
    return { error: e.message ?? "Failed to serialize JSON" };
  }
}

export function insertBlockIntoStackByMolt(
  json: string,
  stackId: string,
  blockTemplate: {
    id: string;
    title: string;
    moltType: string;
    content: string;
    tags: string[];
    priorityOrder: number;
  }
): UpdateResult {
  const { sleeve, error } = parseSleeve(json);
  if (error || !sleeve) {
    return { error: error ?? "Failed to parse sleeve" };
  }

  if (!Array.isArray(sleeve.blocks)) {
    sleeve.blocks = [];
  }

  if (!Array.isArray(sleeve.stacks)) {
    return { error: "No stacks in sleeve" };
  }

  const stack = sleeve.stacks.find((s: any) => s.id === stackId);
  if (!stack) {
    return { error: `Stack not found: ${stackId}` };
  }

  const newBlock = {
    id: blockTemplate.id,
    title: blockTemplate.title,
    moltType: blockTemplate.moltType,
    priorityOrder: blockTemplate.priorityOrder,
    content: blockTemplate.content,
    tags: [...blockTemplate.tags]
  };

  sleeve.blocks.push(newBlock);

  if (!Array.isArray(stack.blockIds)) {
    stack.blockIds = [];
  }

  const blocksById: Record<string, any> = {};
  for (const b of sleeve.blocks) {
    if (b.id) blocksById[b.id] = b;
  }

  const targetMoltIndex = MOLT_ORDER.indexOf(blockTemplate.moltType as any);
  
  let insertIndex = stack.blockIds.length;
  
  for (let i = stack.blockIds.length - 1; i >= 0; i--) {
    const existingBlock = blocksById[stack.blockIds[i]];
    if (!existingBlock) continue;
    
    const existingMoltIndex = MOLT_ORDER.indexOf(existingBlock.moltType as any);
    
    if (existingMoltIndex === targetMoltIndex) {
      insertIndex = i + 1;
      break;
    }
    
    if (existingMoltIndex < targetMoltIndex) {
      insertIndex = i + 1;
      break;
    }
    
    insertIndex = i;
  }

  stack.blockIds.splice(insertIndex, 0, newBlock.id);

  try {
    const nextJson = JSON.stringify(sleeve, null, 2);
    return { nextJson };
  } catch (e: any) {
    return { error: e.message ?? "Failed to serialize JSON" };
  }
}

export function getStacks(json: string): { id: string; name: string }[] {
  const { sleeve, error } = parseSleeve(json);
  if (error || !sleeve || !Array.isArray(sleeve.stacks)) {
    return [];
  }
  return sleeve.stacks.map((s: any) => ({
    id: s.id ?? "",
    name: s.name ?? s.id ?? "Unnamed"
  }));
}

export function getStacksWithBlockIds(json: string): { id: string; name: string; blockIds: string[] }[] {
  const { sleeve, error } = parseSleeve(json);
  if (error || !sleeve || !Array.isArray(sleeve.stacks)) {
    return [];
  }
  return sleeve.stacks.map((s: any) => ({
    id: s.id ?? "",
    name: s.name ?? s.id ?? "Unnamed",
    blockIds: Array.isArray(s.blockIds) ? s.blockIds : []
  }));
}

export function getBlocks(json: string): { id: string; title: string; moltType: string }[] {
  const { sleeve, error } = parseSleeve(json);
  if (error || !sleeve || !Array.isArray(sleeve.blocks)) {
    return [];
  }
  return sleeve.blocks.map((b: any) => ({
    id: b.id ?? "",
    title: b.title ?? b.id ?? "Unnamed",
    moltType: b.moltType ?? "instruction"
  }));
}

export function getBlocksById(json: string): Record<string, any> {
  const { sleeve, error } = parseSleeve(json);
  if (error || !sleeve || !Array.isArray(sleeve.blocks)) {
    return {};
  }
  const result: Record<string, any> = {};
  for (const b of sleeve.blocks) {
    if (b.id) result[b.id] = b;
  }
  return result;
}
