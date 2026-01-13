import type { Node, Edge } from "reactflow";
import type { Block, NeoBlock, NeoStack, Sleeve } from "../types";
import { MOLT_ORDER, moltIndex } from "../molt";

export function buildGraph(
  blocks: Block[],
  neoBlocks: NeoBlock[],
  neoStacks: NeoStack[],
  sleeve: Sleeve | null
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const width = typeof window !== "undefined" ? window.innerWidth : 1200;
  const compact = width < 900;

  const roleX = compact ? 20 : 50;
  const nbX = compact ? 20 : 380;
  const rightX = compact ? 20 : 740;

  const roleY0 = 30;
  const nbY0 = compact ? 520 : 60;
  const rightY0 = compact ? 980 : 80;

  const roleGap = 110;
  const nbGap = 120;

  for (const role of MOLT_ORDER) {
    const block = blocks.find(b => b.role === role);
    const y = roleY0 + moltIndex(role) * roleGap;

    nodes.push({
      id: `role-${role}`,
      type: "basic",
      position: { x: roleX, y },
      data: {
        title: role,
        subtitle: block ? block.title : "empty",
        badges: block
          ? ["governed", role === "TRIGGER" ? "activates" : role === "DIRECTIVE" ? "constrains" : role === "INSTRUCTION" ? "executes" : "grounds"]
          : ["missing"],
      },
    });

    const idx = moltIndex(role);
    if (idx > 0) {
      edges.push({
        id: `e-role-${MOLT_ORDER[idx - 1]}-${role}`,
        source: `role-${MOLT_ORDER[idx - 1]}`,
        target: `role-${role}`,
        type: "smoothstep",
        style: { stroke: "rgba(255,255,255,0.3)" },
      });
    }
  }

  neoBlocks.forEach((nb, i) => {
    nodes.push({
      id: `nb-${nb.id}`,
      type: "neoblock",
      position: { x: nbX, y: nbY0 + i * nbGap },
      data: {
        neoBlockId: nb.id,
        label: nb.label,
        lineageCount: nb.sourceBlockIds.length,
        roleTitles: {
          TRIGGER: nb.snapshot.TRIGGER.title,
          DIRECTIVE: nb.snapshot.DIRECTIVE.title,
          INSTRUCTION: nb.snapshot.INSTRUCTION.title,
          SUBJECT: nb.snapshot.SUBJECT.title,
        },
      },
    });
  });

  const lastStack = neoStacks[neoStacks.length - 1];
  if (lastStack) {
    nodes.push({
      id: `ns-${lastStack.id}`,
      type: "basic",
      position: { x: rightX, y: rightY0 },
      data: { 
        title: `NEOSTACK: ${lastStack.name}`, 
        subtitle: `${lastStack.neoBlockIds.length} neoblocks`,
        badges: ["domain"]
      },
    });
  }

  if (sleeve) {
    nodes.push({
      id: `sl-${sleeve.id}`,
      type: "basic",
      position: { x: rightX, y: rightY0 + 140 },
      data: { 
        title: `SLEEVE: ${sleeve.name}`, 
        subtitle: sleeve.neoStackId ? "ready" : "empty",
        badges: sleeve.neoStackId ? ["compilable"] : ["incomplete"]
      },
    });
    if (lastStack) {
      edges.push({
        id: `e-ns-sl`,
        source: `ns-${lastStack.id}`,
        target: `sl-${sleeve.id}`,
        type: "smoothstep",
        style: { stroke: "rgba(34, 197, 94, 0.5)" },
      });
    }
  }

  return { nodes, edges };
}
