import React from "react";

interface TopBarProps {
  onCompile: () => void;
  onReset: () => void;
  selectedBlockId?: string | null;
}

export default function TopBar({ onCompile, onReset, selectedBlockId }: TopBarProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", height: "100%", padding: "0 16px", gap: 12 }}>
      <span style={{ fontWeight: 600, fontSize: 15 }}>UMG Studio</span>
      {selectedBlockId && (
        <div className="small mono" style={{ opacity: 0.75, marginLeft: 8 }}>
          Selected: <span className="hotpink">{selectedBlockId}</span>
        </div>
      )}
      <span style={{ flex: 1 }} />
      <button className="btn" onClick={onCompile}>Compile</button>
      <button className="btn" onClick={onReset}>Reset</button>
    </div>
  );
}
