import { compileSleeve, type Sleeve, type TriggerState } from "../src/index.js";

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

console.log("=== Merge Action Alignment Tests ===\n");

const sameTypeSleeve: Sleeve = {
  id: "merge-same-type-sleeve",
  blocks: [
    { id: "blk_instr_1", moltType: "instruction", content: "First instruction." },
    { id: "blk_instr_2", moltType: "instruction", content: "Second instruction." },
    { id: "blk_instr_merged", moltType: "instruction", content: "Merged instruction." },
    { id: "blk_primary", moltType: "primary", content: "Primary." },
  ],
  stacks: [
    {
      id: "stack-1",
      blockIds: ["blk_instr_1", "blk_instr_2", "blk_primary"],
      segments: [
        {
          id: "seg_merge_instr",
          kind: "merge",
          stackId: "stack-1",
          blockIds: ["blk_instr_1", "blk_instr_2"],
          resultBlockId: "blk_instr_merged",
        },
      ],
    },
  ],
};

const sameTypeResult = compileSleeve(sameTypeSleeve, triggerState);
const sameTypeMergeTrace = sameTypeResult.trace.events.find((evt) => evt.code === "INFO_MERGE_APPLIED");
assert("same-type merge compiles", !sameTypeResult.hasErrors);
assert("same-type merge trace exists", !!sameTypeMergeTrace);
assert(
  "same-type merge trace includes resultMoltType",
  sameTypeMergeTrace?.message ===
    "Merge seg_merge_instr: replaced [blk_instr_1, blk_instr_2] with blk_instr_merged (resultMoltType=instruction) in stack stack-1. SourceMoltTypes=[instruction]."
);

const crossTypeSleeve: Sleeve = {
  id: "merge-cross-type-sleeve",
  blocks: [
    { id: "blk_instruction", moltType: "instruction", content: "Instruction." },
    { id: "blk_subject", moltType: "subject", content: "Subject." },
    { id: "blk_merged_instruction", moltType: "instruction", content: "Merged output." },
    { id: "blk_primary", moltType: "primary", content: "Primary." },
  ],
  stacks: [
    {
      id: "stack-1",
      blockIds: ["blk_instruction", "blk_subject", "blk_primary"],
      segments: [
        {
          id: "seg_cross_merge",
          kind: "merge",
          stackId: "stack-1",
          blockIds: ["blk_instruction", "blk_subject"],
          resultBlockId: "blk_merged_instruction",
          resultMoltType: "instruction",
        },
      ],
    },
  ],
};

const crossTypeResult = compileSleeve(crossTypeSleeve, triggerState);
const crossTypeError = crossTypeResult.trace.events.find((evt) => evt.code === "ERR_MERGE_CROSS_MOLT_FORBIDDEN");
assert("cross-type merge rejected by default", crossTypeResult.hasErrors);
assert("cross-type merge emits deterministic error code", crossTypeError?.code === "ERR_MERGE_CROSS_MOLT_FORBIDDEN");
assert(
  "cross-type merge deterministic message",
  crossTypeError?.message ===
    "Cross-MOLT merge seg_cross_merge is not allowed in v0 without override.allowAdvanced=true."
);

const badResultTypeSleeve: Sleeve = {
  id: "merge-bad-result-type-sleeve",
  blocks: [
    { id: "blk_instr_1", moltType: "instruction", content: "Instruction 1." },
    { id: "blk_instr_2", moltType: "instruction", content: "Instruction 2." },
    { id: "blk_merged_subject", moltType: "subject", content: "Wrongly typed result." },
    { id: "blk_primary", moltType: "primary", content: "Primary." },
  ],
  stacks: [
    {
      id: "stack-1",
      blockIds: ["blk_instr_1", "blk_instr_2", "blk_primary"],
      segments: [
        {
          id: "seg_bad_result_type",
          kind: "merge",
          stackId: "stack-1",
          blockIds: ["blk_instr_1", "blk_instr_2"],
          resultBlockId: "blk_merged_subject",
          resultMoltType: "instruction",
        },
      ],
    },
  ],
};

const badResultTypeResult = compileSleeve(badResultTypeSleeve, triggerState);
const badResultTypeError = badResultTypeResult.trace.events.find((evt) => evt.code === "ERR_MERGE_RESULT_MOLT_TYPE_MISMATCH");
assert("mismatched merge result type rejected", badResultTypeResult.hasErrors);
assert("mismatched merge result type error emitted", badResultTypeError?.code === "ERR_MERGE_RESULT_MOLT_TYPE_MISMATCH");

console.log(`\n=== All Tests Complete: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
}
