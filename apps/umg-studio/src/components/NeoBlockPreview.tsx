import React from "react";

const LANE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  trigger: { label: "Trigger", color: "#22d3ee", bg: "rgba(34, 211, 238, 0.1)" },
  directive: { label: "Directive", color: "#a78bfa", bg: "rgba(167, 139, 250, 0.1)" },
  instruction: { label: "Instruction", color: "#ec4899", bg: "rgba(236, 72, 153, 0.1)" },
  subject: { label: "Subject", color: "#4ade80", bg: "rgba(74, 222, 128, 0.1)" },
  primary: { label: "Primary", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
  philosophy: { label: "Philosophy", color: "#6366f1", bg: "rgba(99, 102, 241, 0.1)" },
  blueprint: { label: "Blueprint", color: "#64748b", bg: "rgba(100, 116, 139, 0.1)" }
};

const LANE_ORDER = ["trigger", "directive", "instruction", "subject", "primary", "philosophy", "blueprint"] as const;

type Lanes = {
  trigger: string[];
  directive: string[];
  instruction: string[];
  subject: string[];
  primary: string[];
  philosophy: string[];
  blueprint: string[];
};

interface NeoBlockPreviewProps {
  title: string;
  lanes: Lanes;
  blocksById?: Record<string, any>;
  compact?: boolean;
}

export default function NeoBlockPreview({ title, lanes, blocksById, compact = false }: NeoBlockPreviewProps) {
  const maxItems = compact ? 2 : 3;

  return (
    <div 
      data-testid="neoblock-preview"
      style={{ 
        background: "rgba(168, 85, 247, 0.05)", 
        borderRadius: 8, 
        padding: compact ? 8 : 12,
        border: "1px solid rgba(168, 85, 247, 0.2)"
      }}
    >
      <div style={{ 
        fontSize: compact ? 11 : 13, 
        fontWeight: 600, 
        marginBottom: compact ? 6 : 10,
        color: "#a855f7"
      }}>
        {title}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: compact ? 4 : 6 }}>
        {LANE_ORDER.map(lane => {
          const items = lanes[lane] || [];
          const config = LANE_CONFIG[lane];
          const displayItems = items.slice(0, maxItems);
          const remaining = items.length - maxItems;

          return (
            <div 
              key={lane}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                fontSize: compact ? 10 : 11
              }}
            >
              <div style={{
                width: compact ? 50 : 65,
                fontWeight: 500,
                color: config.color,
                textTransform: "capitalize",
                flexShrink: 0,
                paddingTop: 2
              }}>
                {compact ? lane.slice(0, 4) : lane}
              </div>

              <div style={{ 
                flex: 1, 
                display: "flex", 
                flexWrap: "wrap", 
                gap: 4,
                minHeight: compact ? 18 : 22
              }}>
                {items.length === 0 ? (
                  <span style={{ opacity: 0.3, fontStyle: "italic", fontSize: compact ? 9 : 10 }}>
                    (empty)
                  </span>
                ) : (
                  <>
                    {displayItems.map(blockId => {
                      const block = blocksById?.[blockId];
                      const label = block?.title ?? blockId;
                      return (
                        <span
                          key={blockId}
                          style={{
                            padding: compact ? "1px 4px" : "2px 6px",
                            background: config.bg,
                            border: `1px solid ${config.color}30`,
                            borderRadius: 4,
                            fontSize: compact ? 9 : 10,
                            color: config.color,
                            maxWidth: 100,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          }}
                          title={label}
                        >
                          {label.length > 12 ? label.slice(0, 12) + "..." : label}
                        </span>
                      );
                    })}
                    {remaining > 0 && (
                      <span style={{
                        padding: compact ? "1px 4px" : "2px 6px",
                        fontSize: compact ? 9 : 10,
                        opacity: 0.5
                      }}>
                        +{remaining} more
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
