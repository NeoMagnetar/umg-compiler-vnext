export type MoltType =
  | "trigger"
  | "directive"
  | "instruction"
  | "subject"
  | "primary"
  | "philosophy"
  | "blueprint";

export type BlockRole = "primary_shell" | "merge_contributor" | "annotation" | "off";

export interface Block {
  id: string;
  moltType: MoltType;
  role?: BlockRole;
  priorityOrder?: number; // higher = stronger within same moltType
  content: string;
  tags?: string[];
}

export type SegmentKind = "bundle" | "merge";

export interface BundleSegment {
  id: string;
  kind: "bundle";
  stackId: string;
  blockIds: string[]; // ordered
}

export interface MergeSegment {
  id: string;
  kind: "merge";
  stackId: string;
  blockIds: string[]; // ordered span to merge
  resultBlockId: string; // must exist in sleeve.blocks
  resultMoltType?: MoltType; // required when cross-MOLT
  override?: { allowAdvanced?: boolean }; // reserved (v0+)
}

export type Segment = BundleSegment | MergeSegment;

export interface Stack {
  id: string;
  name?: string;
  domainKey?: string;
  blockIds: string[];
  segments?: Segment[];
}

export interface Trigger {
  id: string;
  name: string;
  description?: string;
}

export interface TriggerState {
  activeTriggerIds: string[];
}

export interface Sleeve {
  id: string;
  name?: string;
  version?: string;

  blocks: Block[];
  stacks: Stack[];

  triggers?: Trigger[];
}

export type Severity = "info" | "warning" | "error";

export interface TraceEvent {
  id: string;
  kind: "pipeline_stage" | "validation_failed" | "note";
  severity: Severity;
  code: string;
  message: string;

  relatedBlockIds?: string[];
  relatedStackIds?: string[];
  relatedTriggerIds?: string[];
  timestamp?: string;
}

export interface Trace {
  sleeveId: string;
  events: TraceEvent[];
}

export interface RuntimeBundle {
  segmentId: string;
  stackId: string;
  blockIds: string[];
}

export interface RuntimeSpec {
  sleeveId: string;
  sleeveName?: string;

  stacks: Array<{
    stackId: string;
    domainKey?: string;
    orderedBlockIds: string[];
  }>;

  blocksByMoltType: Record<MoltType, string[]>;

  bundles?: RuntimeBundle[];

  meta: {
    compiledAt: string;
    compilerVersion: "v0";
  };
}

export interface CompileResult {
  runtime?: RuntimeSpec;
  trace: Trace;
  hasErrors: boolean;
}
