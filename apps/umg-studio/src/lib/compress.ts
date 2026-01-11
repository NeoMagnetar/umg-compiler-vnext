import { parseSleeve, getBlocksById } from "./sleeveEdit";
import type { NeoBlock } from "./library/neoblockStore";

const MOLT_TYPES = [
  "trigger",
  "directive",
  "instruction",
  "subject",
  "primary",
  "philosophy",
  "blueprint"
] as const;

export interface CompressResult {
  neoBlock?: Omit<NeoBlock, "id" | "createdAt">;
  error?: string;
}

export function compressStackToNeoBlock(
  json: string, 
  stackId: string,
  name?: string
): CompressResult {
  const { sleeve, error } = parseSleeve(json);
  if (error || !sleeve) {
    return { error: error ?? "Failed to parse sleeve" };
  }

  if (!Array.isArray(sleeve.stacks)) {
    return { error: "No stacks in sleeve" };
  }

  const stack = sleeve.stacks.find((s: any) => s.id === stackId);
  if (!stack) {
    return { error: `Stack not found: ${stackId}` };
  }

  const blocksById = getBlocksById(json);
  const blockIds: string[] = Array.isArray(stack.blockIds) ? stack.blockIds : [];

  const lanes: NeoBlock["lanes"] = {
    trigger: [],
    directive: [],
    instruction: [],
    subject: [],
    primary: [],
    philosophy: [],
    blueprint: []
  };

  for (const blockId of blockIds) {
    const block = blocksById[blockId];
    if (!block) continue;

    const moltType = block.moltType as keyof typeof lanes;
    if (moltType && lanes[moltType]) {
      lanes[moltType].push(blockId);
    }
  }

  const counts = MOLT_TYPES
    .map(m => lanes[m].length > 0 ? `${m[0].toUpperCase()}:${lanes[m].length}` : null)
    .filter(Boolean)
    .join(" ");

  const neoBlock: Omit<NeoBlock, "id" | "createdAt"> = {
    name: name ?? stack.name ?? stack.id ?? "Unnamed",
    sourceStackId: stackId,
    lanes,
    summary: counts || "Empty"
  };

  return { neoBlock };
}
