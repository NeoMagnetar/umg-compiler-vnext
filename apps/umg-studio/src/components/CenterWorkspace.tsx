import React, { useState, useCallback, useEffect } from "react";
import { GraphNode, Pos } from "@/lib/graphTypes";
import { CompressedGroup } from "@/lib/moltCompression";
import { ParsedItem } from "@/lib/promptParse";
import { loadLayout, saveLayout, LayoutState, updateNeoPosition } from "@/lib/layoutStore";
import MoltGraphView from "./graphs/MoltGraphView";
import NeoGraphView from "./graphs/NeoGraphView";
import SleeveGraphView from "./graphs/SleeveGraphView";
import BottomPanel from "./BottomPanel";

type TabId = "molt" | "neo" | "sleeve";
type PlacementMode = "idle" | "placing" | "moving";

interface CenterWorkspaceProps {
  sleeveJson: string;
  compiled: any;
  compressedGroups?: CompressedGroup[];
  onCompressSelection?: (mode: "bundle" | "merge", blockIds: string[], stackId: string) => void;
  isMobile?: boolean;
  onGenerate?: (item: ParsedItem) => void;
}

export default function CenterWorkspace({
  sleeveJson,
  compiled,
  compressedGroups = [],
  onCompressSelection,
  isMobile = false,
  onGenerate
}: CenterWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<TabId>("molt");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [bottomPanelOpen, setBottomPanelOpen] = useState(!isMobile);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(180);

  const [layout, setLayout] = useState<LayoutState>(() => loadLayout());
  const [placementMode, setPlacementMode] = useState<PlacementMode>("idle");
  const [activePlacementNodeId, setActivePlacementNodeId] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState<Pos | null>(null);

  useEffect(() => {
    setLayout(loadLayout());
  }, []);

  const handleSelectNode = useCallback((node: GraphNode | null) => {
    setSelectedNode(node);
    if (node && !bottomPanelOpen) {
      setBottomPanelOpen(true);
    }
  }, [bottomPanelOpen]);

  const toggleBottomPanel = useCallback(() => {
    setBottomPanelOpen(prev => !prev);
  }, []);

  const handleSetPlacementNode = useCallback((nodeId: string | null) => {
    if (!nodeId) {
      setPlacementMode("idle");
      setActivePlacementNodeId(null);
      return;
    }

    const isPlaced = layout.neo[nodeId] !== undefined;

    if (isPlaced) {
      setPlacementMode("moving");
    } else {
      setPlacementMode("placing");
    }
    setActivePlacementNodeId(nodeId);
  }, [layout.neo]);

  const handlePickCell = useCallback((pos: Pos) => {
    if (placementMode === "idle" || !activePlacementNodeId) {
      setCursorPos(pos);
      return;
    }

    const nextLayout = updateNeoPosition(layout, activePlacementNodeId, pos);
    setLayout(nextLayout);
    saveLayout(nextLayout);

    setPlacementMode("idle");
    setActivePlacementNodeId(null);
    setCursorPos(null);
  }, [placementMode, activePlacementNodeId, layout]);

  const handleUpdateNeoPosition = useCallback((nodeId: string, pos: Pos) => {
    const nextLayout = updateNeoPosition(layout, nodeId, pos);
    setLayout(nextLayout);
    saveLayout(nextLayout);
  }, [layout]);

  const tabs: { id: TabId; label: string }[] = [
    { id: "molt", label: "MOLT STACK" },
    { id: "neo", label: "NEOBLOCKS" },
    { id: "sleeve", label: "SLEEVE" }
  ];

  const renderGraphView = () => {
    switch (activeTab) {
      case "molt":
        return (
          <MoltGraphView
            sleeveJson={sleeveJson}
            selectedNodeId={selectedNode?.id}
            onSelectNode={handleSelectNode}
            compressedGroups={compressedGroups}
            positions={layout.molt}
          />
        );
      case "neo":
        return (
          <NeoGraphView
            compiled={compiled}
            selectedNodeId={selectedNode?.id}
            onSelectNode={handleSelectNode}
            positions={layout.neo}
            onUpdatePosition={handleUpdateNeoPosition}
            placementMode={placementMode}
            activePlacementNodeId={activePlacementNodeId}
            onSetPlacementNode={handleSetPlacementNode}
            cursorPos={cursorPos}
            onPickCell={handlePickCell}
          />
        );
      case "sleeve":
        return (
          <SleeveGraphView
            sleeveJson={sleeveJson}
            selectedNodeId={selectedNode?.id}
            onSelectNode={handleSelectNode}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={{
      height: "100%",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      overflow: "hidden"
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "8px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.2)",
        flexShrink: 0
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            data-testid={`tab-${tab.id}`}
            style={{
              padding: "6px 16px",
              background: activeTab === tab.id ? "rgba(255,255,255,0.1)" : "transparent",
              border: activeTab === tab.id ? "1px solid rgba(255,255,255,0.2)" : "1px solid transparent",
              borderRadius: 6,
              color: activeTab === tab.id ? "#fff" : "rgba(255,255,255,0.5)",
              fontSize: 12,
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: "pointer",
              transition: "all 0.15s"
            }}
          >
            {tab.label}
          </button>
        ))}

        {activeTab === "neo" && placementMode !== "idle" && (
          <button
            onClick={() => {
              setPlacementMode("idle");
              setActivePlacementNodeId(null);
            }}
            data-testid="button-cancel-placement"
            style={{
              marginLeft: 8,
              padding: "4px 10px",
              background: "rgba(239, 68, 68, 0.2)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              borderRadius: 4,
              color: "#ef4444",
              fontSize: 11,
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
        )}
      </div>

      <div style={{
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column"
      }}>
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          {renderGraphView()}
        </div>

        <BottomPanel
          selectedNode={selectedNode}
          isOpen={bottomPanelOpen}
          onToggle={toggleBottomPanel}
          height={bottomPanelHeight}
          onHeightChange={setBottomPanelHeight}
          isMobile={isMobile}
          onGenerate={onGenerate}
        />
      </div>
    </div>
  );
}
