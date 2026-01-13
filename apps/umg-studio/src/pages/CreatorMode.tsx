import { useMemo } from "react";
import ReactFlow, { Background, Controls } from "reactflow";
import "reactflow/dist/style.css";

import { CreatorSidebar } from "../umg/ui/CreatorSidebar";
import { BlockEditorPanel } from "../umg/ui/BlockEditorPanel";
import { TutorialOutputPanel } from "../umg/ui/TutorialOutputPanel";
import { nodeTypes } from "../umg/graph/nodeTypes";
import { buildGraph } from "../umg/graph/buildNodes";
import { useUmgStore } from "../umg/store";

const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;

export default function CreatorMode() {
  const s = useUmgStore();

  const { nodes, edges } = useMemo(
    () => buildGraph(s.blocks, s.neoBlocks, s.neoStacks, s.sleeve),
    [s.blocks, s.neoBlocks, s.neoStacks, s.sleeve]
  );

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
            panOnScroll={!isMobile}
            zoomOnScroll={!isMobile}
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
          </ReactFlow>
        </div>
        <TutorialOutputPanel />
      </div>
      <BlockEditorPanel />
    </div>
  );
}
