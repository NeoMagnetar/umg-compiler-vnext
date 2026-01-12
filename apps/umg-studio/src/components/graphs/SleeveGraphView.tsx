import React, { useMemo } from "react";
import { GraphNode } from "@/lib/graphTypes";
import { parseSleeve } from "@/lib/sleeveEdit";

interface SleeveGraphViewProps {
  sleeveJson: string;
  selectedNodeId?: string | null;
  onSelectNode?: (node: GraphNode | null) => void;
}

export default function SleeveGraphView({ 
  sleeveJson, 
  selectedNodeId, 
  onSelectNode 
}: SleeveGraphViewProps) {
  const { sleeve, stacks, triggers, governance, bundles, merges } = useMemo(() => {
    const { sleeve, error } = parseSleeve(sleeveJson);
    if (error || !sleeve) {
      return { sleeve: null, stacks: [], triggers: [], governance: [], bundles: [], merges: [] };
    }

    return {
      sleeve,
      stacks: sleeve.stacks ?? [],
      triggers: sleeve.triggers ?? [],
      governance: sleeve.governance ?? [],
      bundles: sleeve.bundles ?? [],
      merges: sleeve.merges ?? []
    };
  }, [sleeveJson]);

  const handleNodeClick = (id: string, label: string, kind: GraphNode["kind"], payload: any) => {
    if (onSelectNode) {
      const node: GraphNode = { id, label, kind, payload };
      onSelectNode(selectedNodeId === id ? null : node);
    }
  };

  if (!sleeve) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#ff6b6b" }}>Invalid sleeve JSON</p>
      </div>
    );
  }

  const renderCard = (
    id: string, 
    label: string, 
    kind: GraphNode["kind"], 
    payload: any, 
    color: string,
    subtitle?: string
  ) => {
    const isSelected = selectedNodeId === id;
    return (
      <div
        key={id}
        role="button"
        tabIndex={0}
        onClick={() => handleNodeClick(id, label, kind, payload)}
        onKeyDown={(e) => e.key === "Enter" && handleNodeClick(id, label, kind, payload)}
        data-testid={`sleeve-node-${id}`}
        style={{
          padding: 10,
          marginBottom: 8,
          background: isSelected ? `${color}33` : `${color}1a`,
          border: isSelected ? `2px solid ${color}` : `1px solid ${color}55`,
          borderRadius: 8,
          cursor: "pointer",
          transition: "all 0.15s"
        }}
      >
        <div style={{ fontWeight: 500, fontSize: 12 }}>{label}</div>
        {subtitle && (
          <div className="mono" style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>{subtitle}</div>
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
      <div style={{ display: "flex", gap: 24 }}>
        <div style={{ minWidth: 180 }}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleNodeClick("sleeve-root", sleeve.id, "sleeve", sleeve)}
            onKeyDown={(e) => e.key === "Enter" && handleNodeClick("sleeve-root", sleeve.id, "sleeve", sleeve)}
            data-testid="sleeve-root-node"
            style={{
              padding: 14,
              marginBottom: 16,
              background: selectedNodeId === "sleeve-root" ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)",
              border: selectedNodeId === "sleeve-root" ? "2px solid #fff" : "1px solid rgba(255,255,255,0.3)",
              borderRadius: 10,
              cursor: "pointer",
              transition: "all 0.15s"
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 14 }}>Sleeve</div>
            <div className="mono" style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{sleeve.id}</div>
          </div>

          <h4 style={{ fontSize: 11, opacity: 0.5, marginBottom: 8, textTransform: "uppercase" }}>
            Stacks ({stacks.length})
          </h4>
          {stacks.map((stack: any) => 
            renderCard(stack.id, stack.name ?? stack.id, "stack", stack, "#3b82f6", stack.id)
          )}
        </div>

        {triggers.length > 0 && (
          <div style={{ minWidth: 160 }}>
            <h4 style={{ fontSize: 11, opacity: 0.5, marginBottom: 8, textTransform: "uppercase" }}>
              Triggers ({triggers.length})
            </h4>
            {triggers.map((trigger: any, i: number) => 
              renderCard(
                `trigger-${i}`, 
                trigger.pattern ?? `Trigger ${i + 1}`, 
                "trigger", 
                trigger, 
                "#ef4444"
              )
            )}
          </div>
        )}

        {governance.length > 0 && (
          <div style={{ minWidth: 160 }}>
            <h4 style={{ fontSize: 11, opacity: 0.5, marginBottom: 8, textTransform: "uppercase" }}>
              Governance ({governance.length})
            </h4>
            {governance.map((rule: any, i: number) => 
              renderCard(
                `governance-${i}`, 
                rule.action ?? `Rule ${i + 1}`, 
                "governance", 
                rule, 
                "#f59e0b",
                rule.target
              )
            )}
          </div>
        )}

        {(bundles.length > 0 || merges.length > 0) && (
          <div style={{ minWidth: 160 }}>
            {bundles.length > 0 && (
              <>
                <h4 style={{ fontSize: 11, opacity: 0.5, marginBottom: 8, textTransform: "uppercase" }}>
                  Bundles ({bundles.length})
                </h4>
                {bundles.map((bundle: any, i: number) => 
                  renderCard(
                    `bundle-${i}`, 
                    bundle.bundleId ?? `Bundle ${i + 1}`, 
                    "block", 
                    bundle, 
                    "#22c55e",
                    `${bundle.blockIds?.length ?? 0} blocks`
                  )
                )}
              </>
            )}
            {merges.length > 0 && (
              <>
                <h4 style={{ fontSize: 11, opacity: 0.5, marginBottom: 8, marginTop: bundles.length > 0 ? 16 : 0, textTransform: "uppercase" }}>
                  Merges ({merges.length})
                </h4>
                {merges.map((merge: any, i: number) => 
                  renderCard(
                    `merge-${i}`, 
                    merge.resultBlockId ?? `Merge ${i + 1}`, 
                    "block", 
                    merge, 
                    "#a855f7",
                    `${merge.sourceBlockIds?.length ?? 0} sources`
                  )
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
