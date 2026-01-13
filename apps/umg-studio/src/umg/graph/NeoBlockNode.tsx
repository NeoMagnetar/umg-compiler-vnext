import { Handle, Position } from "reactflow";
import { useUmgStore } from "../store";
import type { MoltRole } from "../types";

const ORDER: MoltRole[] = ["TRIGGER", "DIRECTIVE", "INSTRUCTION", "SUBJECT"];

export function NeoBlockNode({ data }: any) {
  const {
    expandedNeoBlockIds,
    toggleNeoBlockExpanded,
    toggleSelectNeoBlock,
    selectedNeoBlockIds,
  } = useUmgStore();

  const neoBlockId: string = data.neoBlockId;
  const selected = selectedNeoBlockIds.includes(neoBlockId);
  const expanded = expandedNeoBlockIds[neoBlockId] ?? false;

  return (
    <div
      data-testid={`neoblock-node-${neoBlockId}`}
      style={{
        padding: 10,
        border: selected ? "2px solid #60a5fa" : "1px solid rgba(255,255,255,0.2)",
        borderRadius: 14,
        background: selected ? "rgba(30, 35, 50, 0.98)" : "rgba(20, 20, 28, 0.95)",
        minWidth: 280,
        boxShadow: selected ? "0 4px 18px rgba(96, 165, 250, 0.2)" : "none",
        color: "#e0e0e0",
        position: "relative"
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontWeight: 900 }}>{data.label}</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            lineage: {data.lineageCount} blocks
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={(e) => { e.stopPropagation(); toggleSelectNeoBlock(neoBlockId); }}
            data-testid={`button-select-nb-${neoBlockId}`}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: selected ? "1px solid #60a5fa" : "1px solid rgba(255,255,255,0.2)",
              background: selected ? "rgba(96, 165, 250, 0.2)" : "rgba(60,60,80,0.5)",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
              color: selected ? "#60a5fa" : "#e0e0e0"
            }}
            title="Select (pick 2 for Merge/Bundle)"
          >
            {selected ? "Selected" : "Select"}
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); toggleNeoBlockExpanded(neoBlockId); }}
            data-testid={`button-expand-nb-${neoBlockId}`}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(60,60,80,0.5)",
              cursor: "pointer",
              fontWeight: 900,
              color: "#e0e0e0",
              fontSize: 14
            }}
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? "▾" : "▸"}
          </button>
        </div>
      </div>

      {expanded ? (
        <div style={{ marginTop: 10, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 800, marginBottom: 6, color: "#60a5fa" }}>
            Internal MOLT Snapshot (read-only)
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            {ORDER.map((r) => (
              <div
                key={r}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  padding: "6px 8px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  background: "rgba(0,0,0,0.3)",
                }}
              >
                <div style={{ width: 90, fontWeight: 800, fontSize: 10, color: "#60a5fa" }}>{r}</div>
                <div style={{ fontSize: 11, opacity: 0.9, flex: 1 }}>
                  {data.roleTitles?.[r] ?? "—"}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 10, fontSize: 10, opacity: 0.6, fontStyle: "italic" }}>
            NeoBlocks are artifacts. Edit live blocks on the MOLT ladder, then compress to create a new NeoBlock.
          </div>
        </div>
      ) : null}
    </div>
  );
}
