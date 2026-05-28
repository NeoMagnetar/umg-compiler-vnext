import { compileSleeve, type Sleeve, type TriggerState, type Block, type PriorityGroup } from "../src/index.js";
import { compareBlocksByPriority, sortByPriorityGroupAndOrder, resolveByPriority } from "../src/priority.js";

function makeBlock(
  id: string,
  moltType: Block["moltType"],
  priorityGroup?: PriorityGroup,
  priorityOrder?: number
): Block {
  return {
    id,
    moltType,
    content: `Content for ${id}`,
    priorityGroup,
    priorityOrder,
  };
}

function makeSleeve(blocks: Block[], stackBlockIds: string[], segments?: any[]): Sleeve {
  return {
    id: "test-sleeve",
    name: "Test Sleeve",
    blocks,
    stacks: [
      {
        id: "stack-1",
        name: "Test Stack",
        blockIds: stackBlockIds,
        segments,
      },
    ],
  };
}

const triggerState: TriggerState = { activeTriggerIds: [] };
const noTrace = (_evt: any) => {};

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

console.log("=== Priority Resolution Tests ===\n");

// ─────────────────────────────────────────────────────────────────────────────
// Existing tests — updated for higher-number-wins semantics
// ─────────────────────────────────────────────────────────────────────────────

console.log("Test 1: Non-breaking - single primary (no collision)");
{
  const sleeve = makeSleeve(
    [makeBlock("p1", "primary")],
    ["p1"]
  );
  const result = compileSleeve(sleeve, triggerState);
  assert("no errors", !result.hasErrors);
  assert("p1 selected", result.runtime?.primaryByStackId?.["stack-1"] === "p1");
}

console.log("\nTest 2: Group resolution - Override beats Explicit");
{
  const sleeve = makeSleeve(
    [
      makeBlock("p1", "primary", "Explicit", 1),
      makeBlock("p2", "primary", "Override", 1),
    ],
    ["p1", "p2"],
    [{
      id: "bundle-1",
      kind: "bundle",
      stackId: "stack-1",
      blockIds: ["p1", "p2"],
      intent: "alternates",
    }]
  );
  const result = compileSleeve(sleeve, triggerState);
  assert("no errors", !result.hasErrors);
  assert("Override group wins (p2)", result.runtime?.primaryByStackId?.["stack-1"] === "p2");
}

console.log("\nTest 3: Order resolution - higher priorityOrder wins within same group");
{
  const sleeve = makeSleeve(
    [
      makeBlock("p1", "primary", "Explicit", 2),
      makeBlock("p2", "primary", "Explicit", 1),
      makeBlock("p3", "primary", "Explicit", 3),
    ],
    ["p1", "p2", "p3"],
    [{
      id: "bundle-1",
      kind: "bundle",
      stackId: "stack-1",
      blockIds: ["p1", "p2", "p3"],
      intent: "alternates",
    }]
  );
  const result = compileSleeve(sleeve, triggerState);
  assert("no errors", !result.hasErrors);
  assert("highest order (p3=3) wins", result.runtime?.primaryByStackId?.["stack-1"] === "p3");
}

console.log("\nTest 4: Same group, no priorityOrder → deterministic id tie-break");
{
  const sleeve = makeSleeve(
    [
      makeBlock("p1", "primary", "Default"),
      makeBlock("p2", "primary", "Default"),
    ],
    ["p1", "p2"],
    [{
      id: "bundle-1",
      kind: "bundle",
      stackId: "stack-1",
      blockIds: ["p1", "p2"],
      intent: "alternates",
    }]
  );
  const result = compileSleeve(sleeve, triggerState);
  assert("no errors", !result.hasErrors);
  assert("alphabetically first id wins (p1)", result.runtime?.primaryByStackId?.["stack-1"] === "p1");
}

console.log("\nTest 5: ID tie-break - same group + same order → alphabetical id wins");
{
  const sleeve = makeSleeve(
    [
      makeBlock("p_charlie", "primary", "Explicit", 1),
      makeBlock("p_alpha", "primary", "Explicit", 1),
      makeBlock("p_bravo", "primary", "Explicit", 1),
    ],
    ["p_charlie", "p_alpha", "p_bravo"],
    [{
      id: "bundle-1",
      kind: "bundle",
      stackId: "stack-1",
      blockIds: ["p_charlie", "p_alpha", "p_bravo"],
      intent: "alternates",
    }]
  );
  const result = compileSleeve(sleeve, triggerState);
  assert("no errors", !result.hasErrors);
  assert("p_alpha wins (alphabetically first)", result.runtime?.primaryByStackId?.["stack-1"] === "p_alpha");
}

