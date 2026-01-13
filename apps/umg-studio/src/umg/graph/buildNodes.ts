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

  const roleX = 50;
  const roleY0 = 50;
  const roleGap = 110;

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
      },
    });

    const idx = moltIndex(role);
    if (idx > 0) {
      edges.push({
        id: `e-role-${MOLT_ORDER[idx - 1]}-${role}`,
        source: `role-${MOLT_ORDER[idx - 1]}`,
        target: `role-${role}`,
      });
    }
  }

  const nbX = 380;
  const nbY0 = 60;
  const nbGap = 90;

  neoBlocks.forEach((nb, i) => {
    nodes.push({
      id: `nb-${nb.id}`,
      type: "basic",
      position: { x: nbX, y: nbY0 + i * nbGap },
      data: { title: nb.label, subtitle: `lineage: ${nb.sourceBlockIds.length} blocks` },
    });
  });

  const rightX = 740;
  const rightY0 = 80;

  const lastStack = neoStacks[neoStacks.length - 1];
  if (lastStack) {
    nodes.push({
      id: `ns-${lastStack.id}`,
      type: "basic",
      position: { x: rightX, y: rightY0 },
      data: { title: `NEOSTACK: ${lastStack.name}`, subtitle: `${lastStack.neoBlockIds.length} neoblocks` },
    });
  }

  if (sleeve) {
    nodes.push({
      id: `sl-${sleeve.id}`,
      type: "basic",
      position: { x: rightX, y: rightY0 + 140 },
      data: { title: `SLEEVE: ${sleeve.name}`, subtitle: sleeve.neoStackId ? "ready" : "empty" },
    });
    if (lastStack) {
      edges.push({
        id: `e-ns-sl`,
        source: `ns-${lastStack.id}`,
        target: `sl-${sleeve.id}`,
      });
    }
  }

  return { nodes, edges };
}
