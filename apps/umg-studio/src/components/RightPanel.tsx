import React, { useState, useEffect } from "react";
import JsonEditor from "./JsonEditor";
import OutputTabs from "./OutputTabs";
import BlockInspector from "./BlockInspector";

interface RightPanelProps {
  sleeveJson: string;
  setSleeveJson: (v: string) => void;
  resultJson: string;
  selectedBlockId?: string | null;
}

export default function RightPanel({ sleeveJson, setSleeveJson, resultJson, selectedBlockId }: RightPanelProps) {
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
          className={`btn ${tab === "input" ? "hotpink" : ""}`} 
          onClick={() => setTab("input")}
        >
          Input
        </button>
        <button 
          className={`btn ${tab === "output" ? "hotpink" : ""}`} 
          onClick={() => setTab("output")}
        >
          Output
        </button>
        <button 
          className={`btn ${tab === "block" ? "hotpink" : ""}`} 
          onClick={() => setTab("block")}
          style={{ position: "relative" }}
        >
          Block
          {selectedBlockId && (
            <span style={{
              position: "absolute",
              top: -4,
              right: -4,
              width: 8,
              height: 8,
              background: "#ff69b4",
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
          />
        )}
      </div>
    </div>
  );
}
