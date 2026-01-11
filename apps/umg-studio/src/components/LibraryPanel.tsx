import React from "react";
import { getBlocks, getStacks } from "@/lib/sleeveEdit";

interface LibraryPanelProps {
  sleeveJson: string;
}

export default function LibraryPanel({ sleeveJson }: LibraryPanelProps) {
  const blocks = getBlocks(sleeveJson);
  const stacks = getStacks(sleeveJson);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div className="small" style={{ opacity: 0.6, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Blocks ({blocks.length})
        </div>
        {blocks.length === 0 ? (
          <div className="small" style={{ opacity: 0.4, fontStyle: "italic" }}>No blocks</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {blocks.map(b => (
              <div 
                key={b.id}
                style={{
                  padding: "6px 8px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 4,
                  fontSize: 12
                }}
              >
                <div style={{ fontWeight: 500 }}>{b.title}</div>
                <div className="mono" style={{ fontSize: 10, opacity: 0.5 }}>{b.moltType}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="small" style={{ opacity: 0.6, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Stacks ({stacks.length})
        </div>
        {stacks.length === 0 ? (
          <div className="small" style={{ opacity: 0.4, fontStyle: "italic" }}>No stacks</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {stacks.map(s => (
              <div 
                key={s.id}
                style={{
                  padding: "6px 8px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 4,
                  fontSize: 12
                }}
              >
                <div style={{ fontWeight: 500 }}>{s.name}</div>
                <div className="mono" style={{ fontSize: 10, opacity: 0.5 }}>{s.id}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