console.log("\nTest 6: Default group (missing priorityGroup) → treated as Default, beats Fallback");
{
  const sleeve = makeSleeve(
    [
      makeBlock("p1", "primary", undefined, 1),
      makeBlock("p2", "primary", "Fallback", 1),
    ],
    ["p1", "p2"],
    [{
      id: "bundle-1",
      kind: "bundle",
      stackId: "stack-1",
      blockIds: ["p1", "p2"],
      intent: "alternates",
    }]
  );
  const result = compileSleeve(sleeve, triggerState);
  assert("no errors", !result.hasErrors);
  assert("Default group beats Fallback (p1)", result.runtime?.primaryByStackId?.["stack-1"] === "p1");
}

console.log("\nTest 7: Directive alternates bundle - higher priorityOrder wins");
{
  const sleeve = makeSleeve(
    [
      makeBlock("p1", "primary"),
      makeBlock("d1", "directive", "Explicit", 2),
      makeBlock("d2", "directive", "Explicit", 1),
    ],
    ["p1", "d1", "d2"],
    [{
      id: "bundle-1",
      kind: "bundle",
      stackId: "stack-1",
      blockIds: ["d1", "d2"],
      intent: "alternates",
    }]
  );
  const result = compileSleeve(sleeve, triggerState);
  const neoBlock = result.runtime?.neoBlocks.find(nb => nb.stackId === "stack-1");
  const activeDirectives = neoBlock?.active.directiveIds;
  assert("no errors", !result.hasErrors);
  assert("d1 wins (order=2 > order=1)", activeDirectives?.length === 1 && activeDirectives[0] === "d1");
}

// ─────────────────────────────────────────────────────────────────────────────
// New tests required by pass-1 spec (Tests A–E)
// ─────────────────────────────────────────────────────────────────────────────

console.log("\nTest A: Higher numeric order wins (100 beats 10)");
{
  const blockA = makeBlock("block-a", "primary", "Explicit", 10);
  const blockB = makeBlock("block-b", "primary", "Explicit", 100);
  const cmp = compareBlocksByPriority(blockA, blockB);
  assert("B (order=100) beats A (order=10): comparator returns positive", cmp > 0);

  const sleeve = makeSleeve(
    [blockA, blockB],
    ["block-a", "block-b"],
    [{
      id: "bundle-1",
      kind: "bundle",
      stackId: "stack-1",
      blockIds: ["block-a", "block-b"],
      intent: "alternates",
    }]
  );
  const result = compileSleeve(sleeve, triggerState);
  assert("no errors", !result.hasErrors);
  assert("block-b (order=100) selected as primary", result.runtime?.primaryByStackId?.["stack-1"] === "block-b");
}

console.log("\nTest B: Explicit numeric priority beats undefined");
{
  const blockA = makeBlock("block-a", "primary", "Explicit", undefined);
  const blockB = makeBlock("block-b", "primary", "Explicit", 1);
  const cmp = compareBlocksByPriority(blockA, blockB);
  assert("B (order=1) beats A (order=undefined): comparator returns positive", cmp > 0);

  const sleeve = makeSleeve(
    [blockA, blockB],
    ["block-a", "block-b"],
    [{
      id: "bundle-1",
      kind: "bundle",
      stackId: "stack-1",
      blockIds: ["block-a", "block-b"],
      intent: "alternates",
    }]
  );
  const result = compileSleeve(sleeve, triggerState);
  assert("no errors", !result.hasErrors);
  assert("block-b (defined order) beats block-a (undefined)", result.runtime?.primaryByStackId?.["stack-1"] === "block-b");
}

console.log("\nTest C: Group precedence dominates over numeric order");
{
  const blockWeak = makeBlock("block-weak", "primary", "Fallback", 999);
  const blockStrong = makeBlock("block-strong", "primary", "Override", 1);
  const cmp = compareBlocksByPriority(blockWeak, blockStrong);
  assert("Override (order=1) beats Fallback (order=999): comparator returns positive", cmp > 0);

  const sleeve = makeSleeve(
    [blockWeak, blockStrong],
    ["block-weak", "block-strong"],
    [{
      id: "bundle-1",
      kind: "bundle",
      stackId: "stack-1",
      blockIds: ["block-weak", "block-strong"],
      intent: "alternates",
    }]
  );
  const result = compileSleeve(sleeve, triggerState);
  assert("no errors", !result.hasErrors);
  assert("Override group wins despite lower numeric order", result.runtime?.primaryByStackId?.["stack-1"] === "block-strong");
}

