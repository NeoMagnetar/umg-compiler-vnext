import React, { useState, useEffect } from "react";
import { 
  listLibraryBlocks, 
  deleteBlockTemplate, 
  LibraryBlock 
} from "@/lib/library/store";
import { getStacks, insertBlockIntoStackByMolt } from "@/lib/sleeveEdit";
import { mintBlockId } from "@/lib/library/store";

const MOLT_TYPES = [
  "trigger",
  "directive",
  "instruction",
  "subject",
  "primary",
  "philosophy",
  "blueprint"
] as const;

interface TemplatePanelProps {
  sleeveJson: string;
  onChangeSleeveJson: (next: string) => void;
}

export default function TemplatePanel({ sleeveJson, onChangeSleeveJson }: TemplatePanelProps) {
  const [libraryBlocks, setLibraryBlocks] = useState<LibraryBlock[]>([]);
  const [insertStackId, setInsertStackId] = useState<string>("");
  const [moltFilter, setMoltFilter] = useState<string>("all");
  const [message, setMessage] = useState<string | null>(null);

  const stacks = getStacks(sleeveJson);

  useEffect(() => {
    setLibraryBlocks(listLibraryBlocks());
  }, []);

  const filteredLibraryBlocks = moltFilter === "all" 
    ? libraryBlocks 
    : libraryBlocks.filter(b => b.moltType === moltFilter);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2000);
  };

  const handleInsertFromLibrary = (libBlock: LibraryBlock) => {
    if (!insertStackId) {
      showMessage("Select a stack first");
      return;
    }

    const newId = mintBlockId(libBlock.moltType, libBlock.title);
    
    const result = insertBlockIntoStackByMolt(sleeveJson, insertStackId, {
      id: newId,
      title: libBlock.title,
      moltType: libBlock.moltType,
      content: libBlock.content,
      tags: [...libBlock.tags],
      priorityOrder: libBlock.priorityOrder
    });

    if (result.error) {
      showMessage(`Error: ${result.error}`);
    } else if (result.nextJson) {
      onChangeSleeveJson(result.nextJson);
      showMessage("Inserted into sleeve!");
    }
  };

  const handleDeleteFromLibrary = (id: string) => {
    deleteBlockTemplate(id);
    setLibraryBlocks(listLibraryBlocks());
    showMessage("Removed from library");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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

      <div>
        <div className="small" style={{ opacity: 0.6, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Insert Target Stack
        </div>
        <select
          value={insertStackId}
          onChange={(e) => setInsertStackId(e.target.value)}
          data-testid="select-template-insert-stack"
          style={{
            width: "100%",
            padding: "5px 6px",
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 4,
            color: "inherit",
            fontSize: 11
          }}
        >
          <option value="">Select stack...</option>
          {stacks.map(s => (
            <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
          ))}
        </select>
      </div>

      <div>
        <div className="small" style={{ opacity: 0.6, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Filter by MOLT
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          <button
            onClick={() => setMoltFilter("all")}
            style={{
              padding: "3px 6px",
              background: moltFilter === "all" ? "rgba(255,255,255,0.15)" : "transparent",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 4,
              color: "inherit",
              fontSize: 10,
              cursor: "pointer"
            }}
          >
            All
          </button>
          {MOLT_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setMoltFilter(t)}
              style={{
                padding: "3px 6px",
                background: moltFilter === t ? "rgba(255,255,255,0.15)" : "transparent",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 4,
                color: "inherit",
                fontSize: 10,
                cursor: "pointer",
                textTransform: "capitalize"
              }}
            >
              {t.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="small" style={{ opacity: 0.6, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Saved Templates ({filteredLibraryBlocks.length})
        </div>
        {filteredLibraryBlocks.length === 0 ? (
          <div className="small" style={{ opacity: 0.4, fontStyle: "italic" }}>
            {moltFilter === "all" ? "No saved blocks" : `No ${moltFilter} blocks`}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filteredLibraryBlocks.map(b => (
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
                  data-testid={`button-insert-template-${b.id}`}
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
                  Insert into Stack
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
