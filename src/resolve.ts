import { MOLT_AUTHORITY_ORDER } from './constants.js';
import { errorDiagnostic } from './errors.js';
import type {
  CompileSelection,
  CompilerDiagnostic,
  GeometryRow,
  MoltBlock,
  MoltType,
  NeoBlock,
  NeoStack,
  PromptPart,
  ResolvedGeometryRow,
  ResolvedLane,
  ResolvedMoltBlock,
  ResolvedNeoBlock,
  RuntimeState,
  ScopeRef,
  Sleeve,
  TraceEvent,
} from './types.js';

interface RuntimeIndexes {
  moltBlocks: Map<string, MoltBlock>;
  neoBlocks: Map<string, NeoBlock>;
  neoStacks: Map<string, NeoStack>;
  stackByNeoBlockId: Map<string, string>;
  parentByStackId: Map<string, string>;
  childrenByStackId: Map<string, string[]>;
}

export interface ResolutionResult {
  activeNeoStackIds: string[];
  resolvedNeoBlocks: ResolvedNeoBlock[];
  promptParts: PromptPart[];
  events: TraceEvent[];
  diagnostics: CompilerDiagnostic[];
  finalNeoStackStates: Record<string, RuntimeState>;
  finalNeoBlockStates: Record<string, RuntimeState>;
}

interface NeoBlockResolutionBase {
  activeTriggerIds: string[];
  matchedSecondaryDirectiveIds: string[];
}

type NeoBlockResolutionOutcome =
  | (NeoBlockResolutionBase & { ok: true; resolved: ResolvedNeoBlock })
  | (NeoBlockResolutionBase & { ok: false });

function buildIndexes(sleeve: Sleeve): RuntimeIndexes {
  const moltBlocks = new Map(sleeve.moltBlocks.map((block) => [block.id, block]));
  const neoBlocks = new Map(sleeve.neoBlocks.map((block) => [block.id, block]));
  const neoStacks = new Map(sleeve.neoStacks.map((stack) => [stack.id, stack]));
  const stackByNeoBlockId = new Map<string, string>();
  const parentByStackId = new Map<string, string>();
  const childrenByStackId = new Map<string, string[]>();

  for (const stack of sleeve.neoStacks) {
    const orderedChildren = (stack.childStackRows ?? [])
      .slice()
      .sort((a, b) => a.row - b.row)
      .flatMap((row) => row.neoStackIds);
    childrenByStackId.set(stack.id, orderedChildren);
    orderedChildren.forEach((childId) => parentByStackId.set(childId, stack.id));

    stack.neoBlockRows
      .slice()
      .sort((a, b) => a.row - b.row)
      .flatMap((row) => row.neoBlockIds)
      .forEach((neoBlockId) => stackByNeoBlockId.set(neoBlockId, stack.id));
  }

  return { moltBlocks, neoBlocks, neoStacks, stackByNeoBlockId, parentByStackId, childrenByStackId };
}

function descendantsOf(stackId: string, indexes: RuntimeIndexes): string[] {
  const result: string[] = [];
  const visit = (id: string): void => {
    for (const child of indexes.childrenByStackId.get(id) ?? []) {
      result.push(child);
      visit(child);
    }
  };
  visit(stackId);
  return result;
}

function neoBlockRowInStack(stack: NeoStack, neoBlockId: string): number | undefined {
  return stack.neoBlockRows.find((row) => row.neoBlockIds.includes(neoBlockId))?.row;
}

function childStackRowInParent(parentStack: NeoStack, childStackId: string): number | undefined {
  return parentStack.childStackRows?.find((row) => row.neoStackIds.includes(childStackId))?.row;
}

function stackTraceData(stackId: string, indexes: RuntimeIndexes): Record<string, unknown> {
  const parentNeoStackId = indexes.parentByStackId.get(stackId);
  const data: Record<string, unknown> = {
    depth: ancestorsRootToLeaf(stackId, indexes).length - 1,
  };
  if (parentNeoStackId) {
    data.parentNeoStackId = parentNeoStackId;
    data.rowInParent = childStackRowInParent(indexes.neoStacks.get(parentNeoStackId)!, stackId);
  }
  return data;
}

