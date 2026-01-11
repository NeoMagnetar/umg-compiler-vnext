import React, { useState, useEffect, useCallback } from "react";
import { findBlockInSleeve, updateBlock, deleteBlock, BlockPatch } from "@/lib/sleeveEdit";

interface BlockInspectorProps {
  sleeveJson: string;
  selectedBlockId: string | null;
  onChangeSleeveJson: (next: string) => void;
  onSelectBlockId?: (id: string | null) => void;
}

export default function BlockInspector({ sleeveJson, selectedBlockId, onChangeSleeveJson, onSelectBlockId }: BlockInspectorProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [priorityOrder, setPriorityOrder] = useState<number>(0);
  const [moltType, setMoltType] = useState("");
  const [stackId, setStackId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [blockFound, setBlockFound] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [originalTitle, setOriginalTitle] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [originalTagsInput, setOriginalTagsInput] = useState("");
  const [originalPriorityOrder, setOriginalPriorityOrder] = useState<number>(0);

  useEffect(() => {
    if (!selectedBlockId) {
      setTitle("");
      setContent("");
      setTagsInput("");
      setPriorityOrder(0);
      setMoltType("");
      setStackId("");
      setBlockFound(false);
      setError(null);
      setIsDirty(false);
      setLastSaved(false);
      setShowDeleteConfirm(false);
      return;
    }

    const { block, stackId: foundStackId } = findBlockInSleeve(sleeveJson, selectedBlockId);
    if (block) {
      const t = block.title ?? "";
      const c = block.content ?? "";
      const tags = (block.tags ?? []).join(", ");
      const p = block.priorityOrder ?? 0;

      setTitle(t);
      setContent(c);
      setTagsInput(tags);
      setPriorityOrder(p);
      setMoltType(block.moltType ?? "instruction");
      setStackId(foundStackId ?? "(unknown)");
      setBlockFound(true);
      setError(null);
      setIsDirty(false);
      setLastSaved(false);
      setShowDeleteConfirm(false);

      setOriginalTitle(t);
      setOriginalContent(c);
      setOriginalTagsInput(tags);
      setOriginalPriorityOrder(p);
    } else {
      setBlockFound(false);
      setError(`Block "${selectedBlockId}" not found in sleeve JSON`);
    }
  }, [selectedBlockId, sleeveJson]);

  useEffect(() => {
    if (!blockFound) return;
    const dirty = 
      title !== originalTitle ||
      content !== originalContent ||
      tagsInput !== originalTagsInput ||
      priorityOrder !== originalPriorityOrder;
    setIsDirty(dirty);
    if (dirty) setLastSaved(false);
  }, [title, content, tagsInput, priorityOrder, originalTitle, originalContent, originalTagsInput, originalPriorityOrder, blockFound]);

  const handleApply = useCallback(() => {
    if (!selectedBlockId || !blockFound) return;

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
      setOriginalTitle(title);
      setOriginalContent(content);
      setOriginalTagsInput(tagsInput);
      setOriginalPriorityOrder(priorityOrder);
      setIsDirty(false);
      setLastSaved(true);
    }
  }, [sleeveJson, selectedBlockId, blockFound, title, content, tagsInput, priorityOrder, onChangeSleeveJson]);

  const handleDelete = useCallback(() => {
    if (!selectedBlockId) return;

    const result = deleteBlock(sleeveJson, selectedBlockId);
    if (result.error) {
      setError(result.error);
    } else if (result.nextJson) {
      onChangeSleeveJson(result.nextJson);
      onSelectBlockId?.(null);
    }
    setShowDeleteConfirm(false);
  }, [sleeveJson, selectedBlockId, onChangeSleeveJson, onSelectBlockId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleApply();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleApply]);

  if (!selectedBlockId) {
    return (
      <div style={{ padding: 16, opacity: 0.5, textAlign: "center" }}>
        <p>Select a block to inspect</p>
      </div>
    );
  }

  if (!blockFound) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ 
          padding: 12, 
          background: "rgba(239, 68, 68, 0.15)", 
          borderRadius: 6,
          borderLeft: "3px solid #ef4444"
        }}>
          <div style={{ fontWeight: 600, color: "#ef4444", marginBottom: 4 }}>Block Not Found</div>
          <div className="mono small" style={{ opacity: 0.8 }}>{selectedBlockId}</div>
          <div className="small" style={{ marginTop: 8, opacity: 0.6 }}>
            This block ID could not be found in the input sleeve JSON.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflow: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
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
      </div>

      <div style={{ 
        padding: "10px 12px",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(0,0,0,0.2)",
        display: "flex",
        flexDirection: "column",
        gap: 8
      }}>
        {showDeleteConfirm ? (
          <div style={{ 
            padding: 10, 
            background: "rgba(239, 68, 68, 0.15)", 
            borderRadius: 6,
            borderLeft: "3px solid #ef4444"
          }}>
            <div className="small" style={{ marginBottom: 8, color: "#ef4444" }}>
              Delete this block permanently?
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn"
                onClick={handleDelete}
                style={{ 
                  flex: 1, 
                  background: "rgba(239, 68, 68, 0.3)", 
                  borderColor: "#ef4444",
                  color: "#ef4444"
                }}
              >
                Yes, Delete
              </button>
              <button
                className="btn"
                onClick={() => setShowDeleteConfirm(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div className="small" style={{ 
              color: error ? "#ef4444" : isDirty ? "#eab308" : lastSaved ? "#22c55e" : "inherit",
              opacity: error || isDirty || lastSaved ? 1 : 0.4
            }}>
              {error ? "Error" : isDirty ? "Unsaved changes" : lastSaved ? "Saved" : "No changes"}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn"
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  background: "transparent",
                  borderColor: "#ef4444",
                  color: "#ef4444"
                }}
              >
                Delete
              </button>
              <button
                className="btn"
                onClick={handleApply}
                disabled={!isDirty}
                style={{
                  opacity: isDirty ? 1 : 0.5,
                  cursor: isDirty ? "pointer" : "not-allowed"
                }}
              >
                Apply
                <span className="small" style={{ opacity: 0.6, marginLeft: 6 }}>Ctrl+Enter</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
