import { useUmgStore } from "../store";
import { MOLT_ORDER } from "../molt";

export function TutorialOutputPanel() {
  const { tutorialStep, blocks, neoBlocks, neoStacks, sleeve, lastComposeMode, preview } = useUmgStore();

  const moltSummary = MOLT_ORDER
    .map(role => {
      const block = blocks.find(b => b.role === role);
      return block
        ? `• ${role}: ${block.title || "(untitled)"} (${block.content.length} chars)`
        : `• ${role}: (missing)`;
    })
    .join("\n");

  const latestNeo = neoBlocks[neoBlocks.length - 1];
  const latestStack = neoStacks[neoStacks.length - 1];

  return (
    <div style={wrap}>
      <div style={{ fontWeight: 900, marginBottom: 6, color: "#e0e0e0" }}>Tutorial Output</div>

      <pre style={pre}>
{`Step: ${tutorialStep}

7-Role MOLT Status:
${moltSummary}

NeoBlocks:
• count: ${neoBlocks.length}${latestNeo ? `\n• latest: ${latestNeo.label} (lineage ${latestNeo.sourceBlockIds.length})` : ""}

Composition:
${lastComposeMode ? `• mode: ${lastComposeMode}\n• semantic overlap: ${preview.semanticOverlap.toFixed(2)}\n• governance priority: ${preview.governancePriority.toFixed(2)}` : "• none yet"}

NeoStack:
${latestStack ? `• ${latestStack.name} (${latestStack.neoBlockIds.length} NeoBlocks)` : "• none yet"}

Sleeve:
${sleeve ? `• ${sleeve.name} (bound: ${String(!!sleeve.neoStackId)})` : "• none yet"}

What this means:
• Build authority top-down through 7 roles:
  Trigger → Directive → Instruction → Subject → Primary → Philosophy → Blueprint
• Compression produces an immutable NeoBlock artifact.
• Extra blocks unlock after first compress (add depth per role).
• Merge/Bundle creates a new artifact with lineage.
• Naming a NeoStack turns artifacts into a domain unit.
• A Sleeve is the execution boundary. Compile is verification + trace.`
}
      </pre>
    </div>
  );
}

const wrap: React.CSSProperties = {
  padding: 12,
  borderTop: "1px solid rgba(255,255,255,0.1)",
  background: "#0d0d12",
};

const pre: React.CSSProperties = {
  margin: 0,
  whiteSpace: "pre-wrap",
  fontSize: 12,
  lineHeight: 1.4,
  background: "#15151c",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  padding: 10,
  maxHeight: 260,
  overflow: "auto",
  color: "#b0b0b0",
};
