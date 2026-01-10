import React, { useState } from "react";
import JsonEditor from "./JsonEditor";
import OutputTabs from "./OutputTabs";

interface RightPanelProps {
  sleeveJson: string;
  setSleeveJson: (v: string) => void;
  resultJson: string;
  selectedBlockId?: string | null;
}

export default function RightPanel({ sleeveJson, setSleeveJson, resultJson, selectedBlockId }: RightPanelProps) {
  const [tab, setTab] = useState<"input" | "output">("input");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 8 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button className={`btn ${tab === "input" ? "hotpink" : ""}`} onClick={() => setTab("input")}>Input</button>
        <button className={`btn ${tab === "output" ? "hotpink" : ""}`} onClick={() => setTab("output")}>Output</button>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        {tab === "input" ? (
          <JsonEditor value={sleeveJson} onChange={setSleeveJson} />
        ) : (
          <OutputTabs resultJson={resultJson} />
        )}
      </div>
    </div>
  );
}
