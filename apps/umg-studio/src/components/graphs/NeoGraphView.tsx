import React from "react";
import { GraphNode } from "@/lib/graphTypes";

interface NeoGraphViewProps {
  compiled: any;
  selectedNodeId?: string | null;
  onSelectNode?: (node: GraphNode | null) => void;
}

export default function NeoGraphView({ 
  compiled, 
  selectedNodeId, 
  onSelectNode 
}: NeoGraphViewProps) {
  const runtime = compiled?.runtime;
  const neoBlocks = runtime?.neoBlocks ?? [];
  const neoStacks = runtime?.neoStacks ?? [];

  if (!runtime || (neoBlocks.length === 0 && neoStacks.length === 0)) {
    return (
      <div style={{ 
        height: "100%", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        flexDirection: "column",
        gap: 8
      }}>
        <p style={{ opacity: 0.5, fontSize: 13 }}>No Neo graph yet</p>
        <p className="small" style={{ opacity: 0.3 }}>Compile to generate NeoBlocks and NeoStacks</p>
      </div>
    );
  }

  const handleNodeClick = (item: any, kind: "neoblock" | "neostack") => {
    if (onSelectNode) {
      const node: GraphNode = {
        id: item.id,
        label: item.title ?? item.id,
        kind,
        payload: item,
        moltType: item.moltType,
        tags: item.tags
      };
      onSelectNode(selectedNodeId === node.id ? null : node);
    }
  };

  return (
    <div style={{ 
      height: "100%", 
      width: "100%",
      overflow: "auto", 
      padding: 12
    }}>
      <div style={{ display: "flex", gap: 24 }}>
        {neoStacks.length > 0 && (
          <div style={{ minWidth: 200 }}>
            <h4 style={{ fontSize: 12, opacity: 0.6, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              NeoStacks ({neoStacks.length})
            </h4>
            {neoStacks.map((stack: any) => {
              const isSelected = selectedNodeId === stack.id;
              return (
                <div
                  key={stack.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleNodeClick(stack, "neostack")}
                  onKeyDown={(e) => e.key === "Enter" && handleNodeClick(stack, "neostack")}
                  data-testid={`neo-stack-${stack.id}`}
                  style={{
                    padding: 12,
                    marginBottom: 8,
                    background: isSelected ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.1)",
                    border: isSelected ? "2px solid #3b82f6" : "1px solid rgba(59, 130, 246, 0.3)",
                    borderRadius: 8,
                    cursor: "pointer",
                    transition: "all 0.15s"
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{stack.name ?? stack.id}</div>
                  <div className="mono small" style={{ opacity: 0.5, marginTop: 2 }}>{stack.id}</div>
                  {stack.neoBlockIds && (
                    <div className="small" style={{ opacity: 0.4, marginTop: 4 }}>
                      {stack.neoBlockIds.length} blocks
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {neoBlocks.length > 0 && (
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: 12, opacity: 0.6, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              NeoBlocks ({neoBlocks.length})
            </h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {neoBlocks.map((block: any) => {
                const isSelected = selectedNodeId === block.id;
                return (
                  <div
                    key={block.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleNodeClick(block, "neoblock")}
                    onKeyDown={(e) => e.key === "Enter" && handleNodeClick(block, "neoblock")}
                    data-testid={`neo-block-${block.id}`}
                    style={{
                      padding: 10,
                      background: isSelected ? "rgba(168, 85, 247, 0.2)" : "rgba(168, 85, 247, 0.1)",
                      border: isSelected ? "2px solid #a855f7" : "1px solid rgba(168, 85, 247, 0.3)",
                      borderRadius: 8,
                      cursor: "pointer",
                      minWidth: 140,
                      transition: "all 0.15s"
                    }}
                  >
                    <div style={{ fontWeight: 500, fontSize: 12 }}>{block.title ?? block.id}</div>
                    <div className="mono" style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>{block.id}</div>
                    {block.moltType && (
                      <div style={{ 
                        fontSize: 9, 
                        opacity: 0.6, 
                        marginTop: 4,
                        textTransform: "uppercase",
                        letterSpacing: "0.3px"
                      }}>
                        {block.moltType}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
