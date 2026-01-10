import type { Block, TraceEvent, RuntimeBundle } from "./types.js";

export interface StackDirectiveInput {
  stackId: string;
  orderedBlockIds: string[];
}

export interface DirectiveSelection {
  stackId: string;
  activeDirectiveIds: string[];
}

export interface SelectDirectiveResult {
  selections: DirectiveSelection[];
  notes: Array<Omit<TraceEvent, "id" | "timestamp">>;
  errors: Array<Omit<TraceEvent, "id" | "timestamp">>;
}

function isDirectiveOnlyBundle(bundle: RuntimeBundle, blocksById: Map<string, Block>): boolean {
  for (const blockId of bundle.blockIds) {
    const block = blocksById.get(blockId);
    if (!block || block.moltType !== "directive") {
      return false;
    }
  }
  return bundle.blockIds.length > 0;
}

function bundleContainsAll(bundle: RuntimeBundle, candidateIds: string[]): boolean {
  const bundleSet = new Set(bundle.blockIds);
  return candidateIds.every(id => bundleSet.has(id));
}

export function selectDirective(
  stacks: StackDirectiveInput[],
  blocksById: Map<string, Block>,
  bundles: RuntimeBundle[],
  priorityOverrides: Map<string, number>
): SelectDirectiveResult {
  const notes: SelectDirectiveResult["notes"] = [];
  const errors: SelectDirectiveResult["errors"] = [];
  const selections: DirectiveSelection[] = [];

  const getEffectivePriority = (blockId: string): number => {
    if (priorityOverrides.has(blockId)) {
      return priorityOverrides.get(blockId)!;
    }
    const block = blocksById.get(blockId);
    return block?.priorityOrder ?? 0;
  };

  const sortByPriorityDesc = (ids: string[]): string[] => {
    return [...ids].sort((a, b) => {
      const prioA = getEffectivePriority(a);
      const prioB = getEffectivePriority(b);
      if (prioB !== prioA) return prioB - prioA;
      return a.localeCompare(b);
    });
  };

  for (const stack of stacks) {
    const directiveIds = stack.orderedBlockIds.filter(id => {
      const block = blocksById.get(id);
      return block?.moltType === "directive";
    });

    if (directiveIds.length === 0) {
      selections.push({
        stackId: stack.stackId,
        activeDirectiveIds: [],
      });
      continue;
    }

    if (directiveIds.length === 1) {
      selections.push({
        stackId: stack.stackId,
        activeDirectiveIds: [directiveIds[0]],
      });
      continue;
    }

    const directiveOnlyBundleContainingAll = bundles.find(
      b =>
        b.stackId === stack.stackId &&
        isDirectiveOnlyBundle(b, blocksById) &&
        bundleContainsAll(b, directiveIds)
    );

    if (directiveOnlyBundleContainingAll) {
      const sorted = sortByPriorityDesc(directiveIds);
      const selectedId = sorted[0];

      notes.push({
        kind: "pipeline_stage",
        severity: "warning",
        code: "WARN_MULTIPLE_DIRECTIVE_BUNDLED",
        message: `Stack ${stack.stackId} has ${directiveIds.length} bundled directive alternates; selecting highest priority.`,
        relatedStackIds: [stack.stackId],
        relatedBlockIds: directiveIds,
      });

      notes.push({
        kind: "pipeline_stage",
        severity: "info",
        code: "INFO_DIRECTIVE_SELECTED",
        message: `Stack ${stack.stackId}: selected directive ${selectedId} from ${directiveIds.length} candidates.`,
        relatedStackIds: [stack.stackId],
        relatedBlockIds: [selectedId],
      });

      selections.push({
        stackId: stack.stackId,
        activeDirectiveIds: [selectedId],
      });
    } else {
      const sorted = sortByPriorityDesc(directiveIds);

      notes.push({
        kind: "pipeline_stage",
        severity: "warning",
        code: "WARN_MULTIPLE_DIRECTIVE_ACTIVE",
        message: `Stack ${stack.stackId} has ${directiveIds.length} directives without explicit alternates bundle; all remain active.`,
        relatedStackIds: [stack.stackId],
        relatedBlockIds: sorted,
      });

      selections.push({
        stackId: stack.stackId,
        activeDirectiveIds: sorted,
      });
    }
  }

  selections.sort((a, b) => a.stackId.localeCompare(b.stackId));

  return { selections, notes, errors };
}
