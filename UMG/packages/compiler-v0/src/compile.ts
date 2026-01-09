import type { CompileResult, Sleeve, TriggerState, TraceEvent, MoltType } from "./types.js";
import { ROLE_SET } from "./roles.js";

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

  const fail = (code: string, message: string, extra?: Partial<TraceEvent>) => {
    push({
      kind: "validation_failed",
      severity: "error",
      code,
      message,
      ...extra,
    });
  };

  push({
    kind: "pipeline_stage",
    severity: "info",
    code: "INFO_START",
    message: "compileSleeve(v0) started.",
  });

  // Basic schema checks
  if (!sleeve?.id || !Array.isArray(sleeve.blocks) || !Array.isArray(sleeve.stacks)) {
    fail("ERR_INVALID_SLEEVE_SCHEMA", "Sleeve requires id, blocks[], stacks[].");
    return { trace: { sleeveId: sleeve?.id ?? "unknown", events }, hasErrors: true };
  }

  // Dedup blocks + validate molt + role
  const blocksById = new Map<string, Sleeve["blocks"][number]>();
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

  if (events.some(e => e.severity === "error")) {
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

  if (events.some(e => e.severity === "error")) {
    return { trace: { sleeveId: sleeve.id, events }, hasErrors: true };
  }

  // Deterministic compiled views
  const blocksByMoltType: Record<MoltType, string[]> = Object.fromEntries(
    MOLT_ORDER.map(t => [t, []])
  ) as any;

  const liveBlockIds = Array.from(blocksById.values())
    .filter(b => b.role !== "off")
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(b => b.id);

  for (const id of liveBlockIds) {
    const b = blocksById.get(id)!;
    blocksByMoltType[b.moltType].push(id);
  }

  const stacks = sleeve.stacks.map(st => ({
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
      stacks,
      blocksByMoltType,
      meta: {
        compiledAt: isoNow(),
        compilerVersion: "v0",
      },
    },
    trace: { sleeveId: sleeve.id, events },
    hasErrors: false,
  };
}
