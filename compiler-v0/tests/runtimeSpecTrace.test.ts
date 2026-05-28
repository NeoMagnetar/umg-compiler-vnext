import { compileSleeve, compileIr, type Sleeve, type TriggerState } from "../src/index.js";
import {
  normalizeSleeveCompileResultForSemanticComparison,
  normalizeIrCompileResultForSemanticComparison,
} from "./determinismHelpers.js";

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) {
    console.log(`  PASS: ${label} ✓`);
    passed++;
  } else {
    console.log(`  FAIL: ${label} ✗`);
    failed++;
  }
}

console.log("=== RuntimeSpec / Trace Boundary Tests ===\n");

const sleeve: Sleeve = {
  id: "runtime-trace-boundary-sleeve",
  name: "Runtime Trace Boundary Sleeve",
  blocks: [
    { id: "blk_primary", moltType: "primary", role: "primary_shell", content: "Primary." },
    { id: "blk_instr_live", moltType: "instruction", content: "Live instruction." },
    { id: "blk_instr_off", moltType: "instruction", role: "off", content: "Off instruction." },
    { id: "blk_instr_forbidden", moltType: "instruction", content: "Forbidden instruction." },
  ],
  stacks: [
    {
      id: "stack-1",
      blockIds: ["blk_primary", "blk_instr_live", "blk_instr_off", "blk_instr_forbidden"],
    },
  ],
  governance: [
    {
      id: "gov-boundary",
      scope: { type: "sleeve" },
      rules: [
        {
          id: "rule-forbid-boundary",
          name: "Forbid forbidden instruction",
          target: { blockIds: ["blk_instr_forbidden"] },
          effect: { type: "forbid", severity: "hard" },
        },
      ],
    },
  ],
  triggers: [],
};

const triggerState: TriggerState = { activeTriggerIds: [] };
const sleeveResultA = compileSleeve(sleeve, triggerState);
const sleeveResultB = compileSleeve(sleeve, triggerState);

assert("sleeve compile succeeds", !sleeveResultA.hasErrors);
assert("runtime meta declares runtime_spec artifact kind", sleeveResultA.runtime?.meta.artifactKind === "runtime_spec");
assert("runtime meta declares non-executing boundary", sleeveResultA.runtime?.meta.nonExecuting === true);
assert(
  "runtime boundary note is explicit",
  sleeveResultA.runtime?.meta.boundaryNote ===
    "RuntimeSpec is a non-executing compiler artifact and does not grant permission or perform execution."
);

const offTrace = sleeveResultA.trace.events.find((evt) => evt.code === "INFO_BLOCK_EXCLUDED_OFF_STATE");
const govTrace = sleeveResultA.trace.events.find((evt) => evt.code === "INFO_BLOCK_EXCLUDED_GOVERNANCE");
const mergeLike = sleeveResultA.trace.events.find((evt) => evt.code === "INFO_MERGE_APPLIED");
const priorityLike = sleeveResultA.trace.events.find((evt) => evt.code === "INFO_PRIORITY_RESOLVED");
const doneEvent = sleeveResultA.trace.events.find((evt) => evt.code === "INFO_DONE");

assert("trace includes Off exclusion record", !!offTrace);
assert("trace includes governance exclusion record", !!govTrace);
assert("trace completion event includes trigger context field", Array.isArray(doneEvent?.relatedTriggerIds));
assert("trace messages do not claim permission", !sleeveResultA.trace.events.some((evt) => /permission granted|approved to execute/i.test(evt.message)));
assert(
  "sleeve compile semantic output deterministic via normalization helper",
  JSON.stringify(normalizeSleeveCompileResultForSemanticComparison(sleeveResultA)) ===
    JSON.stringify(normalizeSleeveCompileResultForSemanticComparison(sleeveResultB))
);
assert("merge trace is optional for non-merge sample", !mergeLike);
assert("priority trace is optional for non-conflict sample", !priorityLike);

const ir = {
  ir_version: "0.1",
  ir_id: "ir.boundary.test",
  source: { sleeve_id: "sleeve.boundary.test" },
  nodes: [
    { node_id: "sleeve.boundary.test", node_type: "sleeve", artifact_ref: "sleeve.boundary.test" },
    { node_id: "stack.1", node_type: "neostack", artifact_ref: "stack.1" },
    { node_id: "block.1", node_type: "neoblock", artifact_ref: "block.1" },
  ],
  edges: [],
  diagnostics: [],
};

const irResult = compileIr(ir as any);
const irResultRepeat = compileIr(ir as any);
assert("compileIr succeeds without diagnostics errors", (irResult.diagnostics.errors?.length ?? 0) === 0);
assert("IR runtimeSpec state marks non-executing artifact", irResult.runtimeSpec.state?.non_executing === true);
assert(
  "IR runtimeSpec boundary note explicit",
  irResult.runtimeSpec.state?.boundary_note ===
    "RuntimeSpec is a non-executing compiler artifact and does not grant permission or perform execution."
);
const traceEmitted = irResult.trace.events.find((evt) => evt.event_type === "trace.emitted");
assert(
  "IR trace event states audit/provenance boundary",
  traceEmitted?.reason === "Emitted deterministic compiler trace as audit/provenance artifact; not permission and not execution."
);
assert(
  "IR compile semantic output deterministic via normalization helper",
  JSON.stringify(normalizeIrCompileResultForSemanticComparison(irResult)) ===
    JSON.stringify(normalizeIrCompileResultForSemanticComparison(irResultRepeat))
);

console.log(`\n=== All Tests Complete: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
}
