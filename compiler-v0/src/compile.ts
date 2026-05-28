import type { CompileResult, Sleeve, TriggerState, TraceEvent, MoltType, Block, RuntimeIndexes, RuntimeNeoBlock } from "./types.js";
import { ROLE_SET } from "./roles.js";
import { normalizeSegments } from "./normalizeSegments.js";
import { applyMerges } from "./applyMerges.js";
import { applyBundles } from "./applyBundles.js";
import { applyGovernance } from "./applyGovernance.js";
import { resolveAuthority } from "./resolveAuthority.js";
import { selectPrimary } from "./selectPrimary.js";
import { selectDirective } from "./selectDirective.js";
import { selectInstruction } from "./selectInstruction.js";
import { selectBlueprint } from "./selectBlueprint.js";
import { selectSubject } from "./selectSubject.js";
import { buildNeoBlocks } from "./buildNeoBlocks.js";
import { buildNeoStacks } from "./buildNeoStacks.js";
import { buildPromptSpec } from "./buildPromptSpec.js";
import { buildTagIndexes, type RuntimeStackInfo } from "./buildTagIndexes.js";

const MOLT_ORDER: MoltType[] = [
  "trigger",
  "directive",
  "instruction",
  "subject",
  "primary",
  "philosophy",
  "blueprint",
];

function isoNow() {
  return new Date().toISOString();
}

function buildRuntimeIndexes(
  sleeve: Sleeve,
  liveBlockIds: Set<string>,
  blocksById: Map<string, Block>,
  runtimeStacks: RuntimeStackInfo[],
  neoBlocks: RuntimeNeoBlock[]
): RuntimeIndexes {
  const blockTitleById: Record<string, string> = {};
  const stackNameById: Record<string, string> = {};

  for (const [id, block] of blocksById) {
    if (!liveBlockIds.has(id)) continue;
    blockTitleById[id] = block.title ?? id;
  }

  for (const stack of sleeve.stacks) {
    stackNameById[stack.id] = stack.name ?? stack.id;
  }

  const tags = buildTagIndexes({
    blocksById,
    runtimeStacks,
    neoBlocks,
  });

  return {
    blockTitleById,
    stackNameById,
    tags,
  };
}

function mkEventId(i: number) {
  return `evt_${String(i).padStart(5, "0")}`;
}

