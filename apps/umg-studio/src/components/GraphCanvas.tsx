import React from "react";

interface GraphCanvasProps {
  compiled: any;
}

export default function GraphCanvas({ compiled }: GraphCanvasProps) {
  const neoBlocks = compiled?.runtime?.neoBlocks ?? [];
  const hasErrors = compiled?.hasErrors;

  return (
    <div className="panel" style={{ height: "100%", padding: 16 }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 13, opacity: 0.7 }}>Graph Canvas (Phase 2)</h3>
      {hasErrors ? (
        <p style={{ color: "#ff6b6b" }}>Compilation has errors. Check output.</p>
      ) : neoBlocks.length > 0 ? (
        <div>
          <p className="small">NeoBlocks: {neoBlocks.length}</p>
          {neoBlocks.map((nb: any) => (
            <div key={nb.id} style={{ marginTop: 8, padding: 8, background: "rgba(255,255,255,0.05)", borderRadius: 6 }}>
              <div className="mono small hotpink">{nb.id}</div>
              <div className="small" style={{ opacity: 0.7 }}>Stack: {nb.stackId}</div>
              <div className="small" style={{ opacity: 0.7 }}>Blocks: {nb.orderedBlockIds?.length ?? 0}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="small" style={{ opacity: 0.5 }}>No NeoBlocks yet</p>
      )}
    </div>
  );
}
