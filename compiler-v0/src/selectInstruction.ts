import type { Block, TraceEvent, RuntimeBundle } from "./types.js";
import { resolveByPriority, sortByPriorityGroupAndOrder, type TracePushFn } from "./priority.js";

export interface StackInstructionInput {
  stackId: string;
  orderedBlockIds: string[];
}

export interface InstructionSelection {
  stackId: string;
  activeInstructionIds: string[];
  candidateIds: string[];
}

export interface SelectInstructionResult {
  selections: InstructionSelection[];
  notes: Array<Omit<TraceEvent, "id" | "timestamp">>;
  errors: Array<Omit<TraceEvent, "id" | "timestamp">>;
}

function isInstructionOnlyBundle(bundle: RuntimeBundle, blocksById: Map<string, Block>): boolean {
  for (const blockId of bundle.blockIds) {
    const block = blocksById.get(blockId);
    if (!block || block.moltType !== "instruction") {
      return false;
    }
  }
  return bundle.blockIds.length > 0;
}

function bundleContainsAll(bundle: RuntimeBundle, candidateIds: string[]): boolean {
  const bundleSet = new Set(bundle.blockIds);
  return candidateIds.every(id => bundleSet.has(id));
}

export function selectInstruction(
  stacks: StackInstructionInput[],
  blocksById: Map<string, Block>,
  bundles: RuntimeBundle[],
  priorityOverrides: Map<string, number>
): SelectInstructionResult {
  const notes: SelectInstructionResult["notes"] = [];
  const errors: SelectInstructionResult["errors"] = [];
  const selections: InstructionSelection[] = [];

  const tracePush: TracePushFn = (evt) => {
    if (evt.severity === "error") {
      errors.push(evt);
    } else {
      notes.push(evt);
    }
  };

  for (const stack of stacks) {
    const instructionIds = stack.orderedBlockIds.filter(id => {
      const block = blocksById.get(id);
      return block?.moltType === "instruction";
    });

    if (instructionIds.length === 0) {
      selections.push({
        stackId: stack.stackId,
        activeInstructionIds: [],
        candidateIds: [],
      });
      continue;
    }

    if (instructionIds.length === 1) {
      selections.push({
        stackId: stack.stackId,
        activeInstructionIds: [instructionIds[0]],
        candidateIds: instructionIds,
      });
      continue;
    }

    const instructionOnlyBundleContainingAll = bundles.find(
      b =>
        b.stackId === stack.stackId &&
        isInstructionOnlyBundle(b, blocksById) &&
        bundleContainsAll(b, instructionIds)
    );

    if (instructionOnlyBundleContainingAll) {
      const intent = instructionOnlyBundleContainingAll.intent ?? "ranked";

      if (intent === "alternates") {
        notes.push({
          kind: "pipeline_stage",
          severity: "warning",
          code: "WARN_MULTIPLE_INSTRUCTION_BUNDLED",
          message: `Stack ${stack.stackId} has ${instructionIds.length} bundled instruction alternates; resolving by priority.`,
          relatedStackIds: [stack.stackId],
          relatedBlockIds: instructionIds,
        });

        const candidates = instructionIds.map(id => blocksById.get(id)!).filter(Boolean);
        const result = resolveByPriority(
          candidates,
          {
            moltType: "instruction",
            stackId: stack.stackId,
            reason: "select single instruction from bundled alternates",
          },
          tracePush,
          priorityOverrides
        );

        if (result.error) {
          selections.push({
            stackId: stack.stackId,
            activeInstructionIds: instructionIds,
            candidateIds: instructionIds,
          });
          continue;
        }

        selections.push({
          stackId: stack.stackId,
          activeInstructionIds: [result.winner!.id],
          candidateIds: instructionIds,
        });
      } else {
        const orderedInBundle = sortByPriorityGroupAndOrder(
          instructionOnlyBundleContainingAll.blockIds.filter(id => instructionIds.includes(id)),
          blocksById,
          priorityOverrides
        );

        notes.push({
          kind: "pipeline_stage",
          severity: "info",
          code: "INFO_INSTRUCTION_RANKED_BUNDLE",
          message: `Stack ${stack.stackId}: ${orderedInBundle.length} instructions in ranked bundle; all remain active.`,
          relatedStackIds: [stack.stackId],
          relatedBlockIds: orderedInBundle,
        });

        selections.push({
          stackId: stack.stackId,
          activeInstructionIds: orderedInBundle,
          candidateIds: instructionIds,
        });
      }
    } else {
      notes.push({
        kind: "pipeline_stage",
        severity: "warning",
        code: "WARN_MULTIPLE_INSTRUCTION_ACTIVE",
        message: `Stack ${stack.stackId} has ${instructionIds.length} instructions without explicit alternates bundle; all remain active.`,
        relatedStackIds: [stack.stackId],
        relatedBlockIds: instructionIds,
      });

      selections.push({
        stackId: stack.stackId,
        activeInstructionIds: instructionIds,
        candidateIds: instructionIds,
      });
    }
  }

  selections.sort((a, b) => a.stackId.localeCompare(b.stackId));

  return { selections, notes, errors };
}
