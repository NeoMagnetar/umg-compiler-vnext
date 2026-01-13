import React from "react";
import { parseSleeve } from "@/lib/sleeveEdit";

interface StructurePanelProps {
  sleeveJson: string;
  onChangeSleeveJson: (next: string) => void;
  selectedBlockIds?: string[];
  onClearMultiSelect?: () => void;
}

export default function StructurePanel({ 
  sleeveJson
}: StructurePanelProps) {
  const { sleeve } = parseSleeve(sleeveJson);
  
  const blockCount = sleeve?.blocks?.length ?? 0;
  const stackCount = sleeve?.stacks?.length ?? 0;
  const segmentCount = (sleeve?.segments?.bundles?.length ?? 0) + (sleeve?.segments?.merges?.length ?? 0);
  
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{
        padding: 12,
        background: "rgba(255,255,255,0.03)",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.08)"
      }}>
        <div className="small" style={{ 
          opacity: 0.6, 
          marginBottom: 10, 
          textTransform: "uppercase", 
          letterSpacing: "0.5px" 
        }}>
          Sleeve Overview
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            padding: "6px 0",
            borderBottom: "1px solid rgba(255,255,255,0.05)"
          }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Total Blocks</span>
            <span style={{ 
              fontSize: 14, 
              fontWeight: 600, 
              color: "#00ff00",
              fontFamily: "var(--font-mono)"
            }}>
              {blockCount}
            </span>
          </div>
          
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            padding: "6px 0",
            borderBottom: "1px solid rgba(255,255,255,0.05)"
          }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Active Stacks</span>
            <span style={{ 
              fontSize: 14, 
              fontWeight: 600, 
              color: "#3b82f6",
              fontFamily: "var(--font-mono)"
            }}>
              {stackCount}
            </span>
          </div>
          
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            padding: "6px 0"
          }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Segments (Bundle/Merge)</span>
            <span style={{ 
              fontSize: 14, 
              fontWeight: 600, 
              color: "#a855f7",
              fontFamily: "var(--font-mono)"
            }}>
              {segmentCount}
            </span>
          </div>
        </div>
      </div>

      <div style={{
        padding: 12,
        background: "rgba(0, 255, 0, 0.03)",
        borderRadius: 8,
        border: "1px solid rgba(0, 255, 0, 0.1)"
      }}>
        <div style={{ fontSize: 11, opacity: 0.7, lineHeight: 1.5 }}>
          Use the <strong style={{ color: "#00ff00" }}>CUSTOMIZE</strong> button on each stack in the graph view to access compression, bundling, and merging tools.
        </div>
      </div>
    </div>
  );
}
