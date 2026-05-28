import { compileSleeve, type Sleeve, type TriggerState } from "../src/index.js";

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

console.log("=== Governance / Trigger Alignment Tests ===\n");

const governedSleeve: Sleeve = {
  id: "governance-trigger-test-sleeve",
  name: "Governance Trigger Test Sleeve",
  blocks: [
    { id: "blk_primary", moltType: "primary", role: "primary_shell", content: "Primary." },
    { id: "blk_instr_allowed", moltType: "instruction", priorityGroup: "Default", priorityOrder: 10, content: "Allowed instruction." },
    { id: "blk_instr_forbidden", moltType: "instruction", priorityGroup: "Override", priorityOrder: 999, content: "Forbidden instruction." },
    { id: "blk_instr_triggered", moltType: "instruction", priorityGroup: "Default", priorityOrder: 1, content: "Triggered instruction." },
    { id: "blk_instr_off", moltType: "instruction", role: "off", priorityGroup: "Override", priorityOrder: 1000, content: "Off instruction." },
  ],
  stacks: [
    {
      id: "stack-1",
      name: "Main Stack",
      blockIds: ["blk_primary", "blk_instr_allowed", "blk_instr_forbidden", "blk_instr_triggered", "blk_instr_off"],
      segments: [
        {
          id: "bundle-instructions",
          kind: "bundle",
          stackId: "stack-1",
          blockIds: ["blk_instr_allowed", "blk_instr_forbidden", "blk_instr_triggered", "blk_instr_off"],
          intent: "alternates",
        },
      ],
    },
  ],
  triggers: [
    { id: "trigger-on", name: "Trigger On" },
  ],
  governance: [
    {
      id: "gov-main",
      scope: { type: "sleeve" },
      rules: [
        {
          id: "rule-forbid-high-priority",
          name: "Forbid forbidden instruction",
          target: { blockIds: ["blk_instr_forbidden"] },
          effect: { type: "forbid", severity: "hard" },
        },
        {
          id: "rule-triggered-prefer",
          name: "Prefer triggered instruction when gate active",
          condition: { triggerIdsAny: ["trigger-on"] },
          target: { blockIds: ["blk_instr_triggered"] },
          effect: { type: "override_priority", severity: "hard", setTo: 500 },
        },
      ],
    },
  ],
};

const inactiveResult = compileSleeve(governedSleeve, { activeTriggerIds: [] });
const inactiveNeoBlock = inactiveResult.runtime?.neoBlocks.find((nb) => nb.stackId === "stack-1");
const inactiveGovernanceTrace = inactiveResult.trace.events.find((evt) => evt.code === "INFO_BLOCK_EXCLUDED_GOVERNANCE");
const inactiveTriggerSkip = inactiveResult.trace.events.find((evt) => evt.code === "WARN_GOVERNANCE_RULE_SKIPPED");

assert("inactive trigger compile succeeds", !inactiveResult.hasErrors);
assert("governance-forbidden block is traceable", inactiveGovernanceTrace?.message === "Block blk_instr_forbidden excluded from active participation because governance forbids it.");
assert("governance-forbidden block is not revived by higher priority", !inactiveNeoBlock?.active.instructionIds.includes("blk_instr_forbidden"));
assert("inactive trigger skips gated governance rule deterministically", inactiveTriggerSkip?.message === "Rule rule-triggered-prefer skipped: trigger condition not met.");
assert("inactive trigger skip carries no unrelated trigger authority", Array.isArray(inactiveTriggerSkip?.relatedTriggerIds) && inactiveTriggerSkip?.relatedTriggerIds?.length === 0);
assert("off block is still not revived", !inactiveNeoBlock?.active.instructionIds.includes("blk_instr_off"));
assert("inactive trigger does not enable triggered candidate", inactiveNeoBlock?.active.instructionIds[0] === "blk_instr_allowed");

const activeResult = compileSleeve(governedSleeve, { activeTriggerIds: ["trigger-on"] });
const activeNeoBlock = activeResult.runtime?.neoBlocks.find((nb) => nb.stackId === "stack-1");
const doneEvent = activeResult.trace.events.find((evt) => evt.code === "INFO_DONE");

assert("active trigger compile succeeds", !activeResult.hasErrors);
assert("active trigger enables eligible triggered candidate only", activeNeoBlock?.active.instructionIds[0] === "blk_instr_triggered");
assert("active trigger still cannot revive governance-forbidden block", !activeNeoBlock?.active.instructionIds.includes("blk_instr_forbidden"));
assert("active trigger still cannot revive off block", !activeNeoBlock?.active.instructionIds.includes("blk_instr_off"));
assert("active trigger count is traceable at compile completion", doneEvent?.relatedTriggerIds?.length === 1 && doneEvent?.relatedTriggerIds?.[0] === "trigger-on");

console.log(`\n=== All Tests Complete: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
}
