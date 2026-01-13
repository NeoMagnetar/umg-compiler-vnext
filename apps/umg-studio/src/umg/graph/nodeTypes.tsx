import { Handle, Position } from "reactflow";
import { useUmgStore } from "../store";
import { NeoBlockNode } from "./NeoBlockNode";

export function BasicNode({ id, data }: any) {
  const { selectedNodeId, selectNode } = useUmgStore();
  const selected = selectedNodeId === id;

  return (
    <div
      onClick={() => selectNode(id)}
      data-testid={`node-${id}`}
      style={{
        padding: 10,
        border: selected ? "2px solid #60a5fa" : "1px solid rgba(255,255,255,0.2)",
        borderRadius: 12,
        background: selected ? "rgba(30, 35, 50, 0.98)" : "rgba(20, 20, 28, 0.95)",
        minWidth: 200,
        cursor: "pointer",
        boxShadow: selected ? "0 4px 18px rgba(96, 165, 250, 0.2)" : "none",
        color: "#e0e0e0",
        position: "relative"
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <div style={{ fontWeight: 800 }}>{data.title}</div>
      <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{data.subtitle}</div>
      {data.badges?.length ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {data.badges.map((b: string) => (
            <span
              key={b}
              style={{
                fontSize: 10,
                padding: "2px 8px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.15)",
                background: b === "missing" ? "rgba(239, 68, 68, 0.15)" : "rgba(96, 165, 250, 0.15)",
                color: b === "missing" ? "#ef4444" : "#60a5fa",
                opacity: 0.9,
              }}
            >
              {b}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function StartNode({ data }: any) {
  return (
    <div
      data-testid="node-start"
      style={{
        padding: 24,
        border: "2px dashed rgba(96, 165, 250, 0.4)",
        borderRadius: 16,
        background: "rgba(20, 20, 28, 0.95)",
        minWidth: 240,
        textAlign: "center",
        color: "#e0e0e0",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{data.title}</div>
      <div style={{ fontSize: 13, opacity: 0.7, lineHeight: 1.4 }}>
        {data.subtitle}
      </div>
    </div>
  );
}

export function GhostNode({ id, data }: any) {
  const selectNode = useUmgStore(s => s.selectNode);

  return (
    <div
      onClick={() => selectNode(id)}
      data-testid={`node-${id}`}
      style={{
        padding: 10,
        border: "1px dashed rgba(255,255,255,0.15)",
        borderRadius: 12,
        background: "rgba(20, 20, 28, 0.6)",
        minWidth: 200,
        cursor: "pointer",
        color: "#9ca3af",
        position: "relative",
        opacity: 0.7,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <div style={{ fontWeight: 700 }}>{data.title}</div>
      <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>{data.subtitle}</div>
      {data.badges?.length ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {data.badges.map((b: string) => (
            <span
              key={b}
              style={{
                fontSize: 10,
                padding: "2px 8px",
                borderRadius: 999,
                border: "1px dashed rgba(255,255,255,0.1)",
                background: "transparent",
                color: "#9ca3af",
                opacity: 0.7,
              }}
            >
              {b}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const nodeTypes = {
  basic: BasicNode,
  neoblock: NeoBlockNode,
  start: StartNode,
  ghost: GhostNode,
};
