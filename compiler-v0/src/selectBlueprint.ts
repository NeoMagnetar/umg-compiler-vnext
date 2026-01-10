import type { Block, TraceEvent, RuntimeBundle } from "./types.js";

export interface StackBlueprintInput {
  stackId: string;
  orderedBlockIds: string[];
}

export interface BlueprintSelection {
  stackId: string;
  activeBlueprintIds: string[];
  candidateIds: string[];
}

export interface SelectBlueprintResult {
  selections: BlueprintSelection[];
  notes: Array<Omit<TraceEvent, "id" | "timestamp">>;
  errors: Array<Omit<TraceEvent, "id" | "timestamp">>;
}

function isBlueprintOnlyBundle(bundle: RuntimeBundle, blocksById: Map<string, Block>): boolean {
  for (const blockId of bundle.blockIds) {
    const block = blocksById.get(blockId);
    if (!block || block.moltType !== "blueprint") {
      return false;
    }
  }
  return bundle.blockIds.length > 0;
}

function bundleContainsAll(bundle: RuntimeBundle, candidateIds: string[]): boolean {
  const bundleSet = new Set(bundle.blockIds);
  return candidateIds.every(id => bundleSet.has(id));
}

export function selectBlueprint(
  stacks: StackBlueprintInput[],
  blocksById: Map<string, Block>,
  bundles: RuntimeBundle[],
  priorityOverrides: Map<string, number>
): SelectBlueprintResult {
  const notes: SelectBlueprintResult["notes"] = [];
  const errors: SelectBlueprintResult["errors"] = [];
  const selections: BlueprintSelection[] = [];

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
    const blueprintIds = stack.orderedBlockIds.filter(id => {
      const block = blocksById.get(id);
      return block?.moltType === "blueprint";
    });

    if (blueprintIds.length === 0) {
      selections.push({
        stackId: stack.stackId,
        activeBlueprintIds: [],
        candidateIds: [],
      });
      continue;
    }

    if (blueprintIds.length === 1) {
      selections.push({
        stackId: stack.stackId,
        activeBlueprintIds: [blueprintIds[0]],
        candidateIds: blueprintIds,
      });
      continue;
    }

    const blueprintOnlyBundleContainingAll = bundles.find(
      b =>
        b.stackId === stack.stackId &&
        isBlueprintOnlyBundle(b, blocksById) &&
        bundleContainsAll(b, blueprintIds)
    );

    if (blueprintOnlyBundleContainingAll) {
      const intent = blueprintOnlyBundleContainingAll.intent ?? "ranked";

      if (intent === "alternates") {
        const sorted = sortByPriorityDesc(blueprintIds);
        const selectedId = sorted[0];

        notes.push({
          kind: "pipeline_stage",
          severity: "warning",
          code: "WARN_MULTIPLE_BLUEPRINT_BUNDLED",
          message: `Stack ${stack.stackId} has ${blueprintIds.length} bundled blueprint alternates; selecting highest priority.`,
          relatedStackIds: [stack.stackId],
          relatedBlockIds: blueprintIds,
        });

        notes.push({
          kind: "pipeline_stage",
          severity: "info",
          code: "INFO_BLUEPRINT_SELECTED",
          message: `Stack ${stack.stackId}: selected blueprint ${selectedId} from ${blueprintIds.length} candidates.`,
          relatedStackIds: [stack.stackId],
          relatedBlockIds: [selectedId],
        });

        selections.push({
          stackId: stack.stackId,
          activeBlueprintIds: [selectedId],
          candidateIds: blueprintIds,
        });
      } else {
        const orderedInBundle = blueprintOnlyBundleContainingAll.blockIds.filter(id =>
          blueprintIds.includes(id)
        );

        notes.push({
          kind: "pipeline_stage",
          severity: "info",
          code: "INFO_BLUEPRINT_RANKED_BUNDLE",
          message: `Stack ${stack.stackId}: ${orderedInBundle.length} blueprints in ranked bundle; all remain active.`,
          relatedStackIds: [stack.stackId],
          relatedBlockIds: orderedInBundle,
        });

        selections.push({
          stackId: stack.stackId,
          activeBlueprintIds: orderedInBundle,
          candidateIds: blueprintIds,
        });
      }
    } else {
      notes.push({
        kind: "pipeline_stage",
        severity: "warning",
        code: "WARN_MULTIPLE_BLUEPRINT_ACTIVE",
        message: `Stack ${stack.stackId} has ${blueprintIds.length} blueprints without explicit alternates bundle; all remain active.`,
        relatedStackIds: [stack.stackId],
        relatedBlockIds: blueprintIds,
      });

      selections.push({
        stackId: stack.stackId,
        activeBlueprintIds: blueprintIds,
        candidateIds: blueprintIds,
      });
    }
  }

  selections.sort((a, b) => a.stackId.localeCompare(b.stackId));

  return { selections, notes, errors };
}
