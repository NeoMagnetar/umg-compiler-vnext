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

interface GraphCanvasProps {
  compiled: any;
  selectedTag?: string | null;
}

export default function GraphCanvas({ compiled, selectedTag }: GraphCanvasProps) {
  const neoBlocks = compiled?.runtime?.neoBlocks ?? [];
  const indexes = compiled?.runtime?.indexes ?? {};
  const hasErrors = compiled?.hasErrors;

  const stackNameById = indexes.stackNameById ?? {};
  const blockTitleById = indexes.blockTitleById ?? {};
  const tagsByBlockId = indexes.tags?.tagsByBlockId ?? {};

  const getBlocksGroupedByMolt = (nb: any) => {
    const blocksByMolt: Record<string, any[]> = {};
    MOLT_ORDER.forEach(molt => { blocksByMolt[molt] = []; });

    const orderedBlockIds = nb.orderedBlockIds ?? [];
    const moltTypeByBlockId = indexes.moltTypeByBlockId ?? {};

    orderedBlockIds.forEach((blockId: string) => {
      const molt = moltTypeByBlockId[blockId] ?? "instruction";
      if (blocksByMolt[molt]) {
        blocksByMolt[molt].push({
          id: blockId,
          title: blockTitleById[blockId] ?? blockId,
          tags: tagsByBlockId[blockId] ?? []
        });
      }
    });

    return blocksByMolt;
  };

  const isBlockHighlighted = (blockId: string) => {
    if (!selectedTag) return false;
    const blockTags = tagsByBlockId[blockId] ?? [];
    return blockTags.includes(selectedTag);
  };

  return (
    <div className="panel" style={{ height: "100%", padding: 16, overflowX: "auto" }}>
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
                          blocks.map((block: any) => (
                            <div 
                              key={block.id}
                              style={{
                                padding: "6px 8px",
                                marginBottom: 4,
                                background: "rgba(0,0,0,0.3)",
                                borderRadius: 4,
                                border: isBlockHighlighted(block.id) 
                                  ? "1px solid #ff69b4" 
                                  : "1px solid transparent",
                                boxShadow: isBlockHighlighted(block.id) 
                                  ? "0 0 8px rgba(255,105,180,0.4)" 
                                  : "none"
                              }}
                            >
                              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>
                                {block.title}
                              </div>
                              <div className="mono" style={{ fontSize: 10, opacity: 0.5 }}>
                                {block.id}
                              </div>
                              {block.tags.length > 0 && (
                                <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4 }}>
                                  {block.tags.map((tag: string) => (
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
                                          : "1px solid transparent"
                                      }}
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))
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
