import type { DiagnosticsOutput } from "./diagnostics.js";

export interface CanonicalIrSource {
  sleeve_id?: string | null;
  sleeve_version?: string | null;
  library_sources?: string[];
  compiled_at?: string | null;
  compiler_target?: string | null;
}

export interface CanonicalIrNode {
  node_id: string;
  node_type: string;
  artifact_ref?: string | null;
  state?: string | null;
  payload?: unknown;
}

export interface CanonicalIrEdge {
  from: string;
  to: string;
  edge_kind: string;
  condition?: unknown;
  notes?: string | null;
}

export interface CanonicalIr {
  ir_version: string;
  ir_id: string;
  source: CanonicalIrSource;
  priority_profile?: string | null;
  nodes: CanonicalIrNode[];
  edges: CanonicalIrEdge[];
  routes?: Array<Record<string, unknown> | string>;
  gates?: Array<Record<string, unknown> | string>;
  bundles?: Array<Record<string, unknown> | string>;
  overlays?: Array<Record<string, unknown> | string>;
  merge_recipes?: Array<Record<string, unknown> | string>;
  capabilities?: Array<Record<string, unknown> | string>;
  states?: Record<string, unknown>;
  source_map?: Array<Record<string, unknown>>;
  diagnostics: Array<Record<string, unknown> | string>;
}

export interface RuntimeSpecOutput {
  runtime_spec_version: string;
  runtime_spec_id: string;
  source_ir_id: string;
  active_sleeve: string | Record<string, unknown>;
  active_route: string | Record<string, unknown>;
  active_neostacks: Array<string | Record<string, unknown>>;
  active_neoblocks: Array<string | Record<string, unknown>>;
  active_molt_blocks: Array<string | Record<string, unknown>>;
  bundles: Array<string | Record<string, unknown>>;
  overlays: Array<string | Record<string, unknown>>;
  runtime_slots: Array<string | Record<string, unknown>>;
  excluded: Array<string | Record<string, unknown>>;
  merge_outputs: Array<string | Record<string, unknown>>;
  capabilities: Array<string | Record<string, unknown>>;
  services: Array<string | Record<string, unknown>>;
  state: Record<string, unknown>;
  diagnostics: Array<Record<string, unknown> | string>;
}

export interface TraceEventOutput {
  event_id: string;
  event_type: string;
  pass?: number | null;
  timestamp?: string | null;
  artifact_refs?: string[];
  decision?: string | Record<string, unknown> | null;
  reason?: string | null;
  inputs?: Record<string, unknown> | unknown[] | null;
  outputs?: Record<string, unknown> | unknown[] | null;
  diagnostic_level?: "info" | "warn" | "error" | null;
  source_refs?: string[];
}

export interface TraceOutput {
  trace_version: string;
  trace_id: string;
  source_ir_id: string;
  runtime_spec_id: string | null;
  compiler: {
    name: string | null;
    version: string | null;
    profile: string | null;
  };
  events: TraceEventOutput[];
  diagnostics: Array<Record<string, unknown> | string>;
  summary: Record<string, unknown> | string | null;
}

export interface CompileIrResult {
  runtimeSpec: RuntimeSpecOutput;
  trace: TraceOutput;
  diagnostics: DiagnosticsOutput;
}
