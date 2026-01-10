import React from "react";

interface JsonEditorProps {
  value: string;
  onChange: (v: string) => void;
}

export default function JsonEditor({ value, onChange }: JsonEditorProps) {
  return (
    <textarea
      className="mono"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.4)",
        color: "#e0e0e0",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        padding: 12,
        fontSize: 12,
        resize: "none",
      }}
    />
  );
}
