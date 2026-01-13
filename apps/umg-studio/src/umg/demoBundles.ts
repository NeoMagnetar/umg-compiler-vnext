import { EXPORT_SCHEMA, EXPORT_VERSION, type UMGExportBundleV1 } from "./exportSchema";

const now = Date.now();

export const DEMO_A: UMGExportBundleV1 = {
  schema: EXPORT_SCHEMA,
  version: EXPORT_VERSION,
  exportedAt: new Date().toISOString(),
  data: {
    blocks: [
      { id: "blk-trigger", role: "TRIGGER", title: "User Intent Detected", content: "When user expresses a goal or task", tags: ["intent", "activation"], priorityOrder: 10, createdAt: now - 7000 },
      { id: "blk-directive", role: "DIRECTIVE", title: "Safety Constraints", content: "Must not produce harmful content", tags: ["safety"], priorityOrder: 10, createdAt: now - 6000 },
      { id: "blk-instruction", role: "INSTRUCTION", title: "Step-by-Step Guide", content: "Break task into subtasks, validate each", tags: ["process"], priorityOrder: 10, createdAt: now - 5000 },
      { id: "blk-subject", role: "SUBJECT", title: "Domain: Writing", content: "Focus on creative writing assistance", tags: ["writing", "creative"], priorityOrder: 10, createdAt: now - 4000 },
      { id: "blk-primary", role: "PRIMARY", title: "Core Logic Engine", content: "Use chain-of-thought reasoning", tags: ["reasoning"], priorityOrder: 10, createdAt: now - 3000 },
      { id: "blk-philosophy", role: "PHILOSOPHY", title: "Helpful & Honest", content: "Prioritize user benefit over engagement", tags: ["ethics"], priorityOrder: 10, createdAt: now - 2000 },
      { id: "blk-blueprint", role: "BLUEPRINT", title: "Response Schema v1", content: "JSON output with reasoning trace", tags: ["schema", "output"], priorityOrder: 10, createdAt: now - 1000 },
    ],
    neoBlocks: [],
    neoStacks: [],
    sleeve: null,
    preview: { semanticOverlap: 0.5, governancePriority: 0.5 },
    lastComposeMode: null,
    selectedBlockId: null,
    selectedNeoBlockIds: [],
    expandedNeoBlockIds: {},
    runtimeSpec: null,
    trace: null,
    tutorialStep: "READY_TO_COMPRESS",
  },
};

const snapshot = {
  TRIGGER: { title: "User Intent Detected", content: "When user expresses a goal or task" },
  DIRECTIVE: { title: "Safety Constraints", content: "Must not produce harmful content" },
  INSTRUCTION: { title: "Step-by-Step Guide", content: "Break task into subtasks, validate each" },
  SUBJECT: { title: "Domain: Writing", content: "Focus on creative writing assistance" },
  PRIMARY: { title: "Core Logic Engine", content: "Use chain-of-thought reasoning" },
  PHILOSOPHY: { title: "Helpful & Honest", content: "Prioritize user benefit over engagement" },
  BLUEPRINT: { title: "Response Schema v1", content: "JSON output with reasoning trace" },
};

export const DEMO_B: UMGExportBundleV1 = {
  schema: EXPORT_SCHEMA,
  version: EXPORT_VERSION,
  exportedAt: new Date().toISOString(),
  data: {
    blocks: DEMO_A.data.blocks,
    neoBlocks: [
      {
        id: "neo-1",
        sourceBlockIds: DEMO_A.data.blocks.map(b => b.id),
        createdAt: now,
        label: "NeoBlock (Original)",
        snapshot,
      },
      {
        id: "neo-2",
        sourceBlockIds: DEMO_A.data.blocks.map(b => b.id),
        createdAt: now + 1000,
        label: "NeoBlock (Copy)",
        snapshot,
      },
    ],
    neoStacks: [],
    sleeve: null,
    preview: { semanticOverlap: 0.65, governancePriority: 0.7 },
    lastComposeMode: null,
    selectedBlockId: null,
    selectedNeoBlockIds: ["neo-1", "neo-2"],
    expandedNeoBlockIds: {},
    runtimeSpec: null,
    trace: null,
    tutorialStep: "DUPLICATED",
  },
};

export const DEMO_C: UMGExportBundleV1 = {
  schema: EXPORT_SCHEMA,
  version: EXPORT_VERSION,
  exportedAt: new Date().toISOString(),
  data: {
    blocks: DEMO_A.data.blocks,
    neoBlocks: [
      {
        id: "neo-merged",
        sourceBlockIds: DEMO_A.data.blocks.map(b => b.id),
        createdAt: now + 2000,
        label: "NeoBlock (Merged) • ov=0.65 gp=0.70",
        snapshot,
      },
    ],
    neoStacks: [
      {
        id: "ns-demo",
        name: "Decision Control",
        neoBlockIds: ["neo-merged"],
        createdAt: now + 3000,
      },
    ],
    sleeve: {
      id: "sl-demo",
      name: "sleeve_v0",
      neoStackId: "ns-demo",
      createdAt: now + 4000,
    },
    preview: { semanticOverlap: 0.65, governancePriority: 0.7 },
    lastComposeMode: "MERGE",
    selectedBlockId: null,
    selectedNeoBlockIds: ["neo-merged"],
    expandedNeoBlockIds: {},
    runtimeSpec: {
      sleeve: { id: "sl-demo", name: "sleeve_v0", neoStackId: "ns-demo" },
      neoStack: { id: "ns-demo", name: "Decision Control", neoBlockIds: ["neo-merged"] },
      neoBlocks: [
        {
          id: "neo-merged",
          label: "NeoBlock (Merged) • ov=0.65 gp=0.70",
          lineage: DEMO_A.data.blocks.map(b => b.id),
          snapshot,
        },
      ],
    },
    trace: {
      compiledAt: new Date().toISOString(),
      moltBlocks: DEMO_A.data.blocks.map(b => ({
        id: b.id,
        role: b.role,
        title: b.title,
        contentLen: b.content.length,
        createdAt: b.createdAt,
      })),
      sleeve: { id: "sl-demo", name: "sleeve_v0" },
      neoStack: { id: "ns-demo", name: "Decision Control" },
      notes: ["v0 structural compile", "no LLM synthesis", "7-role MOLT stack"],
    },
    tutorialStep: "COMPILED",
  },
};

export const DEMO_LABELS = {
  A: "Spine Complete (ready to compress)",
  B: "Two NeoBlocks (ready to merge/bundle)",
  C: "Full Pipeline (compiled)",
};
