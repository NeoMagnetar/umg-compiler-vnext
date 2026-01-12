import React, { useMemo } from "react";
import { GraphNode, Pos } from "@/lib/graphTypes";
import GridSurface from "./GridSurface";

interface NeoGraphViewProps {
  compiled: any;
  selectedNodeId?: string | null;
  onSelectNode?: (node: GraphNode | null) => void;
  positions?: Record<string, Pos>;
  onUpdatePosition?: (nodeId: string, pos: Pos) => void;
  placementMode?: "idle" | "placing" | "moving";
  activePlacementNodeId?: string | null;
  onSetPlacementNode?: (nodeId: string | null) => void;
  cursorPos?: Pos | null;
  onPickCell?: (pos: Pos) => void;
}

export default function NeoGraphView({
  compiled,
  selectedNodeId,
  onSelectNode,
  positions = {},
  onUpdatePosition,
  placementMode = "idle",
  activePlacementNodeId,
  onSetPlacementNode,
  cursorPos,
  onPickCell
}: NeoGraphViewProps) {
  const runtime = compiled?.runtime;
  const neoBlocks = runtime?.neoBlocks ?? [];
  const neoStacks = runtime?.neoStacks ?? [];

  const placedNodes = useMemo(() => {
    const placed: Array<{ id: string; label: string; pos: Pos; kind: "neoblock" | "neostack"; payload: any }> = [];

    for (const block of neoBlocks) {
      if (positions[block.id]) {
        placed.push({
          id: block.id,
          label: block.title ?? block.id,
          pos: positions[block.id],
          kind: "neoblock",
          payload: block
        });
      }
    }

    for (const stack of neoStacks) {
      if (positions[stack.id]) {
        placed.push({
          id: stack.id,
          label: stack.name ?? stack.id,
          pos: positions[stack.id],
          kind: "neostack",
          payload: stack
        });
      }
    }

    return placed;
  }, [neoBlocks, neoStacks, positions]);

  const unplacedItems = useMemo(() => {
    const items: Array<{ id: string; label: string; kind: "neoblock" | "neostack"; payload: any }> = [];

    for (const block of neoBlocks) {
      if (!positions[block.id]) {
        items.push({
          id: block.id,
          label: block.title ?? block.id,
          kind: "neoblock",
          payload: block
        });
      }
    }

    for (const stack of neoStacks) {
      if (!positions[stack.id]) {
        items.push({
          id: stack.id,
          label: stack.name ?? stack.id,
          kind: "neostack",
          payload: stack
        });
      }
    }

    return items;
  }, [neoBlocks, neoStacks, positions]);

  const handleNodeClick = (item: any, kind: "neoblock" | "neostack") => {
    if (placementMode === "placing" || placementMode === "moving") {
      onSetPlacementNode?.(item.id);
      return;
    }

    if (onSelectNode) {
      const node: GraphNode = {
        id: item.id,
        label: item.title ?? item.name ?? item.id,
        kind,
        payload: item,
        moltType: item.moltType,
        tags: item.tags
      };
      onSelectNode(selectedNodeId === node.id ? null : node);
    }
  };

  const handlePlacedNodeClick = (item: typeof placedNodes[0], e: React.MouseEvent) => {
    e.stopPropagation();

    if (placementMode === "moving" && activePlacementNodeId === item.id) {
      return;
    }

    if (placementMode !== "idle") {
      onSetPlacementNode?.(item.id);
      return;
    }

    if (onSelectNode) {
      const node: GraphNode = {
        id: item.id,
        label: item.label,
        kind: item.kind,
        payload: item.payload
      };
      onSelectNode(selectedNodeId === node.id ? null : node);
    }
  };

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

  return (
    <div style={{
      height: "100%",
      width: "100%",
      display: "flex",
      overflow: "hidden"
    }}>
      <div style={{
        width: 200,
        borderRight: "1px solid rgba(255,255,255,0.1)",
        overflow: "auto",
        padding: 12,
        flexShrink: 0
      }}>
        <h4 style={{
          fontSize: 11,
          opacity: 0.5,
          marginBottom: 8,
          textTransform: "uppercase"
        }}>
          Unplaced ({unplacedItems.length})
        </h4>

        {unplacedItems.length === 0 ? (
          <p className="small" style={{ opacity: 0.4 }}>All items placed</p>
        ) : (
          unplacedItems.map(item => {
            const isActive = activePlacementNodeId === item.id;
            const color = item.kind === "neoblock" ? "#a855f7" : "#3b82f6";

            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => handleNodeClick(item.payload, item.kind)}
                onKeyDown={(e) => e.key === "Enter" && handleNodeClick(item.payload, item.kind)}
                data-testid={`unplaced-${item.id}`}
                style={{
                  padding: 8,
                  marginBottom: 6,
                  background: isActive ? `${color}33` : `${color}1a`,
                  border: isActive ? `2px solid ${color}` : `1px solid ${color}55`,
                  borderRadius: 6,
                  cursor: "pointer",
                  transition: "all 0.15s"
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 500 }}>{item.label}</div>
                <div className="mono" style={{ fontSize: 9, opacity: 0.5 }}>{item.kind}</div>
              </div>
            );
          })
        )}

        {placementMode !== "idle" && (
          <div style={{
            marginTop: 12,
            padding: 8,
            background: "rgba(168, 85, 247, 0.15)",
            borderRadius: 6,
            fontSize: 10,
            color: "#a855f7"
          }}>
            {placementMode === "placing" ? "Click grid to place" : "Click grid to move"}
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
        <GridSurface
          cellSize={60}
          onPickCell={onPickCell}
          cursorPos={cursorPos}
        >
          {placedNodes.map(item => {
            const isSelected = selectedNodeId === item.id;
            const isActive = activePlacementNodeId === item.id;
            const color = item.kind === "neoblock" ? "#a855f7" : "#3b82f6";

            return (
              <div
                key={item.id}
                onClick={(e) => handlePlacedNodeClick(item, e)}
                data-testid={`placed-${item.id}`}
                style={{
                  position: "absolute",
                  left: item.pos.x * 60 + 4,
                  top: item.pos.y * 60 + 4,
                  width: 52,
                  height: 52,
                  background: isActive ? `${color}55` : isSelected ? `${color}44` : `${color}22`,
                  border: isActive ? `2px dashed ${color}` : isSelected ? `2px solid ${color}` : `1px solid ${color}66`,
                  borderRadius: 8,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  padding: 4,
                  transition: "all 0.15s"
                }}
              >
                <span style={{
                  fontSize: 9,
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "100%"
                }}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </GridSurface>
      </div>
    </div>
  );
}
