import React, { useState } from "react";
import { addStack, addBlockToStack, getStacks } from "@/lib/sleeveEdit";

const MOLT_TYPES = [
  "trigger",
  "directive",
  "instruction",
  "subject",
  "primary",
  "philosophy",
  "blueprint"
] as const;

interface StructurePanelProps {
  sleeveJson: string;
  onChangeSleeveJson: (next: string) => void;
}

export default function StructurePanel({ sleeveJson, onChangeSleeveJson }: StructurePanelProps) {
  const [selectedStackId, setSelectedStackId] = useState<string>("");
  const [selectedMoltType, setSelectedMoltType] = useState<string>("instruction");
  const [error, setError] = useState<string | null>(null);

  const stacks = getStacks(sleeveJson);

  const handleAddStack = () => {
    setError(null);
    const result = addStack(sleeveJson, {});
    if (result.error) {
      setError(result.error);
    } else if (result.nextJson) {
      onChangeSleeveJson(result.nextJson);
    }
  };

  const handleAddBlock = () => {
    if (!selectedStackId) {
      setError("Select a stack first");
      return;
    }
    setError(null);
    const result = addBlockToStack(sleeveJson, selectedStackId, {
      moltType: selectedMoltType
    });
    if (result.error) {
      setError(result.error);
    } else if (result.nextJson) {
      onChangeSleeveJson(result.nextJson);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {error && (
        <div style={{
          padding: 8,
          background: "rgba(239, 68, 68, 0.15)",
          borderRadius: 4,
          color: "#ef4444",
          fontSize: 11
        }}>
          {error}
        </div>
      )}

      <div>
        <div className="small" style={{ opacity: 0.6, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Add Column (Stack)
        </div>
        <button
          className="btn"
          onClick={handleAddStack}
          style={{ width: "100%", fontSize: 12 }}
        >
          + New Stack
        </button>
      </div>

      <div>
        <div className="small" style={{ opacity: 0.6, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Add Block to Lane
        </div>

        <div style={{ marginBottom: 8 }}>
          <label className="small" style={{ display: "block", marginBottom: 4, opacity: 0.5 }}>Stack</label>
          <select
            value={selectedStackId}
            onChange={(e) => setSelectedStackId(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 8px",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 4,
              color: "inherit",
              fontSize: 12
            }}
          >
            <option value="">Select stack...</option>
            {stacks.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label className="small" style={{ display: "block", marginBottom: 4, opacity: 0.5 }}>MOLT Type</label>
          <select
            value={selectedMoltType}
            onChange={(e) => setSelectedMoltType(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 8px",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 4,
              color: "inherit",
              fontSize: 12
            }}
          >
            {MOLT_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <button
          className="btn"
          onClick={handleAddBlock}
          disabled={!selectedStackId}
          style={{ 
            width: "100%", 
            fontSize: 12,
            opacity: selectedStackId ? 1 : 0.5,
            cursor: selectedStackId ? "pointer" : "not-allowed"
          }}
        >
          + Add Block
        </button>
      </div>
    </div>
  );
}
