export type MoltRole =
  | "TRIGGER"
  | "DIRECTIVE"
  | "INSTRUCTION"
  | "SUBJECT"
  | "PRIMARY"
  | "PHILOSOPHY"
  | "BLUEPRINT";

export type MoltSnapshot = Record<MoltRole, { title: string; content: string }>;

export type Block = {
  id: string;
  role: MoltRole;
  title: string;
  content: string;
  tags: string[];
  priorityOrder: number;
  createdAt: number;
};

export type NeoBlock = {
  id: string;
  sourceBlockIds: string[];
  createdAt: number;
  label: string;
  snapshot: MoltSnapshot;
};

export type NeoStack = {
  id: string;
  name: string;
  neoBlockIds: string[];
  createdAt: number;
};

export type Sleeve = {
  id: string;
  name: string;
  neoStackId: string | null;
  createdAt: number;
};

export type MergeMode = "MERGE" | "BUNDLE";

export type ComposePreview = {
  semanticOverlap: number;
  governancePriority: number;
};
