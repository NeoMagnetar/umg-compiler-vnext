import { parseSleeve, getBlocksById } from "./sleeveEdit";

export interface ApplyOpsReport {
  bundlesApplied: number;
  mergesApplied: number;
  blocksCreated: number;
  blocksRemovedFromStacks: number;
  errors: string[];
}

interface Op {
  id: string;
  name?: string;
  stackId: string;
  lane: string;
  blockIds: string[];
}

function generateDerivedId(type: "bund" | "merg"): string {
  return `${type}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function applyOpsToSleeveJson(json: string): { nextJson?: string; error?: string; report?: ApplyOpsReport } {
  const { sleeve, error } = parseSleeve(json);
  if (error || !sleeve) {
    return { error: error ?? "Failed to parse sleeve" };
  }

  const report: ApplyOpsReport = {
    bundlesApplied: 0,
    mergesApplied: 0,
    blocksCreated: 0,
    blocksRemovedFromStacks: 0,
    errors: []
  };

  const ops = sleeve.ui?.ops;
  if (!ops) {
    return { nextJson: json, report };
  }

  const bundles: Op[] = ops.bundles ?? [];
  const merges: Op[] = ops.merges ?? [];

  if (bundles.length === 0 && merges.length === 0) {
    return { nextJson: json, report };
  }

  sleeve.ui = sleeve.ui ?? {};
  sleeve.ui.derived = sleeve.ui.derived ?? { map: {} };

  const blocksById = getBlocksById(json);

  const processOp = (op: Op, opType: "bundle" | "merge"): { newBlockId: string; sourceBlockIds: string[] } | null => {
    if (op.blockIds.length < 2) {
      report.errors.push(`${opType} ${op.id}: requires at least 2 blocks`);
      return null;
    }

    const stack = sleeve.stacks?.find((s: any) => s.id === op.stackId);
    if (!stack) {
      report.errors.push(`${opType} ${op.id}: stack ${op.stackId} not found`);
      return null;
    }

    const sourceBlocks = op.blockIds
      .map(id => blocksById[id])
      .filter(Boolean);

    if (sourceBlocks.length !== op.blockIds.length) {
      const missing = op.blockIds.filter(id => !blocksById[id]);
      report.errors.push(`${opType} ${op.id}: missing blocks ${missing.join(", ")}`);
      return null;
    }

    for (const block of sourceBlocks) {
      if (block.moltType !== op.lane) {
        report.errors.push(`${opType} ${op.id}: block ${block.id} has moltType ${block.moltType}, expected ${op.lane}`);
        return null;
      }
    }

    const newId = generateDerivedId(opType === "bundle" ? "bund" : "merg");
    const label = op.name || `${sourceBlocks.length} blocks`;
    const title = opType === "bundle" ? `Bundle: ${label}` : `Merge: ${label}`;
    
    const combinedContent = sourceBlocks
      .map((b: any) => b.content || "")
      .filter((c: string) => c.length > 0)
      .join("\n\n---\n\n");

    const allTags = new Set<string>();
    for (const block of sourceBlocks) {
      if (Array.isArray(block.tags)) {
        block.tags.forEach((t: string) => allTags.add(t));
      }
    }
    allTags.add(opType === "bundle" ? "bundled" : "merged");

    const avgPriority = Math.round(
      sourceBlocks.reduce((sum: number, b: any) => sum + (b.priorityOrder ?? 10), 0) / sourceBlocks.length
    );

    const newBlock = {
      id: newId,
      title,
      moltType: op.lane,
      priorityOrder: avgPriority,
      content: combinedContent,
      tags: Array.from(allTags)
    };

    if (!Array.isArray(sleeve.blocks)) {
      sleeve.blocks = [];
    }
    sleeve.blocks.push(newBlock);

    sleeve.ui.derived.map[newId] = {
      opId: op.id,
      opType,
      sourceBlockIds: [...op.blockIds]
    };

    if (Array.isArray(stack.blockIds)) {
      const firstIndex = Math.min(
        ...op.blockIds.map((id: string) => {
          const idx = stack.blockIds.indexOf(id);
          return idx >= 0 ? idx : Infinity;
        })
      );

      stack.blockIds = stack.blockIds.filter((id: string) => !op.blockIds.includes(id));
      
      if (firstIndex !== Infinity && firstIndex <= stack.blockIds.length) {
        stack.blockIds.splice(firstIndex, 0, newId);
      } else {
        stack.blockIds.push(newId);
      }

      report.blocksRemovedFromStacks += op.blockIds.length;
    }

    report.blocksCreated++;
    return { newBlockId: newId, sourceBlockIds: op.blockIds };
  };

  for (const bundle of bundles) {
    const result = processOp(bundle, "bundle");
    if (result) {
      report.bundlesApplied++;
    }
  }

  for (const merge of merges) {
    const result = processOp(merge, "merge");
    if (result) {
      report.mergesApplied++;
    }
  }

  try {
    const nextJson = JSON.stringify(sleeve, null, 2);
    return { nextJson, report };
  } catch (e: any) {
    return { error: e.message ?? "Failed to serialize derived sleeve" };
  }
}

export function hasOps(json: string): boolean {
  try {
    const sleeve = JSON.parse(json);
    const ops = sleeve?.ui?.ops;
    if (!ops) return false;
    const bundles = ops.bundles ?? [];
    const merges = ops.merges ?? [];
    return bundles.length > 0 || merges.length > 0;
  } catch {
    return false;
  }
}

export function getOpsCount(json: string): { bundles: number; merges: number } {
  try {
    const sleeve = JSON.parse(json);
    const ops = sleeve?.ui?.ops;
    if (!ops) return { bundles: 0, merges: 0 };
    return {
      bundles: (ops.bundles ?? []).length,
      merges: (ops.merges ?? []).length
    };
  } catch {
    return { bundles: 0, merges: 0 };
  }
}
