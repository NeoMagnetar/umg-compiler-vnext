import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { Block, MoltRole, NeoBlock, NeoStack, Sleeve, ComposePreview, MergeMode, MoltSnapshot } from "./types";
import { isMoltComplete, nextAllowedRole, getSpineBlocks } from "./molt";
import { computeTutorialStep, type TutorialStep } from "./tutorial";

const STORAGE_KEY = "umg.v0.creator";
const STORAGE_VERSION = 2;

type State = {
  tutorialStep: TutorialStep;
  hydrated: boolean;

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
  addExtraBlock: (role: MoltRole) => void;
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
  resetAll: () => void;
};

export const useUmgStore = create<State>()(
  persist(
    (set, get) => ({
      tutorialStep: "EMPTY",
      hydrated: false,

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

      createBlock: (title) => {
        const { blocks } = get();
        const role: MoltRole = blocks.length < 7 ? nextAllowedRole(blocks) : "BLUEPRINT";
        const b: Block = {
          id: nanoid(),
          role,
          title: title ?? `${role} Block`,
          content: "",
          createdAt: Date.now(),
        };

        const nextBlocks = [...blocks, b];
        const { neoBlocks, neoStacks, sleeve, runtimeSpec } = get();
        const nextStep = computeTutorialStep(nextBlocks, neoBlocks, neoStacks, sleeve, runtimeSpec);

        set({ blocks: nextBlocks, selectedBlockId: b.id, tutorialStep: nextStep });
      },

      addExtraBlock: (role: MoltRole) => {
        const { blocks, neoBlocks, neoStacks, sleeve, runtimeSpec } = get();
        if (neoBlocks.length === 0) return;

        const b: Block = {
          id: nanoid(),
          role,
          title: `${role} Block (Extra)`,
          content: "",
          createdAt: Date.now(),
        };

        const nextBlocks = [...blocks, b];
        const nextStep = computeTutorialStep(nextBlocks, neoBlocks, neoStacks, sleeve, runtimeSpec);

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
        const { blocks, neoBlocks, neoStacks, sleeve, runtimeSpec } = get();
        const spine = getSpineBlocks(blocks);
        if (spine.length < 7) return;

        const getBlock = (role: MoltRole) => {
          const b = spine.find(x => x.role === role);
          if (!b) throw new Error(`Missing role during compress: ${role}`);
          return b;
        };

        const snapshot: MoltSnapshot = {
          TRIGGER: { title: getBlock("TRIGGER").title, content: getBlock("TRIGGER").content },
          DIRECTIVE: { title: getBlock("DIRECTIVE").title, content: getBlock("DIRECTIVE").content },
          INSTRUCTION: { title: getBlock("INSTRUCTION").title, content: getBlock("INSTRUCTION").content },
          SUBJECT: { title: getBlock("SUBJECT").title, content: getBlock("SUBJECT").content },
          PRIMARY: { title: getBlock("PRIMARY").title, content: getBlock("PRIMARY").content },
          PHILOSOPHY: { title: getBlock("PHILOSOPHY").title, content: getBlock("PHILOSOPHY").content },
          BLUEPRINT: { title: getBlock("BLUEPRINT").title, content: getBlock("BLUEPRINT").content },
        };

        const nb: NeoBlock = {
          id: nanoid(),
          sourceBlockIds: spine.map(b => b.id),
          createdAt: Date.now(),
          label: "NeoBlock",
          snapshot,
        };

        const nextNeoBlocks = [...neoBlocks, nb];
        const nextStep = computeTutorialStep(blocks, nextNeoBlocks, neoStacks, sleeve, runtimeSpec);

        set({
          neoBlocks: nextNeoBlocks,
          selectedNeoBlockIds: [nb.id],
          tutorialStep: nextStep,
        });
      },

      duplicateNeoBlock: (neoBlockId) => {
        const { neoBlocks, blocks, neoStacks, sleeve, runtimeSpec } = get();
        const src = neoBlocks.find(n => n.id === neoBlockId);
        if (!src) return;

        const dup: NeoBlock = {
          id: nanoid(),
          sourceBlockIds: [...src.sourceBlockIds],
          createdAt: Date.now(),
          label: "NeoBlock (Copy)",
          snapshot: src.snapshot,
        };

        const nextNeoBlocks = [...neoBlocks, dup];
        const nextStep = computeTutorialStep(blocks, nextNeoBlocks, neoStacks, sleeve, runtimeSpec);

        set({
          neoBlocks: nextNeoBlocks,
          selectedNeoBlockIds: [src.id, dup.id],
          tutorialStep: nextStep,
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
        const { selectedNeoBlockIds, neoBlocks, preview, blocks, neoStacks, sleeve, runtimeSpec } = get();
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

        const nextNeoBlocks = [...neoBlocks, newNeo];
        const nextStep = computeTutorialStep(blocks, nextNeoBlocks, neoStacks, sleeve, runtimeSpec);

        set({
          neoBlocks: nextNeoBlocks,
          selectedNeoBlockIds: [newNeo.id],
          lastComposeMode: mode,
          tutorialStep: nextStep,
        });
      },

      nameNeoStack: (name) => {
        const { selectedNeoBlockIds, neoStacks, blocks, neoBlocks, sleeve, runtimeSpec } = get();
        if (selectedNeoBlockIds.length < 1) return;

        const ns: NeoStack = {
          id: nanoid(),
          name,
          neoBlockIds: [...selectedNeoBlockIds],
          createdAt: Date.now(),
        };

        const nextNeoStacks = [...neoStacks, ns];
        const nextStep = computeTutorialStep(blocks, neoBlocks, nextNeoStacks, sleeve, runtimeSpec);

        set({
          neoStacks: nextNeoStacks,
          tutorialStep: nextStep,
        });
      },

      createSleeve: (name) => {
        const { neoStacks, blocks, neoBlocks, runtimeSpec } = get();
        const last = neoStacks[neoStacks.length - 1];
        if (!last) return;

        const newSleeve: Sleeve = {
          id: nanoid(),
          name,
          neoStackId: last.id,
          createdAt: Date.now(),
        };

        const nextStep = computeTutorialStep(blocks, neoBlocks, neoStacks, newSleeve, runtimeSpec);

        set({ sleeve: newSleeve, tutorialStep: nextStep });
      },

      compile: () => {
        const { sleeve, neoStacks, neoBlocks, blocks } = get();
        if (!sleeve?.neoStackId) return;

        const ns = neoStacks.find(s => s.id === sleeve.neoStackId);
        if (!ns) return;

        const nsNeoBlocks = ns.neoBlockIds
          .map(id => neoBlocks.find(n => n.id === id))
          .filter(Boolean);

        const newRuntimeSpec = {
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
          notes: ["v0 structural compile", "no LLM synthesis", "7-role MOLT stack"],
        };

        const nextStep = computeTutorialStep(blocks, neoBlocks, neoStacks, sleeve, newRuntimeSpec);

        set({ runtimeSpec: newRuntimeSpec, trace, tutorialStep: nextStep });
      },

      resetAll: () => {
        localStorage.removeItem(STORAGE_KEY);

        set({
          tutorialStep: "EMPTY",
          hydrated: true,
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
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),

      partialize: (state) => ({
        blocks: state.blocks,
        selectedBlockId: state.selectedBlockId,
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

      migrate: (persisted: any, version) => {
        if (version < 2) {
          return {
            ...persisted,
            expandedNeoBlockIds: persisted.expandedNeoBlockIds ?? {},
            blocks: [],
            neoBlocks: [],
          };
        }
        return persisted;
      },

      onRehydrateStorage: () => (state) => {
        if (state) {
          const step = computeTutorialStep(
            state.blocks,
            state.neoBlocks,
            state.neoStacks,
            state.sleeve,
            state.runtimeSpec
          );
          state.tutorialStep = step;
          state.hydrated = true;
        }
      },
    }
  )
);
