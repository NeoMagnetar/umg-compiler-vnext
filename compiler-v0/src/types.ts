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

// ─────────────────────────────────────────────────────────────────────────────
// Governance Types
// ─────────────────────────────────────────────────────────────────────────────

export type GovernanceScopeType = "sleeve" | "stack" | "block";

export type GovernanceScope =
  | { type: "sleeve" }
  | { type: "stack"; stackId: string }
  | { type: "block"; blockId: string };

export interface GovernanceCondition {
  triggerIdsAny?: string[];
  triggerIdsAll?: string[];
}

export interface GovernanceTargetFilter {
  moltTypes?: MoltType[];
  blockIds?: string[];
  stackIds?: string[];
  tagsAny?: string[];
  roles?: BlockRole[];
}

export type GovernanceEffectType =
  | "forbid"
  | "require"
  | "prefer"
  | "override_priority"
  | "limit";

export type GovernanceSeverity = "hard" | "soft";

export type GovernanceEffect =
  | { type: "forbid"; severity: GovernanceSeverity }
  | { type: "require"; severity: GovernanceSeverity }
  | { type: "prefer"; severity: GovernanceSeverity; boost?: number }
  | { type: "override_priority"; severity: GovernanceSeverity; setTo?: number; delta?: number }
  | { type: "limit"; severity: GovernanceSeverity; maxCount: number };

export interface GovernanceRule {
  id: string;
  name: string;
  description?: string;
  condition?: GovernanceCondition;
  target: GovernanceTargetFilter;
  effect: GovernanceEffect;
}

export interface GovernanceBinding {
  id: string;
  scope: GovernanceScope;
  rules: GovernanceRule[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Sleeve (extended with governance)
// ─────────────────────────────────────────────────────────────────────────────

export interface Sleeve {
  id: string;
  name?: string;
  version?: string;

  blocks: Block[];
  stacks: Stack[];

  triggers?: Trigger[];
  governance?: GovernanceBinding[];
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
