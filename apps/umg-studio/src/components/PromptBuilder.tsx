import React, { useState } from "react";
import { parsePromptInput, ParsedItem, EXAMPLE_NEOBLOCK, EXAMPLE_NEOSTACK } from "@/lib/promptParse";

interface PromptBuilderProps {
  onGenerate: (item: ParsedItem) => void;
}

export default function PromptBuilder({ onGenerate }: PromptBuilderProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    const result = parsePromptInput(input);
    if (!result.success) {
      setError(result.error || "Unknown error");
      return;
    }

    setError(null);
    onGenerate(result.item!);
    setInput("");
  };

  const fillExample = (example: string) => {
    setInput(example);
    setError(null);
  };

  return (
    <div style={{ padding: 12, height: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, opacity: 0.5, alignSelf: "center" }}>Examples:</span>
        <button
          onClick={() => fillExample(EXAMPLE_NEOBLOCK)}
          data-testid="button-example-neoblock"
          style={{
            padding: "4px 10px",
            background: "rgba(168, 85, 247, 0.15)",
            border: "1px solid rgba(168, 85, 247, 0.4)",
            borderRadius: 4,
            color: "#a855f7",
            fontSize: 10,
            cursor: "pointer"
          }}
        >
          NeoBlock
        </button>
        <button
          onClick={() => fillExample(EXAMPLE_NEOSTACK)}
          data-testid="button-example-neostack"
          style={{
            padding: "4px 10px",
            background: "rgba(59, 130, 246, 0.15)",
            border: "1px solid rgba(59, 130, 246, 0.4)",
            borderRadius: 4,
            color: "#3b82f6",
            fontSize: 10,
            cursor: "pointer"
          }}
        >
          NeoStack
        </button>
      </div>

      <textarea
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setError(null);
        }}
        placeholder="Enter structured text or JSON..."
        data-testid="prompt-textarea"
        style={{
          flex: 1,
          minHeight: 80,
          padding: 10,
          background: "rgba(0,0,0,0.3)",
          border: error ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.1)",
          borderRadius: 6,
          color: "#fff",
          fontSize: 11,
          fontFamily: "monospace",
          resize: "none"
        }}
      />

      {error && (
        <div style={{
          padding: 8,
          background: "rgba(239, 68, 68, 0.15)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: 4,
          color: "#ef4444",
          fontSize: 11
        }}>
          {error}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={!input.trim()}
        data-testid="button-generate"
        style={{
          padding: "8px 16px",
          background: input.trim() ? "#a855f7" : "rgba(168, 85, 247, 0.3)",
          border: "none",
          borderRadius: 6,
          color: input.trim() ? "#fff" : "rgba(255,255,255,0.5)",
          fontSize: 12,
          fontWeight: 600,
          cursor: input.trim() ? "pointer" : "not-allowed"
        }}
      >
        Generate
      </button>
    </div>
  );
}
