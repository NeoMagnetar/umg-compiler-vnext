import { listLibraryBlocks, LibraryBlock } from "./library/store";
import { listNeoBlocks, NeoBlock } from "./library/neoblockStore";
import { listNeoStacks, NeoStack } from "./library/neostackStore";
import { listSleeves, SleeveTemplate } from "./library/sleeveStore";

export interface LibraryExport {
  version: 1;
  exportedAt: number;
  blocks: LibraryBlock[];
  neoBlocks: NeoBlock[];
  neoStacks: NeoStack[];
  sleeves: SleeveTemplate[];
}

const BLOCKS_KEY = "umg_studio_library_blocks";
const NEOBLOCKS_KEY = "umg_studio_neoblock_library";
const NEOSTACKS_KEY = "umg_studio_neostack_library";
const SLEEVES_KEY = "umg_studio_sleeve_library";

export function exportLibrary(): string {
  const data: LibraryExport = {
    version: 1,
    exportedAt: Date.now(),
    blocks: listLibraryBlocks(),
    neoBlocks: listNeoBlocks(),
    neoStacks: listNeoStacks(),
    sleeves: listSleeves()
  };
  return JSON.stringify(data, null, 2);
}

export function importLibrary(jsonStr: string): { success: boolean; error?: string; counts?: { blocks: number; neoBlocks: number; neoStacks: number; sleeves: number } } {
  try {
    const data = JSON.parse(jsonStr);
    
    if (!data || typeof data !== "object") {
      return { success: false, error: "Invalid JSON structure" };
    }

    const counts = {
      blocks: 0,
      neoBlocks: 0,
      neoStacks: 0,
      sleeves: 0
    };

    if (Array.isArray(data.blocks) && data.blocks.length > 0) {
      const existing = listLibraryBlocks();
      const existingIds = new Set(existing.map(b => b.id));
      const newBlocks = data.blocks.filter((b: LibraryBlock) => !existingIds.has(b.id));
      if (newBlocks.length > 0) {
        const merged = [...existing, ...newBlocks];
        localStorage.setItem(BLOCKS_KEY, JSON.stringify(merged));
        counts.blocks = newBlocks.length;
      }
    }

    if (Array.isArray(data.neoBlocks) && data.neoBlocks.length > 0) {
      const existing = listNeoBlocks();
      const existingIds = new Set(existing.map(b => b.id));
      const newNeoBlocks = data.neoBlocks.filter((b: NeoBlock) => !existingIds.has(b.id));
      if (newNeoBlocks.length > 0) {
        const merged = [...existing, ...newNeoBlocks];
        localStorage.setItem(NEOBLOCKS_KEY, JSON.stringify(merged));
        counts.neoBlocks = newNeoBlocks.length;
      }
    }

    if (Array.isArray(data.neoStacks) && data.neoStacks.length > 0) {
      const existing = listNeoStacks();
      const existingIds = new Set(existing.map(s => s.id));
      const newNeoStacks = data.neoStacks.filter((s: NeoStack) => !existingIds.has(s.id));
      if (newNeoStacks.length > 0) {
        const merged = [...existing, ...newNeoStacks];
        localStorage.setItem(NEOSTACKS_KEY, JSON.stringify(merged));
        counts.neoStacks = newNeoStacks.length;
      }
    }

    if (Array.isArray(data.sleeves) && data.sleeves.length > 0) {
      const existing = listSleeves();
      const existingIds = new Set(existing.map(s => s.id));
      const newSleeves = data.sleeves.filter((s: SleeveTemplate) => !existingIds.has(s.id));
      if (newSleeves.length > 0) {
        const merged = [...existing, ...newSleeves];
        localStorage.setItem(SLEEVES_KEY, JSON.stringify(merged));
        counts.sleeves = newSleeves.length;
      }
    }

    return { success: true, counts };
  } catch (e: any) {
    return { success: false, error: e.message ?? "Failed to parse JSON" };
  }
}

export function downloadAsFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
