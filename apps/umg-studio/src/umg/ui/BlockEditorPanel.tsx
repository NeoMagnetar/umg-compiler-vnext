import { useMemo } from "react";
import { useUmgStore } from "../store";
import type { MoltRole } from "../types";

function roleFromNodeId(nodeId: string | null): MoltRole | null {
  if (!nodeId) return null;
  if (nodeId.startsWith("role-")) return nodeId.replace("role-", "") as MoltRole;
  return null;
}

export function BlockEditorPanel() {
  const s = useUmgStore();
  const role = useMemo(() => roleFromNodeId(s.selectedNodeId), [s.selectedNodeId]);

  const block = role ? s.blocks.find(b => b.role === role) : null;

  if (!role) {
    return (
      <div style={panel}>
        <div style={{ fontWeight: 800, color: "#e0e0e0" }}>Inspector</div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 8, color: "#e0e0e0" }}>
          Click a MOLT role node on the graph to inspect/edit.
        </div>
      </div>
    );
  }

  if (!block) {
    return (
      <div style={panel}>
        <div style={{ fontWeight: 800, color: "#e0e0e0" }}>Inspector: {role}</div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 8, color: "#e0e0e0" }}>
          No block exists for this role yet.
        </div>
      </div>
    );
  }

  return (
    <div style={panel}>
      <div style={{ fontWeight: 900, fontSize: 14, color: "#e0e0e0" }}>Inspector: {role}</div>

      <div style={{ fontSize: 11, opacity: 0.5, marginTop: 6, color: "#e0e0e0" }}>
        Block ID: {block.id}
      </div>

      <div style={{ marginTop: 12, fontSize: 12, fontWeight: 700, color: "#e0e0e0" }}>Title</div>
      <input
        value={block.title}
        onChange={(e) => s.updateBlockTitle(role, e.target.value)}
        style={input}
        data-testid="input-block-title"
      />

      <div style={{ marginTop: 12, fontSize: 12, fontWeight: 700, color: "#e0e0e0" }}>Content</div>
      <textarea
        value={block.content}
        onChange={(e) => s.updateBlockContent(role, e.target.value)}
        style={textarea}
        placeholder={`Write ${role.toLowerCase()} content...`}
        data-testid="textarea-block-content"
      />

      <div style={{ marginTop: 14, fontSize: 12, fontWeight: 700, color: "#e0e0e0" }}>Governance</div>
      <ul style={{ margin: "6px 0 0 18px", fontSize: 11, opacity: 0.7, color: "#e0e0e0" }}>
        <li>Edits are live on the graph</li>
        <li>Library items are snapshots</li>
        <li>Compression requires all 4 MOLT roles</li>
      </ul>
    </div>
  );
}

const panel: React.CSSProperties = {
  width: 320,
  padding: 12,
  borderLeft: "1px solid rgba(255,255,255,0.1)",
  height: "100vh",
  overflow: "auto",
  background: "rgba(15,15,20,0.95)"
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.15)",
  marginTop: 6,
  background: "rgba(0,0,0,0.3)",
  color: "#e0e0e0",
  fontSize: 12
};

const textarea: React.CSSProperties = {
  width: "100%",
  height: 140,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.15)",
  marginTop: 6,
  resize: "vertical",
  background: "rgba(0,0,0,0.3)",
  color: "#e0e0e0",
  fontSize: 12
};
