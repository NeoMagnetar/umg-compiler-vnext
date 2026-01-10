import React, { useState, useEffect } from "react";
import { findBlockInSleeve, updateBlock, BlockPatch } from "@/lib/sleeveEdit";

interface BlockInspectorProps {
  sleeveJson: string;
  selectedBlockId: string | null;
  onChangeSleeveJson: (next: string) => void;
}

export default function BlockInspector({ sleeveJson, selectedBlockId, onChangeSleeveJson }: BlockInspectorProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [priorityOrder, setPriorityOrder] = useState<number>(0);
  const [moltType, setMoltType] = useState("");
  const [stackId, setStackId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedBlockId) {
      setTitle("");
      setContent("");
      setTagsInput("");
      setPriorityOrder(0);
      setMoltType("");
      setStackId("");
      return;
    }

    const { block, stackId: foundStackId } = findBlockInSleeve(sleeveJson, selectedBlockId);
    if (block) {
      setTitle(block.title ?? "");
      setContent(block.content ?? "");
      setTagsInput((block.tags ?? []).join(", "));
      setPriorityOrder(block.priorityOrder ?? 0);
      setMoltType(block.moltType ?? "instruction");
      setStackId(foundStackId ?? "");
      setError(null);
    } else {
      setError(`Block not found: ${selectedBlockId}`);
    }
  }, [selectedBlockId, sleeveJson]);

  if (!selectedBlockId) {
    return (
      <div style={{ padding: 16, opacity: 0.5, textAlign: "center" }}>
        <p>Select a block to inspect</p>
      </div>
    );
  }

  const handleApply = () => {
    const tags = tagsInput
      .split(",")
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const patch: BlockPatch = {
      title,
      content,
      tags,
      priorityOrder
    };

    const result = updateBlock(sleeveJson, selectedBlockId, patch);
    if (result.error) {
      setError(result.error);
    } else if (result.nextJson) {
      setError(null);
      onChangeSleeveJson(result.nextJson);
    }
  };

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12, height: "100%", overflow: "auto" }}>
      <div style={{ 
        padding: 10, 
        background: "rgba(255,255,255,0.03)", 
        borderRadius: 6,
        borderLeft: "3px solid #ff69b4"
      }}>
        <div className="mono small hotpink" style={{ fontWeight: 600 }}>{selectedBlockId}</div>
        <div className="small" style={{ marginTop: 4, opacity: 0.6 }}>
          Stack: <span className="mono">{stackId}</span>
        </div>
        <div className="small" style={{ marginTop: 2, opacity: 0.6 }}>
          Type: <span className="mono">{moltType}</span>
        </div>
      </div>

      {error && (
        <div style={{ 
          padding: 8, 
          background: "rgba(239, 68, 68, 0.15)", 
          borderRadius: 4,
          color: "#ef4444",
          fontSize: 12
        }}>
          {error}
        </div>
      )}

      <div>
        <label className="small" style={{ display: "block", marginBottom: 4, opacity: 0.7 }}>Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 10px",
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 6,
            color: "inherit",
            fontSize: 13
          }}
        />
      </div>

      <div style={{ flex: 1, minHeight: 100, display: "flex", flexDirection: "column" }}>
        <label className="small" style={{ display: "block", marginBottom: 4, opacity: 0.7 }}>Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          style={{
            flex: 1,
            width: "100%",
            padding: "8px 10px",
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 6,
            color: "inherit",
            fontSize: 12,
            fontFamily: "monospace",
            resize: "vertical",
            minHeight: 80
          }}
        />
      </div>

      <div>
        <label className="small" style={{ display: "block", marginBottom: 4, opacity: 0.7 }}>
          Tags <span style={{ opacity: 0.5 }}>(comma-separated)</span>
        </label>
        <input
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="tag1, tag2, tag3"
          style={{
            width: "100%",
            padding: "8px 10px",
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 6,
            color: "inherit",
            fontSize: 13
          }}
        />
      </div>

      <div>
        <label className="small" style={{ display: "block", marginBottom: 4, opacity: 0.7 }}>Priority Order</label>
        <input
          type="number"
          value={priorityOrder}
          onChange={(e) => setPriorityOrder(parseInt(e.target.value) || 0)}
          style={{
            width: 100,
            padding: "8px 10px",
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 6,
            color: "inherit",
            fontSize: 13
          }}
        />
      </div>

      <button
        className="btn"
        onClick={handleApply}
        style={{ marginTop: 8 }}
      >
        Apply Changes
      </button>

      <div className="small" style={{ opacity: 0.4, marginTop: 4 }}>
        Changes update the Input JSON. Click Compile to see runtime updates.
      </div>
    </div>
  );
}
