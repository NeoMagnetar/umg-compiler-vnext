import React, { useState } from "react";
import { addStack, addBlockToStack, getStacksWithBlockIds, renameStack } from "@/lib/sleeveEdit";
import { compressStackToNeoBlock } from "@/lib/compress";
import { saveNeoBlock, listNeoBlocks, deleteNeoBlock, getTotalBlockCount, NeoBlock } from "@/lib/library/neoblockStore";

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
  const [message, setMessage] = useState<string | null>(null);
  const [editingStackId, setEditingStackId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const [neoBlocks, setNeoBlocks] = useState<NeoBlock[]>(() => listNeoBlocks());
  const [previewNeoBlock, setPreviewNeoBlock] = useState<Omit<NeoBlock, "id" | "createdAt"> | null>(null);
  const [previewStackId, setPreviewStackId] = useState<string | null>(null);

  const stacks = getStacksWithBlockIds(sleeveJson);

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

  const handleStartRename = (stackId: string, currentName: string) => {
    setEditingStackId(stackId);
    setEditingName(currentName);
  };

  const handleSaveRename = () => {
    if (!editingStackId) return;
    
    const result = renameStack(sleeveJson, editingStackId, editingName);
    if (result.error) {
      setError(result.error);
    } else if (result.nextJson) {
      onChangeSleeveJson(result.nextJson);
    }
    setEditingStackId(null);
    setEditingName("");
  };

  const handleCancelRename = () => {
    setEditingStackId(null);
    setEditingName("");
  };

  const handleCompressPreview = (stackId: string) => {
    const result = compressStackToNeoBlock(sleeveJson, stackId);
    if (result.error) {
      setError(result.error);
    } else if (result.neoBlock) {
      setPreviewNeoBlock(result.neoBlock);
      setPreviewStackId(stackId);
    }
  };

  const handleSaveNeoBlock = () => {
    if (!previewNeoBlock) return;
    
    saveNeoBlock(previewNeoBlock);
    setNeoBlocks(listNeoBlocks());
    setPreviewNeoBlock(null);
    setPreviewStackId(null);
    setMessage("Saved to NeoBlock Library!");
    setTimeout(() => setMessage(null), 2000);
  };

  const handleDeleteNeoBlock = (id: string) => {
    deleteNeoBlock(id);
    setNeoBlocks(listNeoBlocks());
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

      {message && (
        <div style={{
          padding: 8,
          background: "rgba(34, 197, 94, 0.15)",
          borderRadius: 4,
          color: "#22c55e",
          fontSize: 11
        }}>
          {message}
        </div>
      )}

      <div>
        <div className="small" style={{ opacity: 0.6, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Stacks ({stacks.length})
        </div>
        {stacks.map(s => (
          <div 
            key={s.id}
            style={{
              padding: 8,
              marginBottom: 6,
              background: "rgba(255,255,255,0.03)",
              borderRadius: 4,
              fontSize: 12
            }}
          >
            {editingStackId === s.id ? (
              <div style={{ display: "flex", gap: 4 }}>
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveRename();
                    if (e.key === "Escape") handleCancelRename();
                  }}
                  style={{
                    flex: 1,
                    padding: "4px 6px",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 4,
                    color: "inherit",
                    fontSize: 11
                  }}
                  autoFocus
                />
                <button
                  onClick={handleSaveRename}
                  style={{
                    padding: "4px 8px",
                    background: "rgba(34, 197, 94, 0.2)",
                    border: "1px solid rgba(34, 197, 94, 0.3)",
                    borderRadius: 4,
                    color: "#22c55e",
                    fontSize: 10,
                    cursor: "pointer"
                  }}
                >
                  Save
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{s.name}</div>
                    <div className="mono" style={{ fontSize: 10, opacity: 0.5 }}>{s.id}</div>
                  </div>
                  <button
                    onClick={() => handleStartRename(s.id, s.name)}
                    style={{
                      padding: "2px 6px",
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 4,
                      color: "inherit",
                      fontSize: 10,
                      cursor: "pointer",
                      opacity: 0.6
                    }}
                  >
                    Rename
                  </button>
                </div>
                <div style={{ marginTop: 6, display: "flex", gap: 4 }}>
                  <span className="small" style={{ opacity: 0.5 }}>{s.blockIds.length} blocks</span>
                  <button
                    onClick={() => handleCompressPreview(s.id)}
                    style={{
                      padding: "2px 6px",
                      background: "rgba(168, 85, 247, 0.1)",
                      border: "1px solid rgba(168, 85, 247, 0.3)",
                      borderRadius: 4,
                      color: "#a855f7",
                      fontSize: 10,
                      cursor: "pointer"
                    }}
                  >
                    Compress
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        <button
          className="btn"
          onClick={handleAddStack}
          style={{ width: "100%", fontSize: 11, marginTop: 4 }}
        >
          + New Stack
        </button>
      </div>

      {previewNeoBlock && (
        <div style={{
          padding: 10,
          background: "rgba(168, 85, 247, 0.1)",
          borderRadius: 6,
          borderLeft: "3px solid #a855f7"
        }}>
          <div className="small" style={{ opacity: 0.7, marginBottom: 4 }}>NeoBlock Preview</div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>{previewNeoBlock.name}</div>
          <div className="mono" style={{ fontSize: 10, opacity: 0.6, marginBottom: 8 }}>
            {previewNeoBlock.summary}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={handleSaveNeoBlock}
              style={{
                flex: 1,
                padding: "4px 8px",
                background: "rgba(34, 197, 94, 0.2)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                borderRadius: 4,
                color: "#22c55e",
                fontSize: 10,
                cursor: "pointer"
              }}
            >
              Save to Library
            </button>
            <button
              onClick={() => { setPreviewNeoBlock(null); setPreviewStackId(null); }}
              style={{
                padding: "4px 8px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 4,
                color: "inherit",
                fontSize: 10,
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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

      <div>
        <div className="small" style={{ opacity: 0.6, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          NeoBlock Library ({neoBlocks.length})
        </div>
        {neoBlocks.length === 0 ? (
          <div className="small" style={{ opacity: 0.4, fontStyle: "italic" }}>
            No NeoBlocks saved
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {neoBlocks.map(nb => (
              <div 
                key={nb.id}
                style={{
                  padding: 8,
                  background: "rgba(168, 85, 247, 0.05)",
                  borderRadius: 4,
                  fontSize: 12
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{nb.name}</div>
                    <div className="mono" style={{ fontSize: 10, opacity: 0.5 }}>
                      {getTotalBlockCount(nb)} blocks | {nb.summary}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteNeoBlock(nb.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      fontSize: 14,
                      padding: 2,
                      opacity: 0.6
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
