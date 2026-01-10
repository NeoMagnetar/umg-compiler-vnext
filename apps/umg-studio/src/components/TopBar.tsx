import React from "react";

interface TopBarProps {
  onCompile: () => void;
  onReset: () => void;
  selectedBlockId?: string | null;
  isDirty?: boolean;
}

export default function TopBar({ onCompile, onReset, selectedBlockId, isDirty }: TopBarProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", height: "100%", padding: "0 16px", gap: 12 }}>
      <span style={{ fontWeight: 600, fontSize: 15 }}>UMG Studio</span>
      {isDirty && (
        <span style={{ 
          fontSize: 10, 
          padding: "2px 8px", 
          background: "rgba(234, 179, 8, 0.2)",
          color: "#eab308",
          borderRadius: 10,
          fontWeight: 500
        }}>
          unsaved
        </span>
      )}
      {selectedBlockId && (
        <div className="small mono" style={{ opacity: 0.75, marginLeft: 8 }}>
          Selected: <span className="hotpink">{selectedBlockId}</span>
        </div>
      )}
      <span style={{ flex: 1 }} />
      <button className="btn" onClick={onCompile} style={{ position: "relative" }}>
        Compile
        {isDirty && (
          <span style={{
            position: "absolute",
            top: -2,
            right: -2,
            width: 8,
            height: 8,
            background: "#eab308",
            borderRadius: "50%"
          }} />
        )}
      </button>
      <button className="btn" onClick={onReset}>Reset</button>
    </div>
  );
}
