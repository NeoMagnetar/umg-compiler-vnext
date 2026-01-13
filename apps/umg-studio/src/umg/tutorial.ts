import type { Block, NeoBlock, NeoStack, Sleeve } from "./types";
import { isMoltComplete } from "./molt";

export type TutorialStep =
  | "EMPTY"
  | "MOLT_BUILDING"
  | "READY_TO_COMPRESS"
  | "NEOBLOCK_CREATED"
  | "EXTRA_BLOCKS_UNLOCKED"
  | "DUPLICATED"
  | "READY_TO_COMPOSE"
  | "NEOSTACK_NAMED"
  | "SLEEVE_CREATED"
  | "COMPILED";

export function stepLabel(step: TutorialStep): string {
  switch (step) {
    case "EMPTY": return "Start";
    case "MOLT_BUILDING": return "Build 7-role MOLT stack";
    case "READY_TO_COMPRESS": return "Compress to NeoBlock";
    case "NEOBLOCK_CREATED": return "NeoBlock created";
    case "EXTRA_BLOCKS_UNLOCKED": return "Extra blocks unlocked";
    case "DUPLICATED": return "Preview Merge / Bundle";
    case "READY_TO_COMPOSE": return "Commit Merge or Bundle";
    case "NEOSTACK_NAMED": return "Create Sleeve";
    case "SLEEVE_CREATED": return "Compile";
    case "COMPILED": return "Done";
  }
}

export function computeTutorialStep(
  blocks: Block[],
  neoBlocks: NeoBlock[],
  neoStacks: NeoStack[],
  sleeve: Sleeve | null,
  runtimeSpec: any | null
): TutorialStep {
  if (runtimeSpec) return "COMPILED";
  if (sleeve) return "SLEEVE_CREATED";
  if (neoStacks.length > 0) return "NEOSTACK_NAMED";

  if (neoBlocks.length >= 2) return "DUPLICATED";
  if (neoBlocks.length === 1) {
    const extraBlocks = blocks.length > 7;
    return extraBlocks ? "EXTRA_BLOCKS_UNLOCKED" : "NEOBLOCK_CREATED";
  }

  if (isMoltComplete(blocks)) return "READY_TO_COMPRESS";
  if (blocks.length > 0) return "MOLT_BUILDING";
  
  return "EMPTY";
}
