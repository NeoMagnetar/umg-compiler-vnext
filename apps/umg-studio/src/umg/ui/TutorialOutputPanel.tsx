import { useUmgStore } from "../store";
import { MOLT_ORDER, getSpineBlocks, getExtraBlocks } from "../molt";

export function TutorialOutputPanel() {
  const { tutorialStep, blocks, neoBlocks, neoStacks, sleeve, lastComposeMode, preview, hydrated } = useUmgStore();

  const spine = getSpineBlocks(blocks);
  const extras = getExtraBlocks(blocks);

  const moltSummary = MOLT_ORDER
    .map(role => {
      const block = spine.find(b => b.role === role);
      return block
        ? `• ${role}: ${block.title || "(untitled)"} (${block.content.length} chars)`
        : `• ${role}: (missing)`;
    })
    .join("\n");

  const latestNeo = neoBlocks[neoBlocks.length - 1];
  const latestStack = neoStacks[neoStacks.length - 1];

  return (
    <div style={wrap}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{ fontWeight: 900, color: "#e0e0e0" }}>Tutorial Output</div>
        {hydrated && (
          <span style={{ fontSize: 10, color: "#22c55e", opacity: 0.8 }}>Hydrated</span>
        )}
      </div>

      <pre style={pre}>
{`Step: ${tutorialStep}

7-Role MOLT Spine:
${moltSummary}
${extras.length > 0 ? `\nExtra Blocks: ${extras.length} (not in spine, for advanced use)` : ""}

NeoBlocks:
• count: ${neoBlocks.length}${latestNeo ? `\n• latest: ${latestNeo.label} (lineage ${latestNeo.sourceBlockIds.length})` : ""}

Composition:
${lastComposeMode ? `• mode: ${lastComposeMode}\n• semantic overlap: ${preview.semanticOverlap.toFixed(2)}\n• governance priority: ${preview.governancePriority.toFixed(2)}\n\nNote: v0 composition uses "dominant snapshot" rule.\nThe governancePriority slider decides which artifact's snapshot wins.` : "• none yet"}

NeoStack:
${latestStack ? `• ${latestStack.name} (${latestStack.neoBlockIds.length} NeoBlocks)` : "• none yet"}

Sleeve:
${sleeve ? `• ${sleeve.name} (bound: ${String(!!sleeve.neoStackId)})` : "• none yet"}

---

Quick Reference:
• Spine = first block per role (used for compress)
• Extras = duplicate roles for depth (unlocked after first compress)
• Authority flows: Trigger → Directive → Instruction → Subject → Primary → Philosophy → Blueprint
• NeoBlock = immutable snapshot artifact
• Merge = combine snapshots (dominant wins)
• Bundle = group without merging (runtime selects)
• NeoStack = named domain unit
• Sleeve = execution boundary
• Compile = validate structure + emit trace`
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
  maxHeight: 300,
  overflow: "auto",
  color: "#b0b0b0",
};
