export interface NeoStack {
  id: string;
  name: string;
  createdAt: number;
  neoBlockIds: string[];
  summary?: string;
}

const STORAGE_KEY = "umg_studio_neostack_library";

function generateId(): string {
  return `neostack_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function listNeoStacks(): NeoStack[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const stacks = JSON.parse(raw);
    if (!Array.isArray(stacks)) return [];
    return stacks;
  } catch {
    return [];
  }
}

export function saveNeoStack(neoStack: Omit<NeoStack, "id" | "createdAt">): NeoStack {
  const stacks = listNeoStacks();
  
  const newStack: NeoStack = {
    id: generateId(),
    name: neoStack.name,
    createdAt: Date.now(),
    neoBlockIds: [...neoStack.neoBlockIds],
    summary: neoStack.summary
  };

  stacks.push(newStack);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stacks));
  return newStack;
}

export function loadNeoStack(id: string): NeoStack | null {
  const stacks = listNeoStacks();
  return stacks.find(s => s.id === id) ?? null;
}

export function deleteNeoStack(id: string): boolean {
  const stacks = listNeoStacks();
  const filtered = stacks.filter(s => s.id !== id);
  if (filtered.length === stacks.length) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}