function neoBlockTraceData(neoBlockId: string, stackId: string, indexes: RuntimeIndexes): Record<string, unknown> {
  return {
    neoStackId: stackId,
    rowInNeoStack: neoBlockRowInStack(indexes.neoStacks.get(stackId)!, neoBlockId),
  };
}

function ancestorsRootToLeaf(stackId: string, indexes: RuntimeIndexes): string[] {
  const result: string[] = [];
  let current: string | undefined = stackId;
  while (current) {
    result.push(current);
    current = indexes.parentByStackId.get(current);
  }
  return result.reverse();
}

function scopeApplies(scope: ScopeRef, stackId: string, indexes: RuntimeIndexes): boolean {
  if (scope.kind === 'sleeve') return true;
  return ancestorsRootToLeaf(stackId, indexes).includes(scope.neoStackId);
}

function orderedActiveStacks(
  sleeve: Sleeve,
  selected: Set<string>,
  unavailable: Set<string>,
  indexes: RuntimeIndexes,
  diagnostics: CompilerDiagnostic[],
): string[] {
  const ordered: string[] = [];
  const visited = new Set<string>();

  const visit = (stackId: string): void => {
    if (visited.has(stackId)) return;
    visited.add(stackId);
    if (selected.has(stackId) && !unavailable.has(stackId)) ordered.push(stackId);
    for (const child of indexes.childrenByStackId.get(stackId) ?? []) visit(child);
  };
  visit(sleeve.controllerNeoStackId);

  for (const selectedId of selected) {
    if (!visited.has(selectedId) && !unavailable.has(selectedId)) {
      diagnostics.push(
        errorDiagnostic(
          'ACTIVE_NEOSTACK_OUTSIDE_CONTROLLER_TREE',
          `Selected NeoStack ${selectedId} is not reachable from the Controller NeoStack.`,
          'selection.activeNeoStackIds',
        ),
      );
    }
  }

  for (const stackId of ordered) {
    const parent = indexes.parentByStackId.get(stackId);
    if (parent && !selected.has(parent)) {
      diagnostics.push(
        errorDiagnostic(
          'ACTIVE_CHILD_WITHOUT_PARENT',
          `Selected NeoStack ${stackId} requires selected parent ${parent}.`,
          'selection.activeNeoStackIds',
        ),
      );
    }
  }

  return ordered;
}

function localMolt(
  block: MoltBlock,
  mergeByResult: Map<string, string>,
): ResolvedMoltBlock {
  const mergeId = mergeByResult.get(block.id);
  return {
    id: block.id,
    type: block.type,
    content: block.content,
    title: block.title,
    sourceMode: mergeId ? 'merge' : 'local',
    sourceId: mergeId ?? block.id,
    mergeId,
  };
}

function scopedMolt(
  block: MoltBlock,
  attachmentId: string,
  scope: ScopeRef,
  overlayId?: string,
): ResolvedMoltBlock {
  return {
    id: block.id,
    type: block.type,
    content: block.content,
    title: block.title,
    sourceMode: overlayId ? 'overlay' : 'scoped',
    sourceId: attachmentId,
    sourceScope: scope,
    overlayId,
  };
}

function resolveRows(
  rows: GeometryRow[],
  indexes: RuntimeIndexes,
  mergeByResult: Map<string, string>,
): ResolvedGeometryRow[] {
  return rows
    .slice()
    .sort((a, b) => a.row - b.row)
    .map((row) => ({
      row: row.row,
      blocks: row.blockIds.map((id) => localMolt(indexes.moltBlocks.get(id)!, mergeByResult)),
    }));
}

function geometryRowsAsIds(rows: ResolvedGeometryRow[]): string[][] {
  return rows.map((row) => row.blocks.map((block) => block.id));
}

function geometryReadOrder(rows: ResolvedGeometryRow[]): string[] {
  return rows.flatMap((row) => row.blocks.map((block) => block.id));
}

function mergeAuthorityCeilingType(merge: NonNullable<NeoBlock['merges']>[number], indexes: RuntimeIndexes): MoltType | undefined {
  const authorityIndex = new Map<string, number>(MOLT_AUTHORITY_ORDER.map((type, index) => [type, index]));
  const sourceTypes = merge.sourceBlockIds
    .map((sourceId) => indexes.moltBlocks.get(sourceId)?.type)
    .filter((value): value is MoltType => value !== undefined);
  if (sourceTypes.length === 0) return undefined;
  const ceiling = Math.min(...sourceTypes.map((type) => authorityIndex.get(type) ?? Number.MAX_SAFE_INTEGER));
  return MOLT_AUTHORITY_ORDER[ceiling];
}

