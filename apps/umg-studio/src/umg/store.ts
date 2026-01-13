import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { Block, MoltRole, NeoBlock, NeoStack, Sleeve, ComposePreview, MergeMode, MoltSnapshot } from "./types";
import { isMoltComplete, nextAllowedRole } from "./molt";
import type { TutorialStep } from "./tutorial";
import { saveState, loadState, clearState } from "./persist";

type State = {
  tutorialStep: TutorialStep;

  blocks: Block[];
  selectedBlockId: string | null;
  selectedNodeId: string | null;

  neoBlocks: NeoBlock[];
  selectedNeoBlockIds: string[];
  expandedNeoBlockIds: Record<string, boolean>;

  preview: ComposePreview;
  lastComposeMode: MergeMode | null;

  neoStacks: NeoStack[];
  sleeve: Sleeve | null;

  runtimeSpec: any | null;
  trace: any | null;

  createBlock: (title?: string) => void;
  selectBlock: (id: string | null) => void;
  selectNode: (nodeId: string | null) => void;
  updateBlockContent: (role: MoltRole, content: string) => void;
  updateBlockTitle: (role: MoltRole, title: string) => void;

  compressToNeoBlock: () => void;
  duplicateNeoBlock: (neoBlockId: string) => void;
  toggleSelectNeoBlock: (neoBlockId: string) => void;
  toggleNeoBlockExpanded: (neoBlockId: string) => void;

  setPreview: (p: Partial<ComposePreview>) => void;
  commitCompose: (mode: MergeMode) => void;

  nameNeoStack: (name: string) => void;
  createSleeve: (name: string) => void;

  compile: () => void;
  resetState: () => void;
};

const getInitialState = () => {
  const persisted = loadState();
  if (persisted) {
    return {
      tutorialStep: persisted.tutorialStep,
      blocks: persisted.blocks,
      neoBlocks: persisted.neoBlocks,
      selectedNeoBlockIds: persisted.selectedNeoBlockIds,
      expandedNeoBlockIds: persisted.expandedNeoBlockIds,
      preview: persisted.preview,
      lastComposeMode: persisted.lastComposeMode,
      neoStacks: persisted.neoStacks,
      sleeve: persisted.sleeve,
      runtimeSpec: persisted.runtimeSpec,
      trace: persisted.trace,
    };
  }
  return {
    tutorialStep: "EMPTY" as TutorialStep,
    blocks: [] as Block[],
    neoBlocks: [] as NeoBlock[],
    selectedNeoBlockIds: [] as string[],
    expandedNeoBlockIds: {} as Record<string, boolean>,
    preview: { semanticOverlap: 0.5, governancePriority: 0.5 },
    lastComposeMode: null as MergeMode | null,
    neoStacks: [] as NeoStack[],
    sleeve: null as Sleeve | null,
    runtimeSpec: null,
    trace: null,
  };
};

const initialState = getInitialState();

