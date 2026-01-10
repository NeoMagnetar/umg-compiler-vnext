import React from "react";

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
  instruction: { bg: "rgba(234, 179, 8, 0.15)", border: "#eab308" },
  subject: { bg: "rgba(34, 197, 94, 0.15)", border: "#22c55e" },
  primary: { bg: "rgba(245, 158, 11, 0.15)", border: "#f59e0b" },
  philosophy: { bg: "rgba(245, 245, 220, 0.12)", border: "#d4d4aa" },
  blueprint: { bg: "rgba(59, 130, 246, 0.15)", border: "#3b82f6" }
};

const MAX_VISIBLE_TAGS = 2;

interface GraphCanvasProps {
  compiled: any;
  selectedTag?: string | null;
  selectedBlockId?: string | null;
  onSelectBlockId?: (id: string | null) => void;
}

export default function GraphCanvas({ compiled, selectedTag, selectedBlockId, onSelectBlockId }: GraphCanvasProps) {
  const neoBlocks = compiled?.runtime?.neoBlocks ?? [];
  const indexes = compiled?.runtime?.indexes ?? {};
  const hasErrors = compiled?.hasErrors;

  const stackNameById = indexes.stackNameById ?? {};
  const blockTitleById = indexes.blockTitleById ?? {};
  const moltTypeByBlockId = indexes.moltTypeByBlockId ?? {};
  const tagsByBlockId = indexes.tags?.tagsByBlockId ?? {};

  const getBlocksGroupedByMolt = (nb: any) => {
    const blocksByMolt: Record<string, any[]> = {};
    MOLT_ORDER.forEach(molt => { blocksByMolt[molt] = []; });

    const orderedBlockIds = nb.orderedBlockIds ?? [];

    orderedBlockIds.forEach((blockId: string) => {
      const molt = moltTypeByBlockId[blockId];
      if (!molt) return;
      
      if (blocksByMolt[molt]) {
        blocksByMolt[molt].push({
          id: blockId,
          title: blockTitleById[blockId] ?? blockId,
          tags: tagsByBlockId[blockId] ?? [],
          moltType: molt
        });
      }
    });

    return blocksByMolt;
  };

  const isBlockHighlightedByTag = (blockId: string) => {
    if (!selectedTag) return false;
    const blockTags = tagsByBlockId[blockId] ?? [];
    return blockTags.includes(selectedTag);
  };

  const handleBlockClick = (blockId: string) => {
    if (onSelectBlockId) {
      onSelectBlockId(selectedBlockId === blockId ? null : blockId);
    }
  };

  return (
    <div style={{ height: "100%", overflow: "auto", padding: 12 }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 13, opacity: 0.7 }}>Graph Canvas</h3>
      {hasErrors ? (
        <p style={{ color: "#ff6b6b" }}>Compilation has errors. Check output.</p>
      ) : neoBlocks.length > 0 ? (
        <div style={{ display: "flex", gap: 16, minWidth: "fit-content" }}>
          {neoBlocks.map((nb: any) => {
            const blocksByMolt = getBlocksGroupedByMolt(nb);
            const stackName = stackNameById[nb.stackId] ?? nb.stackId;

            return (
              <div 
                key={nb.id} 
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
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{stackName}</div>
                  <div className="mono small" style={{ opacity: 0.5, marginTop: 2 }}>{nb.id}</div>
                </div>

                <div style={{ padding: 8 }}>
                  {MOLT_ORDER.map((molt) => {
                    const blocks = blocksByMolt[molt];
                    const colors = MOLT_COLORS[molt];

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
                          marginBottom: blocks.length > 0 ? 6 : 0,
                          letterSpacing: "0.5px"
                        }}>
                          {molt}
                        </div>

                        {blocks.length === 0 ? (
                          <div style={{ fontSize: 11, opacity: 0.3, fontStyle: "italic" }}>
                            empty {molt}
                          </div>
                        ) : (
                          blocks.map((block: any) => {
                            const isSelected = block.id === selectedBlockId;
                            const isHighlightedByTag = isBlockHighlightedByTag(block.id);
                            const visibleTags = block.tags.slice(0, MAX_VISIBLE_TAGS);
                            const hiddenTagCount = block.tags.length - MAX_VISIBLE_TAGS;

                            return (
                              <div 
                                key={block.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleBlockClick(block.id)}
                                onKeyDown={(e) => e.key === "Enter" && handleBlockClick(block.id)}
                                style={{
                                  padding: 10,
                                  marginTop: 8,
                                  background: "rgba(0,0,0,0.25)",
                                  borderRadius: 10,
                                  cursor: "pointer",
                                  border: isSelected 
                                    ? "2px solid rgba(255,255,255,0.65)" 
                                    : isHighlightedByTag 
                                      ? "1px solid #ff69b4" 
                                      : "1px solid rgba(255,255,255,0.12)",
                                  boxShadow: isSelected 
                                    ? "0 0 0 3px rgba(255,255,255,0.12)" 
                                    : isHighlightedByTag 
                                      ? "0 0 8px rgba(255,105,180,0.4)" 
                                      : "none",
                                  transition: "border 0.15s, box-shadow 0.15s"
                                }}
                              >
                                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>
                                  {block.title}
                                </div>
                                <div className="mono" style={{ fontSize: 10, opacity: 0.5 }}>
                                  {block.id}
                                </div>
                                {block.tags.length > 0 && (
                                  <div style={{ 
                                    marginTop: 4, 
                                    display: "flex", 
                                    flexWrap: "nowrap", 
                                    gap: 4,
                                    overflow: "hidden"
                                  }}>
                                    {visibleTags.map((tag: string) => (
                                      <span 
                                        key={tag}
                                        style={{
                                          fontSize: 9,
                                          padding: "2px 6px",
                                          background: selectedTag === tag 
                                            ? "rgba(255,105,180,0.3)" 
                                            : "rgba(255,255,255,0.1)",
                                          borderRadius: 10,
                                          border: selectedTag === tag 
                                            ? "1px solid #ff69b4" 
                                            : "1px solid transparent",
                                          whiteSpace: "nowrap"
                                        }}
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                    {hiddenTagCount > 0 && (
                                      <span style={{
                                        fontSize: 9,
                                        padding: "2px 6px",
                                        background: "rgba(255,255,255,0.05)",
                                        borderRadius: 10,
                                        opacity: 0.6,
                                        whiteSpace: "nowrap"
                                      }}>
                                        +{hiddenTagCount}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="small" style={{ opacity: 0.5 }}>No NeoBlocks yet</p>
      )}
    </div>
  );
}
