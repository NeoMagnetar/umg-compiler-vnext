import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Block, MoltRole, NeoBlock, NeoStack, Sleeve, ComposePreview, MergeMode } from "./types";
import { isMoltComplete, nextAllowedRole } from "./molt";
import type { TutorialStep } from "./tutorial";

type State = {
  tutorialStep: TutorialStep;

  blocks: Block[];
  selectedBlockId: string | null;

  neoBlocks: NeoBlock[];
  selectedNeoBlockIds: string[];

  preview: ComposePreview;
  lastComposeMode: MergeMode | null;

  neoStacks: NeoStack[];
  sleeve: Sleeve | null;

  createBlock: (title?: string) => void;
  selectBlock: (id: string | null) => void;

  compressToNeoBlock: () => void;
  duplicateNeoBlock: (neoBlockId: string) => void;
  toggleSelectNeoBlock: (neoBlockId: string) => void;

  setPreview: (p: Partial<ComposePreview>) => void;
  commitCompose: (mode: MergeMode) => void;

  nameNeoStack: (name: string) => void;
  createSleeve: (name: string) => void;

  compile: () => void;
};

export const useUmgStore = create<State>((set, get) => ({
  tutorialStep: "EMPTY",

  blocks: [],
  selectedBlockId: null,

  neoBlocks: [],
  selectedNeoBlockIds: [],

  preview: { semanticOverlap: 0.5, governancePriority: 0.5 },
  lastComposeMode: null,

  neoStacks: [],
  sleeve: null,

  createBlock: (title) => {
    const { blocks, tutorialStep } = get();
    const role: MoltRole = blocks.length < 4 ? nextAllowedRole(blocks) : "INSTRUCTION";
    const b: Block = {
      id: nanoid(),
      role,
      title: title ?? `${role} Block`,
      content: "",
      createdAt: Date.now(),
    };

    const nextBlocks = [...blocks, b];

    let nextStep: TutorialStep = tutorialStep;
    if (nextBlocks.length === 1) nextStep = "MOLT_BUILDING";
    if (isMoltComplete(nextBlocks)) nextStep = "READY_TO_COMPRESS";

    set({ blocks: nextBlocks, selectedBlockId: b.id, tutorialStep: nextStep });
  },

  selectBlock: (id) => set({ selectedBlockId: id }),

  compressToNeoBlock: () => {
    const { blocks, neoBlocks, tutorialStep } = get();
    if (!isMoltComplete(blocks)) return;

    const nb: NeoBlock = {
      id: nanoid(),
      sourceBlockIds: blocks.map(b => b.id),
      createdAt: Date.now(),
      label: "NeoBlock",
    };

    set({
      neoBlocks: [...neoBlocks, nb],
      selectedNeoBlockIds: [nb.id],
      tutorialStep: tutorialStep === "READY_TO_COMPRESS" ? "NEOBLOCK_CREATED" : tutorialStep,
    });
  },

  duplicateNeoBlock: (neoBlockId) => {
    const { neoBlocks, tutorialStep } = get();
    const src = neoBlocks.find(n => n.id === neoBlockId);
    if (!src) return;

    const dup: NeoBlock = {
      id: nanoid(),
      sourceBlockIds: [...src.sourceBlockIds],
      createdAt: Date.now(),
      label: "NeoBlock (Copy)",
    };

    const next = [...neoBlocks, dup];
    set({
      neoBlocks: next,
      selectedNeoBlockIds: [src.id, dup.id],
      tutorialStep: tutorialStep === "NEOBLOCK_CREATED" ? "DUPLICATED" : tutorialStep,
    });
  },

  toggleSelectNeoBlock: (neoBlockId) => {
    const { selectedNeoBlockIds } = get();
    let next = selectedNeoBlockIds.includes(neoBlockId)
      ? selectedNeoBlockIds.filter(id => id !== neoBlockId)
      : [...selectedNeoBlockIds, neoBlockId];

    if (next.length > 2) next = next.slice(next.length - 2);

    set({ selectedNeoBlockIds: next });
  },

  setPreview: (p) => set({ preview: { ...get().preview, ...p } }),

  commitCompose: (mode) => {
    const { selectedNeoBlockIds, neoBlocks, preview } = get();
    if (selectedNeoBlockIds.length !== 2) return;

    const [aId, bId] = selectedNeoBlockIds;
    const A = neoBlocks.find(n => n.id === aId);
    const B = neoBlocks.find(n => n.id === bId);
    if (!A || !B) return;

    const mergedLabel = mode === "MERGE" ? "NeoBlock (Merged)" : "NeoBlock Group";
    const newNeo: NeoBlock = {
      id: nanoid(),
      sourceBlockIds: [...new Set([...A.sourceBlockIds, ...B.sourceBlockIds])],
      createdAt: Date.now(),
      label: `${mergedLabel} • ov=${preview.semanticOverlap.toFixed(2)} gp=${preview.governancePriority.toFixed(2)}`,
    };

    set({
      neoBlocks: [...neoBlocks, newNeo],
      selectedNeoBlockIds: [newNeo.id],
      lastComposeMode: mode,
      tutorialStep: "READY_TO_COMPOSE",
    });
  },

  nameNeoStack: (name) => {
    const { selectedNeoBlockIds, neoStacks } = get();
    if (selectedNeoBlockIds.length < 1) return;

    const ns: NeoStack = {
      id: nanoid(),
      name,
      neoBlockIds: [...selectedNeoBlockIds],
      createdAt: Date.now(),
    };

    set({
      neoStacks: [...neoStacks, ns],
      tutorialStep: "NEOSTACK_NAMED",
    });
  },

  createSleeve: (name) => {
    const { neoStacks } = get();
    const last = neoStacks[neoStacks.length - 1];
    if (!last) return;

    const sleeve: Sleeve = {
      id: nanoid(),
      name,
      neoStackId: last.id,
      createdAt: Date.now(),
    };

    set({ sleeve, tutorialStep: "SLEEVE_CREATED" });
  },

  compile: () => {
    const { sleeve } = get();
    if (!sleeve?.neoStackId) return;
    set({ tutorialStep: "COMPILED" });
  },
}));
