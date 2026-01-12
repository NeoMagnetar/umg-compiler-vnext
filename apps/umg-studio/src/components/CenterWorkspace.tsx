import React, { useState, useCallback } from "react";
import { GraphNode } from "@/lib/graphTypes";
import MoltGraphView from "./graphs/MoltGraphView";
import NeoGraphView from "./graphs/NeoGraphView";
import SleeveGraphView from "./graphs/SleeveGraphView";
import BottomPanel from "./BottomPanel";

type TabId = "molt" | "neo" | "sleeve";

interface CenterWorkspaceProps {
  sleeveJson: string;
  compiled: any;
}

export default function CenterWorkspace({ sleeveJson, compiled }: CenterWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<TabId>("molt");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [bottomPanelOpen, setBottomPanelOpen] = useState(false);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(180);

  const handleSelectNode = useCallback((node: GraphNode | null) => {
    setSelectedNode(node);
    if (node && !bottomPanelOpen) {
      setBottomPanelOpen(true);
    }
  }, [bottomPanelOpen]);

  const toggleBottomPanel = useCallback(() => {
    setBottomPanelOpen(prev => !prev);
  }, []);

  const tabs: { id: TabId; label: string }[] = [
    { id: "molt", label: "MOLT" },
    { id: "neo", label: "NEO" },
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
          />
        );
      case "neo":
        return (
          <NeoGraphView
            compiled={compiled}
            selectedNodeId={selectedNode?.id}
            onSelectNode={handleSelectNode}
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
        />
      </div>
    </div>
  );
}
