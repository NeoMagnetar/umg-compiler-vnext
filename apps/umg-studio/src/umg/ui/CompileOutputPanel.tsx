import { useState } from "react";
import { useUmgStore } from "../store";

export function CompileOutputPanel() {
  const { runtimeSpec, trace } = useUmgStore();
  const [tab, setTab] = useState<"runtime" | "trace">("runtime");

  if (!runtimeSpec && !trace) {
    return (
      <div style={{ 
        padding: 12, 
        borderTop: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(15,15,20,0.95)",
        color: "#e0e0e0"
      }}>
        <div style={{ fontSize: 12, opacity: 0.5, fontStyle: "italic" }}>
          Compile to see RuntimeSpec and Trace output here.
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: 12, 
      borderTop: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(15,15,20,0.95)"
    }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button 
          style={tabBtn(tab === "runtime")} 
          onClick={() => setTab("runtime")}
          data-testid="button-tab-runtime"
        >
          RuntimeSpec
        </button>
        <button 
          style={tabBtn(tab === "trace")} 
          onClick={() => setTab("trace")}
          data-testid="button-tab-trace"
        >
          Trace
        </button>
      </div>

      <pre style={pre}>
        {JSON.stringify(tab === "runtime" ? runtimeSpec : trace, null, 2)}
      </pre>
    </div>
  );
}

const tabBtn = (active: boolean): React.CSSProperties => ({
  padding: "6px 12px",
  borderRadius: 8,
  border: active ? "1px solid #60a5fa" : "1px solid rgba(255,255,255,0.15)",
  background: active ? "rgba(96, 165, 250, 0.15)" : "rgba(30,30,40,0.5)",
  color: active ? "#60a5fa" : "#e0e0e0",
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 600
});

const pre: React.CSSProperties = {
  maxHeight: 200,
  overflow: "auto",
  background: "rgba(0,0,0,0.4)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  padding: 10,
  fontSize: 11,
  color: "#22c55e",
  fontFamily: "monospace"
};
