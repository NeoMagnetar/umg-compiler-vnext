export type TutorialStep =
  | "EMPTY"
  | "MOLT_BUILDING"
  | "READY_TO_COMPRESS"
  | "NEOBLOCK_CREATED"
  | "DUPLICATED"
  | "READY_TO_COMPOSE"
  | "NEOSTACK_NAMED"
  | "SLEEVE_CREATED"
  | "COMPILED";

export function stepLabel(step: TutorialStep): string {
  switch (step) {
    case "EMPTY": return "Start";
    case "MOLT_BUILDING": return "Build MOLT (one of each role)";
    case "READY_TO_COMPRESS": return "Compress to NeoBlock";
    case "NEOBLOCK_CREATED": return "Duplicate NeoBlock";
    case "DUPLICATED": return "Preview Merge / Bundle";
    case "READY_TO_COMPOSE": return "Commit Merge or Bundle";
    case "NEOSTACK_NAMED": return "Create Sleeve";
    case "SLEEVE_CREATED": return "Compile";
    case "COMPILED": return "Done";
  }
}
