import React, { useState, useMemo } from "react";
import RuntimeViewer from "./RuntimeViewer";
import TraceViewer from "./TraceViewer";

interface OutputTabsProps {
  resultJson: string;
}

export default function OutputTabs({ resultJson }: OutputTabsProps) {
  const [subTab, setSubTab] = useState<"runtime" | "trace" | "raw">("runtime");

  const parsed = useMemo(() => {
    try { return JSON.parse(resultJson); } catch { return null; }
  }, [resultJson]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 8 }}>
      <div style={{ display: "flex", gap: 6 }}>
        <button className={`btn small ${subTab === "runtime" ? "hotpink" : ""}`} onClick={() => setSubTab("runtime")}>Runtime</button>
        <button className={`btn small ${subTab === "trace" ? "hotpink" : ""}`} onClick={() => setSubTab("trace")}>Trace</button>
        <button className={`btn small ${subTab === "raw" ? "hotpink" : ""}`} onClick={() => setSubTab("raw")}>Raw</button>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        {subTab === "runtime" && <RuntimeViewer runtime={parsed?.runtime} />}
        {subTab === "trace" && <TraceViewer trace={parsed?.trace} />}
        {subTab === "raw" && (
          <pre className="mono small" style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {resultJson}
          </pre>
        )}
      </div>
    </div>
  );
}
