const STORAGE_KEY = "umg.sidebar.sections";

export interface SidebarState {
  template: boolean;
  library: boolean;
  tags: boolean;
  structure: boolean;
}

const DEFAULT_STATE: SidebarState = {
  template: false,
  library: true,
  tags: false,
  structure: false
};

export function loadSidebarState(): SidebarState {
  if (typeof window === "undefined") {
    return DEFAULT_STATE;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_STATE;

    const parsed = JSON.parse(stored);
    return {
      template: parsed.template ?? DEFAULT_STATE.template,
      library: parsed.library ?? DEFAULT_STATE.library,
      tags: parsed.tags ?? DEFAULT_STATE.tags,
      structure: parsed.structure ?? DEFAULT_STATE.structure
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveSidebarState(state: SidebarState): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    console.warn("Failed to save sidebar state to localStorage");
  }
}

export function toggleSection(state: SidebarState, section: keyof SidebarState): SidebarState {
  const next = { ...state, [section]: !state[section] };
  saveSidebarState(next);
  return next;
}
