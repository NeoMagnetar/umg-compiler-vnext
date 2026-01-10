import React, { useState } from "react";

interface RuntimeViewerProps {
  runtime: any;
}

export default function RuntimeViewer({ runtime }: RuntimeViewerProps) {
  const [showRawJson, setShowRawJson] = useState(false);

  if (!runtime) {
    return <p className="small" style={{ opacity: 0.5 }}>No runtime data</p>;
  }

  const { sleeveId, neoBlocks, indexes, promptSpec } = runtime;
  const tagsCount = indexes?.tags?.allTagsSorted?.length ?? 0;
  const stacksCount = Object.keys(indexes?.stackNameById ?? {}).length;

  return (
    <div className="small">
      <div style={{ 
        padding: 12, 
        background: "rgba(255,255,255,0.03)", 
        borderRadius: 6,
        marginBottom: 12 
      }}>
        <div style={{ fontWeight: 600, marginBottom: 8, opacity: 0.9 }}>Summary</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ 
            padding: "8px 10px", 
            background: "rgba(255,255,255,0.05)", 
            borderRadius: 4 
          }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{neoBlocks?.length ?? 0}</div>
            <div style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase" }}>NeoBlocks</div>
          </div>
          <div style={{ 
            padding: "8px 10px", 
            background: "rgba(255,255,255,0.05)", 
            borderRadius: 4 
          }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{stacksCount}</div>
            <div style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase" }}>Stacks</div>
          </div>
          <div style={{ 
            padding: "8px 10px", 
            background: "rgba(255,255,255,0.05)", 
            borderRadius: 4 
          }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{tagsCount}</div>
            <div style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase" }}>Tags</div>
          </div>
          <div style={{ 
            padding: "8px 10px", 
            background: "rgba(255,255,255,0.05)", 
            borderRadius: 4 
          }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{promptSpec?.neoBlockPrompts?.length ?? 0}</div>
            <div style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase" }}>Prompts</div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <strong>Sleeve:</strong> <span className="mono">{sleeveId}</span>
      </div>

      <div 
        onClick={() => setShowRawJson(!showRawJson)}
        style={{ 
          cursor: "pointer",
          padding: "8px 10px",
          background: "rgba(255,255,255,0.03)",
          borderRadius: 4,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 12
        }}
      >
        <span style={{ fontWeight: 500 }}>Raw JSON</span>
        <span style={{ opacity: 0.5, fontSize: 11 }}>
          {showRawJson ? "▼ collapse" : "▶ expand"}
        </span>
      </div>

      {showRawJson && (
        <pre style={{ 
          marginTop: 8,
          padding: 10, 
          background: "rgba(0,0,0,0.3)", 
          borderRadius: 4,
          fontSize: 10,
          overflow: "auto",
          maxHeight: 300
        }}>
          {JSON.stringify(runtime, null, 2)}
        </pre>
      )}
    </div>
  );
}
