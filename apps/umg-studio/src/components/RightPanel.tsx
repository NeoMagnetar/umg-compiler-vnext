import React, { useState, useEffect } from "react";
import JsonEditor from "./JsonEditor";
import OutputTabs from "./OutputTabs";
import BlockInspector from "./BlockInspector";

interface RightPanelProps {
  sleeveJson: string;
  setSleeveJson: (v: string) => void;
  resultJson: string;
  selectedBlockId?: string | null;
  onSelectBlockId?: (id: string | null) => void;
}

export default function RightPanel({ sleeveJson, setSleeveJson, resultJson, selectedBlockId, onSelectBlockId }: RightPanelProps) {
  const [tab, setTab] = useState<"input" | "output" | "block">("input");

  useEffect(() => {
    if (selectedBlockId) {
      setTab("block");
    }
  }, [selectedBlockId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 8 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button 
          className="btn"
          onClick={() => setTab("input")}
          style={{
            background: tab === "input" ? "rgba(0, 255, 0, 0.15)" : undefined,
            borderColor: tab === "input" ? "rgba(0, 255, 0, 0.3)" : undefined,
            color: tab === "input" ? "#00ff00" : undefined
          }}
        >
          Input
        </button>
        <button 
          className="btn"
          onClick={() => setTab("output")}
          style={{
            background: tab === "output" ? "rgba(0, 255, 0, 0.15)" : undefined,
            borderColor: tab === "output" ? "rgba(0, 255, 0, 0.3)" : undefined,
            color: tab === "output" ? "#00ff00" : undefined
          }}
        >
          Output
        </button>
        <button 
          className="btn"
          onClick={() => setTab("block")}
          style={{
            position: "relative",
            background: tab === "block" ? "rgba(0, 255, 0, 0.15)" : undefined,
            borderColor: tab === "block" ? "rgba(0, 255, 0, 0.3)" : undefined,
            color: tab === "block" ? "#00ff00" : undefined
          }}
        >
          Block
          {selectedBlockId && (
            <span style={{
              position: "absolute",
              top: -4,
              right: -4,
              width: 8,
              height: 8,
              background: "#00ff00",
              borderRadius: "50%"
            }} />
          )}
        </button>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        {tab === "input" ? (
          <JsonEditor value={sleeveJson} onChange={setSleeveJson} />
        ) : tab === "output" ? (
          <OutputTabs resultJson={resultJson} />
        ) : (
          <BlockInspector 
            sleeveJson={sleeveJson}
            selectedBlockId={selectedBlockId ?? null}
            onChangeSleeveJson={setSleeveJson}
            onSelectBlockId={onSelectBlockId}
          />
        )}
      </div>
    </div>
  );
}