function emitGeometryResolved(
  neoBlockId: string,
  moltType: MoltType,
  rows: ResolvedGeometryRow[],
  bundleId: string | undefined,
  events: TraceEvent[],
  nextSeq: () => number,
): void {
  events.push({
    seq: nextSeq(),
    type: 'GEOMETRY_RESOLVED',
    subjectId: neoBlockId,
    data: {
      neoBlockId,
      moltType,
      source: bundleId ? 'bundle' : 'base',
      bundleId,
      rows: geometryRowsAsIds(rows),
      readOrder: geometryReadOrder(rows),
    },
  });
}

function scopedForBlock(
  sleeve: Sleeve,
  neoBlockId: string,
  stackId: string,
  activeOverlayIds: Set<string>,
  indexes: RuntimeIndexes,
  events: TraceEvent[],
  nextSeq: () => number,
): Map<MoltType, ResolvedMoltBlock[]> {
  const result = new Map<MoltType, ResolvedMoltBlock[]>();
  const append = (entry: ResolvedMoltBlock): void => {
    const current = result.get(entry.type) ?? [];
    current.push(entry);
    result.set(entry.type, current);
  };

  const attachments = sleeve.scopedMolt ?? [];
  const ancestorOrder = ancestorsRootToLeaf(stackId, indexes);
  const depth = (scope: ScopeRef): number => {
    if (scope.kind === 'sleeve') return 0;
    const index = ancestorOrder.indexOf(scope.neoStackId);
    return index < 0 ? Number.MAX_SAFE_INTEGER : index + 1;
  };

  attachments
    .filter((attachment) => scopeApplies(attachment.scope, stackId, indexes))
    .slice()
    .sort((a, b) => depth(a.scope) - depth(b.scope) || a.id.localeCompare(b.id))
    .forEach((attachment) => {
      const block = indexes.moltBlocks.get(attachment.blockId)!;
      const resolved = scopedMolt(block, attachment.id, attachment.scope);
      append(resolved);
      events.push({
        seq: nextSeq(),
        type: 'SCOPED_MOLT_APPLIED',
        subjectId: block.id,
        data: {
          source: 'scoped',
          attachmentId: attachment.id,
          scope: attachment.scope,
          neoBlockId,
          neoStackId: stackId,
          moltType: block.type,
        },
      });
    });

  for (const overlay of sleeve.overlays ?? []) {
    if (!activeOverlayIds.has(overlay.id)) continue;
    overlay.attachments
      .filter((attachment) => scopeApplies(attachment.scope, stackId, indexes))
      .slice()
      .sort((a, b) => depth(a.scope) - depth(b.scope) || a.id.localeCompare(b.id))
      .forEach((attachment) => {
        const block = indexes.moltBlocks.get(attachment.blockId)!;
        const resolved = scopedMolt(block, attachment.id, attachment.scope, overlay.id);
        append(resolved);
        events.push({
          seq: nextSeq(),
          type: 'OVERLAY_APPLIED',
          subjectId: block.id,
          data: {
            source: 'overlay',
            overlayId: overlay.id,
            attachmentId: attachment.id,
            scope: attachment.scope,
            neoBlockId,
            neoStackId: stackId,
            moltType: block.type,
          },
        });
      });
  }

  return result;
}

