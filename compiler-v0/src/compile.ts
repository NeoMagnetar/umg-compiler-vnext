import type { CompileResult, Sleeve, TriggerState, TraceEvent, MoltType, Block } from "./types.js";
import { ROLE_SET } from "./roles.js";
import { normalizeSegments } from "./normalizeSegments.js";
import { applyMerges } from "./applyMerges.js";
import { applyBundles } from "./applyBundles.js";

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

  // Step 5: Build runtime from post-merge stack ordering
  const blocksByMoltType = Object.fromEntries(
    MOLT_ORDER.map(t => [t, [] as string[]])
  ) as Record<MoltType, string[]>;

  const liveBlockIds = Array.from(blocksById.values())
    .filter(b => b.role !== "off")
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(b => b.id);

  for (const id of liveBlockIds) {
    const b = blocksById.get(id)!;
    blocksByMoltType[b.moltType].push(id);
  }

  const runtimeStacks = mergeResult.mergedStacks.map(st => ({
    stackId: st.id,
    domainKey: st.domainKey,
    orderedBlockIds: st.blockIds.filter(id => blocksById.get(id)?.role !== "off"),
  }));

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
      meta: {
        compiledAt: isoNow(),
        compilerVersion: "v0",
      },
    },
    trace: { sleeveId: sleeve.id, events },
    hasErrors: false,
  };
}
