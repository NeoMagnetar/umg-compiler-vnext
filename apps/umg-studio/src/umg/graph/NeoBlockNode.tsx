import { Handle, Position } from "reactflow";
import { useUmgStore } from "../store";
import { MOLT_ORDER } from "../molt";

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
        border: selected ? "2px solid #a78bfa" : "1px solid rgba(167, 139, 250, 0.4)",
        borderRadius: 14,
        background: selected ? "rgba(88, 28, 135, 0.4)" : "rgba(88, 28, 135, 0.25)",
        minWidth: 280,
        boxShadow: selected ? "0 4px 18px rgba(167, 139, 250, 0.3)" : "none",
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
              border: selected ? "1px solid #a78bfa" : "1px solid rgba(255,255,255,0.2)",
              background: selected ? "rgba(167, 139, 250, 0.2)" : "rgba(60,60,80,0.5)",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
              color: selected ? "#a78bfa" : "#e0e0e0"
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
          <div style={{ fontSize: 11, fontWeight: 800, marginBottom: 6, color: "#a78bfa" }}>
            Internal MOLT Snapshot (read-only)
          </div>

          <div style={{ display: "grid", gap: 4 }}>
            {MOLT_ORDER.map((r) => (
              <div
                key={r}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  padding: "4px 6px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 6,
                  background: "rgba(0,0,0,0.3)",
                }}
              >
                <div style={{ width: 80, fontWeight: 800, fontSize: 9, color: "#a78bfa" }}>{r}</div>
                <div style={{ fontSize: 10, opacity: 0.9, flex: 1 }}>
                  {data.roleTitles?.[r] ?? "—"}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 8, fontSize: 9, opacity: 0.6, fontStyle: "italic" }}>
            NeoBlocks are artifacts. Edit live blocks on the MOLT ladder, then compress to create a new NeoBlock.
          </div>
        </div>
      ) : null}
    </div>
  );
}
