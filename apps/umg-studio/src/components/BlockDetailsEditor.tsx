import React, { useState, useEffect, useMemo } from "react";
import { findBlockInSleeve, updateBlock, BlockPatch } from "@/lib/sleeveEdit";

interface BlockDetailsEditorProps {
  sleeveJson: string;
  selectedBlockId: string | null;
  onChangeSleeveJson: (nextJson: string) => void;
}

export default function BlockDetailsEditor({
  sleeveJson,
  selectedBlockId,
  onChangeSleeveJson
}: BlockDetailsEditorProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  const blockData = useMemo(() => {
    if (!selectedBlockId) return null;
    const { block, stackId } = findBlockInSleeve(sleeveJson, selectedBlockId);
    return block ? { ...block, stackId } : null;
  }, [sleeveJson, selectedBlockId]);

  useEffect(() => {
    if (blockData) {
      setTitle(blockData.title ?? "");
      setContent(blockData.content ?? "");
      setTags(Array.isArray(blockData.tags) ? [...blockData.tags] : []);
    } else {
      setTitle("");
      setContent("");
      setTags([]);
    }
  }, [blockData?.id]);

  if (!selectedBlockId || !blockData) {
    return (
      <div style={{ 
        height: "100%", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        opacity: 0.5,
        fontSize: 12
      }}>
        Tap a block to edit
      </div>
    );
  }

  const applyUpdate = (patch: BlockPatch) => {
    const result = updateBlock(sleeveJson, selectedBlockId, patch);
    if (result.nextJson) {
      onChangeSleeveJson(result.nextJson);
    }
  };

  const handleTitleBlur = () => {
    if (title !== (blockData.title ?? "")) {
      applyUpdate({ title });
    }
  };

  const handleContentBlur = () => {
    if (content !== (blockData.content ?? "")) {
      applyUpdate({ content });
    }
  };

  const handleAddTag = () => {
    const trimmed = newTag.trim().toLowerCase();
    if (!trimmed) return;
    
    const exists = tags.some(t => t.toLowerCase() === trimmed);
    if (exists) {
      setNewTag("");
      return;
    }

    const updatedTags = [...tags, trimmed];
    setTags(updatedTags);
    setNewTag("");
    applyUpdate({ tags: updatedTags });
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = tags.filter(t => t !== tagToRemove);
    setTags(updatedTags);
    applyUpdate({ tags: updatedTags });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div style={{ padding: 12, height: "100%", overflow: "auto" }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: 8, 
          marginBottom: 8 
        }}>
          <span style={{ 
            fontSize: 9, 
            padding: "2px 6px", 
            background: "rgba(168, 85, 247, 0.2)",
            borderRadius: 4,
            color: "#a855f7",
            textTransform: "uppercase",
            fontWeight: 600
          }}>
            {blockData.moltType ?? "block"}
          </span>
          <span className="mono" style={{ fontSize: 10, opacity: 0.4 }}>
            {blockData.id}
          </span>
        </div>

        {blockData.stackId && (
          <div className="mono" style={{ fontSize: 10, opacity: 0.4, marginBottom: 8 }}>
            Stack: {blockData.stackId}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ 
          fontSize: 10, 
          opacity: 0.6, 
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          display: "block",
          marginBottom: 4
        }}>
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          data-testid="input-block-title"
          style={{
            width: "100%",
            padding: "6px 8px",
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 4,
            color: "inherit",
            fontSize: 12
          }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ 
          fontSize: 10, 
          opacity: 0.6, 
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          display: "block",
          marginBottom: 4
        }}>
          Content
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleContentBlur}
          data-testid="textarea-block-content"
          rows={5}
          style={{
            width: "100%",
            padding: "6px 8px",
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 4,
            color: "inherit",
            fontSize: 11,
            resize: "vertical",
            minHeight: 80,
            lineHeight: 1.5
          }}
        />
      </div>

      <div>
        <label style={{ 
          fontSize: 10, 
          opacity: 0.6, 
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          display: "block",
          marginBottom: 4
        }}>
          Tags
        </label>

        <div style={{ 
          display: "flex", 
          flexWrap: "wrap", 
          gap: 4,
          marginBottom: 8
        }}>
          {tags.length === 0 && (
            <span style={{ fontSize: 11, opacity: 0.4, fontStyle: "italic" }}>
              No tags
            </span>
          )}
          {tags.map((tag) => (
            <span 
              key={tag}
              style={{ 
                fontSize: 10, 
                padding: "3px 6px", 
                background: "rgba(255,105,180,0.15)",
                borderRadius: 4,
                color: "#ff69b4",
                display: "flex",
                alignItems: "center",
                gap: 4
              }}
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                data-testid={`button-remove-tag-${tag}`}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#ff69b4",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: 12,
                  lineHeight: 1,
                  opacity: 0.7
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add tag..."
            data-testid="input-new-tag"
            style={{
              flex: 1,
              padding: "5px 8px",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 4,
              color: "inherit",
              fontSize: 11
            }}
          />
          <button
            onClick={handleAddTag}
            data-testid="button-add-tag"
            style={{
              padding: "5px 10px",
              background: "rgba(255,105,180,0.2)",
              border: "1px solid rgba(255,105,180,0.3)",
              borderRadius: 4,
              color: "#ff69b4",
              fontSize: 11,
              cursor: "pointer"
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
