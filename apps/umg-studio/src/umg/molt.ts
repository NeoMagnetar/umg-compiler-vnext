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

export function getSpineBlocks(blocks: Block[]): Block[] {
  const spine: Block[] = [];
  for (const role of MOLT_ORDER) {
    const earliest = blocks
      .filter(b => b.role === role)
      .sort((a, b) => a.createdAt - b.createdAt)[0];
    if (earliest) spine.push(earliest);
  }
  return spine;
}

export function getExtraBlocks(blocks: Block[]): Block[] {
  const spineIds = new Set(getSpineBlocks(blocks).map(b => b.id));
  return blocks.filter(b => !spineIds.has(b.id));
}

export function hasRole(blocks: Block[], role: MoltRole): boolean {
  return blocks.some(b => b.role === role);
}

export function isMoltComplete(blocks: Block[]): boolean {
  const spine = getSpineBlocks(blocks);
  return MOLT_ORDER.every(r => spine.some(b => b.role === r));
}

export function nextAllowedRole(blocks: Block[]): MoltRole | null {
  const spine = getSpineBlocks(blocks);
  for (const role of MOLT_ORDER) {
    if (!spine.some(b => b.role === role)) return role;
  }
  return null;
}
