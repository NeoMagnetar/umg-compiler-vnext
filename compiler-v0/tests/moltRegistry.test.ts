import { compileSleeve, type Sleeve, type TriggerState, type Block } from "../src/index.js";

const triggerState: TriggerState = { activeTriggerIds: [] };

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

function makeSleeveWithSingleBlock(block: Partial<Block> & Pick<Block, "id" | "content">): Sleeve {
  return {
    id: "registry-test-sleeve",
    name: "Registry Test Sleeve",
    blocks: [block as Block],
    stacks: [
      {
        id: "stack-1",
        name: "Registry Test Stack",
        blockIds: [block.id],
      },
    ],
  };
}

function compileSingle(moltType: string) {
  const sleeve = makeSleeveWithSingleBlock({
    id: `blk-${moltType}`,
    moltType: moltType as Block["moltType"],
    content: `Content for ${moltType}`,
  });
  return compileSleeve(sleeve, triggerState);
}

console.log("=== MOLT Registry Alignment Tests ===\n");

const validMoltTypes = [
  "trigger",
  "directive",
  "instruction",
  "subject",
  "primary",
  "philosophy",
  "blueprint",
] as const;

console.log("Valid v0 MOLT types are accepted by registry validation");
for (const moltType of validMoltTypes) {
  const result = compileSingle(moltType);
  const unknownTypeError = result.trace.events.find(
    (evt) => evt.severity === "error" && evt.code === "ERR_UNKNOWN_MOLT_TYPE"
  );
  assert(`${moltType} not rejected as unknown moltType`, !unknownTypeError);
}

function assertDeterministicUnknownType(moltType: string) {
  const result = compileSingle(moltType);
  const firstError = result.trace.events.find((evt) => evt.severity === "error");
  assert(`${moltType} rejected`, result.hasErrors);
  assert(`${moltType} emits ERR_UNKNOWN_MOLT_TYPE`, firstError?.code === "ERR_UNKNOWN_MOLT_TYPE");
  assert(
    `${moltType} rejection message deterministic`,
    firstError?.message === `Unknown moltType: ${moltType} on block blk-${moltType}`
  );
}

console.log("\nInvalid Merge-as-MOLT values are rejected");
assertDeterministicUnknownType("merge");
assertDeterministicUnknownType("Merge");

console.log("\nInvalid Off-as-MOLT values are rejected");
assertDeterministicUnknownType("off");
assertDeterministicUnknownType("Off");

console.log("\nInvalid unknown MOLT values are rejected");
assertDeterministicUnknownType("unknown");
assertDeterministicUnknownType("Directive");

console.log(`\n=== All Tests Complete: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
}
