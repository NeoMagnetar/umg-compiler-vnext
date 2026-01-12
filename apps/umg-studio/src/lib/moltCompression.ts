import { GraphNode, GraphEdge, GraphData, Pos, CompressedGroupPayload } from "./graphTypes";

export interface CompressedGroup {
  id: string;
  mode: "bundle" | "merge";
  blockIds: string[];
  stackId: string;
}

export interface MoltGraphInput {
  stacks: Array<{
    id: string;
    name?: string;
    blockIds: string[];
  }>;
  blocksById: Record<string, any>;
  compressedGroups: CompressedGroup[];
  positions?: Record<string, Pos>;
}

export function buildMoltGraph(input: MoltGraphInput): GraphData {
  const { stacks, blocksById, compressedGroups, positions = {} } = input;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const groupsByStack: Record<string, CompressedGroup[]> = {};
  for (const group of compressedGroups) {
    if (!groupsByStack[group.stackId]) {
      groupsByStack[group.stackId] = [];
    }
    groupsByStack[group.stackId].push(group);
  }

  const blockIdToGroup: Record<string, CompressedGroup> = {};
  for (const group of compressedGroups) {
    for (const blockId of group.blockIds) {
      blockIdToGroup[blockId] = group;
    }
  }

  for (const stack of stacks) {
    const stackBlockIds: string[] = stack.blockIds ?? [];
    let prevNodeId: string | null = null;
    const processedGroups = new Set<string>();

    for (const blockId of stackBlockIds) {
      const group = blockIdToGroup[blockId];

      if (group && !processedGroups.has(group.id)) {
        processedGroups.add(group.id);

        const groupBlocks = group.blockIds
          .map(id => blocksById[id])
          .filter(Boolean);

        const titles = groupBlocks
          .slice(0, 3)
          .map((b: any) => b.title ?? b.id)
          .join(", ");

        const summary = groupBlocks.length > 3
          ? `${titles}... (+${groupBlocks.length - 3} more)`
          : titles;

        const payload: CompressedGroupPayload = {
          groupId: group.id,
          mode: group.mode,
          blockIds: group.blockIds,
          derivedSummary: summary
        };

        const node: GraphNode = {
          id: group.id,
          label: `${group.mode.toUpperCase()} (${group.blockIds.length})`,
          kind: "compressed",
          payload,
          pos: positions[group.id]
        };

        nodes.push(node);

        if (prevNodeId) {
          edges.push({ from: prevNodeId, to: group.id });
        }
        prevNodeId = group.id;

      } else if (!group) {
        const block = blocksById[blockId];
        if (block) {
          const node: GraphNode = {
            id: block.id,
            label: block.title ?? block.id,
            kind: "block",
            payload: block,
            moltType: block.moltType,
            tags: block.tags,
            pos: positions[block.id]
          };

          nodes.push(node);

          if (prevNodeId) {
            edges.push({ from: prevNodeId, to: block.id });
          }
          prevNodeId = block.id;
        }
      }
    }
  }

  return { nodes, edges };
}

export function createCompressedGroup(
  mode: "bundle" | "merge",
  blockIds: string[],
  stackId: string
): CompressedGroup {
  const id = `${mode}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return { id, mode, blockIds, stackId };
}
