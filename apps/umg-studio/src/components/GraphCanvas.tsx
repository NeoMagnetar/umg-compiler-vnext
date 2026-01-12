import React, { useMemo } from "react";
import { parseSleeve } from "@/lib/sleeveEdit";

const MOLT_ORDER = [
  "trigger",
  "directive", 
  "instruction",
  "subject",
  "primary",
  "philosophy",
  "blueprint"
] as const;

const MOLT_COLORS: Record<string, { bg: string; border: string }> = {
  trigger: { bg: "rgba(239, 68, 68, 0.15)", border: "#ef4444" },
  directive: { bg: "rgba(168, 85, 247, 0.15)", border: "#a855f7" },
  instruction: { bg: "rgba(236, 72, 153, 0.15)", border: "#ec4899" },
  subject: { bg: "rgba(34, 197, 94, 0.15)", border: "#22c55e" },
  primary: { bg: "rgba(245, 158, 11, 0.15)", border: "#f59e0b" },
  philosophy: { bg: "rgba(245, 245, 220, 0.12)", border: "#d4d4aa" },
  blueprint: { bg: "rgba(59, 130, 246, 0.15)", border: "#3b82f6" }
};

interface GraphCanvasProps {
  sleeveJson: string;
  compiled?: any;
  selectedTag?: string | null;
  selectedBlockId?: string | null;
  onSelectBlockId?: (id: string | null) => void;
  onAddBlock?: (stackId: string, moltType: string) => void;
  selectedBlockIds?: string[];
  onToggleMultiSelect?: (id: string) => void;
  selectMode?: boolean;
}

