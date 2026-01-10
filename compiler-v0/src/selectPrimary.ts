import type { Block, TraceEvent, RuntimeBundle } from "./types.js";

export interface StackPrimaryInput {
  stackId: string;
  orderedBlockIds: string[];
}

export interface PrimarySelection {
  stackId: string;
  selectedPrimaryId: string;
  candidateIds: string[];
}

export interface SelectPrimaryResult {
  selections: PrimarySelection[];
  notes: Array<Omit<TraceEvent, "id" | "timestamp">>;
  errors: Array<Omit<TraceEvent, "id" | "timestamp">>;
}

function isPrimaryOnlyBundle(bundle: RuntimeBundle, blocksById: Map<string, Block>): boolean {
  for (const blockId of bundle.blockIds) {
    const block = blocksById.get(blockId);
    if (!block || block.moltType !== "primary") {
      return false;
    }
  }
  return bundle.blockIds.length > 0;
}

export function selectPrimary(
  stacks: StackPrimaryInput[],
  blocksById: Map<string, Block>,
  bundles: RuntimeBundle[],
  priorityOverrides: Map<string, number>
): SelectPrimaryResult {
  const notes: SelectPrimaryResult["notes"] = [];
  const errors: SelectPrimaryResult["errors"] = [];
  const selections: PrimarySelection[] = [];

  const primaryOnlyBundleBlockIds = new Set<string>();
  for (const bundle of bundles) {
    if (isPrimaryOnlyBundle(bundle, blocksById)) {
      for (const blockId of bundle.blockIds) {
        primaryOnlyBundleBlockIds.add(blockId);
      }
    }
  }

  const getEffectivePriority = (blockId: string): number => {
    if (priorityOverrides.has(blockId)) {
      return priorityOverrides.get(blockId)!;
    }
    const block = blocksById.get(blockId);
    return block?.priorityOrder ?? 0;
  };

  for (const stack of stacks) {
    const primaryIds = stack.orderedBlockIds.filter(id => {
      const block = blocksById.get(id);
      return block?.moltType === "primary";
    });

    if (primaryIds.length === 0) {
      errors.push({
        kind: "validation_failed",
        severity: "error",
        code: "ERR_NO_PRIMARY_DEFINED",
        message: `Stack ${stack.stackId} has no primary blocks.`,
        relatedStackIds: [stack.stackId],
      });
      continue;
    }

    if (primaryIds.length > 1) {
      const allInPrimaryBundle = primaryIds.every(id => primaryOnlyBundleBlockIds.has(id));

      if (!allInPrimaryBundle) {
        errors.push({
          kind: "validation_failed",
          severity: "error",
          code: "ERR_MULTIPLE_PRIMARY_IN_STACK",
          message: `Stack ${stack.stackId} has ${primaryIds.length} primary blocks not bundled as alternates.`,
          relatedStackIds: [stack.stackId],
          relatedBlockIds: primaryIds,
        });
        continue;
      }

      notes.push({
        kind: "pipeline_stage",
        severity: "warning",
        code: "WARN_MULTIPLE_PRIMARY_BUNDLED",
        message: `Stack ${stack.stackId} has ${primaryIds.length} bundled primary alternates; selecting highest priority.`,
        relatedStackIds: [stack.stackId],
        relatedBlockIds: primaryIds,
      });
    }

    const sorted = [...primaryIds].sort((a, b) => {
      const prioA = getEffectivePriority(a);
      const prioB = getEffectivePriority(b);
      if (prioB !== prioA) return prioB - prioA;
      return a.localeCompare(b);
    });

    const selectedId = sorted[0];

    selections.push({
      stackId: stack.stackId,
      selectedPrimaryId: selectedId,
      candidateIds: primaryIds,
    });

    notes.push({
      kind: "pipeline_stage",
      severity: "info",
      code: "INFO_PRIMARY_SELECTED",
      message: `Stack ${stack.stackId}: selected primary ${selectedId}${primaryIds.length > 1 ? ` from ${primaryIds.length} candidates` : ""}.`,
      relatedStackIds: [stack.stackId],
      relatedBlockIds: [selectedId],
    });
  }

  selections.sort((a, b) => a.stackId.localeCompare(b.stackId));

  return { selections, notes, errors };
}
