import type {
  Sleeve,
  TriggerState,
  TraceEvent,
  Block,
  GovernanceBinding,
  GovernanceRule,
  GovernanceScope,
  MoltType,
  Stack,
} from "./types.js";

export interface GovernanceResult {
  forbiddenBlockIds: Set<string>;
  requiredBlockIds: Set<string>;
  priorityOverrides: Map<string, number>;
  limits: Map<string, number>;
  appliedGovernance: Array<{ ruleId: string; affectedBlockIds: string[] }>;
  notes: Array<Omit<TraceEvent, "id" | "timestamp">>;
  errors: Array<Omit<TraceEvent, "id" | "timestamp">>;
}

function scopeSpecificity(scope: GovernanceScope): number {
  if (scope.type === "block") return 4;
  if (scope.type === "stack") return 3;
  if (scope.type === "stacks") return 2;
  return 1; // sleeve
}

function evaluateCondition(
  condition: GovernanceRule["condition"],
  activeTriggerIds: string[]
): boolean {
  if (!condition) return true;

  const activeSet = new Set(activeTriggerIds);

  if (condition.triggerIdsAny && condition.triggerIdsAny.length > 0) {
    const anyMatch = condition.triggerIdsAny.some((id) => activeSet.has(id));
    if (!anyMatch) return false;
  }

  if (condition.triggerIdsAll && condition.triggerIdsAll.length > 0) {
    const allMatch = condition.triggerIdsAll.every((id) => activeSet.has(id));
    if (!allMatch) return false;
  }

  return true;
}

function resolveScopeBlockIds(
  scope: GovernanceScope,
  blocksById: Map<string, Block>,
  stacksById: Map<string, Stack>
): { blockIds: string[]; error?: string } {
  if (scope.type === "sleeve") {
    return { blockIds: Array.from(blocksById.keys()) };
  }

  if (scope.type === "stack") {
    const stack = stacksById.get(scope.stackId);
    if (!stack) {
      return { blockIds: [], error: `Stack not found: ${scope.stackId}` };
    }
    return { blockIds: stack.blockIds.filter((id) => blocksById.has(id)) };
  }

  if (scope.type === "stacks") {
    const allBlockIds: string[] = [];
    const seen = new Set<string>();
    for (const stackId of scope.stackIds) {
      const stack = stacksById.get(stackId);
      if (!stack) {
        return { blockIds: [], error: `Stack not found: ${stackId}` };
      }
      for (const bid of stack.blockIds) {
        if (blocksById.has(bid) && !seen.has(bid)) {
          seen.add(bid);
          allBlockIds.push(bid);
        }
      }
    }
    return { blockIds: allBlockIds };
  }

  if (scope.type === "block") {
    if (!blocksById.has(scope.blockId)) {
      return { blockIds: [], error: `Block not found: ${scope.blockId}` };
    }
    return { blockIds: [scope.blockId] };
  }

  return { blockIds: [], error: "Unknown scope type" };
}

function matchesTarget(
  block: Block,
  target: GovernanceRule["target"],
  scopeBlockIds: string[]
): boolean {
  if (!scopeBlockIds.includes(block.id)) {
    return false;
  }

  if (target.blockIds && target.blockIds.length > 0) {
    if (!target.blockIds.includes(block.id)) return false;
  }

  if (target.moltTypes && target.moltTypes.length > 0) {
    if (!target.moltTypes.includes(block.moltType)) return false;
  }

  if (target.tagsAny && target.tagsAny.length > 0) {
    const blockTags = new Set(block.tags ?? []);
    const anyTag = target.tagsAny.some((t) => blockTags.has(t));
    if (!anyTag) return false;
  }

  if (target.roles && target.roles.length > 0) {
    if (!block.role || !target.roles.includes(block.role)) return false;
  }

  return true;
}