function resolveNeoBlock(
  sleeve: Sleeve,
  neoBlock: NeoBlock,
  stackId: string,
  selection: CompileSelection,
  indexes: RuntimeIndexes,
  events: TraceEvent[],
  diagnostics: CompilerDiagnostic[],
  nextSeq: () => number,
): NeoBlockResolutionOutcome {
  const localBlocks = neoBlock.moltBlockIds.map((id) => indexes.moltBlocks.get(id)!).filter(Boolean);
  const triggerBlocks = localBlocks.filter((block) => block.type === 'trigger');
  const activeTriggerIds: string[] = [];

  for (const trigger of triggerBlocks) {
    const active = selection.triggerState[trigger.id] === true;
    if (active) activeTriggerIds.push(trigger.id);
    events.push({
      seq: nextSeq(),
      type: 'TRIGGER_EVALUATED',
      subjectId: trigger.id,
      data: { active, matched: active, neoBlockId: neoBlock.id },
    });
  }

  const matchedSecondaries = (neoBlock.secondaryDirectives ?? []).filter(
    (secondary) => selection.triggerState[secondary.triggerBlockId] === true,
  );
  const matchedSecondaryDirectiveIds = matchedSecondaries.map((secondary) => secondary.id);

  if (activeTriggerIds.length === 0) {
    diagnostics.push(
      errorDiagnostic(
        'NO_TRIGGER_MATCH_FOR_ACTIVE_NEOBLOCK',
        `Active NeoBlock ${neoBlock.id} has no true Trigger state.`,
        `selection.triggerState`,
        { neoBlockId: neoBlock.id, triggerBlockIds: triggerBlocks.map((block) => block.id) },
      ),
    );
    return { ok: false, activeTriggerIds, matchedSecondaryDirectiveIds };
  }
  if (matchedSecondaries.length > 1) {
    diagnostics.push(
      errorDiagnostic(
        'MULTIPLE_SECONDARY_DIRECTIVE_MATCH',
        `NeoBlock ${neoBlock.id} matched more than one Secondary Directive. vNext requires an explicit future coexistence rule.`,
        `neoBlocks.${neoBlock.id}.secondaryDirectives`,
        { secondaryDirectiveIds: matchedSecondaries.map((secondary) => secondary.id) },
      ),
    );
    return { ok: false, activeTriggerIds, matchedSecondaryDirectiveIds };
  }

  const secondary = matchedSecondaries[0];
  events.push({
    seq: nextSeq(),
    type: 'PRIME_DIRECTIVE_APPLIED',
    subjectId: neoBlock.primeDirectiveId,
    data: { neoBlockId: neoBlock.id },
  });
  if (secondary) {
    events.push({
      seq: nextSeq(),
      type: 'SECONDARY_DIRECTIVE_SELECTED',
      subjectId: secondary.directiveBlockId,
      data: { relationId: secondary.id, triggerBlockId: secondary.triggerBlockId },
    });
  }

  const mergeByResult = new Map<string, string>();
  for (const merge of neoBlock.merges ?? []) {
    mergeByResult.set(merge.resultBlockId, merge.id);
  }

  const scoped = scopedForBlock(
    sleeve,
    neoBlock.id,
    stackId,
    new Set(selection.activeOverlayIds ?? []),
    indexes,
    events,
    nextSeq,
  );

  const lanes: ResolvedLane[] = [];
  for (const moltType of MOLT_AUTHORITY_ORDER) {
    let rows: ResolvedGeometryRow[] = [];
    let geometrySource: ResolvedLane['geometrySource'] = 'base';
    let bundleId: string | undefined;

    if (moltType === 'trigger') {
      const baseRows = neoBlock.baseGeometry.trigger ?? [];
      const filtered = baseRows
        .map((row) => ({ row: row.row, blockIds: row.blockIds.filter((id) => activeTriggerIds.includes(id)) }))
        .filter((row) => row.blockIds.length > 0);
      rows = resolveRows(filtered, indexes, mergeByResult);
      geometrySource = 'evaluated-trigger-lane';
    } else if (moltType === 'directive') {
      const directiveRows: GeometryRow[] = [{ row: 1, blockIds: [neoBlock.primeDirectiveId] }];
      if (secondary) directiveRows.push({ row: 2, blockIds: [secondary.directiveBlockId] });
      rows = resolveRows(directiveRows, indexes, mergeByResult);
      geometrySource = 'generated-directive-lane';
    } else {
      const selectedBundleId = secondary?.bundles?.[moltType as keyof typeof secondary.bundles];
      if (selectedBundleId) {
        const bundle = (neoBlock.bundles ?? []).find((item) => item.id === selectedBundleId)!;
        rows = resolveRows(bundle.rows, indexes, mergeByResult);
        geometrySource = 'bundle';
        bundleId = bundle.id;
        events.push({
          seq: nextSeq(),
          type: 'BUNDLE_APPLIED',
          subjectId: bundle.id,
          data: { neoBlockId: neoBlock.id, moltType: bundle.moltType, secondaryDirectiveId: secondary?.id },
        });

        const activeIds = new Set(bundle.rows.flatMap((row) => row.blockIds));
        localBlocks
          .filter((block) => block.type === moltType && !activeIds.has(block.id))
          .forEach((block) => {
            events.push({
              seq: nextSeq(),
              type: 'MOLT_READY',
              subjectId: block.id,
              data: { neoBlockId: neoBlock.id, reason: 'omitted_from_active_bundle', bundleId: bundle.id },
            });
          });
      } else {
        rows = resolveRows(neoBlock.baseGeometry[moltType] ?? [], indexes, mergeByResult);
        geometrySource = 'base';
        if (rows.length > 0) {
          events.push({
            seq: nextSeq(),
            type: 'BASE_GEOMETRY_APPLIED',
            subjectId: neoBlock.id,
            data: { moltType },
          });
        }
      }
    }

    const laneScoped = scoped.get(moltType) ?? [];
    if (rows.length > 0 || laneScoped.length > 0) {
      lanes.push({ moltType, scoped: laneScoped, rows, geometrySource, bundleId });
      emitGeometryResolved(neoBlock.id, moltType, rows, bundleId, events, nextSeq);
    }
  }

  const activeIds = new Set(lanes.flatMap((lane) => lane.rows.flatMap((row) => row.blocks.map((block) => block.id))));
  for (const merge of neoBlock.merges ?? []) {
    if (activeIds.has(merge.resultBlockId)) {
      const resultBlock = indexes.moltBlocks.get(merge.resultBlockId)!;
      events.push({
        seq: nextSeq(),
        type: 'MERGE_VALIDATED',
        subjectId: merge.resultBlockId,
        data: {
          neoBlockId: neoBlock.id,
          mergeId: merge.id,
          sources: merge.sourceBlockIds.map((sourceBlockId) => ({
            blockId: sourceBlockId,
            moltType: indexes.moltBlocks.get(sourceBlockId)!.type,
          })),
          result: {
            blockId: resultBlock.id,
            moltType: resultBlock.type,
          },
          authorityCeiling: mergeAuthorityCeilingType(merge, indexes),
          authorityCheck: 'pass',
        },
      });
    }
  }

  return {
    ok: true,
    activeTriggerIds,
    matchedSecondaryDirectiveIds,
    resolved: {
      id: neoBlock.id,
      name: neoBlock.name,
      state: 'active',
      postRunState: 'ready',
      primeDirectiveId: neoBlock.primeDirectiveId,
      secondaryDirectiveId: secondary?.id,
      activeTriggerIds,
      lanes,
    },
  };
}

