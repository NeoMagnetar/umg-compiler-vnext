import type { Node, Edge } from "reactflow";
import type { Block, NeoBlock, NeoStack, Sleeve } from "../types";
import { MOLT_ORDER, moltIndex, getSpineBlocks } from "../molt";

export function buildGraph(
  blocks: Block[],
  neoBlocks: NeoBlock[],
  neoStacks: NeoStack[],
  sleeve: Sleeve | null,
  nodePositions: Record<string, { x: number; y: number }> = {}
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const width = typeof window !== "undefined" ? window.innerWidth : 1200;
  const compact = width < 900;

  const roleX = compact ? 20 : 50;
  const nbX = compact ? 20 : 380;
  const rightX = compact ? 20 : 740;

  const roleY0 = 30;
  const roleGap = compact ? 80 : 90;
  const nbY0 = compact ? 700 : 60;
  const nbGap = compact ? 100 : 120;
  const rightY0 = compact ? 1200 : 80;

  if (!blocks || blocks.length === 0) {
    nodes.push({
      id: "start",
      type: "start",
      position: { x: roleX + 40, y: roleY0 + 100 },
      data: {
        title: "Start",
        subtitle: "Use the Build panel to create your first block.",
      },
    });
    return { nodes, edges };
  }

  const hasNeoBlocks = neoBlocks.length > 0;

  if (!hasNeoBlocks) {
    const spine = getSpineBlocks(blocks);
    const maxIndex = Math.max(-1, ...spine.map(b => MOLT_ORDER.indexOf(b.role)));
    const rolesToRender = MOLT_ORDER.slice(0, Math.min(MOLT_ORDER.length, maxIndex + 2));

    const roleLabels: Record<string, string> = {
      TRIGGER: "activates",
      DIRECTIVE: "constrains",
      INSTRUCTION: "executes",
      SUBJECT: "grounds",
      PRIMARY: "core",
      PHILOSOPHY: "governs",
      BLUEPRINT: "defines",
    };

    for (const role of rolesToRender) {
      const block = blocks.find(b => b.role === role);
      const y = roleY0 + moltIndex(role) * roleGap;
      const isGhost = !block;

      const nodeId = `role-${role}`;
      const storedPos = nodePositions[nodeId];
      nodes.push({
        id: nodeId,
        type: isGhost ? "ghost" : "basic",
        position: storedPos ?? { x: roleX, y },
        data: {
          title: role,
          subtitle: block ? block.title : "next",
          badges: block
            ? ["governed", roleLabels[role] || "active"]
            : ["pending"],
        },
      });

      const idx = moltIndex(role);
      if (idx > 0 && rolesToRender.includes(MOLT_ORDER[idx - 1])) {
        edges.push({
          id: `e-role-${MOLT_ORDER[idx - 1]}-${role}`,
          source: `role-${MOLT_ORDER[idx - 1]}`,
          target: `role-${role}`,
          type: "smoothstep",
          style: { stroke: isGhost ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.3)" },
        });
      }
    }
  }

  neoBlocks.forEach((nb, i) => {
    const nodeId = `nb-${nb.id}`;
    const storedPos = nodePositions[nodeId];
    nodes.push({
      id: nodeId,
      type: "neoblock",
      position: storedPos ?? { x: nbX, y: nbY0 + i * nbGap },
      data: {
        neoBlockId: nb.id,
        label: nb.label,
        lineageCount: nb.sourceBlockIds.length,
        roleTitles: {
          TRIGGER: nb.snapshot.TRIGGER.title,
          DIRECTIVE: nb.snapshot.DIRECTIVE.title,
          INSTRUCTION: nb.snapshot.INSTRUCTION.title,
          SUBJECT: nb.snapshot.SUBJECT.title,
          PRIMARY: nb.snapshot.PRIMARY.title,
          PHILOSOPHY: nb.snapshot.PHILOSOPHY.title,
          BLUEPRINT: nb.snapshot.BLUEPRINT.title,
        },
      },
    });
  });

  const lastStack = neoStacks[neoStacks.length - 1];
  if (lastStack) {
    const nsNodeId = `ns-${lastStack.id}`;
    const nsStoredPos = nodePositions[nsNodeId];
    nodes.push({
      id: nsNodeId,
      type: "neostack",
      position: nsStoredPos ?? { x: rightX, y: rightY0 },
      data: { 
        title: `NEOSTACK: ${lastStack.name}`, 
        subtitle: `${lastStack.neoBlockIds.length} neoblocks`,
        badges: ["domain"]
      },
    });
  }

  if (sleeve) {
    const slNodeId = `sl-${sleeve.id}`;
    const slStoredPos = nodePositions[slNodeId];
    nodes.push({
      id: slNodeId,
      type: "sleeve",
      position: slStoredPos ?? { x: rightX, y: rightY0 + 140 },
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
