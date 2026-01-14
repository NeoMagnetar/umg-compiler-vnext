import { useState, useMemo } from "react";
import ReactFlow, { Background, Controls, MiniMap } from "reactflow";
import "reactflow/dist/style.css";

import { CreatorSidebar } from "../umg/ui/CreatorSidebar";
import { BlockEditorPanel } from "../umg/ui/BlockEditorPanel";
import { TutorialOutputPanel } from "../umg/ui/TutorialOutputPanel";
import { TutorialLibraryPanel } from "../umg/ui/TutorialLibraryPanel";
import { ImportExportControls } from "../umg/ui/ImportExportControls";
import { nodeTypes } from "../umg/graph/nodeTypes";
import { buildGraph } from "../umg/graph/buildNodes";
import { SnapSlotOverlay } from "../umg/graph/SnapSlotOverlay";
import { useUmgStore } from "../umg/store";

type MobileTab = "build" | "graph" | "inspect" | "output" | "library";

const isMobile = typeof window !== "undefined" && window.innerWidth < 900;

export default function CreatorMode() {
  const s = useUmgStore();
  const [mobileTab, setMobileTab] = useState<MobileTab>("build");

  const { nodes, edges } = useMemo(
    () => buildGraph(s.blocks, s.neoBlocks, s.neoStacks, s.sleeve, s.nodePositions),
    [s.blocks, s.neoBlocks, s.neoStacks, s.sleeve, s.nodePositions]
  );

  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0a0a0f" }}>
        <div style={headerBar}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>UMG Studio</span>
          <ImportExportControls />
        </div>
        <div style={tabBar}>
          {(["build", "graph", "inspect", "library", "output"] as MobileTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              style={{
                ...tabBtn,
                background: mobileTab === tab ? "rgba(96, 165, 250, 0.2)" : "transparent",
                color: mobileTab === tab ? "#60a5fa" : "rgba(255,255,255,0.5)",
                borderBottom: mobileTab === tab ? "2px solid #60a5fa" : "2px solid transparent",
              }}
              data-testid={`tab-${tab}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          {mobileTab === "build" && <CreatorSidebar />}
          {mobileTab === "graph" && (
            <div style={graphWrap}>
              <SnapSlotOverlay />
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                style={{ background: "#0a0a0f" }}
                proOptions={{ hideAttribution: true }}
                panOnScroll={false}
                zoomOnScroll={false}
                zoomOnPinch={true}
                zoomOnDoubleClick={false}
                nodesDraggable={false}
              >
                <Background color="rgba(255,255,255,0.05)" gap={20} />
                <Controls
                  style={{
                    background: "rgba(30,30,40,0.9)",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.1)"
                  }}
                />
                <MiniMap
                  style={{ background: "#15151c" }}
                  nodeColor="#60a5fa"
                  maskColor="rgba(0,0,0,0.7)"
                />
              </ReactFlow>
            </div>
          )}
          {mobileTab === "inspect" && <BlockEditorPanel />}
          {mobileTab === "library" && <TutorialLibraryPanel />}
          {mobileTab === "output" && <TutorialOutputPanel />}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0a0a0f" }}>
      <div style={headerBar}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>UMG Studio</span>
        <ImportExportControls />
      </div>
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <CreatorSidebar />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
            <SnapSlotOverlay />
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              style={{ background: "#0a0a0f" }}
              proOptions={{ hideAttribution: true }}
              panOnScroll={true}
              zoomOnScroll={true}
              zoomOnPinch={true}
              zoomOnDoubleClick={false}
              nodesDraggable={false}
            >
              <Background color="rgba(255,255,255,0.05)" gap={20} />
              <Controls
                style={{
                  background: "rgba(30,30,40,0.9)",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)"
                }}
              />
              <MiniMap
                style={{ background: "#15151c" }}
                nodeColor="#60a5fa"
                maskColor="rgba(0,0,0,0.7)"
              />
            </ReactFlow>
          </div>
          <TutorialOutputPanel />
        </div>
        <BlockEditorPanel />
        <TutorialLibraryPanel />
      </div>
    </div>
  );
}

const headerBar: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "8px 12px",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
  background: "#0d0d12",
  flexShrink: 0,
};

const tabBar: React.CSSProperties = {
  display: "flex",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
  background: "#0d0d12",
  flexShrink: 0,
};

const tabBtn: React.CSSProperties = {
  flex: 1,
  padding: "12px 8px",
  fontSize: 12,
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
  transition: "all 0.15s",
};

const graphWrap: React.CSSProperties = {
  height: "100%",
  width: "100%",
  overflow: "hidden",
  touchAction: "none",
  position: "relative",
};
