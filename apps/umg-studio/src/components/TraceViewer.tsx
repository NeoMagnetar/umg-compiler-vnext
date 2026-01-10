import React from "react";

interface TraceViewerProps {
  trace: any;
}

export default function TraceViewer({ trace }: TraceViewerProps) {
  if (!trace) {
    return <p className="small" style={{ opacity: 0.5 }}>No trace data</p>;
  }

  const events = trace.events ?? [];

  return (
    <div className="small">
      <div style={{ marginBottom: 8 }}>
        <strong>Sleeve:</strong> {trace.sleeveId}
      </div>
      <div style={{ marginBottom: 8 }}>
        <strong>Events:</strong> {events.length}
      </div>
      <div style={{ maxHeight: 300, overflow: "auto" }}>
        {events.map((evt: any) => (
          <div key={evt.id} style={{ marginBottom: 6, padding: 6, background: "rgba(255,255,255,0.03)", borderRadius: 4 }}>
            <span style={{ color: evt.severity === "error" ? "#ff6b6b" : evt.severity === "warning" ? "#ffa500" : "#8bc34a" }}>
              [{evt.severity}]
            </span>{" "}
            <span className="mono">{evt.code}</span>
            <div style={{ opacity: 0.7, marginTop: 2 }}>{evt.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
