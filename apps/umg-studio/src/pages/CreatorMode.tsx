import { useState, useMemo } from "react";
import ReactFlow, { Background, Controls, MiniMap } from "reactflow";
import "reactflow/dist/style.css";

import { CreatorSidebar } from "../umg/ui/CreatorSidebar";
import { BlockEditorPanel } from "../umg/ui/BlockEditorPanel";
import { TutorialOutputPanel } from "../umg/ui/TutorialOutputPanel";
import { nodeTypes } from "../umg/graph/nodeTypes";
import { buildGraph } from "../umg/graph/buildNodes";
import { useUmgStore } from "../umg/store";

type MobileTab = "build" | "graph" | "inspect" | "output";

const isMobile = typeof window !== "undefined" && window.innerWidth < 900;

export default function CreatorMode() {
  const s = useUmgStore();
  const [mobileTab, setMobileTab] = useState<MobileTab>("build");

  const { nodes, edges } = useMemo(
    () => buildGraph(s.blocks, s.neoBlocks, s.neoStacks, s.sleeve),
    [s.blocks, s.neoBlocks, s.neoStacks, s.sleeve]
  );

  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0a0a0f" }}>
        <div style={tabBar}>
          {(["build", "graph", "inspect", "output"] as MobileTab[]).map(tab => (
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
            <div style={{ height: "100%", width: "100%", position: "relative" }}>
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
          {mobileTab === "output" && <TutorialOutputPanel />}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100%", background: "#0a0a0f" }}>
      <CreatorSidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
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
    </div>
  );
}

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