export function applyGovernance(
  sleeve: Sleeve,
  triggerState: TriggerState,
  blocksById: Map<string, Block>
): GovernanceResult {
  const forbiddenBlockIds = new Set<string>();
  const requiredBlockIds = new Set<string>();
  const priorityOverrides = new Map<string, number>();
  const limits = new Map<string, number>();
  const appliedGovernance: Array<{ ruleId: string; affectedBlockIds: string[] }> = [];
  const notes: Array<Omit<TraceEvent, "id" | "timestamp">> = [];
  const errors: Array<Omit<TraceEvent, "id" | "timestamp">> = [];

  const hardForbidden = new Set<string>();
  const hardRequired = new Set<string>();

  const stacksById = new Map(sleeve.stacks.map((s) => [s.id, s]));

  const bindings = sleeve.governance ?? [];
  const sortedBindings = [...bindings].sort(
    (a, b) => scopeSpecificity(a.scope) - scopeSpecificity(b.scope)
  );

  for (const binding of sortedBindings) {
    const scopeResult = resolveScopeBlockIds(binding.scope, blocksById, stacksById);

    if (scopeResult.error) {
      errors.push({
        kind: "validation_failed",
        severity: "error",
        code: "ERR_GOVERNANCE_INVALID_SCOPE",
        message: `Governance binding ${binding.id}: ${scopeResult.error}`,
      });
      continue;
    }

    const scopeBlockIds = scopeResult.blockIds;

    for (const rule of binding.rules) {
      if (!evaluateCondition(rule.condition, triggerState.activeTriggerIds)) {
        notes.push({
          kind: "note",
          severity: "warning",
          code: "WARN_GOVERNANCE_RULE_SKIPPED",
          message: `Rule ${rule.id} skipped: condition not met.`,
        });
        continue;
      }

      const matchedBlocks: string[] = [];
      for (const [id, block] of blocksById) {
        if (matchesTarget(block, rule.target, scopeBlockIds)) {
          matchedBlocks.push(id);
        }
      }

      if (matchedBlocks.length === 0) {
        continue;
      }

      matchedBlocks.sort((a, b) => a.localeCompare(b));

      const effect = rule.effect;

      if (effect.type === "forbid") {
        for (const blockId of matchedBlocks) {
          if (effect.severity === "hard") {
            if (hardRequired.has(blockId)) {
              errors.push({
                kind: "validation_failed",
                severity: "error",
                code: "ERR_GOVERNANCE_CONFLICT",
                message: `Block ${blockId} is both hard-required and hard-forbidden.`,
                relatedBlockIds: [blockId],
              });
              continue;
            }
            hardForbidden.add(blockId);
          }
          forbiddenBlockIds.add(blockId);
        }
        appliedGovernance.push({ ruleId: rule.id, affectedBlockIds: matchedBlocks });
        notes.push({
          kind: "note",
          severity: "info",
          code: "INFO_GOVERNANCE_APPLIED",
          message: `Rule ${rule.id} (forbid) applied to ${matchedBlocks.length} block(s).`,
          relatedBlockIds: matchedBlocks,
        });
      }

      if (effect.type === "require") {
        for (const blockId of matchedBlocks) {
          if (effect.severity === "hard") {
            if (hardForbidden.has(blockId)) {
              errors.push({
                kind: "validation_failed",
                severity: "error",
                code: "ERR_GOVERNANCE_CONFLICT",
                message: `Block ${blockId} is both hard-forbidden and hard-required.`,
                relatedBlockIds: [blockId],
              });
              continue;
            }
            hardRequired.add(blockId);
          }
          requiredBlockIds.add(blockId);
        }
        appliedGovernance.push({ ruleId: rule.id, affectedBlockIds: matchedBlocks });
        notes.push({
          kind: "note",
          severity: "info",
          code: "INFO_GOVERNANCE_APPLIED",
          message: `Rule ${rule.id} (require) applied to ${matchedBlocks.length} block(s).`,
          relatedBlockIds: matchedBlocks,
        });
      }

      if (effect.type === "prefer") {
        const boost = effect.boost ?? 1000;
        for (const blockId of matchedBlocks) {
          const block = blocksById.get(blockId)!;
          const basePriority = priorityOverrides.get(blockId) ?? block.priorityOrder ?? 0;
          priorityOverrides.set(blockId, basePriority + boost);
        }
        appliedGovernance.push({ ruleId: rule.id, affectedBlockIds: matchedBlocks });
        notes.push({
          kind: "note",
          severity: "info",
          code: "INFO_GOVERNANCE_APPLIED",
          message: `Rule ${rule.id} (prefer, boost=${boost}) applied to ${matchedBlocks.length} block(s).`,
          relatedBlockIds: matchedBlocks,
        });
      }

      if (effect.type === "override_priority") {
        for (const blockId of matchedBlocks) {
          const block = blocksById.get(blockId)!;
          const basePriority = priorityOverrides.get(blockId) ?? block.priorityOrder ?? 0;

          let newPriority: number;
          if (effect.setTo !== undefined) {
            newPriority = effect.setTo;
          } else if (effect.delta !== undefined) {
            newPriority = basePriority + effect.delta;
          } else {
            newPriority = basePriority;
          }

          priorityOverrides.set(blockId, newPriority);
        }
        appliedGovernance.push({ ruleId: rule.id, affectedBlockIds: matchedBlocks });
        notes.push({
          kind: "note",
          severity: "info",
          code: "INFO_GOVERNANCE_APPLIED",
          message: `Rule ${rule.id} (override_priority) applied to ${matchedBlocks.length} block(s).`,
          relatedBlockIds: matchedBlocks,
        });
      }

      if (effect.type === "limit") {
        if (!rule.target.moltTypes || rule.target.moltTypes.length !== 1) {
          errors.push({
            kind: "validation_failed",
            severity: "error",
            code: "ERR_INVALID_SLEEVE_SCHEMA",
            message: `Rule ${rule.id}: limit effect requires exactly one moltType in target.`,
          });
          continue;
        }

        const moltType = rule.target.moltTypes[0];
        let limitKey: string;
        if (binding.scope.type === "sleeve") {
          limitKey = `sleeve:limit:${moltType}`;
        } else if (binding.scope.type === "stack") {
          limitKey = `stack:${binding.scope.stackId}:limit:${moltType}`;
        } else if (binding.scope.type === "stacks") {
          limitKey = `stacks:${binding.scope.stackIds.sort().join(",")}:limit:${moltType}`;
        } else {
          continue;
        }

        const existing = limits.get(limitKey);
        if (existing === undefined || effect.maxCount < existing) {
          limits.set(limitKey, effect.maxCount);
        }

        appliedGovernance.push({ ruleId: rule.id, affectedBlockIds: matchedBlocks });
        notes.push({
          kind: "note",
          severity: "info",
          code: "INFO_GOVERNANCE_APPLIED",
          message: `Rule ${rule.id} (limit, maxCount=${effect.maxCount}) applied for ${moltType}.`,
          relatedBlockIds: matchedBlocks,
        });
      }
    }
  }

  return {
    forbiddenBlockIds,
    requiredBlockIds,
    priorityOverrides,
    limits,
    appliedGovernance,
    notes,
    errors,
  };
}
