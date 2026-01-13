import React, { useState } from "react";
import { 
  getStacksWithBlockIds, 
  getBlocksById
} from "@/lib/sleeveEdit";
import { compressStackToNeoBlock } from "@/lib/compress";
import { saveNeoBlock, NeoBlock } from "@/lib/library/neoblockStore";
import NeoBlockPreview from "./NeoBlockPreview";

interface StructurePanelProps {
  sleeveJson: string;
  onChangeSleeveJson: (next: string) => void;
  selectedBlockIds?: string[];
  onClearMultiSelect?: () => void;
}

export default function StructurePanel({ 
  sleeveJson, 
  onChangeSleeveJson,
  selectedBlockIds = [],
  onClearMultiSelect
}: StructurePanelProps) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [previewNeoBlock, setPreviewNeoBlock] = useState<Omit<NeoBlock, "id" | "createdAt"> | null>(null);
  const [previewStackId, setPreviewStackId] = useState<string | null>(null);

  const stacks = getStacksWithBlockIds(sleeveJson);

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
    setPreviewNeoBlock(null);
    setPreviewStackId(null);
    setMessage("Saved to NeoBlock Library!");
    setTimeout(() => setMessage(null), 2000);
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
        {stacks.map(stack => (
          <div 
            key={stack.id}
            style={{
              padding: 8,
              marginBottom: 6,
              background: "rgba(255,255,255,0.03)",
              borderRadius: 6,
              border: previewStackId === stack.id ? "1px solid rgba(168, 85, 247, 0.4)" : "1px solid transparent"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontWeight: 500, fontSize: 12 }}>{stack.name}</div>
              <button
                onClick={() => handleCompressPreview(stack.id)}
                style={{
                  padding: "3px 8px",
                  background: previewStackId === stack.id ? "rgba(168, 85, 247, 0.2)" : "transparent",
                  border: "1px solid rgba(168, 85, 247, 0.3)",
                  borderRadius: 4,
                  color: "#a855f7",
                  fontSize: 10,
                  cursor: "pointer"
                }}
              >
                {previewStackId === stack.id ? "Selected" : "Compress"}
              </button>
            </div>
            <div className="mono" style={{ fontSize: 10, opacity: 0.5 }}>{stack.id}</div>
            <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>
              {stack.blockIds.length} blocks
            </div>
          </div>
        ))}
      </div>

      {previewNeoBlock && (
        <div style={{
          padding: 10,
          background: "rgba(168, 85, 247, 0.08)",
          borderRadius: 6,
          borderLeft: "3px solid #a855f7"
        }}>
          <div className="small" style={{ opacity: 0.7, marginBottom: 8 }}>NeoBlock Preview</div>
          
          <NeoBlockPreview 
            title={previewNeoBlock.name}
            lanes={previewNeoBlock.lanes}
            blocksById={getBlocksById(sleeveJson)}
            compact={false}
          />
          
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            <button
              onClick={handleSaveNeoBlock}
              data-testid="button-save-neoblock"
              style={{
                flex: 1,
                padding: "6px 10px",
                background: "rgba(34, 197, 94, 0.2)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                borderRadius: 4,
                color: "#22c55e",
                fontSize: 11,
                cursor: "pointer",
                fontWeight: 500
              }}
            >
              Save to NeoBlock Library
            </button>
            <button
              onClick={() => { setPreviewNeoBlock(null); setPreviewStackId(null); }}
              data-testid="button-close-preview"
              style={{
                padding: "6px 10px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 4,
                color: "inherit",
                fontSize: 11,
                cursor: "pointer"
              }}
            >
              Close Preview
            </button>
          </div>
          
          <button
            disabled
            data-testid="button-insert-neoblock-stub"
            style={{
              width: "100%",
              marginTop: 8,
              padding: "6px 10px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 4,
              color: "inherit",
              fontSize: 11,
              cursor: "not-allowed",
              opacity: 0.4
            }}
          >
            Insert NeoBlock (coming soon)
          </button>
        </div>
      )}
    </div>
  );
}
