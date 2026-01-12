export type GraphNodeKind = 
  | "block"
  | "neoblock"
  | "neostack"
  | "stack"
  | "sleeve"
  | "trigger"
  | "governance"
  | "compressed";

export interface Pos {
  x: number;
  y: number;
}

export interface GraphNode {
  id: string;
  label: string;
  kind: GraphNodeKind;
  payload: any;
  moltType?: string;
  tags?: string[];
  pos?: Pos;
}

export interface CompressedGroupPayload {
  groupId: string;
  mode: "bundle" | "merge";
  blockIds: string[];
  derivedSummary: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
