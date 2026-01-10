import type { Block, TraceEvent, RuntimeBundle } from "./types.js";

export interface StackSubjectInput {
  stackId: string;
  orderedBlockIds: string[];
}

export interface SubjectSelection {
  stackId: string;
  activeSubjectIds: string[];
  candidateIds: string[];
}

export interface SelectSubjectResult {
  selections: SubjectSelection[];
  notes: Array<Omit<TraceEvent, "id" | "timestamp">>;
  errors: Array<Omit<TraceEvent, "id" | "timestamp">>;
}

function isSubjectOnlyBundle(bundle: RuntimeBundle, blocksById: Map<string, Block>): boolean {
  for (const blockId of bundle.blockIds) {
    const block = blocksById.get(blockId);
    if (!block || block.moltType !== "subject") {
      return false;
    }
  }
  return bundle.blockIds.length > 0;
}

function bundleContainsAll(bundle: RuntimeBundle, candidateIds: string[]): boolean {
  const bundleSet = new Set(bundle.blockIds);
  return candidateIds.every(id => bundleSet.has(id));
}

export function selectSubject(
  stacks: StackSubjectInput[],
  blocksById: Map<string, Block>,
  bundles: RuntimeBundle[],
  priorityOverrides: Map<string, number>
): SelectSubjectResult {
  const notes: SelectSubjectResult["notes"] = [];
  const errors: SelectSubjectResult["errors"] = [];
  const selections: SubjectSelection[] = [];

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
    const subjectIds = stack.orderedBlockIds.filter(id => {
      const block = blocksById.get(id);
      return block?.moltType === "subject";
    });

    if (subjectIds.length === 0) {
      selections.push({
        stackId: stack.stackId,
        activeSubjectIds: [],
        candidateIds: [],
      });
      continue;
    }

    if (subjectIds.length === 1) {
      selections.push({
        stackId: stack.stackId,
        activeSubjectIds: [subjectIds[0]],
        candidateIds: subjectIds,
      });
      continue;
    }

    const subjectOnlyBundleContainingAll = bundles.find(
      b =>
        b.stackId === stack.stackId &&
        isSubjectOnlyBundle(b, blocksById) &&
        bundleContainsAll(b, subjectIds)
    );

    if (subjectOnlyBundleContainingAll) {
      const sorted = sortByPriorityDesc(subjectIds);
      const selectedId = sorted[0];

      notes.push({
        kind: "pipeline_stage",
        severity: "warning",
        code: "WARN_MULTIPLE_SUBJECT_BUNDLED",
        message: `Stack ${stack.stackId} has ${subjectIds.length} bundled subject alternates; selecting highest priority.`,
        relatedStackIds: [stack.stackId],
        relatedBlockIds: subjectIds,
      });

      notes.push({
        kind: "pipeline_stage",
        severity: "info",
        code: "INFO_SUBJECT_SELECTED",
        message: `Stack ${stack.stackId}: selected subject ${selectedId} from ${subjectIds.length} candidates.`,
        relatedStackIds: [stack.stackId],
        relatedBlockIds: [selectedId],
      });

      selections.push({
        stackId: stack.stackId,
        activeSubjectIds: [selectedId],
        candidateIds: subjectIds,
      });
    } else {
      notes.push({
        kind: "pipeline_stage",
        severity: "warning",
        code: "WARN_MULTIPLE_SUBJECT_ACTIVE",
        message: `Stack ${stack.stackId} has ${subjectIds.length} subjects without explicit alternates bundle; all remain active.`,
        relatedStackIds: [stack.stackId],
        relatedBlockIds: subjectIds,
      });

      selections.push({
        stackId: stack.stackId,
        activeSubjectIds: subjectIds,
        candidateIds: subjectIds,
      });
    }
  }

  selections.sort((a, b) => a.stackId.localeCompare(b.stackId));

  return { selections, notes, errors };
}
