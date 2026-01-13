import type { MoltRole, Block } from "./types";

export const MOLT_ORDER: MoltRole[] = [
  "TRIGGER",
  "DIRECTIVE",
  "INSTRUCTION",
  "SUBJECT",
  "PRIMARY",
  "PHILOSOPHY",
  "BLUEPRINT",
];

export function moltIndex(role: MoltRole): number {
  return MOLT_ORDER.indexOf(role);
}

export function hasRole(blocks: Block[], role: MoltRole): boolean {
  return blocks.some(b => b.role === role);
}

export function isMoltComplete(blocks: Block[]): boolean {
  return MOLT_ORDER.every(r => hasRole(blocks, r));
}

export function nextAllowedRole(blocks: Block[]): MoltRole {
  for (const role of MOLT_ORDER) {
    if (!hasRole(blocks, role)) return role;
  }
  return "BLUEPRINT";
}
