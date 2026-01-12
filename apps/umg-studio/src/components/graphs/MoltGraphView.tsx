import React, { useMemo } from "react";
import { GraphNode, GraphEdge, GraphData } from "@/lib/graphTypes";
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

interface MoltGraphViewProps {
  sleeveJson: string;
  selectedNodeId?: string | null;
  onSelectNode?: (node: GraphNode | null) => void;
}

export default function MoltGraphView({ 
  sleeveJson, 
  selectedNodeId, 
  onSelectNode 
}: MoltGraphViewProps) {
  const { graphData, blocksById, stacks } = useMemo(() => {
    const { sleeve, error } = parseSleeve(sleeveJson);
    if (error || !sleeve) {
      return { graphData: { nodes: [], edges: [] }, blocksById: {}, stacks: [] };
    }

    const blocksById: Record<string, any> = {};
    const blocks = sleeve.blocks ?? [];
    for (const block of blocks) {
      if (block.id) {
        blocksById[block.id] = block;
      }
    }

    const stacks = sleeve.stacks ?? [];
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    for (const stack of stacks) {
      const stackBlockIds: string[] = stack.blockIds ?? [];
      let prevBlockId: string | null = null;

      for (const blockId of stackBlockIds) {
        const block = blocksById[blockId];
        if (block) {
          nodes.push({
            id: block.id,
            label: block.title ?? block.id,
            kind: "block",
            payload: block,
            moltType: block.moltType,
            tags: block.tags
          });

          if (prevBlockId) {
            edges.push({ from: prevBlockId, to: block.id });
          }
          prevBlockId = block.id;
        }
      }
    }

    return { graphData: { nodes, edges }, blocksById, stacks };
  }, [sleeveJson]);

  const handleNodeClick = (node: GraphNode) => {
    if (onSelectNode) {
      onSelectNode(selectedNodeId === node.id ? null : node);
    }
  };

  if (stacks.length === 0) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p className="small" style={{ opacity: 0.5 }}>No stacks defined in sleeve</p>
      </div>
    );
  }

  return (
    <div style={{ 
      height: "100%", 
      width: "100%",
      overflow: "auto", 
      padding: 12
    }}>
      <div style={{ display: "flex", gap: 16, minWidth: "fit-content" }}>
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
                        <div style={{ 
                          fontSize: 11, 
                          opacity: 0.3, 
                          fontStyle: "italic",
                          padding: "4px 0"
                        }}>
                          empty
                        </div>
                      ) : (
                        blocksInLane.map((block: any) => {
                          const isSelected = block.id === selectedNodeId;
                          const node = graphData.nodes.find(n => n.id === block.id);
                          
                          return (
                            <div 
                              key={block.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => node && handleNodeClick(node)}
                              onKeyDown={(e) => e.key === "Enter" && node && handleNodeClick(node)}
                              data-testid={`graph-node-${block.id}`}
                              style={{
                                padding: 10,
                                marginTop: 8,
                                background: "rgba(0,0,0,0.25)",
                                borderRadius: 10,
                                cursor: "pointer",
                                border: isSelected 
                                  ? "2px solid rgba(255,255,255,0.65)" 
                                  : "1px solid rgba(255,255,255,0.12)",
                                boxShadow: isSelected 
                                  ? "0 0 0 3px rgba(255,255,255,0.12)" 
                                  : "none",
                                transition: "border 0.15s, box-shadow 0.15s"
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
    </div>
  );
}
