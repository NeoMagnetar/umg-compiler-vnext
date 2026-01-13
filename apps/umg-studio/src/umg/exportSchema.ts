import type { Block, NeoBlock, NeoStack, Sleeve, ComposePreview, MergeMode } from "./types";
import type { TutorialStep } from "./tutorial";

export const EXPORT_SCHEMA = "umg-studio-export" as const;
export const EXPORT_VERSION = 1 as const;

export type UMGExportBundleV1 = {
  schema: typeof EXPORT_SCHEMA;
  version: typeof EXPORT_VERSION;
  exportedAt: string;

  data: {
    blocks: Block[];
    neoBlocks: NeoBlock[];
    neoStacks: NeoStack[];
    sleeve: Sleeve | null;

    preview: ComposePreview;
    lastComposeMode: MergeMode | null;

    selectedBlockId: string | null;
    selectedNeoBlockIds: string[];

    expandedNeoBlockIds: Record<string, boolean>;

    runtimeSpec: any | null;
    trace: any | null;

    tutorialStep?: TutorialStep;
  };
};
