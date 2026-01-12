import { compileSleeve, type Sleeve, type TriggerState, type Block, type PriorityGroup } from "../src/index.js";

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

console.log("=== Priority Resolution Tests ===\n");

console.log("Test 1: Non-breaking - single primary (no collision)");
{
  const sleeve = makeSleeve(
    [makeBlock("p1", "primary")],
    ["p1"]
  );
  const result = compileSleeve(sleeve, triggerState);
  console.log("  hasErrors:", result.hasErrors);
  console.log("  primary selected:", result.runtime?.primaryByStackId?.["stack-1"]);
  console.log("  PASS:", !result.hasErrors && result.runtime?.primaryByStackId?.["stack-1"] === "p1" ? "✓" : "✗");
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
  console.log("  hasErrors:", result.hasErrors);
  console.log("  primary selected:", result.runtime?.primaryByStackId?.["stack-1"]);
  console.log("  PASS:", !result.hasErrors && result.runtime?.primaryByStackId?.["stack-1"] === "p2" ? "✓" : "✗");
}

console.log("\nTest 3: Order resolution - lower priorityOrder wins within same group");
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
  console.log("  hasErrors:", result.hasErrors);
  console.log("  primary selected:", result.runtime?.primaryByStackId?.["stack-1"]);
  console.log("  PASS:", !result.hasErrors && result.runtime?.primaryByStackId?.["stack-1"] === "p2" ? "✓" : "✗");
}

console.log("\nTest 4: Ambiguous priority - same group, no priorityOrder → FAIL");
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
  const hasAmbiguousError = result.trace.events.some(e => e.code === "ERR_PRIORITY_AMBIGUOUS");
  console.log("  hasErrors:", result.hasErrors);
  console.log("  hasAmbiguousError:", hasAmbiguousError);
  console.log("  PASS:", result.hasErrors && hasAmbiguousError ? "✓" : "✗");
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
  console.log("  hasErrors:", result.hasErrors);
  console.log("  primary selected:", result.runtime?.primaryByStackId?.["stack-1"]);
  console.log("  PASS:", !result.hasErrors && result.runtime?.primaryByStackId?.["stack-1"] === "p_alpha" ? "✓" : "✗");
}

console.log("\nTest 6: Default group (missing priorityGroup) → treated as Default");
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
  console.log("  hasErrors:", result.hasErrors);
  console.log("  primary selected:", result.runtime?.primaryByStackId?.["stack-1"]);
  console.log("  PASS:", !result.hasErrors && result.runtime?.primaryByStackId?.["stack-1"] === "p1" ? "✓" : "✗");
}

console.log("\nTest 7: Directive alternates bundle - priority resolution");
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
  console.log("  hasErrors:", result.hasErrors);
  console.log("  activeDirectives:", activeDirectives);
  console.log("  PASS:", !result.hasErrors && activeDirectives?.length === 1 && activeDirectives[0] === "d2" ? "✓" : "✗");
}

console.log("\n=== All Tests Complete ===");
