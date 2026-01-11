export interface NeoBlock {
  id: string;
  name: string;
  sourceStackId: string;
  createdAt: number;
  lanes: {
    trigger: string[];
    directive: string[];
    instruction: string[];
    subject: string[];
    primary: string[];
    philosophy: string[];
    blueprint: string[];
  };
  summary?: string;
}

const STORAGE_KEY = "umg_studio_neoblock_library";

function generateId(): string {
  return `neo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function listNeoBlocks(): NeoBlock[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const blocks = JSON.parse(raw);
    if (!Array.isArray(blocks)) return [];
    return blocks;
  } catch {
    return [];
  }
}

export function saveNeoBlock(neoBlock: Omit<NeoBlock, "id" | "createdAt">): NeoBlock {
  const blocks = listNeoBlocks();
  
  const newBlock: NeoBlock = {
    id: generateId(),
    name: neoBlock.name,
    sourceStackId: neoBlock.sourceStackId,
    createdAt: Date.now(),
    lanes: { ...neoBlock.lanes },
    summary: neoBlock.summary
  };

  blocks.push(newBlock);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
  return newBlock;
}

export function loadNeoBlock(id: string): NeoBlock | null {
  const blocks = listNeoBlocks();
  return blocks.find(b => b.id === id) ?? null;
}

export function deleteNeoBlock(id: string): boolean {
  const blocks = listNeoBlocks();
  const filtered = blocks.filter(b => b.id !== id);
  if (filtered.length === blocks.length) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

export function getLaneCounts(neoBlock: NeoBlock): Record<string, number> {
  return {
    trigger: neoBlock.lanes.trigger.length,
    directive: neoBlock.lanes.directive.length,
    instruction: neoBlock.lanes.instruction.length,
    subject: neoBlock.lanes.subject.length,
    primary: neoBlock.lanes.primary.length,
    philosophy: neoBlock.lanes.philosophy.length,
    blueprint: neoBlock.lanes.blueprint.length
  };
}

export function getTotalBlockCount(neoBlock: NeoBlock): number {
  return Object.values(neoBlock.lanes).reduce((sum, arr) => sum + arr.length, 0);
}