function promptPartsFromResolved(
  resolvedNeoBlocks: ResolvedNeoBlock[],
  stackByNeoBlockId: Map<string, string>,
): PromptPart[] {
  const result: PromptPart[] = [];
  for (const neoBlock of resolvedNeoBlocks) {
    const neoStackId = stackByNeoBlockId.get(neoBlock.id)!;
    for (const lane of neoBlock.lanes) {
      const laneOrder = MOLT_AUTHORITY_ORDER.indexOf(lane.moltType) + 1;
      lane.scoped.forEach((block, index) => {
        result.push({
          ...block,
          neoStackId,
          neoBlockId: neoBlock.id,
          laneOrder,
          scopeLayer: block.sourceScope?.kind === 'sleeve' ? 0 : 1,
          row: 0,
          column: index + 1,
        });
      });
      for (const row of lane.rows) {
        row.blocks.forEach((block, index) => {
          result.push({
            ...block,
            neoStackId,
            neoBlockId: neoBlock.id,
            laneOrder,
            scopeLayer: 100,
            row: row.row,
            column: index + 1,
          });
        });
      }
    }
  }
  return result;
}

export function resolveSleeve(sleeve: Sleeve, selection: CompileSelection): ResolutionResult {
  const diagnostics: CompilerDiagnostic[] = [];
  const events: TraceEvent[] = [];
  let seq = 0;
  const nextSeq = (): number => ++seq;
  const indexes = buildIndexes(sleeve);

  const finalNeoStackStates: Record<string, RuntimeState> = Object.fromEntries(
    sleeve.neoStacks.map((stack) => [stack.id, stack.defaultState ?? 'ready']),
  );
  const finalNeoBlockStates: Record<string, RuntimeState> = Object.fromEntries(
    sleeve.neoBlocks.map((block) => [block.id, block.defaultState ?? 'ready']),
  );

  const disabledStacks = new Set<string>([
    ...sleeve.neoStacks.filter((stack) => stack.defaultState === 'disabled').map((stack) => stack.id),
    ...(selection.disabledNeoStackIds ?? []),
  ]);
  const disabledBlocks = new Set<string>([
    ...sleeve.neoBlocks.filter((block) => block.defaultState === 'disabled').map((block) => block.id),
    ...(selection.disabledNeoBlockIds ?? []),
  ]);

  for (const stackId of [...disabledStacks]) descendantsOf(stackId, indexes).forEach((id) => disabledStacks.add(id));
  for (const stackId of disabledStacks) {
    finalNeoStackStates[stackId] = 'disabled';
    events.push({
      seq: nextSeq(),
      type: 'NEOSTACK_DISABLED',
      subjectId: stackId,
      data: stackTraceData(stackId, indexes),
    });
    const stack = indexes.neoStacks.get(stackId);
    stack?.neoBlockRows.flatMap((row) => row.neoBlockIds).forEach((id) => disabledBlocks.add(id));
  }
  for (const blockId of disabledBlocks) {
    finalNeoBlockStates[blockId] = 'disabled';
    events.push({
      seq: nextSeq(),
      type: 'NEOBLOCK_DISABLED',
      subjectId: blockId,
      data: neoBlockTraceData(blockId, indexes.stackByNeoBlockId.get(blockId)!, indexes),
    });
  }

  const offStacks = new Set<string>();
  const offBlocks = new Set<string>();
  const activeGovernance = new Set(selection.activeGovernanceRuleIds ?? []);
  for (const rule of sleeve.governance ?? []) {
    if (!activeGovernance.has(rule.id)) continue;
    events.push({
      seq: nextSeq(),
      type: 'GOVERNANCE_RULE_APPLIED',
      subjectId: rule.id,
      data: { name: rule.name },
    });
    for (const id of rule.offNeoStackIds ?? []) {
      offStacks.add(id);
      descendantsOf(id, indexes).forEach((child) => offStacks.add(child));
    }
    for (const id of rule.offNeoBlockIds ?? []) offBlocks.add(id);
  }
  for (const stackId of offStacks) {
    finalNeoStackStates[stackId] = 'off';
    events.push({
      seq: nextSeq(),
      type: 'NEOSTACK_OFF',
      subjectId: stackId,
      data: stackTraceData(stackId, indexes),
    });
    const stack = indexes.neoStacks.get(stackId);
    stack?.neoBlockRows.flatMap((row) => row.neoBlockIds).forEach((id) => offBlocks.add(id));
  }
  for (const blockId of offBlocks) {
    finalNeoBlockStates[blockId] = 'off';
    events.push({
      seq: nextSeq(),
      type: 'NEOBLOCK_OFF',
      subjectId: blockId,
      data: neoBlockTraceData(blockId, indexes.stackByNeoBlockId.get(blockId)!, indexes),
    });
  }

  const unavailableStacks = new Set([...disabledStacks, ...offStacks]);
  const unavailableBlocks = new Set([...disabledBlocks, ...offBlocks]);
  const requestedStacks = new Set(selection.activeNeoStackIds);
  const requestedBlocks = new Set(selection.activeNeoBlockIds);
  const activeNeoStackIds = orderedActiveStacks(sleeve, requestedStacks, unavailableStacks, indexes, diagnostics);
  const activeStackSet = new Set(activeNeoStackIds);

  activeNeoStackIds.forEach((stackId, index) => {
    finalNeoStackStates[stackId] = 'active';
    events.push({
      seq: nextSeq(),
      type: 'NEOSTACK_ACTIVE',
      subjectId: stackId,
      data: { ...stackTraceData(stackId, indexes), selectionOrder: index + 1 },
    });
  });
  sleeve.neoStacks
    .filter((stack) => !activeStackSet.has(stack.id) && !unavailableStacks.has(stack.id))
    .forEach((stack) => {
      finalNeoStackStates[stack.id] = 'ready';
      events.push({
        seq: nextSeq(),
        type: 'NEOSTACK_READY',
        subjectId: stack.id,
        data: stackTraceData(stack.id, indexes),
      });
    });

  if (unavailableStacks.has(sleeve.controllerNeoStackId)) {
    diagnostics.push(
      errorDiagnostic(
        'CONTROLLER_UNAVAILABLE',
        'Controller NeoStack is OFF or DISABLED; compilation cannot proceed.',
        'controllerNeoStackId',
      ),
    );
  }

  const orderedSelectedBlocks: string[] = [];
  for (const stackId of activeNeoStackIds) {
    const stack = indexes.neoStacks.get(stackId)!;
    for (const row of stack.neoBlockRows.slice().sort((a, b) => a.row - b.row)) {
      for (const blockId of row.neoBlockIds) {
        if (requestedBlocks.has(blockId) && !unavailableBlocks.has(blockId)) orderedSelectedBlocks.push(blockId);
      }
    }
  }

  for (const blockId of requestedBlocks) {
    const stackId = indexes.stackByNeoBlockId.get(blockId);
    if (stackId && !activeStackSet.has(stackId) && !unavailableBlocks.has(blockId)) {
      diagnostics.push(
        errorDiagnostic(
          'ACTIVE_NEOBLOCK_WITHOUT_ACTIVE_NEOSTACK',
          `Selected NeoBlock ${blockId} requires active containing NeoStack ${stackId}.`,
          'selection.activeNeoBlockIds',
        ),
      );
    }
  }

  const resolvedNeoBlocks: ResolvedNeoBlock[] = [];
  const resolvedNeoBlockIds = new Set<string>();
  for (const blockId of orderedSelectedBlocks) {
    const neoBlock = indexes.neoBlocks.get(blockId)!;
    const stackId = indexes.stackByNeoBlockId.get(blockId)!;
    const blockData = neoBlockTraceData(blockId, stackId, indexes);
    events.push({
      seq: nextSeq(),
      type: 'NEOBLOCK_SELECTION_ATTEMPTED',
      subjectId: blockId,
      data: blockData,
    });
    const diagnosticOffset = diagnostics.length;
    const outcome = resolveNeoBlock(
      sleeve,
      neoBlock,
      stackId,
      selection,
      indexes,
      events,
      diagnostics,
      nextSeq,
    );
    if (outcome.ok) {
      finalNeoBlockStates[blockId] = 'active';
      resolvedNeoBlocks.push(outcome.resolved);
      resolvedNeoBlockIds.add(blockId);
      events.push({
        seq: nextSeq(),
        type: 'NEOBLOCK_ACTIVE',
        subjectId: blockId,
        data: { ...blockData, activeTriggerIds: outcome.activeTriggerIds, secondaryDirectiveId: outcome.resolved.secondaryDirectiveId },
      });
      continue;
    }

    finalNeoBlockStates[blockId] = 'ready';
    const resolutionDiagnostics = diagnostics
      .slice(diagnosticOffset)
      .filter((diagnostic) => diagnostic.level === 'error')
      .map((diagnostic) => diagnostic.code);
    events.push({
      seq: nextSeq(),
      type: 'NEOBLOCK_RESOLUTION_FAILED',
      subjectId: blockId,
      data: {
        ...blockData,
        activeTriggerIds: outcome.activeTriggerIds,
        matchedSecondaryDirectiveIds: outcome.matchedSecondaryDirectiveIds,
        diagnosticCodes: resolutionDiagnostics,
      },
    });
  }

  for (const block of sleeve.neoBlocks) {
    if (!resolvedNeoBlockIds.has(block.id) && !unavailableBlocks.has(block.id)) {
      finalNeoBlockStates[block.id] = 'ready';
      const stackId = indexes.stackByNeoBlockId.get(block.id);
      events.push({
        seq: nextSeq(),
        type: 'NEOBLOCK_READY',
        subjectId: block.id,
        data: stackId ? neoBlockTraceData(block.id, stackId, indexes) : undefined,
      });
    }
  }

  const promptParts = promptPartsFromResolved(resolvedNeoBlocks, indexes.stackByNeoBlockId);

  return {
    activeNeoStackIds,
    resolvedNeoBlocks,
    promptParts,
    events,
    diagnostics,
    finalNeoStackStates,
    finalNeoBlockStates,
  };
}