export function compileSleeve(sleeve: Sleeve, triggerState: TriggerState): CompileResult {
  let i = 0;
  const events: TraceEvent[] = [];

  const push = (evt: Omit<TraceEvent, "id" | "timestamp">) => {
    events.push({ ...evt, id: mkEventId(++i), timestamp: isoNow() });
  };

  const pushAll = (evts: Array<Omit<TraceEvent, "id" | "timestamp">>) => {
    for (const evt of evts) {
      push(evt);
    }
  };

  const fail = (code: string, message: string, extra?: Partial<TraceEvent>) => {
    push({
      kind: "validation_failed",
      severity: "error",
      code,
      message,
      ...extra,
    });
  };

  const hasErrors = () => events.some(e => e.severity === "error");

  push({
    kind: "pipeline_stage",
    severity: "info",
    code: "INFO_START",
    message: "compileSleeve(v0) started.",
  });

  // Step 1: Basic schema validation
  if (!sleeve?.id || !Array.isArray(sleeve.blocks) || !Array.isArray(sleeve.stacks)) {
    fail("ERR_INVALID_SLEEVE_SCHEMA", "Sleeve requires id, blocks[], stacks[].");
    return { trace: { sleeveId: sleeve?.id ?? "unknown", events }, hasErrors: true };
  }

  // Dedup blocks + validate molt + role
  const blocksById = new Map<string, Block>();
  for (const b of sleeve.blocks) {
    if (!b?.id) {
      fail("ERR_INVALID_BLOCK", "Block missing id.");
      continue;
    }
    if (blocksById.has(b.id)) {
      fail("ERR_DUPLICATE_BLOCK_ID", `Duplicate block id: ${b.id}`, { relatedBlockIds: [b.id] });
      continue;
    }
    if (!MOLT_ORDER.includes(b.moltType as MoltType)) {
      fail("ERR_UNKNOWN_MOLT_TYPE", `Unknown moltType: ${String(b.moltType)} on block ${b.id}`, {
        relatedBlockIds: [b.id],
      });
      continue;
    }
    if (b.role && !ROLE_SET.has(b.role)) {
      fail("ERR_UNKNOWN_ROLE", `Unknown role: ${String(b.role)} on block ${b.id}`, {
        relatedBlockIds: [b.id],
      });
      continue;
    }
    blocksById.set(b.id, b);
  }

  if (hasErrors()) {
    return { trace: { sleeveId: sleeve.id, events }, hasErrors: true };
  }

  // Validate stacks reference existing blocks
  for (const st of sleeve.stacks) {
    if (!st?.id || !Array.isArray(st.blockIds)) {
      fail("ERR_INVALID_STACK", "Stack missing id or blockIds[].");
      continue;
    }
    for (const bid of st.blockIds) {
      if (!blocksById.has(bid)) {
        fail("ERR_INVALID_STACK_REF", `Stack ${st.id} references missing block ${bid}`, {
          relatedStackIds: [st.id],
          relatedBlockIds: [bid],
        });
      }
    }
  }

  if (hasErrors()) {
    return { trace: { sleeveId: sleeve.id, events }, hasErrors: true };
  }

  push({
    kind: "pipeline_stage",
    severity: "info",
    code: "INFO_VALIDATE_DONE",
    message: "Validation passed.",
  });

  // Step 2: Normalize segments
  const normalizeResult = normalizeSegments(sleeve.stacks, blocksById);
  pushAll(normalizeResult.errors);
  pushAll(normalizeResult.notes);

  if (hasErrors()) {
    return { trace: { sleeveId: sleeve.id, events }, hasErrors: true };
  }

  push({
    kind: "pipeline_stage",
    severity: "info",
    code: "INFO_NORMALIZE_DONE",
    message: "Segments normalized.",
  });

  // Step 3: Apply merges (substitution)
  const mergeResult = applyMerges(normalizeResult.normalizedStacks, blocksById);
  pushAll(mergeResult.notes);

  push({
    kind: "pipeline_stage",
    severity: "info",
    code: "INFO_MERGE_DONE",
    message: `Merges applied. ${mergeResult.notes.length} merge operation(s).`,
  });

  // Step 4: Apply bundles (record only)
  const bundleResult = applyBundles(mergeResult.mergedStacks, blocksById);
  pushAll(bundleResult.notes);

  push({
    kind: "pipeline_stage",
    severity: "info",
    code: "INFO_BUNDLE_DONE",
    message: `Bundles recorded. ${bundleResult.bundles.length} bundle(s).`,
  });

  // Step 5: Apply governance
  const governanceResult = applyGovernance(sleeve, triggerState, blocksById);
  pushAll(governanceResult.errors);
  pushAll(governanceResult.notes);

  if (hasErrors()) {
    return { trace: { sleeveId: sleeve.id, events }, hasErrors: true };
  }

  push({
    kind: "pipeline_stage",
    severity: "info",
    code: "INFO_GOVERNANCE_DONE",
    message: `Governance applied. ${governanceResult.appliedGovernance.length} rule(s) executed.`,
  });

  // Step 6: Validate required blocks survive (not forbidden, exist in sleeve)
  for (const reqId of governanceResult.requiredBlockIds) {
    if (!blocksById.has(reqId)) {
      fail("ERR_GOVERNANCE_UNSATISFIABLE", `Required block ${reqId} does not exist in sleeve.`, {
        relatedBlockIds: [reqId],
      });
    } else if (governanceResult.forbiddenBlockIds.has(reqId)) {
      fail("ERR_GOVERNANCE_FORBIDDEN_BLOCK", `Required block ${reqId} is also forbidden.`, {
        relatedBlockIds: [reqId],
      });
    }
  }

  if (hasErrors()) {
    return { trace: { sleeveId: sleeve.id, events }, hasErrors: true };
  }

  // Step 7: Filter live blocks (post-merge, post-governance)
  const offExcludedBlockIds: string[] = [];

  const isLiveBlock = (id: string): boolean => {
    if (governanceResult.forbiddenBlockIds.has(id)) return false;
    const b = blocksById.get(id);
    if (!b) return false;
    if (b.role === "off") {
      offExcludedBlockIds.push(id);
      return false;
    }
    return true;
  };

  const preAuthorityStacks = mergeResult.mergedStacks.map(st => ({
    stackId: st.id,
    domainKey: st.domainKey,
    blockIds: st.blockIds.filter(id => isLiveBlock(id)),
  }));

  const uniqueOffExcludedBlockIds = [...new Set(offExcludedBlockIds)].sort((a, b) => a.localeCompare(b));
  for (const blockId of uniqueOffExcludedBlockIds) {
    push({
      kind: "note",
      severity: "info",
      code: "INFO_BLOCK_EXCLUDED_OFF_STATE",
      message: `Block ${blockId} excluded from active participation because role=off (legacy provisional Off-state representation).`,
      relatedBlockIds: [blockId],
    });
  }

  // Step 8: Resolve authority (MOLT hierarchy + priority + id tie-break)
  const authorityResult = resolveAuthority(
    preAuthorityStacks,
    blocksById,
    governanceResult.priorityOverrides
  );
  pushAll(authorityResult.notes);

  push({
    kind: "pipeline_stage",
    severity: "info",
    code: "INFO_RESOLVE_AUTHORITY_DONE",
    message: `Authority resolved for ${authorityResult.stacks.length} stack(s).`,
  });

  // Step 9: Select primary for each stack
  const primaryResult = selectPrimary(
    authorityResult.stacks.map(st => ({
      stackId: st.stackId,
      orderedBlockIds: st.orderedBlockIds,
    })),
    blocksById,
    bundleResult.bundles,
    governanceResult.priorityOverrides
  );
  pushAll(primaryResult.notes);
  pushAll(primaryResult.errors);

  if (primaryResult.errors.length > 0) {
    return { trace: { sleeveId: sleeve.id, events }, hasErrors: true };
  }

  push({
    kind: "pipeline_stage",
    severity: "info",
    code: "INFO_PRIMARY_SELECTION_DONE",
    message: `Primary selection complete for ${primaryResult.selections.length} stack(s).`,
  });

  // Step 10: Select directives for each stack
  const directiveResult = selectDirective(
    authorityResult.stacks.map(st => ({
      stackId: st.stackId,
      orderedBlockIds: st.orderedBlockIds,
    })),
    blocksById,
    bundleResult.bundles,
    governanceResult.priorityOverrides
  );
  pushAll(directiveResult.notes);

  push({
    kind: "pipeline_stage",
    severity: "info",
    code: "INFO_DIRECTIVE_SELECTION_DONE",
    message: `Directive selection complete for ${directiveResult.selections.length} stack(s).`,
  });

  // Step 11: Select instructions for each stack
  const instructionResult = selectInstruction(
    authorityResult.stacks.map(st => ({
      stackId: st.stackId,
      orderedBlockIds: st.orderedBlockIds,
    })),
    blocksById,
    bundleResult.bundles,
    governanceResult.priorityOverrides
  );
  pushAll(instructionResult.notes);
  pushAll(instructionResult.errors);

  if (instructionResult.errors.length > 0) {
    return { trace: { sleeveId: sleeve.id, events }, hasErrors: true };
  }

  push({
    kind: "pipeline_stage",
    severity: "info",
    code: "INFO_INSTRUCTION_SELECTION_DONE",
    message: `Instruction selection complete for ${instructionResult.selections.length} stack(s).`,
  });

  // Step 12: Select subjects for each stack
  const subjectResult = selectSubject(
    authorityResult.stacks.map(st => ({
      stackId: st.stackId,
      orderedBlockIds: st.orderedBlockIds,
    })),
    blocksById,
    bundleResult.bundles,
    governanceResult.priorityOverrides
  );
  pushAll(subjectResult.notes);
  pushAll(subjectResult.errors);

  if (subjectResult.errors.length > 0) {
    return { trace: { sleeveId: sleeve.id, events }, hasErrors: true };
  }

  push({
    kind: "pipeline_stage",
    severity: "info",
    code: "INFO_SUBJECT_SELECTION_DONE",
    message: `Subject selection complete for ${subjectResult.selections.length} stack(s).`,
  });

  // Step 13: Select blueprints for each stack
  const blueprintResult = selectBlueprint(
    authorityResult.stacks.map(st => ({
      stackId: st.stackId,
      orderedBlockIds: st.orderedBlockIds,
    })),
    blocksById,
    bundleResult.bundles,
    governanceResult.priorityOverrides
  );
  pushAll(blueprintResult.notes);
  pushAll(blueprintResult.errors);

  if (blueprintResult.errors.length > 0) {
    return { trace: { sleeveId: sleeve.id, events }, hasErrors: true };
  }

  push({
    kind: "pipeline_stage",
    severity: "info",
    code: "INFO_BLUEPRINT_SELECTION_DONE",
    message: `Blueprint selection complete for ${blueprintResult.selections.length} stack(s).`,
  });

  // Step 13: Philosophy warnings (no selection, keep all)
  for (const st of authorityResult.stacks) {
    const philosophyIds = st.orderedBlockIds.filter(id => {
      const block = blocksById.get(id);
      return block?.moltType === "philosophy";
    });
    if (philosophyIds.length > 1) {
      push({
        kind: "pipeline_stage",
        severity: "warning",
        code: "WARN_MULTIPLE_PHILOSOPHY_ACTIVE",
        message: `Stack ${st.stackId} has ${philosophyIds.length} philosophy blocks; all remain active.`,
        relatedStackIds: [st.stackId],
        relatedBlockIds: philosophyIds,
      });
    }
  }

  // Step 14: Build global blocksByMoltType from authority-resolved stacks
  const blocksByMoltType = Object.fromEntries(
    MOLT_ORDER.map(t => [t, [] as string[]])
  ) as Record<MoltType, string[]>;

  const seenBlockIds = new Set<string>();
  for (const st of authorityResult.stacks) {
    for (const molt of MOLT_ORDER) {
      for (const blockId of st.byMoltType[molt]) {
        if (!seenBlockIds.has(blockId)) {
          seenBlockIds.add(blockId);
          blocksByMoltType[molt].push(blockId);
        }
      }
    }
  }

  const runtimeStacks = authorityResult.stacks.map(st => ({
    stackId: st.stackId,
    domainKey: st.domainKey,
    orderedBlockIds: st.orderedBlockIds,
  }));

  // Step 12: Build NeoBlocks and NeoStacks
  const appliedMerges = sleeve.stacks
    .flatMap(st =>
      (st.segments ?? [])
        .filter(seg => seg.kind === "merge")
        .map(seg => ({ segmentId: seg.id, stackId: st.id }))
    )
    .sort((a, b) => a.segmentId.localeCompare(b.segmentId));

  const primaryByStackId: Record<string, string> = {};
  for (const sel of primaryResult.selections) {
    primaryByStackId[sel.stackId] = sel.selectedPrimaryId;
  }

  const directiveByStackId: Record<string, string[]> = {};
  for (const sel of directiveResult.selections) {
    directiveByStackId[sel.stackId] = sel.activeDirectiveIds;
  }

  const instructionByStackId: Record<string, string[]> = {};
  for (const sel of instructionResult.selections) {
    instructionByStackId[sel.stackId] = sel.activeInstructionIds;
  }

  const blueprintByStackId: Record<string, string[]> = {};
  for (const sel of blueprintResult.selections) {
    blueprintByStackId[sel.stackId] = sel.activeBlueprintIds;
  }

  const subjectByStackId: Record<string, string[]> = {};
  for (const sel of subjectResult.selections) {
    subjectByStackId[sel.stackId] = sel.activeSubjectIds;
  }

  const neoBlocksResult = buildNeoBlocks({
    runtimeStacks,
    bundles: bundleResult.bundles,
    appliedMerges,
    blocksById,
    primaryByStackId,
    directiveByStackId,
    instructionByStackId,
    blueprintByStackId,
    subjectByStackId,
    priorityOverrides: governanceResult.priorityOverrides,
  });

  const neoStacks = buildNeoStacks({
    stacks: sleeve.stacks,
    neoBlockIdByStackId: neoBlocksResult.neoBlockIdByStackId,
  });

  const promptSpec = buildPromptSpec({
    sleeveId: sleeve.id,
    neoBlocks: neoBlocksResult.neoBlocks,
    blocksById,
  });

  const liveBlockIds = new Set<string>();
  for (const nb of neoBlocksResult.neoBlocks) {
    for (const id of nb.orderedBlockIds) {
      liveBlockIds.add(id);
    }
  }

  const indexes = buildRuntimeIndexes(sleeve, liveBlockIds, blocksById, runtimeStacks, neoBlocksResult.neoBlocks);

  push({
    kind: "pipeline_stage",
    severity: "info",
    code: "INFO_PROMPT_SPEC_DONE",
    message: `Built promptSpec for ${promptSpec.neoBlockPrompts.length} neoBlocks.`,
  });

  push({
    kind: "pipeline_stage",
    severity: "info",
    code: "INFO_DONE",
    message: `compileSleeve(v0) succeeded. Active triggers: ${(triggerState?.activeTriggerIds ?? []).length}.`,
    relatedTriggerIds: triggerState?.activeTriggerIds ?? [],
  });

  return {
    runtime: {
      sleeveId: sleeve.id,
      sleeveName: sleeve.name,
      stacks: runtimeStacks,
      blocksByMoltType,
      bundles: bundleResult.bundles,
      neoBlocks: neoBlocksResult.neoBlocks,
      neoStacks,
      neoBlockIdByStackId: neoBlocksResult.neoBlockIdByStackId,
      primaryByStackId,
      promptSpec,
      indexes,
      meta: {
        compiledAt: isoNow(),
        compilerVersion: "v0",
      },
    },
    trace: { sleeveId: sleeve.id, events },
    hasErrors: false,
  };
}
