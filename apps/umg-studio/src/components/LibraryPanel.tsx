import React, { useState, useEffect } from "react";
import { getBlocks, getStacks, findBlockInSleeve } from "@/lib/sleeveEdit";
import { 
  listLibraryBlocks, 
  saveBlockTemplate, 
  deleteBlockTemplate, 
  mintBlockId,
  LibraryBlock 
} from "@/lib/library/store";
import { addBlockToStack } from "@/lib/sleeveEdit";

const MOLT_TYPES = [
  "trigger",
  "directive",
  "instruction",
  "subject",
  "primary",
  "philosophy",
  "blueprint"
] as const;

interface LibraryPanelProps {
  sleeveJson: string;
  selectedBlockId: string | null;
  onChangeSleeveJson: (next: string) => void;
}

export default function LibraryPanel({ sleeveJson, selectedBlockId, onChangeSleeveJson }: LibraryPanelProps) {
  const [libraryBlocks, setLibraryBlocks] = useState<LibraryBlock[]>([]);
  const [insertStackId, setInsertStackId] = useState<string>("");
  const [insertMoltType, setInsertMoltType] = useState<string>("instruction");
  const [message, setMessage] = useState<string | null>(null);

  const blocks = getBlocks(sleeveJson);
  const stacks = getStacks(sleeveJson);

  useEffect(() => {
    setLibraryBlocks(listLibraryBlocks());
  }, []);

  const selectedBlock = selectedBlockId 
    ? findBlockInSleeve(sleeveJson, selectedBlockId).block 
    : null;

  const handleSaveToLibrary = () => {
    if (!selectedBlock) return;
    
    saveBlockTemplate({
      title: selectedBlock.title ?? "Untitled",
      moltType: selectedBlock.moltType ?? "instruction",
      content: selectedBlock.content ?? "",
      tags: selectedBlock.tags ?? [],
      priorityOrder: selectedBlock.priorityOrder ?? 10
    });
    
    setLibraryBlocks(listLibraryBlocks());
    setMessage("Saved to library!");
    setTimeout(() => setMessage(null), 2000);
  };

  const handleInsertFromLibrary = (libBlock: LibraryBlock) => {
    if (!insertStackId) {
      setMessage("Select a stack first");
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    const newId = mintBlockId(insertMoltType, libBlock.title);
    
    const result = addBlockToStack(sleeveJson, insertStackId, {
      id: newId,
      title: libBlock.title,
      moltType: insertMoltType,
      content: libBlock.content,
      tags: [...libBlock.tags],
      priorityOrder: libBlock.priorityOrder
    });

    if (result.error) {
      setMessage(`Error: ${result.error}`);
    } else if (result.nextJson) {
      onChangeSleeveJson(result.nextJson);
      setMessage("Inserted into sleeve!");
    }
    setTimeout(() => setMessage(null), 2000);
  };

  const handleDeleteFromLibrary = (id: string) => {
    deleteBlockTemplate(id);
    setLibraryBlocks(listLibraryBlocks());
    setMessage("Removed from library");
    setTimeout(() => setMessage(null), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {message && (
        <div style={{
          padding: 8,
          background: message.startsWith("Error") 
            ? "rgba(239, 68, 68, 0.15)" 
            : "rgba(34, 197, 94, 0.15)",
          borderRadius: 4,
          fontSize: 11,
          color: message.startsWith("Error") ? "#ef4444" : "#22c55e"
        }}>
          {message}
        </div>
      )}

      {selectedBlock && (
        <div style={{ 
          padding: 10, 
          background: "rgba(255,105,180,0.1)", 
          borderRadius: 6,
          borderLeft: "3px solid #ff69b4"
        }}>
          <div className="small" style={{ marginBottom: 6, opacity: 0.7 }}>Selected Block</div>
          <div style={{ fontSize: 12, fontWeight: 500 }}>{selectedBlock.title}</div>
          <button
            className="btn"
            onClick={handleSaveToLibrary}
            style={{ marginTop: 8, fontSize: 11, width: "100%" }}
          >
            Save to Library
          </button>
        </div>
      )}

      <div>
        <div className="small" style={{ opacity: 0.6, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Insert Target
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <select
            value={insertStackId}
            onChange={(e) => setInsertStackId(e.target.value)}
            style={{
              flex: 1,
              padding: "5px 6px",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 4,
              color: "inherit",
              fontSize: 11
            }}
          >
            <option value="">Stack...</option>
            {stacks.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            value={insertMoltType}
            onChange={(e) => setInsertMoltType(e.target.value)}
            style={{
              flex: 1,
              padding: "5px 6px",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 4,
              color: "inherit",
              fontSize: 11
            }}
          >
            {MOLT_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="small" style={{ opacity: 0.6, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Library Blocks ({libraryBlocks.length})
        </div>
        {libraryBlocks.length === 0 ? (
          <div className="small" style={{ opacity: 0.4, fontStyle: "italic" }}>No saved blocks</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {libraryBlocks.map(b => (
              <div 
                key={b.id}
                style={{
                  padding: "8px 10px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 4,
                  fontSize: 12
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{b.title}</div>
                    <div className="mono" style={{ fontSize: 10, opacity: 0.5 }}>{b.moltType}</div>
                  </div>
                  <button
                    onClick={() => handleDeleteFromLibrary(b.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      fontSize: 14,
                      padding: 2,
                      opacity: 0.6
                    }}
                    title="Remove from library"
                  >
                    ×
                  </button>
                </div>
                <button
                  onClick={() => handleInsertFromLibrary(b)}
                  disabled={!insertStackId}
                  style={{
                    marginTop: 6,
                    padding: "4px 8px",
                    background: insertStackId ? "rgba(59, 130, 246, 0.2)" : "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    borderRadius: 4,
                    color: "inherit",
                    fontSize: 10,
                    cursor: insertStackId ? "pointer" : "not-allowed",
                    opacity: insertStackId ? 1 : 0.5
                  }}
                >
                  Insert into Sleeve
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="small" style={{ opacity: 0.6, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Sleeve Blocks ({blocks.length})
        </div>
        {blocks.length === 0 ? (
          <div className="small" style={{ opacity: 0.4, fontStyle: "italic" }}>No blocks in sleeve</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {blocks.map(b => (
              <div 
                key={b.id}
                style={{
                  padding: "6px 8px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 4,
                  fontSize: 12
                }}
              >
                <div style={{ fontWeight: 500 }}>{b.title}</div>
                <div className="mono" style={{ fontSize: 10, opacity: 0.5 }}>{b.moltType}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
