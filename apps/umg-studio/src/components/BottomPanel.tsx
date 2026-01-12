import React, { useState, useRef, useEffect } from "react";
import { GraphNode } from "@/lib/graphTypes";
import { ParsedItem } from "@/lib/promptParse";
import PromptBuilder from "./PromptBuilder";
import { downloadAsFile } from "@/lib/libraryExport";

interface BottomPanelProps {
  selectedNode: GraphNode | null;
  isOpen: boolean;
  onToggle: () => void;
  height: number;
  onHeightChange: (height: number) => void;
  isMobile?: boolean;
  onGenerate?: (item: ParsedItem) => void;
  onCompile?: () => void;
  sleeveJson?: string;
  selectMode?: boolean;
  onToggleSelectMode?: () => void;
}

type DetailTab = "details" | "json" | "trace" | "prompt";

export default function BottomPanel({ 
  selectedNode, 
  isOpen, 
  onToggle,
  height,
  onHeightChange,
  isMobile = false,
  onGenerate,
  onCompile,
  sleeveJson,
  selectMode,
  onToggleSelectMode
}: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("details");
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const mobileMaxHeight = typeof window !== "undefined" ? window.innerHeight * 0.45 : 300;
  const effectiveHeight = isMobile ? Math.min(height, mobileMaxHeight) : height;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startY: e.clientY, startHeight: height };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragRef.current) return;
    const delta = dragRef.current.startY - e.clientY;
    const maxH = isMobile ? mobileMaxHeight : 500;
    const newHeight = Math.max(100, Math.min(maxH, dragRef.current.startHeight + delta));
    onHeightChange(newHeight);
  };

  const handleMouseUp = () => {
    dragRef.current = null;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleGenerate = (item: ParsedItem) => {
    onGenerate?.(item);
    setActiveTab("details");
  };

  const handleExport = () => {
    if (sleeveJson) {
      downloadAsFile(sleeveJson, `sleeve-${Date.now()}.json`);
    }
  };

  const renderTabButton = (tab: DetailTab, label: string) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      data-testid={`bottom-panel-tab-${tab}`}
      style={{
        padding: "4px 12px",
        background: activeTab === tab ? "rgba(255,255,255,0.1)" : "transparent",
        border: "none",
        borderRadius: 4,
        color: activeTab === tab ? "#fff" : "rgba(255,255,255,0.6)",
        fontSize: 11,
        cursor: "pointer",
        transition: "all 0.15s"
      }}
    >
      {label}
    </button>
  );

  const renderContent = () => {
    if (activeTab === "prompt") {
      return <PromptBuilder onGenerate={handleGenerate} />;
    }

    if (!selectedNode) {
      return (
        <div style={{ 
          height: "100%", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          opacity: 0.5 
        }}>
          Select a node to inspect
        </div>
      );
    }

    if (activeTab === "details") {
      return (
        <div style={{ padding: 12 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, opacity: 0.5, textTransform: "uppercase", marginBottom: 4 }}>
              {selectedNode.kind}
            </div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{selectedNode.label}</div>
            <div className="mono small" style={{ opacity: 0.5, marginTop: 2 }}>{selectedNode.id}</div>
          </div>

          {selectedNode.moltType && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 11, opacity: 0.5 }}>MOLT: </span>
              <span style={{ 
                fontSize: 11, 
                padding: "2px 6px", 
                background: "rgba(168, 85, 247, 0.2)",
                borderRadius: 4,
                color: "#a855f7"
              }}>
                {selectedNode.moltType}
              </span>
            </div>
          )}

          {selectedNode.tags && selectedNode.tags.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>Tags</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {selectedNode.tags.map((tag: string) => (
                  <span 
                    key={tag}
                    style={{ 
                      fontSize: 10, 
                      padding: "2px 6px", 
                      background: "rgba(255,105,180,0.15)",
                      borderRadius: 4,
                      color: "#ff69b4"
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {selectedNode.payload?.description && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>Description</div>
              <div style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.8 }}>
                {selectedNode.payload.description}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (activeTab === "json") {
      return (
        <div style={{ padding: 12, height: "100%", overflow: "auto" }}>
          <pre className="mono" style={{ 
            fontSize: 10, 
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word"
          }}>
            {JSON.stringify(selectedNode.payload, null, 2)}
          </pre>
        </div>
      );
    }

    if (activeTab === "trace") {
      const traceEvents = selectedNode.payload?.trace ?? selectedNode.payload?.traceEvents ?? [];
      if (traceEvents.length === 0) {
        return (
          <div style={{ 
            height: "100%", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            opacity: 0.5 
          }}>
            No trace events available
          </div>
        );
      }
      return (
        <div style={{ padding: 12, height: "100%", overflow: "auto" }}>
          {traceEvents.map((event: any, i: number) => (
            <div 
              key={i}
              style={{ 
                padding: 8, 
                marginBottom: 6, 
                background: "rgba(0,0,0,0.2)",
                borderRadius: 4,
                fontSize: 11
              }}
            >
              <span style={{ opacity: 0.5 }}>{event.kind ?? event.type}: </span>
              <span>{event.message ?? JSON.stringify(event)}</span>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  if (!isOpen) {
    return (
      <div 
        style={{ 
          height: 36,
          borderTop: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0
        }}
        onClick={onToggle}
        data-testid="bottom-panel-collapsed"
      >
        <span style={{ 
          fontSize: 16, 
          opacity: 0.5,
          transform: "translateY(-2px)"
        }}>
          ▲
        </span>
      </div>
    );
  }

  return (
    <div 
      ref={panelRef}
      style={{ 
        height: effectiveHeight,
        borderTop: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0
      }}
      data-testid="bottom-panel-expanded"
    >
      <div 
        onMouseDown={handleMouseDown}
        style={{
          height: 8,
          background: "transparent",
          cursor: "ns-resize",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <div style={{
          width: 40,
          height: 4,
          background: "rgba(255,255,255,0.2)",
          borderRadius: 2
        }} />
      </div>
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        padding: "4px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        gap: 8,
        flexShrink: 0,
        flexWrap: "wrap"
      }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            className="btn"
            onClick={onCompile}
            data-testid="bottom-panel-compile"
            style={{
              fontSize: 10,
              padding: "3px 8px"
            }}
          >
            Compile
          </button>
          <button
            className="btn"
            onClick={handleExport}
            data-testid="bottom-panel-export"
            style={{
              fontSize: 10,
              padding: "3px 8px"
            }}
          >
            Export
          </button>
          <button
            className="btn"
            onClick={onToggleSelectMode}
            data-testid="bottom-panel-select"
            style={{
              fontSize: 10,
              padding: "3px 8px",
              background: selectMode ? "rgba(168, 85, 247, 0.2)" : "transparent",
              borderColor: selectMode ? "#a855f7" : "rgba(255,255,255,0.2)",
              color: selectMode ? "#a855f7" : "inherit"
            }}
          >
            Select
          </button>
        </div>
        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)" }} />
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {renderTabButton("details", "Details")}
          {renderTabButton("json", "JSON")}
          {renderTabButton("trace", "Trace")}
          {renderTabButton("prompt", "PROMPT")}
        </div>
        <button
          onClick={onToggle}
          data-testid="bottom-panel-close"
          style={{
            marginLeft: "auto",
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.5)",
            cursor: "pointer",
            fontSize: 14,
            padding: "2px 6px"
          }}
        >
          ▼
        </button>
      </div>
      <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        {renderContent()}
      </div>
    </div>
  );
}
