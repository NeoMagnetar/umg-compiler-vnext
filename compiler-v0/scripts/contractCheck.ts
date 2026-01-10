import * as fs from "fs";
import * as path from "path";
import { compileSleeve } from "../src/compile.js";
import type {
  Sleeve,
  TriggerState,
  CompileResult,
  RuntimeNeoBlock,
  RuntimeBundle,
  Block,
  MoltType,
  GovernanceBinding,
  Stack,
} from "../src/types.js";

interface Violation {
  sample: string;
  rule: string;
  message: string;
}

const violations: Violation[] = [];

function addViolation(sample: string, rule: string, message: string) {
  violations.push({ sample, rule, message });
  console.error(`[FAIL] ${sample} | ${rule}: ${message}`);
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function checkActiveMatchesPromptSpec(
  sample: string,
  result: CompileResult
): void {
  if (!result.runtime) return;
  
  const { neoBlocks } = result.runtime;
  const { neoBlockPrompts } = result.runtime.promptSpec;

  for (const nb of neoBlocks) {
    const prompt = neoBlockPrompts.find((p) => p.neoBlockId === nb.id);
    if (!prompt) {
      addViolation(sample, "PROMPTSPEC_MISSING", `No promptSpec for neoBlock ${nb.id}`);
      continue;
    }

    const checks: Array<{ type: MoltType; activeIds: string[] }> = [
      { type: "trigger", activeIds: nb.active.triggerIds },
      { type: "directive", activeIds: nb.active.directiveIds },
      { type: "instruction", activeIds: nb.active.instructionIds },
      { type: "subject", activeIds: nb.active.subjectIds },
      { type: "primary", activeIds: nb.active.primaryId ? [nb.active.primaryId] : [] },
      { type: "philosophy", activeIds: nb.active.philosophyIds },
      { type: "blueprint", activeIds: nb.active.blueprintIds },
    ];

    for (const { type, activeIds } of checks) {
      const section = prompt.sections.find((s) => s.type === type);
      if (!section) {
        addViolation(sample, "SECTION_MISSING", `No ${type} section in promptSpec for ${nb.id}`);
        continue;
      }
      if (!arraysEqual(activeIds, section.blockIds)) {
        addViolation(
          sample,
          "ORDER_MISMATCH",
          `${nb.id}.active.${type}Ids [${activeIds.join(",")}] != promptSpec section [${section.blockIds.join(",")}]`
        );
      }
    }
  }
}

function checkNoForbiddenBlocks(
  sample: string,
  result: CompileResult,
  forbiddenIds: Set<string>
): void {
  if (forbiddenIds.size === 0) return;
  if (!result.runtime) return;

  const { neoBlocks } = result.runtime;
  const { neoBlockPrompts } = result.runtime.promptSpec;

  for (const nb of neoBlocks) {
    for (const id of nb.orderedBlockIds) {
      if (forbiddenIds.has(id)) {
        addViolation(sample, "FORBIDDEN_IN_ORDERED", `Forbidden block ${id} in ${nb.id}.orderedBlockIds`);
      }
    }

    for (const [molt, ids] of Object.entries(nb.byMoltType)) {
      for (const id of ids as string[]) {
        if (forbiddenIds.has(id)) {
          addViolation(sample, "FORBIDDEN_IN_BYMOLT", `Forbidden block ${id} in ${nb.id}.byMoltType.${molt}`);
        }
      }
    }

    const allActiveIds = [
      ...nb.active.triggerIds,
      ...nb.active.directiveIds,
      ...nb.active.instructionIds,
      ...nb.active.subjectIds,
      ...(nb.active.primaryId ? [nb.active.primaryId] : []),
      ...nb.active.philosophyIds,
      ...nb.active.blueprintIds,
    ];
    for (const id of allActiveIds) {
      if (forbiddenIds.has(id)) {
        addViolation(sample, "FORBIDDEN_IN_ACTIVE", `Forbidden block ${id} in ${nb.id}.active`);
      }
    }
  }

  for (const prompt of neoBlockPrompts) {
    for (const section of prompt.sections) {
      for (const id of section.blockIds) {
        if (forbiddenIds.has(id)) {
          addViolation(sample, "FORBIDDEN_IN_PROMPTSPEC", `Forbidden block ${id} in promptSpec.${prompt.neoBlockId}.${section.type}`);
        }
      }
    }
  }
}

function checkBundleIntents(
  sample: string,
  result: CompileResult,
  bundles: RuntimeBundle[],
  blocksById: Map<string, Block>,
  priorityOverrides: Map<string, number>,
  forbiddenIds: Set<string>
): void {
  if (!result.runtime) return;
  
  const { neoBlocks } = result.runtime;

  const getEffectivePriority = (blockId: string): number => {
    if (priorityOverrides.has(blockId)) {
      return priorityOverrides.get(blockId)!;
    }
    const block = blocksById.get(blockId);
    return block?.priorityOrder ?? 0;
  };

  for (const bundle of bundles) {
    const allForbidden = bundle.blockIds.every((id) => forbiddenIds.has(id));
    if (allForbidden) continue;
    const nb = neoBlocks.find((n: RuntimeNeoBlock) => n.stackId === bundle.stackId);
    if (!nb) continue;

    const bundleMoltTypes = new Set<MoltType>();
    for (const blockId of bundle.blockIds) {
      const block = blocksById.get(blockId);
      if (block) bundleMoltTypes.add(block.moltType);
    }

    if (bundleMoltTypes.size !== 1) continue;

    const moltType = [...bundleMoltTypes][0];
    const bundleBlockIds = bundle.blockIds;

    let activeIdsForMolt: string[];
    switch (moltType) {
      case "trigger": activeIdsForMolt = nb.active.triggerIds; break;
      case "directive": activeIdsForMolt = nb.active.directiveIds; break;
      case "instruction": activeIdsForMolt = nb.active.instructionIds; break;
      case "subject": activeIdsForMolt = nb.active.subjectIds; break;
      case "primary": activeIdsForMolt = nb.active.primaryId ? [nb.active.primaryId] : []; break;
      case "philosophy": activeIdsForMolt = nb.active.philosophyIds; break;
      case "blueprint": activeIdsForMolt = nb.active.blueprintIds; break;
      default: activeIdsForMolt = [];
    }

    const activeBundleIds = bundleBlockIds.filter((id) => activeIdsForMolt.includes(id));

    if (bundle.intent === "alternates" || moltType === "primary") {
      if (activeBundleIds.length !== 1) {
        addViolation(
          sample,
          "ALTERNATES_COUNT",
          `Bundle ${bundle.segmentId} (alternates) should have exactly 1 active, got ${activeBundleIds.length}`
        );
      } else {
        const sorted = [...bundleBlockIds].sort((a, b) => {
          const prioA = getEffectivePriority(a);
          const prioB = getEffectivePriority(b);
          if (prioB !== prioA) return prioB - prioA;
          return a.localeCompare(b);
        });
        const expectedWinner = sorted[0];
        if (activeBundleIds[0] !== expectedWinner) {
          addViolation(
            sample,
            "ALTERNATES_WINNER",
            `Bundle ${bundle.segmentId} winner should be ${expectedWinner} (highest priority), got ${activeBundleIds[0]}`
          );
        }
      }
    } else {
      if (activeBundleIds.length !== bundleBlockIds.length) {
        addViolation(
          sample,
          "RANKED_COUNT",
          `Bundle ${bundle.segmentId} (ranked) should have all ${bundleBlockIds.length} active, got ${activeBundleIds.length}`
        );
      }

      const activeInBundleOrder = bundleBlockIds.filter((id) => activeBundleIds.includes(id));
      const activePositions = activeInBundleOrder.map((id) => activeIdsForMolt.indexOf(id));
      
      for (let i = 1; i < activePositions.length; i++) {
        if (activePositions[i] <= activePositions[i - 1]) {
          addViolation(
            sample,
            "RANKED_ORDER",
            `Bundle ${bundle.segmentId} (ranked) ids not in bundle order within active list`
          );
          break;
        }
      }
    }
  }
}

function checkPrimarySelection(sample: string, result: CompileResult): void {
  if (!result.runtime) return;
  
  const { neoBlocks } = result.runtime;

  for (const nb of neoBlocks) {
    if (!nb.active.primaryId) {
      addViolation(sample, "PRIMARY_MISSING", `NeoBlock ${nb.id} has no selectedPrimaryId`);
    }

    const primaryCandidates = nb.byMoltType.primary ?? [];
    if (primaryCandidates.length > 0 && !nb.active.primaryId) {
      addViolation(sample, "PRIMARY_NOT_SELECTED", `NeoBlock ${nb.id} has primary candidates but no selection`);
    }
  }
}

function checkRuntimeIndexes(sample: string, result: CompileResult): void {
  if (!result.runtime) return;

  const { neoBlocks, indexes } = result.runtime;

  for (const nb of neoBlocks) {
    for (const id of nb.orderedBlockIds) {
      if (!(id in indexes.blockTitleById)) {
        addViolation(sample, "INDEX_MISSING_TITLE", `Block ${id} in ${nb.id}.orderedBlockIds missing from indexes.blockTitleById`);
      }
    }

    const allActiveIds = [
      ...nb.active.triggerIds,
      ...nb.active.directiveIds,
      ...nb.active.instructionIds,
      ...nb.active.subjectIds,
      ...(nb.active.primaryId ? [nb.active.primaryId] : []),
      ...nb.active.philosophyIds,
      ...nb.active.blueprintIds,
    ];
    for (const id of allActiveIds) {
      if (!(id in indexes.blockTitleById)) {
        addViolation(sample, "INDEX_MISSING_ACTIVE", `Active block ${id} missing from indexes.blockTitleById`);
      }
    }
  }

  const { tagsByBlockId, blockIdsByTag } = indexes.tags;

  for (const [blockId, tags] of Object.entries(tagsByBlockId)) {
    const sorted = [...tags].sort();
    if (!arraysEqual(tags, sorted)) {
      addViolation(sample, "TAGS_NOT_SORTED", `tagsByBlockId[${blockId}] is not sorted`);
    }

    const unique = [...new Set(tags)];
    if (unique.length !== tags.length) {
      addViolation(sample, "TAGS_DUPLICATES", `tagsByBlockId[${blockId}] has duplicates`);
    }

    for (const tag of tags) {
      if (!blockIdsByTag[tag]) {
        addViolation(sample, "TAG_MISSING_REVERSE", `Tag ${tag} for block ${blockId} missing from blockIdsByTag`);
      } else if (!blockIdsByTag[tag].includes(blockId)) {
        addViolation(sample, "TAG_MISSING_BLOCKID", `Block ${blockId} not in blockIdsByTag[${tag}]`);
      }
    }
  }

  for (const [tag, blockIds] of Object.entries(blockIdsByTag)) {
    const sorted = [...blockIds].sort();
    if (!arraysEqual(blockIds, sorted)) {
      addViolation(sample, "BLOCKIDS_NOT_SORTED", `blockIdsByTag[${tag}] is not sorted`);
    }

    const unique = [...new Set(blockIds)];
    if (unique.length !== blockIds.length) {
      addViolation(sample, "BLOCKIDS_DUPLICATES", `blockIdsByTag[${tag}] has duplicates`);
    }
  }
}

function extractForbiddenIds(sleeve: Sleeve): Set<string> {
  const forbidden = new Set<string>();
  const blocksById = new Map(sleeve.blocks.map((b) => [b.id, b]));
  const stacksById = new Map(sleeve.stacks.map((s) => [s.id, s]));

  for (const binding of sleeve.governance ?? []) {
    for (const rule of binding.rules) {
      if (rule.effect.type !== "forbid") continue;

      let scopeBlockIds: string[];
      if (binding.scope.type === "sleeve") {
        scopeBlockIds = [...blocksById.keys()];
      } else if (binding.scope.type === "stack") {
        const stack = stacksById.get(binding.scope.stackId);
        scopeBlockIds = stack?.blockIds ?? [];
      } else if (binding.scope.type === "stacks") {
        const allIds: string[] = [];
        for (const stackId of binding.scope.stackIds) {
          const stack = stacksById.get(stackId);
          if (stack) allIds.push(...stack.blockIds);
        }
        scopeBlockIds = [...new Set(allIds)];
      } else if (binding.scope.type === "block") {
        scopeBlockIds = [binding.scope.blockId];
      } else {
        scopeBlockIds = [];
      }

      for (const blockId of scopeBlockIds) {
        const block = blocksById.get(blockId);
        if (!block) continue;

        let matches = true;

        if (rule.target.blockIds && rule.target.blockIds.length > 0) {
          if (!rule.target.blockIds.includes(blockId)) matches = false;
        }

        if (matches && rule.target.moltTypes && rule.target.moltTypes.length > 0) {
          if (!rule.target.moltTypes.includes(block.moltType)) matches = false;
        }

        if (matches && rule.target.tagsAny && rule.target.tagsAny.length > 0) {
          const blockTags = new Set(block.tags ?? []);
          const anyTag = rule.target.tagsAny.some((t) => blockTags.has(t));
          if (!anyTag) matches = false;
        }

        if (matches && rule.target.roles && rule.target.roles.length > 0) {
          if (!block.role || !rule.target.roles.includes(block.role)) matches = false;
        }

        if (matches) {
          forbidden.add(blockId);
        }
      }
    }
  }
  return forbidden;
}

function extractPriorityOverrides(sleeve: Sleeve): Map<string, number> {
  const overrides = new Map<string, number>();
  for (const binding of sleeve.governance ?? []) {
    for (const rule of binding.rules) {
      if (rule.effect.type === "prefer" && rule.effect.boost !== undefined) {
        for (const blockId of rule.target.blockIds ?? []) {
          const block = sleeve.blocks.find((b) => b.id === blockId);
          const basePriority = block?.priorityOrder ?? 0;
          overrides.set(blockId, basePriority + rule.effect.boost);
        }
      }
    }
  }
  return overrides;
}

async function main() {
  const samplesDir = path.join(import.meta.dirname ?? __dirname, "..", "samples");
  const files = fs.readdirSync(samplesDir).filter((f) => f.endsWith(".json"));

  console.log(`[CONTRACT] Checking ${files.length} samples...\n`);

  for (const file of files) {
    const filePath = path.join(samplesDir, file);
    const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const sleeve: Sleeve = content.sleeve;
    const triggerState: TriggerState = content.triggerState ?? { activeTriggerIds: [] };

    const result = compileSleeve(sleeve, triggerState);

    if (result.hasErrors) {
      const errorCodes = result.trace.events
        .filter((e) => e.severity === "error")
        .map((e) => e.code);
      console.log(`[SKIP] ${file}: has compilation errors (${errorCodes.join(", ")})`);
      continue;
    }

    console.log(`[CHECK] ${file}`);

    const blocksById = new Map(sleeve.blocks.map((b) => [b.id, b]));
    const forbiddenIds = extractForbiddenIds(sleeve);
    const priorityOverrides = extractPriorityOverrides(sleeve);

    checkActiveMatchesPromptSpec(file, result);
    checkNoForbiddenBlocks(file, result, forbiddenIds);
    checkBundleIntents(file, result, result.runtime?.bundles ?? [], blocksById, priorityOverrides, forbiddenIds);
    checkPrimarySelection(file, result);
    checkRuntimeIndexes(file, result);
  }

  console.log("");

  if (violations.length > 0) {
    console.error(`\n[CONTRACT] FAILED with ${violations.length} violation(s)\n`);
    process.exit(1);
  } else {
    console.log(`[CONTRACT] PASSED - all ${files.length} samples satisfy invariants\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Contract check failed:", err);
  process.exit(1);
});