console.log("\nTest D: Override changes winner");
{
  const blockA = makeBlock("block-a", "primary", "Explicit", 100);
  const blockB = makeBlock("block-b", "primary", "Explicit", 10);

  // Without override, A wins (order=100 > order=10)
  const cmpNoOverride = compareBlocksByPriority(blockA, blockB);
  assert("Without override: A (order=100) beats B (order=10)", cmpNoOverride < 0);

  // With override boosting B to 200, B should win
  const overrides = new Map<string, number>([["block-b", 200]]);
  const cmpWithOverride = compareBlocksByPriority(blockA, blockB, overrides);
  assert("With override (B→200): B beats A", cmpWithOverride > 0);

  // Verify through full compile using governance override_priority effect
  const sleeve: Sleeve = {
    id: "test-sleeve",
    name: "Test Sleeve",
    blocks: [blockA, blockB],
    stacks: [{
      id: "stack-1",
      name: "Test Stack",
      blockIds: ["block-a", "block-b"],
      segments: [{
        id: "bundle-1",
        kind: "bundle",
        stackId: "stack-1",
        blockIds: ["block-a", "block-b"],
        intent: "alternates",
      }],
    }],
    governance: [{
      id: "gov-1",
      scope: { type: "sleeve" },
      rules: [{
        id: "rule-boost-b",
        name: "Boost block-b",
        target: { blockIds: ["block-b"] },
        effect: { type: "override_priority", severity: "hard", setTo: 200 },
      }],
    }],
  };
  const result = compileSleeve(sleeve, triggerState);
  assert("no errors", !result.hasErrors);
  assert("block-b wins after governance override boosts its priority to 200", result.runtime?.primaryByStackId?.["stack-1"] === "block-b");
}

console.log("\nTest E: Alternates and ranked paths agree on strongest candidate");
{
  const blockA = makeBlock("cand-a", "directive", "Explicit", 10);
  const blockB = makeBlock("cand-b", "directive", "Explicit", 100);
  const blocksById = new Map<string, Block>([
    ["cand-a", blockA],
    ["cand-b", blockB],
  ]);

  // Ranked path: sortByPriorityGroupAndOrder puts B first (higher order wins)
  const ranked = sortByPriorityGroupAndOrder(["cand-a", "cand-b"], blocksById);
  assert("Ranked path: cand-b first (order=100)", ranked[0] === "cand-b");

  // Alternates path: resolveByPriority picks B
  let resolvedWinner: string | undefined;
  resolveByPriority([blockA, blockB], { moltType: "directive", reason: "test" }, (evt) => {
    if (evt.priorityWinnerId) resolvedWinner = evt.priorityWinnerId;
  });
  assert("Alternates path: cand-b wins (order=100)", resolvedWinner === "cand-b");

  assert("Ranked and alternates agree: both pick cand-b", ranked[0] === resolvedWinner);

  // Verify through full compile (alternates bundle)
  const sleeve = makeSleeve(
    [makeBlock("p1", "primary"), blockA, blockB],
    ["p1", "cand-a", "cand-b"],
    [{
      id: "bundle-dir",
      kind: "bundle",
      stackId: "stack-1",
      blockIds: ["cand-a", "cand-b"],
      intent: "alternates",
    }]
  );
  const result = compileSleeve(sleeve, triggerState);
  const neoBlock = result.runtime?.neoBlocks.find(nb => nb.stackId === "stack-1");
  assert("no errors", !result.hasErrors);
  assert("Alternates compile: cand-b selected as active directive", neoBlock?.active.directiveIds[0] === "cand-b");
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────

console.log("\nTest F: Single candidate is not treated as conflict-site priority resolution");
{
  const blockSolo = makeBlock("solo-directive", "directive", "Default", 1);
  let seenEvent: any;
  const result = resolveByPriority(
    [blockSolo],
    { moltType: "directive", reason: "single candidate check" },
    (evt) => {
      seenEvent = evt;
    }
  );
  assert("single candidate still returns winner", result.winner?.id === "solo-directive");
  assert("single candidate uses INFO_PRIORITY_NOT_NEEDED", seenEvent?.code === "INFO_PRIORITY_NOT_NEEDED");
  assert("single candidate trace is note, not priority_resolution", seenEvent?.kind === "note");
}

console.log("\nTest G: Conflict-site trace records suppressed losers deterministically");
{
  const blockA = makeBlock("cand-a", "directive", "Default", 10);
  const blockB = makeBlock("cand-b", "directive", "Default", 100);
  const blockC = makeBlock("cand-c", "directive", "Default", 50);
  let seenEvent: any;
  const result = resolveByPriority(
    [blockA, blockB, blockC],
    { moltType: "directive", stackId: "stack-1", reason: "conflict-site trace check" },
    (evt) => {
      seenEvent = evt;
    }
  );
  assert("highest-priority candidate wins", result.winner?.id === "cand-b");
  assert("conflict-site event kind remains priority_resolution", seenEvent?.kind === "priority_resolution");
  assert(
    "loser list is deterministic in message",
    seenEvent?.message === "Priority conflict resolved: cand-b selected; suppressed [cand-c, cand-a].\nContext: conflict-site trace check"
  );
}

console.log(`\n=== All Tests Complete: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
}
