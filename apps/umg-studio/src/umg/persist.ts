import type { Block, NeoBlock, NeoStack, Sleeve, ComposePreview, MergeMode } from "./types";
import type { TutorialStep } from "./tutorial";

const STORAGE_KEY = "umg-studio-v0";
const SCHEMA_VERSION = 1;

export type PersistedState = {
  version: number;
  tutorialStep: TutorialStep;
  blocks: Block[];
  neoBlocks: NeoBlock[];
  selectedNeoBlockIds: string[];
  expandedNeoBlockIds: Record<string, boolean>;
  preview: ComposePreview;
  lastComposeMode: MergeMode | null;
  neoStacks: NeoStack[];
  sleeve: Sleeve | null;
  runtimeSpec: any | null;
  trace: any | null;
};

export function saveState(state: Omit<PersistedState, "version">): void {
  try {
    const data: PersistedState = {
      version: SCHEMA_VERSION,
      ...state,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Failed to save state to localStorage:", e);
  }
}

export function loadState(): Omit<PersistedState, "version"> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as PersistedState;

    if (data.version !== SCHEMA_VERSION) {
      console.warn(`Schema version mismatch: stored=${data.version}, current=${SCHEMA_VERSION}. Resetting.`);
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return {
      tutorialStep: data.tutorialStep,
      blocks: data.blocks ?? [],
      neoBlocks: data.neoBlocks ?? [],
      selectedNeoBlockIds: data.selectedNeoBlockIds ?? [],
      expandedNeoBlockIds: data.expandedNeoBlockIds ?? {},
      preview: data.preview ?? { semanticOverlap: 0.5, governancePriority: 0.5 },
      lastComposeMode: data.lastComposeMode ?? null,
      neoStacks: data.neoStacks ?? [],
      sleeve: data.sleeve ?? null,
      runtimeSpec: data.runtimeSpec ?? null,
      trace: data.trace ?? null,
    };
  } catch (e) {
    console.warn("Failed to load state from localStorage:", e);
    return null;
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn("Failed to clear localStorage:", e);
  }
}