export const useUmgStore = create<State>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    selectedBlockId: null,
    selectedNodeId: null,

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

    selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

    updateBlockContent: (role, content) => {
      const { blocks } = get();
      const idx = blocks.findIndex(b => b.role === role);
      if (idx === -1) return;
      const next = blocks.slice();
      next[idx] = { ...next[idx], content };
      set({ blocks: next });
    },

    updateBlockTitle: (role, title) => {
      const { blocks } = get();
      const idx = blocks.findIndex(b => b.role === role);
      if (idx === -1) return;
      const next = blocks.slice();
      next[idx] = { ...next[idx], title };
      set({ blocks: next });
    },

    compressToNeoBlock: () => {
      const { blocks, neoBlocks, tutorialStep } = get();
      if (!isMoltComplete(blocks)) return;

      const getBlock = (role: MoltRole) => {
        const b = blocks.find(x => x.role === role);
        if (!b) throw new Error(`Missing role during compress: ${role}`);
        return b;
      };

      const snapshot: MoltSnapshot = {
        TRIGGER: { title: getBlock("TRIGGER").title, content: getBlock("TRIGGER").content },
        DIRECTIVE: { title: getBlock("DIRECTIVE").title, content: getBlock("DIRECTIVE").content },
        INSTRUCTION: { title: getBlock("INSTRUCTION").title, content: getBlock("INSTRUCTION").content },
        SUBJECT: { title: getBlock("SUBJECT").title, content: getBlock("SUBJECT").content },
      };

      const nb: NeoBlock = {
        id: nanoid(),
        sourceBlockIds: blocks.map(b => b.id),
        createdAt: Date.now(),
        label: "NeoBlock",
        snapshot,
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
        snapshot: src.snapshot,
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

    toggleNeoBlockExpanded: (neoBlockId) => {
      const cur = get().expandedNeoBlockIds[neoBlockId] ?? false;
      set({
        expandedNeoBlockIds: {
          ...get().expandedNeoBlockIds,
          [neoBlockId]: !cur,
        },
      });
    },

    setPreview: (p) => set({ preview: { ...get().preview, ...p } }),

    commitCompose: (mode) => {
      const { selectedNeoBlockIds, neoBlocks, preview } = get();
      if (selectedNeoBlockIds.length !== 2) return;

      const [aId, bId] = selectedNeoBlockIds;
      const A = neoBlocks.find(n => n.id === aId);
      const B = neoBlocks.find(n => n.id === bId);
      if (!A || !B) return;

      const dominant = preview.governancePriority >= 0.5 ? A : B;
      const mergedLabel = mode === "MERGE" ? "NeoBlock (Merged)" : "NeoBlock Group";
      const newNeo: NeoBlock = {
        id: nanoid(),
        sourceBlockIds: [...new Set([...A.sourceBlockIds, ...B.sourceBlockIds])],
        createdAt: Date.now(),
        label: `${mergedLabel} • ov=${preview.semanticOverlap.toFixed(2)} gp=${preview.governancePriority.toFixed(2)}`,
        snapshot: dominant.snapshot,
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
      const { sleeve, neoStacks, neoBlocks, blocks } = get();
      if (!sleeve?.neoStackId) return;

      const ns = neoStacks.find(s => s.id === sleeve.neoStackId);
      if (!ns) return;

      const nsNeoBlocks = ns.neoBlockIds
        .map(id => neoBlocks.find(n => n.id === id))
        .filter(Boolean);

      const runtimeSpec = {
        sleeve: { id: sleeve.id, name: sleeve.name, neoStackId: sleeve.neoStackId },
        neoStack: { id: ns.id, name: ns.name, neoBlockIds: ns.neoBlockIds },
        neoBlocks: nsNeoBlocks.map((n: any) => ({
          id: n.id,
          label: n.label,
          lineage: n.sourceBlockIds,
          snapshot: n.snapshot,
        })),
      };

      const trace = {
        compiledAt: new Date().toISOString(),
        moltBlocks: blocks.map(b => ({
          id: b.id,
          role: b.role,
          title: b.title,
          contentLen: b.content.length,
          createdAt: b.createdAt,
        })),
        sleeve: { id: sleeve.id, name: sleeve.name },
        neoStack: { id: ns.id, name: ns.name },
        notes: ["v0 structural compile", "no LLM synthesis"],
      };

      set({ runtimeSpec, trace, tutorialStep: "COMPILED" });
    },

    resetState: () => {
      clearState();
      set({
        tutorialStep: "EMPTY",
        blocks: [],
        selectedBlockId: null,
        selectedNodeId: null,
        neoBlocks: [],
        selectedNeoBlockIds: [],
        expandedNeoBlockIds: {},
        preview: { semanticOverlap: 0.5, governancePriority: 0.5 },
        lastComposeMode: null,
        neoStacks: [],
        sleeve: null,
        runtimeSpec: null,
        trace: null,
      });
    },
  }))
);

useUmgStore.subscribe(
  (state) => ({
    tutorialStep: state.tutorialStep,
    blocks: state.blocks,
    neoBlocks: state.neoBlocks,
    selectedNeoBlockIds: state.selectedNeoBlockIds,
    expandedNeoBlockIds: state.expandedNeoBlockIds,
    preview: state.preview,
    lastComposeMode: state.lastComposeMode,
    neoStacks: state.neoStacks,
    sleeve: state.sleeve,
    runtimeSpec: state.runtimeSpec,
    trace: state.trace,
  }),
  (current) => {
    saveState(current);
  }
);
