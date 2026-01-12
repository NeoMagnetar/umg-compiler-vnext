export type GraphNodeKind = 
  | "block"
  | "neoblock"
  | "neostack"
  | "stack"
  | "sleeve"
  | "trigger"
  | "governance"
  | "compressed";

export interface GraphNode {
  id: string;
  label: string;
  kind: GraphNodeKind;
  payload: any;
  moltType?: string;
  tags?: string[];
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
