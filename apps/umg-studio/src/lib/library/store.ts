export interface LibraryBlock {
  id: string;
  title: string;
  moltType: string;
  content: string;
  tags: string[];
  priorityOrder: number;
  savedAt: number;
}

const STORAGE_KEY = "umg_studio_library_blocks";

function generateId(): string {
  return `lib_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function listLibraryBlocks(): LibraryBlock[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getSeededBlocks();
    const blocks = JSON.parse(raw);
    if (!Array.isArray(blocks) || blocks.length === 0) {
      return getSeededBlocks();
    }
    return blocks;
  } catch {
    return getSeededBlocks();
  }
}

export function saveBlockTemplate(block: {
  title: string;
  moltType: string;
  content: string;
  tags: string[];
  priorityOrder: number;
}): LibraryBlock {
  const blocks = listLibraryBlocks();
  
  const newBlock: LibraryBlock = {
    id: generateId(),
    title: block.title,
    moltType: block.moltType,
    content: block.content,
    tags: [...block.tags],
    priorityOrder: block.priorityOrder,
    savedAt: Date.now()
  };

  blocks.push(newBlock);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
  return newBlock;
}

export function loadBlockTemplate(id: string): LibraryBlock | null {
  const blocks = listLibraryBlocks();
  return blocks.find(b => b.id === id) ?? null;
}

export function deleteBlockTemplate(id: string): boolean {
  const blocks = listLibraryBlocks();
  const filtered = blocks.filter(b => b.id !== id);
  if (filtered.length === blocks.length) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

function getSeededBlocks(): LibraryBlock[] {
  return [
    {
      id: "seed_instruction_clarity",
      title: "Clear Instructions",
      moltType: "instruction",
      content: "Respond in a clear, step-by-step manner. Break down complex topics into digestible parts.",
      tags: ["clarity", "structure"],
      priorityOrder: 5,
      savedAt: 0
    },
    {
      id: "seed_primary_assistant",
      title: "Helpful Assistant",
      moltType: "primary",
      content: "You are a helpful, knowledgeable assistant focused on providing accurate and useful information.",
      tags: ["identity", "helpful"],
      priorityOrder: 10,
      savedAt: 0
    },
    {
      id: "seed_trigger_greeting",
      title: "Greeting Trigger",
      moltType: "trigger",
      content: "When the user says hello or greets you, respond warmly and ask how you can help.",
      tags: ["greeting", "onboarding"],
      priorityOrder: 1,
      savedAt: 0
    }
  ];
}

export function mintBlockId(moltType: string, title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 20);
  const shortId = Math.random().toString(36).slice(2, 6);
  return `blk_${moltType}_${slug}_${shortId}`;
}
