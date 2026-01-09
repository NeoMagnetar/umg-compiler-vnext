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

export interface Stack {
  id: string;
  name?: string;
  domainKey?: string;
  blockIds: string[];
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

export interface RuntimeSpec {
  sleeveId: string;
  sleeveName?: string;

  // Minimal v0 compiled views (no governance/merge/bundle yet)
  stacks: Array<{
    stackId: string;
    domainKey?: string;
    orderedBlockIds: string[];
  }>;

  blocksByMoltType: Record<MoltType, string[]>;

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
