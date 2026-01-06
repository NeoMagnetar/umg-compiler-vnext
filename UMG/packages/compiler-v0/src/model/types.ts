// Canonical core types for UMG Compiler v0
// No logic, no imports, no implementation

export type MoltType =
  | "Primary"
  | "Merge"
  | "Blueprint"
  | "Governance"
  | "Off";

export interface UMGBlock {
  id: string;
  moltType: MoltType;
  priority: number;
}

export interface UMGStack {
  id: string;
  blocks: UMGBlock[];
}
