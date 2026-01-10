import React from "react";

interface TopBarProps {
  onCompile: () => void;
  onReset: () => void;
  selectedBlockId?: string | null;
  isDirty?: boolean;
  blockFoundInSleeve?: boolean;
}

export default function TopBar({ onCompile, onReset, selectedBlockId, isDirty, blockFoundInSleeve }: TopBarProps) {
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
        <div className="small mono" style={{ opacity: 0.75, display: "flex", alignItems: "center", gap: 6 }}>
          <span>Selected: <span className="hotpink">{selectedBlockId}</span></span>
          <span style={{ 
            fontSize: 9,
            padding: "1px 5px",
            borderRadius: 4,
            background: blockFoundInSleeve 
              ? "rgba(34, 197, 94, 0.2)" 
              : "rgba(239, 68, 68, 0.2)",
            color: blockFoundInSleeve ? "#22c55e" : "#ef4444"
          }}>
            {blockFoundInSleeve ? "found" : "not found"}
          </span>
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
