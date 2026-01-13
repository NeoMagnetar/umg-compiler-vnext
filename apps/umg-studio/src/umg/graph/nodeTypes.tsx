import { useUmgStore } from "../store";

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
        color: "#e0e0e0"
      }}
    >
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

export const nodeTypes = { basic: BasicNode };
