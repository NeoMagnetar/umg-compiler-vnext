import React, { useMemo, useState, useCallback } from "react";
import { GraphNode } from "@/lib/graphTypes";
import { parseSleeve, addBlockToStack, addBundleOp, addMergeOp } from "@/lib/sleeveEdit";
import { buildMoltGraph, CompressedGroup } from "@/lib/moltCompression";
import { Pos } from "@/lib/layoutStore";

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
  compressedGroups?: CompressedGroup[];
  positions?: Record<string, Pos>;
  onChangeSleeveJson?: (nextJson: string) => void;
}

type SelectionMode = "idle" | "selecting";
type OperationType = null | "bundle" | "merge";

interface StackSelectionState {
  mode: SelectionMode;
  operationType: OperationType;
  selectedBlockIds: string[];
  lockedMoltType: string | null;
  lockedStackId: string | null;
}

export default function MoltGraphView({
  sleeveJson,
  selectedNodeId,
  onSelectNode,
  compressedGroups = [],
  positions = {},
  onChangeSleeveJson
}: MoltGraphViewProps) {
  const [selectionState, setSelectionState] = useState<StackSelectionState>({
    mode: "idle",
    operationType: null,
    selectedBlockIds: [],
    lockedMoltType: null,
    lockedStackId: null
  });

  const { graphData, blocksById, sortedStacks, blockIdToGroup } = useMemo(() => {
    const { sleeve, error } = parseSleeve(sleeveJson);
    if (error || !sleeve) {
      return { graphData: { nodes: [], edges: [] }, blocksById: {}, sortedStacks: [], blockIdToGroup: {} };
    }

    const blocksById: Record<string, any> = {};
    const blocks = sleeve.blocks ?? [];
    for (const block of blocks) {
      if (block.id) {
        blocksById[block.id] = block;
      }
    }

    const stacks = sleeve.stacks ?? [];
    const sortedStacks = [...stacks].sort((a, b) => {
      const aName = (a.name ?? a.id).toLowerCase();
      const bName = (b.name ?? b.id).toLowerCase();
      if (aName !== bName) return aName.localeCompare(bName);
      return a.id.localeCompare(b.id);
    });

    const blockIdToGroup: Record<string, CompressedGroup> = {};
    for (const group of compressedGroups) {
      for (const blockId of group.blockIds) {
        blockIdToGroup[blockId] = group;
      }
    }

    const graphData = buildMoltGraph({
      stacks: sortedStacks,
      blocksById,
      compressedGroups,
      positions
    });

    return { graphData, blocksById, sortedStacks, blockIdToGroup };
  }, [sleeveJson, compressedGroups, positions]);

  const handleNodeClick = (node: GraphNode) => {
    if (selectionState.mode === "selecting") return;
    if (onSelectNode) {
      onSelectNode(selectedNodeId === node.id ? null : node);
    }
  };

  const handleCreateBlock = (stackId: string, moltType: string) => {
    if (!onChangeSleeveJson) return;
    
    const result = addBlockToStack(sleeveJson, stackId, {
      moltType,
      title: `New ${moltType}`,
      content: "",
      tags: []
    });
    
    if (result.nextJson) {
      onChangeSleeveJson(result.nextJson);
      
      const { sleeve } = parseSleeve(result.nextJson);
      if (sleeve && Array.isArray(sleeve.blocks)) {
        const newBlock = sleeve.blocks[sleeve.blocks.length - 1];
        if (newBlock && onSelectNode) {
          const node: GraphNode = {
            id: newBlock.id,
            kind: "block",
            label: newBlock.title ?? newBlock.id,
            moltType: newBlock.moltType,
            tags: newBlock.tags ?? [],
            payload: newBlock
          };
          onSelectNode(node);
        }
      }
    }
  };

  const handleToggleSelector = useCallback((stackId: string) => {
    if (selectionState.mode === "idle") {
      setSelectionState({
        mode: "selecting",
        operationType: null,
        selectedBlockIds: [],
        lockedMoltType: null,
        lockedStackId: stackId
      });
    } else if (selectionState.lockedStackId === stackId) {
      setSelectionState({
        mode: "idle",
        operationType: null,
        selectedBlockIds: [],
        lockedMoltType: null,
        lockedStackId: null
      });
    }
  }, [selectionState]);

  const handleBlockOperation = useCallback((blockId: string, opType: "bundle" | "merge", moltType: string, stackId: string) => {
    if (selectionState.mode !== "selecting") return;
    if (selectionState.lockedStackId && selectionState.lockedStackId !== stackId) return;

    const isSelected = selectionState.selectedBlockIds.includes(blockId);

    if (isSelected) {
      const newSelected = selectionState.selectedBlockIds.filter(id => id !== blockId);
      setSelectionState(prev => ({
        ...prev,
        selectedBlockIds: newSelected,
        operationType: newSelected.length === 0 ? null : prev.operationType,
        lockedMoltType: newSelected.length === 0 ? null : prev.lockedMoltType
      }));
      return;
    }

    if (selectionState.operationType && selectionState.operationType !== opType) {
      return;
    }

    if (selectionState.lockedMoltType && selectionState.lockedMoltType !== moltType) {
      return;
    }

    setSelectionState(prev => ({
      ...prev,
      operationType: opType,
      lockedMoltType: moltType,
      lockedStackId: stackId,
      selectedBlockIds: [...prev.selectedBlockIds, blockId]
    }));
  }, [selectionState]);

  const handleActivate = useCallback(() => {
    if (!onChangeSleeveJson) return;
    if (selectionState.selectedBlockIds.length < 2) return;
    if (!selectionState.operationType) return;
    if (!selectionState.lockedStackId || !selectionState.lockedMoltType) return;

    const options = {
      stackId: selectionState.lockedStackId,
      lane: selectionState.lockedMoltType,
      blockIds: selectionState.selectedBlockIds
    };

    let result;
    if (selectionState.operationType === "bundle") {
      result = addBundleOp(sleeveJson, options);
    } else {
      result = addMergeOp(sleeveJson, options);
    }

    if (result.nextJson) {
      onChangeSleeveJson(result.nextJson);
    }

    setSelectionState({
      mode: "idle",
      operationType: null,
      selectedBlockIds: [],
      lockedMoltType: null,
      lockedStackId: null
    });
  }, [sleeveJson, selectionState, onChangeSleeveJson]);

  if (sortedStacks.length === 0) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p className="small" style={{ opacity: 0.5 }}>No stacks defined in sleeve</p>
      </div>
    );
  }

  const renderBlockCard = (block: any, isSelected: boolean, stackId: string) => {
    const node = graphData.nodes.find(n => n.id === block.id);
    const isInSelectionMode = selectionState.mode === "selecting" && selectionState.lockedStackId === stackId;
    const isBlockSelected = selectionState.selectedBlockIds.includes(block.id);
    const moltType = block.moltType;
    
    const canSelectBundle = isInSelectionMode && 
      (!selectionState.operationType || selectionState.operationType === "bundle") &&
      (!selectionState.lockedMoltType || selectionState.lockedMoltType === moltType);
    
    const canSelectMerge = isInSelectionMode && 
      (!selectionState.operationType || selectionState.operationType === "merge") &&
      (!selectionState.lockedMoltType || selectionState.lockedMoltType === moltType);

    const glowColor = selectionState.operationType === "bundle" ? "#22c55e" : 
                      selectionState.operationType === "merge" ? "#a855f7" : 
                      "rgba(255,255,255,0.65)";

    return (
      <div
        key={block.id}
        role="button"
        tabIndex={0}
        onClick={() => !isInSelectionMode && node && handleNodeClick(node)}
        onKeyDown={(e) => e.key === "Enter" && !isInSelectionMode && node && handleNodeClick(node)}
        data-testid={`graph-node-${block.id}`}
        style={{
          padding: 10,
          marginTop: 8,
          background: isBlockSelected ? `${glowColor}22` : "rgba(0,0,0,0.25)",
          borderRadius: 10,
          cursor: isInSelectionMode ? "default" : "pointer",
          border: isBlockSelected
            ? `2px solid ${glowColor}`
            : isSelected
            ? "2px solid rgba(255,255,255,0.65)"
            : "1px solid rgba(255,255,255,0.12)",
          boxShadow: isBlockSelected
            ? `0 0 12px ${glowColor}66, 0 0 4px ${glowColor}44`
            : isSelected
            ? "0 0 0 3px rgba(255,255,255,0.12)"
            : "none",
          transition: "border 0.15s, box-shadow 0.15s, background 0.15s"
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>
          {block.title ?? block.id}
        </div>
        <div className="mono" style={{ fontSize: 10, opacity: 0.5, marginBottom: isInSelectionMode ? 8 : 0 }}>
          {block.id}
        </div>
        
        {isInSelectionMode && (
          <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleBlockOperation(block.id, "bundle", moltType, stackId);
              }}
              disabled={!canSelectBundle}
              data-testid={`button-block-bundle-${block.id}`}
              style={{
                flex: 1,
                padding: "4px 8px",
                fontSize: 10,
                fontWeight: 600,
                background: isBlockSelected && selectionState.operationType === "bundle" 
                  ? "rgba(34, 197, 94, 0.4)" 
                  : canSelectBundle 
                  ? "rgba(34, 197, 94, 0.2)" 
                  : "rgba(34, 197, 94, 0.05)",
                border: isBlockSelected && selectionState.operationType === "bundle"
                  ? "1px solid #22c55e"
                  : "1px solid rgba(34, 197, 94, 0.4)",
                borderRadius: 4,
                color: canSelectBundle ? "#22c55e" : "rgba(34, 197, 94, 0.3)",
                cursor: canSelectBundle ? "pointer" : "not-allowed",
                transition: "all 0.15s",
                textTransform: "uppercase"
              }}
            >
              Bundle
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleBlockOperation(block.id, "merge", moltType, stackId);
              }}
              disabled={!canSelectMerge}
              data-testid={`button-block-merge-${block.id}`}
              style={{
                flex: 1,
                padding: "4px 8px",
                fontSize: 10,
                fontWeight: 600,
                background: isBlockSelected && selectionState.operationType === "merge" 
                  ? "rgba(168, 85, 247, 0.4)" 
                  : canSelectMerge 
                  ? "rgba(168, 85, 247, 0.2)" 
                  : "rgba(168, 85, 247, 0.05)",
                border: isBlockSelected && selectionState.operationType === "merge"
                  ? "1px solid #a855f7"
                  : "1px solid rgba(168, 85, 247, 0.4)",
                borderRadius: 4,
                color: canSelectMerge ? "#a855f7" : "rgba(168, 85, 247, 0.3)",
                cursor: canSelectMerge ? "pointer" : "not-allowed",
                transition: "all 0.15s",
                textTransform: "uppercase"
              }}
            >
              Merge
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderCompressedCard = (group: CompressedGroup, isSelected: boolean) => {
    const node = graphData.nodes.find(n => n.id === group.id);
    const modeColor = group.mode === "bundle" ? "#22c55e" : "#a855f7";

    return (
      <div
        key={group.id}
        role="button"
        tabIndex={0}
        onClick={() => node && handleNodeClick(node)}
        onKeyDown={(e) => e.key === "Enter" && node && handleNodeClick(node)}
        data-testid={`compressed-node-${group.id}`}
        style={{
          padding: 10,
          marginTop: 8,
          background: `${modeColor}22`,
          borderRadius: 10,
          cursor: "pointer",
          border: isSelected
            ? `2px solid ${modeColor}`
            : `1px solid ${modeColor}66`,
          boxShadow: isSelected
            ? `0 0 0 3px ${modeColor}33`
            : "none",
          transition: "border 0.15s, box-shadow 0.15s"
        }}
      >
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 4
        }}>
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            padding: "2px 6px",
            background: modeColor,
            color: "#000",
            borderRadius: 4,
            textTransform: "uppercase"
          }}>
            {group.mode}
          </span>
          <span style={{ fontSize: 11, opacity: 0.7 }}>
            ({group.blockIds.length} blocks)
          </span>
        </div>
        <div className="mono" style={{ fontSize: 10, opacity: 0.5 }}>
          {group.blockIds.slice(0, 2).join(", ")}
          {group.blockIds.length > 2 && "..."}
        </div>
      </div>
    );
  };

  const renderStackHeader = (stack: any) => {
    const isThisStackSelecting = selectionState.mode === "selecting" && selectionState.lockedStackId === stack.id;
    const hasSelections = selectionState.selectedBlockIds.length > 0;
    const canActivate = hasSelections && selectionState.selectedBlockIds.length >= 2;
    
    const buttonLabel = isThisStackSelecting && hasSelections ? "Activate" : "Selector";
    const buttonGlowing = isThisStackSelecting && hasSelections;
    
    const glowColor = selectionState.operationType === "bundle" ? "#22c55e" : 
                      selectionState.operationType === "merge" ? "#a855f7" : 
                      "#00ff00";

    return (
      <div style={{
        padding: "10px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.02)"
      }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between",
          gap: 8
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{stack.name ?? stack.id}</div>
            <div className="mono small" style={{ opacity: 0.5, marginTop: 2 }}>{stack.id}</div>
          </div>
          
          {onChangeSleeveJson && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isThisStackSelecting && canActivate) {
                  handleActivate();
                } else if (isThisStackSelecting && !hasSelections) {
                  handleToggleSelector(stack.id);
                } else {
                  handleToggleSelector(stack.id);
                }
              }}
              data-testid={`button-selector-${stack.id}`}
              style={{
                padding: "5px 12px",
                fontSize: 11,
                fontWeight: 600,
                background: buttonGlowing 
                  ? `${glowColor}33`
                  : isThisStackSelecting 
                  ? "rgba(255,255,255,0.15)" 
                  : "rgba(255,255,255,0.08)",
                border: buttonGlowing
                  ? `1px solid ${glowColor}`
                  : isThisStackSelecting
                  ? "1px solid rgba(255,255,255,0.3)"
                  : "1px solid rgba(255,255,255,0.15)",
                borderRadius: 6,
                color: buttonGlowing ? glowColor : isThisStackSelecting ? "#fff" : "rgba(255,255,255,0.7)",
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: buttonGlowing 
                  ? `0 0 12px ${glowColor}66, 0 0 4px ${glowColor}44`
                  : "none",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}
            >
              {buttonLabel}
            </button>
          )}
        </div>
        
        {isThisStackSelecting && (
          <div style={{
            marginTop: 8,
            padding: "6px 10px",
            background: "rgba(0,0,0,0.3)",
            borderRadius: 6,
            fontSize: 11,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <span style={{ opacity: 0.7 }}>
              {selectionState.selectedBlockIds.length === 0 
                ? "Click Bundle or Merge on blocks to select"
                : `${selectionState.selectedBlockIds.length} block${selectionState.selectedBlockIds.length !== 1 ? 's' : ''} selected`}
              {selectionState.operationType && (
                <span style={{ 
                  marginLeft: 6,
                  color: selectionState.operationType === "bundle" ? "#22c55e" : "#a855f7",
                  fontWeight: 600
                }}>
                  ({selectionState.operationType})
                </span>
              )}
            </span>
            {hasSelections && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectionState(prev => ({
                    ...prev,
                    selectedBlockIds: [],
                    operationType: null,
                    lockedMoltType: null
                  }));
                }}
                data-testid={`button-clear-selection-${stack.id}`}
                style={{
                  padding: "2px 8px",
                  fontSize: 10,
                  background: "rgba(239, 68, 68, 0.2)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  borderRadius: 4,
                  color: "#ef4444",
                  cursor: "pointer"
                }}
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      height: "100%",
      width: "100%",
      overflow: "auto",
      padding: 12
    }}>
      <div style={{ display: "flex", gap: 16, minWidth: "fit-content" }}>
        {sortedStacks.map((stack: any) => {
          const stackBlockIds: string[] = stack.blockIds ?? [];
          const processedGroups = new Set<string>();

          return (
            <div
              key={stack.id}
              style={{
                minWidth: 220,
                background: "rgba(255,255,255,0.03)",
                borderRadius: 8,
                border: selectionState.lockedStackId === stack.id && selectionState.mode === "selecting"
                  ? "1px solid rgba(255,255,255,0.25)"
                  : "1px solid rgba(255,255,255,0.1)"
              }}
            >
              {renderStackHeader(stack)}

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
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: blocksInLane.length > 0 ? 6 : 0
                      }}>
                        <div style={{
                          fontSize: 10,
                          textTransform: "uppercase",
                          opacity: 0.6,
                          letterSpacing: "0.5px",
                          pointerEvents: "none"
                        }}>
                          {molt}
                        </div>
                        {onChangeSleeveJson && selectionState.mode === "idle" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCreateBlock(stack.id, molt);
                            }}
                            data-testid={`button-add-block-${stack.id}-${molt}`}
                            style={{
                              width: 20,
                              height: 20,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "rgba(255,255,255,0.1)",
                              border: "1px solid rgba(255,255,255,0.2)",
                              borderRadius: 4,
                              color: "rgba(255,255,255,0.6)",
                              fontSize: 14,
                              cursor: "pointer",
                              transition: "all 0.15s"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "rgba(255,255,255,0.2)";
                              e.currentTarget.style.color = "#fff";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                              e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                            }}
                          >
                            +
                          </button>
                        )}
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
                          const group = blockIdToGroup[block.id];

                          if (group && !processedGroups.has(group.id)) {
                            processedGroups.add(group.id);
                            const isSelected = selectedNodeId === group.id;
                            return renderCompressedCard(group, isSelected);
                          } else if (group) {
                            return null;
                          }

                          const isSelected = block.id === selectedNodeId;
                          return renderBlockCard(block, isSelected, stack.id);
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
