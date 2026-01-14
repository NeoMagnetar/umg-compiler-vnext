import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { Block, NeoBlock, NeoStack, Sleeve, TutorialLibrary, LibraryItem } from "./types";

const LIBRARY_KEY = "umg_tutorial_library_v1";

type LibraryKind = "blocks" | "neoBlocks" | "neoStacks" | "sleeves";

type LibraryState = TutorialLibrary & {
  saveBlock: (block: Block, name?: string) => string;
  saveNeoBlock: (neoBlock: NeoBlock, name?: string) => string;
  saveNeoStack: (neoStack: NeoStack, name?: string) => string;
  saveSleeve: (sleeve: Sleeve, name?: string) => string;
  deleteItem: (kind: LibraryKind, id: string) => void;
  getItem: (kind: LibraryKind, id: string) => LibraryItem<any> | undefined;
};

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      blocks: [],
      neoBlocks: [],
      neoStacks: [],
      sleeves: [],

      saveBlock: (block, name) => {
        const item: LibraryItem<Block> = {
          id: nanoid(),
          name: name ?? block.title ?? "Block",
          createdAt: Date.now(),
          tags: block.tags ?? [],
          data: { ...block },
        };
        set({ blocks: [...get().blocks, item] });
        return item.id;
      },

      saveNeoBlock: (neoBlock, name) => {
        const item: LibraryItem<NeoBlock> = {
          id: nanoid(),
          name: name ?? neoBlock.label ?? "NeoBlock",
          createdAt: Date.now(),
          tags: [],
          data: { ...neoBlock },
        };
        set({ neoBlocks: [...get().neoBlocks, item] });
        return item.id;
      },

      saveNeoStack: (neoStack, name) => {
        const item: LibraryItem<NeoStack> = {
          id: nanoid(),
          name: name ?? neoStack.name ?? "NeoStack",
          createdAt: Date.now(),
          tags: [],
          data: { ...neoStack },
        };
        set({ neoStacks: [...get().neoStacks, item] });
        return item.id;
      },

      saveSleeve: (sleeve, name) => {
        const item: LibraryItem<Sleeve> = {
          id: nanoid(),
          name: name ?? sleeve.name ?? "Sleeve",
          createdAt: Date.now(),
          tags: [],
          data: { ...sleeve },
        };
        set({ sleeves: [...get().sleeves, item] });
        return item.id;
      },

      deleteItem: (kind, id) => {
        const list = get()[kind];
        set({ [kind]: list.filter((item: any) => item.id !== id) } as any);
      },

      getItem: (kind, id) => {
        const list = get()[kind];
        return list.find((item: any) => item.id === id);
      },
    }),
    {
      name: LIBRARY_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
);
