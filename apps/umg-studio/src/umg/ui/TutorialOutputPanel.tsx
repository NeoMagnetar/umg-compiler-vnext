import { useMemo, useState } from "react";
import { CollapsiblePanel } from "./CollapsiblePanel";
import { useUmgStore } from "../store";
import { computeTutorialStep } from "../tutorial";
import { getSpineBlocks } from "../molt";
import type { Block, NeoBlock, NeoStack, Sleeve } from "../types";

type Tab = "Active" | "Runtime" | "Trace" | "Raw";

function pretty(obj: any) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

function findSelected(
  selectedNodeId: string | null,
  blocks: Block[],
  neoBlocks: NeoBlock[],
  neoStacks: NeoStack[],
  sleeve: Sleeve | null
) {
  if (!selectedNodeId) return null;

  if (selectedNodeId.startsWith("role-")) {
    const role = selectedNodeId.replace("role-", "");
    const b = blocks.find((x) => x.role === role);
    if (b) return { kind: "BLOCK" as const, data: b };
    return { kind: "GHOST" as const, data: { role } };
  }

  if (selectedNodeId.startsWith("nb-")) {
    const id = selectedNodeId.replace("nb-", "");
    const nb = neoBlocks.find((x) => x.id === id);
    if (nb) return { kind: "NEOBLOCK" as const, data: nb };
  }

  if (selectedNodeId.startsWith("ns-")) {
    const id = selectedNodeId.replace("ns-", "");
    const ns = neoStacks.find((x) => x.id === id);
    if (ns) return { kind: "NEOSTACK" as const, data: ns };
  }

  if (selectedNodeId.startsWith("sl-")) {
    if (sleeve) return { kind: "SLEEVE" as const, data: sleeve };
  }

  const b = blocks.find((x) => x.id === selectedNodeId);
  if (b) return { kind: "BLOCK" as const, data: b };

  const nb = neoBlocks.find((x) => x.id === selectedNodeId);
  if (nb) return { kind: "NEOBLOCK" as const, data: nb };

  const ns = neoStacks.find((x) => x.id === selectedNodeId);
  if (ns) return { kind: "NEOSTACK" as const, data: ns };

  if (sleeve && sleeve.id === selectedNodeId) return { kind: "SLEEVE" as const, data: sleeve };

  return { kind: "UNKNOWN" as const, data: { id: selectedNodeId } };
}

export function TutorialOutputPanel() {
  const {
    blocks,
    neoBlocks,
    neoStacks,
    sleeve,
    runtimeSpec,
    trace,
    tutorialStep,
    selectedNodeId,
  } = useUmgStore();

  const [tab, setTab] = useState<Tab>("Active");

  const active = useMemo(() => {
    const sel = findSelected(selectedNodeId, blocks, neoBlocks, neoStacks, sleeve);
    const derivedStep = computeTutorialStep(blocks, neoBlocks, neoStacks, sleeve, runtimeSpec);

    const spine = getSpineBlocks(blocks);
    const spineComplete = spine.length >= 7;
    const readyToCompress = spineComplete && neoBlocks.length === 0;
    const composeReady = neoBlocks.length >= 2;

    return {
      selected: sel,
      workspace: {
        tutorialStep,
        derivedStep,
        spineComplete,
        readyToCompress,
        composeReady,
      },
      counts: {
        blocks: blocks.length,
        neoBlocks: neoBlocks.length,
        neoStacks: neoStacks.length,
        sleeve: !!sleeve,
      },
    };
  }, [blocks, neoBlocks, neoStacks, sleeve, runtimeSpec, tutorialStep, selectedNodeId]);

  const tabs: Tab[] = ["Active", "Runtime", "Trace", "Raw"];

  const body = useMemo(() => {
    if (tab === "Active") return <JsonBox value={active} />;
    if (tab === "Runtime") return <JsonBox value={runtimeSpec ?? { note: "No runtimeSpec yet. Create a Sleeve and Compile to generate." }} />;
    if (tab === "Trace") return <JsonBox value={trace ?? { note: "No trace yet. Compile to generate trace events." }} />;
    return <JsonBox value={{ blocks, neoBlocks, neoStacks, sleeve }} />;
  }, [tab, active, runtimeSpec, trace, blocks, neoBlocks, neoStacks, sleeve]);

  return (
    <CollapsiblePanel 
      title="Output" 
      defaultOpen={false} 
      storageKey="umg:tutorial:output:open"
      style={{ flexShrink: 0 }}
    >
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 10px",
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: tab === t ? "rgba(96,165,250,0.18)" : "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.9)",
              cursor: "pointer",
            }}
            data-testid={`tab-output-${t.toLowerCase()}`}
          >
            {t}
          </button>
        ))}
      </div>

      {body}
    </CollapsiblePanel>
  );
}

function JsonBox({ value }: { value: any }) {
  return (
    <pre
      style={{
        margin: 0,
        whiteSpace: "pre-wrap",
        fontSize: 12,
        lineHeight: 1.35,
        background: "#0b0b10",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 12,
        padding: 10,
        maxHeight: 320,
        overflow: "auto",
        color: "rgba(255,255,255,0.88)",
      }}
    >
      {pretty(value)}
    </pre>
  );
}