export default function GraphCanvas({ 
  sleeveJson, 
  compiled, 
  selectedTag, 
  selectedBlockId, 
  onSelectBlockId, 
  onAddBlock,
  selectedBlockIds = [],
  onToggleMultiSelect,
  selectMode = false
}: GraphCanvasProps) {
  const { sleeve, blocksById, stacks } = useMemo(() => {
    const { sleeve, error } = parseSleeve(sleeveJson);
    if (error || !sleeve) {
      return { sleeve: null, blocksById: {}, stacks: [] };
    }

    const blocksById: Record<string, any> = {};
    const blocks = sleeve.blocks ?? [];
    for (const block of blocks) {
      if (block.id) {
        blocksById[block.id] = block;
      }
    }

    const stacks = sleeve.stacks ?? [];
    return { sleeve, blocksById, stacks };
  }, [sleeveJson]);

  const handleBlockClick = (blockId: string, e: React.MouseEvent) => {
    if (selectMode || e.shiftKey) {
      onToggleMultiSelect?.(blockId);
    } else {
      if (onSelectBlockId) {
        onSelectBlockId(selectedBlockId === blockId ? null : blockId);
      }
    }
  };

  const handleAddBlock = (stackId: string, moltType: string) => {
    if (onAddBlock) {
      onAddBlock(stackId, moltType);
    }
  };

  const isBlockHighlightedByTag = (block: any) => {
    if (!selectedTag) return false;
    const blockTags = block.tags ?? [];
    return blockTags.includes(selectedTag);
  };

  const isMultiSelected = (blockId: string) => selectedBlockIds.includes(blockId);

  const renderCard = (block: any) => {
    const isSelected = block.id === selectedBlockId;
    const isHighlightedByTag = isBlockHighlightedByTag(block);
    const isInMultiSelect = isMultiSelected(block.id);

    return (
      <div 
        key={block.id}
        role="button"
        tabIndex={0}
        onClick={(e) => handleBlockClick(block.id, e)}
        onKeyDown={(e) => e.key === "Enter" && handleBlockClick(block.id, e as any)}
        style={{
          padding: 10,
          marginTop: 8,
          background: isInMultiSelect ? "rgba(168, 85, 247, 0.2)" : "rgba(0,0,0,0.25)",
          borderRadius: 10,
          cursor: "pointer",
          border: isInMultiSelect
            ? "2px solid #a855f7"
            : isSelected 
              ? "2px solid rgba(255,255,255,0.65)" 
              : isHighlightedByTag 
                ? "1px solid #ff69b4" 
                : "1px solid rgba(255,255,255,0.12)",
          boxShadow: isInMultiSelect
            ? "0 0 0 3px rgba(168, 85, 247, 0.2)"
            : isSelected 
              ? "0 0 0 3px rgba(255,255,255,0.12)" 
              : isHighlightedByTag 
                ? "0 0 8px rgba(255,105,180,0.4)" 
                : "none",
          transition: "border 0.15s, box-shadow 0.15s, background 0.15s"
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>
          {block.title ?? block.id}
        </div>
        <div className="mono" style={{ fontSize: 10, opacity: 0.5 }}>
          {block.id}
        </div>
      </div>
    );
  };

  const renderEmptySlot = (stackId: string, molt: string) => (
    <button
      onClick={() => handleAddBlock(stackId, molt)}
      style={{
        background: "transparent",
        border: "1px dashed rgba(255,255,255,0.2)",
        borderRadius: 6,
        padding: "6px 10px",
        color: "inherit",
        fontSize: 11,
        cursor: "pointer",
        opacity: 0.5,
        transition: "opacity 0.15s, border-color 0.15s"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = "0.8";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = "0.5";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
      }}
    >
      + Add block
    </button>
  );

  if (!sleeve) {
    return (
      <div style={{ height: "100%", width: "100%", minHeight: 0, overflow: "auto", padding: 12 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 13, opacity: 0.7 }}>Graph Canvas</h3>
        <p style={{ color: "#ff6b6b" }}>Invalid sleeve JSON</p>
      </div>
    );
  }

  if (stacks.length === 0) {
    return (
      <div style={{ height: "100%", width: "100%", minHeight: 0, overflow: "auto", padding: 12 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 13, opacity: 0.7 }}>Graph Canvas</h3>
        <p className="small" style={{ opacity: 0.5 }}>No stacks defined in sleeve</p>
      </div>
    );
  }

  return (
    <div style={{ 
      height: "100%", 
      width: "100%",
      minHeight: 0,
      overflow: "auto", 
      padding: 12,
      display: "flex",
      flexDirection: "column"
    }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 13, opacity: 0.7, flexShrink: 0 }}>
        Graph Canvas
        {selectMode && <span style={{ color: "#a855f7", marginLeft: 8 }}>(Select Mode)</span>}
      </h3>
      <div style={{ display: "flex", gap: 16, minWidth: "fit-content", flex: 1 }}>
        {stacks.map((stack: any) => {
          const stackBlockIds: string[] = stack.blockIds ?? [];

          return (
            <div 
              key={stack.id} 
              style={{ 
                minWidth: 220, 
                background: "rgba(255,255,255,0.03)", 
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)"
              }}
            >
              <div style={{ 
                padding: "10px 12px", 
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.02)"
              }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{stack.name ?? stack.id}</div>
                <div className="mono small" style={{ opacity: 0.5, marginTop: 2 }}>{stack.id}</div>
              </div>

              <div style={{ padding: 8 }}>
                {MOLT_ORDER.map((molt) => {
                  const colors = MOLT_COLORS[molt];
                  const blocksInLane = stackBlockIds
                    .map(id => blocksById[id])
                    .filter(b => b && b.moltType === molt);

                  return (
                    <div 
                      key={molt}
                      style={{
                        marginBottom: 6,
                        padding: 8,
                        background: colors.bg,
                        borderLeft: `3px solid ${colors.border}`,
                        borderRadius: "0 4px 4px 0",
                        minHeight: 32
                      }}
                    >
                      <div style={{ 
                        fontSize: 10, 
                        textTransform: "uppercase", 
                        opacity: 0.6, 
                        marginBottom: blocksInLane.length > 0 ? 6 : 0,
                        letterSpacing: "0.5px",
                        pointerEvents: "none"
                      }}>
                        {molt}
                      </div>

                      {blocksInLane.length === 0 ? (
                        renderEmptySlot(stack.id, molt)
                      ) : (
                        blocksInLane.map((block: any) => renderCard(block))
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
