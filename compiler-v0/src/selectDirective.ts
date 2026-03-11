import type { Block, TraceEvent, RuntimeBundle } from "./types.js";
import { resolveByPriority, sortByPriorityGroupAndOrder, type TracePushFn } from "./priority.js";

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

  const tracePush: TracePushFn = (evt) => {
    if (evt.severity === "error") {
      errors.push(evt);
    } else {
      notes.push(evt);
    }
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
      const intent = directiveOnlyBundleContainingAll.intent ?? "ranked";

      if (intent === "alternates") {
        notes.push({
          kind: "pipeline_stage",
          severity: "warning",
          code: "WARN_MULTIPLE_DIRECTIVE_BUNDLED",
          message: `Stack ${stack.stackId} has ${directiveIds.length} bundled directive alternates; resolving by priority.`,
          relatedStackIds: [stack.stackId],
          relatedBlockIds: directiveIds,
        });

        const candidates = directiveIds.map(id => blocksById.get(id)!).filter(Boolean);
        const result = resolveByPriority(
          candidates,
          {
            moltType: "directive",
            stackId: stack.stackId,
            reason: "select single directive from bundled alternates",
          },
          tracePush,
          priorityOverrides
        );

        if (result.error) {
          selections.push({
            stackId: stack.stackId,
            activeDirectiveIds: directiveIds,
          });
          continue;
        }

        selections.push({
          stackId: stack.stackId,
          activeDirectiveIds: [result.winner!.id],
        });
      } else {
        const orderedInBundle = sortByPriorityGroupAndOrder(
          directiveOnlyBundleContainingAll.blockIds.filter(id => directiveIds.includes(id)),
          blocksById,
          priorityOverrides
        );

        notes.push({
          kind: "pipeline_stage",
          severity: "info",
          code: "INFO_DIRECTIVE_RANKED_BUNDLE",
          message: `Stack ${stack.stackId}: ${orderedInBundle.length} directives in ranked bundle; all remain active.`,
          relatedStackIds: [stack.stackId],
          relatedBlockIds: orderedInBundle,
        });

        selections.push({
          stackId: stack.stackId,
          activeDirectiveIds: orderedInBundle,
        });
      }
    } else {
      const sorted = sortByPriorityGroupAndOrder(directiveIds, blocksById, priorityOverrides);

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
