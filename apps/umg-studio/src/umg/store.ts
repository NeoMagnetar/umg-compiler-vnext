import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { Block, MoltRole, NeoBlock, NeoStack, Sleeve, ComposePreview, MergeMode, MoltSnapshot } from "./types";
import { nextAllowedRole, getSpineBlocks, MOLT_ORDER } from "./molt";
import { computeTutorialStep, type TutorialStep } from "./tutorial";
import { EXPORT_SCHEMA, EXPORT_VERSION, type UMGExportBundleV1 } from "./exportSchema";

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

  setHydrated: (v: boolean) => void;
  recomputeTutorialStep: () => void;

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

  exportStateToJson: () => string;
  importStateFromJson: (json: string) => { ok: true } | { ok: false; error: string };
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

      setHydrated: (v) => set({ hydrated: v }),

      recomputeTutorialStep: () => {
        const s = get();
        set({
          tutorialStep: computeTutorialStep(
            s.blocks, s.neoBlocks, s.neoStacks, s.sleeve, s.runtimeSpec
          ),
        });
      },

      createBlock: (title) => {
        const { blocks } = get();
        const role = nextAllowedRole(blocks);
        if (role === null) return;

        const b: Block = {
          id: nanoid(),
          role,
          title: title ?? `${role} Block`,
          content: "",
          createdAt: Date.now(),
        };

        set({ blocks: [...blocks, b], selectedBlockId: b.id });
        get().recomputeTutorialStep();
      },

      addExtraBlock: (role: MoltRole) => {
        const { blocks, neoBlocks } = get();
        if (neoBlocks.length === 0) return;

        const b: Block = {
          id: nanoid(),
          role,
          title: `${role} Block (Extra)`,
          content: "",
          createdAt: Date.now(),
        };

        set({ blocks: [...blocks, b], selectedBlockId: b.id });
        get().recomputeTutorialStep();
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
        const { blocks, neoBlocks } = get();
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

        set({
          neoBlocks: [...neoBlocks, nb],
          selectedNeoBlockIds: [nb.id],
        });
        get().recomputeTutorialStep();
      },

      duplicateNeoBlock: (neoBlockId) => {
        const { neoBlocks } = get();
        const src = neoBlocks.find(n => n.id === neoBlockId);
        if (!src) return;

        const dup: NeoBlock = {
          id: nanoid(),
          sourceBlockIds: [...src.sourceBlockIds],
          createdAt: Date.now(),
          label: "NeoBlock (Copy)",
          snapshot: src.snapshot,
        };

        set({
          neoBlocks: [...neoBlocks, dup],
          selectedNeoBlockIds: [src.id, dup.id],
        });
        get().recomputeTutorialStep();
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
        });
        get().recomputeTutorialStep();
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

        set({ neoStacks: [...neoStacks, ns] });
        get().recomputeTutorialStep();
      },

      createSleeve: (name) => {
        const { neoStacks } = get();
        const last = neoStacks[neoStacks.length - 1];
        if (!last) return;

        const newSleeve: Sleeve = {
          id: nanoid(),
          name,
          neoStackId: last.id,
          createdAt: Date.now(),
        };

        set({ sleeve: newSleeve });
        get().recomputeTutorialStep();
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

        set({ runtimeSpec: newRuntimeSpec, trace });
        get().recomputeTutorialStep();
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

      exportStateToJson: () => {
        const s = get();
        const bundle: UMGExportBundleV1 = {
          schema: EXPORT_SCHEMA,
          version: EXPORT_VERSION,
          exportedAt: new Date().toISOString(),
          data: {
            blocks: s.blocks,
            neoBlocks: s.neoBlocks,
            neoStacks: s.neoStacks,
            sleeve: s.sleeve,
            preview: s.preview,
            lastComposeMode: s.lastComposeMode,
            selectedBlockId: s.selectedBlockId,
            selectedNeoBlockIds: s.selectedNeoBlockIds,
            expandedNeoBlockIds: s.expandedNeoBlockIds ?? {},
            runtimeSpec: s.runtimeSpec ?? null,
            trace: s.trace ?? null,
            tutorialStep: s.tutorialStep,
          },
        };
        return JSON.stringify(bundle, null, 2);
      },

      importStateFromJson: (json: string) => {
        let parsed: any;
        try {
          parsed = JSON.parse(json);
        } catch {
          return { ok: false, error: "Invalid JSON. Paste a valid exported bundle." };
        }

        if (parsed?.schema !== EXPORT_SCHEMA) {
          return { ok: false, error: "Not a UMG Studio export bundle (schema mismatch)." };
        }
        if (parsed?.version !== EXPORT_VERSION) {
          return { ok: false, error: `Unsupported export version: ${parsed?.version}. Expected version ${EXPORT_VERSION}.` };
        }
        if (!parsed?.data) {
          return { ok: false, error: "Export bundle missing data field." };
        }

        const d = parsed.data;

        if (!Array.isArray(d.blocks) || !Array.isArray(d.neoBlocks) || !Array.isArray(d.neoStacks)) {
          return { ok: false, error: "Export bundle data arrays are malformed." };
        }

        set({
          blocks: d.blocks,
          neoBlocks: d.neoBlocks,
          neoStacks: d.neoStacks,
          sleeve: d.sleeve ?? null,
          preview: d.preview ?? get().preview,
          lastComposeMode: d.lastComposeMode ?? null,
          selectedBlockId: d.selectedBlockId ?? null,
          selectedNeoBlockIds: Array.isArray(d.selectedNeoBlockIds) ? d.selectedNeoBlockIds : [],
          expandedNeoBlockIds: d.expandedNeoBlockIds ?? {},
          runtimeSpec: d.runtimeSpec ?? null,
          trace: d.trace ?? null,
        });

        get().recomputeTutorialStep();
        return { ok: true };
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
          state.recomputeTutorialStep();
          state.setHydrated(true);
        }
      },
    }
  )
);
