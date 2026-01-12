import React, { useState } from "react";
import { 
  getStacksWithBlockIds, 
  addBundleOp,
  addMergeOp,
  deleteOp,
  getOps,
  validateMultiSelectForOp,
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
  const ops = getOps(sleeveJson);
  const multiSelectValidation = validateMultiSelectForOp(sleeveJson, selectedBlockIds);

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

  const handleBundle = () => {
    if (!multiSelectValidation.valid || !multiSelectValidation.stackId || !multiSelectValidation.lane) {
      setError(multiSelectValidation.error ?? "Invalid selection");
      return;
    }

    const result = addBundleOp(sleeveJson, {
      stackId: multiSelectValidation.stackId,
      lane: multiSelectValidation.lane,
      blockIds: selectedBlockIds
    });

    if (result.error) {
      setError(result.error);
    } else if (result.nextJson) {
      onChangeSleeveJson(result.nextJson);
      onClearMultiSelect?.();
      setMessage("Bundle created!");
      setTimeout(() => setMessage(null), 2000);
    }
  };

  const handleMerge = () => {
    if (!multiSelectValidation.valid || !multiSelectValidation.stackId || !multiSelectValidation.lane) {
      setError(multiSelectValidation.error ?? "Invalid selection");
      return;
    }

    const result = addMergeOp(sleeveJson, {
      stackId: multiSelectValidation.stackId,
      lane: multiSelectValidation.lane,
      blockIds: selectedBlockIds
    });

    if (result.error) {
      setError(result.error);
    } else if (result.nextJson) {
      onChangeSleeveJson(result.nextJson);
      onClearMultiSelect?.();
      setMessage("Merge created!");
      setTimeout(() => setMessage(null), 2000);
    }
  };

  const handleDeleteOp = (opId: string) => {
    const result = deleteOp(sleeveJson, opId);
    if (result.error) {
      setError(result.error);
    } else if (result.nextJson) {
      onChangeSleeveJson(result.nextJson);
    }
  };

  const getStackNameById = (stackId: string): string => {
    const stack = stacks.find(s => s.id === stackId);
    return stack?.name ?? stackId;
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
          Ops (Bundle/Merge)
        </div>
        
        {selectedBlockIds.length >= 2 && (
          <div style={{ marginBottom: 8 }}>
            {multiSelectValidation.valid ? (
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={handleBundle}
                  style={{
                    flex: 1,
                    padding: "6px 8px",
                    background: "rgba(59, 130, 246, 0.2)",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    borderRadius: 4,
                    color: "#3b82f6",
                    fontSize: 11,
                    cursor: "pointer"
                  }}
                >
                  Bundle ({selectedBlockIds.length})
                </button>
                <button
                  onClick={handleMerge}
                  style={{
                    flex: 1,
                    padding: "6px 8px",
                    background: "rgba(34, 197, 94, 0.2)",
                    border: "1px solid rgba(34, 197, 94, 0.3)",
                    borderRadius: 4,
                    color: "#22c55e",
                    fontSize: 11,
                    cursor: "pointer"
                  }}
                >
                  Merge ({selectedBlockIds.length})
                </button>
              </div>
            ) : (
              <div style={{
                padding: 8,
                background: "rgba(234, 179, 8, 0.1)",
                borderRadius: 4,
                fontSize: 11,
                color: "#eab308"
              }}>
                {multiSelectValidation.error}
              </div>
            )}
          </div>
        )}

        {selectedBlockIds.length > 0 && selectedBlockIds.length < 2 && (
          <div style={{
            padding: 8,
            background: "rgba(255,255,255,0.03)",
            borderRadius: 4,
            fontSize: 11,
            opacity: 0.5
          }}>
            Select 2+ blocks (Shift+Click) to Bundle/Merge
          </div>
        )}

        {selectedBlockIds.length === 0 && (
          <div style={{
            padding: 8,
            background: "rgba(255,255,255,0.03)",
            borderRadius: 4,
            fontSize: 11,
            opacity: 0.5
          }}>
            Use Shift+Click or Select Mode to multi-select blocks
          </div>
        )}

        {(ops.bundles.length > 0 || ops.merges.length > 0) && (
          <div style={{ marginTop: 8 }}>
            {ops.bundles.map((op: any) => (
              <div 
                key={op.id}
                style={{
                  padding: 8,
                  marginBottom: 4,
                  background: "rgba(59, 130, 246, 0.1)",
                  borderRadius: 4,
                  fontSize: 11,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <span style={{ color: "#3b82f6", fontWeight: 500 }}>Bundle</span>
                  <span style={{ opacity: 0.6, marginLeft: 6 }}>
                    {getStackNameById(op.stackId)} / {op.lane} ({op.blockIds.length})
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteOp(op.id)}
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
            ))}
            {ops.merges.map((op: any) => (
              <div 
                key={op.id}
                style={{
                  padding: 8,
                  marginBottom: 4,
                  background: "rgba(34, 197, 94, 0.1)",
                  borderRadius: 4,
                  fontSize: 11,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <span style={{ color: "#22c55e", fontWeight: 500 }}>Merge</span>
                  <span style={{ opacity: 0.6, marginLeft: 6 }}>
                    {getStackNameById(op.stackId)} / {op.lane} ({op.blockIds.length})
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteOp(op.id)}
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
            ))}
          </div>
        )}
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
