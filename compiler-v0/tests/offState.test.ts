import { compileSleeve, type Sleeve, type TriggerState } from "../src/index.js";

const triggerState: TriggerState = { activeTriggerIds: ["trigger-on"] };

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

console.log("=== Off State Alignment Tests ===\n");

const sleeve: Sleeve = {
  id: "off-state-test-sleeve",
  name: "Off State Test Sleeve",
  blocks: [
    {
      id: "blk_primary_live",
      moltType: "primary",
      role: "primary_shell",
      content: "Active primary shell",
    },
    {
      id: "blk_directive_off",
      moltType: "directive",
      role: "off",
      content: "Off directive should not participate",
    },
    {
      id: "blk_trigger_live",
      moltType: "trigger",
      content: "Live trigger block",
    },
  ],
  stacks: [
    {
      id: "stack-1",
      name: "Off State Test Stack",
      blockIds: ["blk_primary_live", "blk_directive_off", "blk_trigger_live"],
    },
  ],
  triggers: [
    {
      id: "trigger-on",
      name: "Trigger On",
    },
  ],
  governance: [
    {
      id: "gov-off-test",
      scope: { type: "sleeve" },
      rules: [
        {
          id: "rule-boost-off-block",
          name: "Try to boost off block",
          condition: { triggerIdsAny: ["trigger-on"] },
          target: { blockIds: ["blk_directive_off"] },
          effect: { type: "override_priority", severity: "hard", setTo: 999 },
        },
      ],
    },
  ],
};

const result = compileSleeve(sleeve, triggerState);
const offTrace = result.trace.events.find((evt) => evt.code === "INFO_BLOCK_EXCLUDED_OFF_STATE");
const runtime = result.runtime;
const stack = runtime?.stacks.find((st) => st.stackId === "stack-1");
const neoBlock = runtime?.neoBlocks.find((nb) => nb.stackId === "stack-1");

assert("compile succeeds", !result.hasErrors);
assert("off block exclusion is traced", !!offTrace);
assert(
  "off block trace message deterministic",
  offTrace?.message ===
    "Block blk_directive_off excluded from active participation because role=off (legacy provisional Off-state representation)."
);
assert("off block trace references block id", offTrace?.relatedBlockIds?.[0] === "blk_directive_off");
assert("off block excluded from ordered runtime stack", !stack?.orderedBlockIds.includes("blk_directive_off"));
assert("off block excluded from blocksByMoltType directive list", !runtime?.blocksByMoltType.directive.includes("blk_directive_off"));
assert("off block excluded from active directives", !neoBlock?.active.directiveIds.includes("blk_directive_off"));
assert("trigger state does not revive off block", !stack?.orderedBlockIds.includes("blk_directive_off"));

console.log(`\n=== All Tests Complete: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
}
