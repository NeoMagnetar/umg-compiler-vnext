export interface Pos {
  x: number;
  y: number;
}

export interface LayoutState {
  molt: Record<string, Pos>;
  neo: Record<string, Pos>;
  sleeve: Record<string, Pos>;
}

const STORAGE_KEY = "umg-studio-layout";

function getDefaultLayout(): LayoutState {
  return {
    molt: {},
    neo: {},
    sleeve: {}
  };
}

export function loadLayout(): LayoutState {
  if (typeof window === "undefined") {
    return getDefaultLayout();
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return getDefaultLayout();
    
    const parsed = JSON.parse(stored);
    return {
      molt: parsed.molt ?? {},
      neo: parsed.neo ?? {},
      sleeve: parsed.sleeve ?? {}
    };
  } catch {
    return getDefaultLayout();
  }
}

export function saveLayout(layout: LayoutState): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    console.warn("Failed to save layout to localStorage");
  }
}

export function updateMoltPosition(layout: LayoutState, nodeId: string, pos: Pos): LayoutState {
  return {
    ...layout,
    molt: { ...layout.molt, [nodeId]: pos }
  };
}

export function updateNeoPosition(layout: LayoutState, nodeId: string, pos: Pos): LayoutState {
  return {
    ...layout,
    neo: { ...layout.neo, [nodeId]: pos }
  };
}

export function updateSleevePosition(layout: LayoutState, nodeId: string, pos: Pos): LayoutState {
  return {
    ...layout,
    sleeve: { ...layout.sleeve, [nodeId]: pos }
  };
}
