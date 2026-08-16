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

type BaseRuntimeState = Exclude<RuntimeState, 'active'>;
type BlockingSource = 'governance' | 'configuration' | 'ancestor' | 'selection';

interface StateBlocker {
  effectiveState: Exclude<BaseRuntimeState, 'ready'>;
  blockingObjectId: string;
  blockingReason: string;
  blockingSource: BlockingSource;
  governanceRuleId?: string;
  inheritedFromId?: string;
  path?: string;
}

interface Availability {
  state: BaseRuntimeState;
  blocker?: StateBlocker;
}

interface DirectDisable {
  path: string;
  reason: 'authored_disabled' | 'human_disabled';
}

interface SelectedStackBlockContext {
  diagnosticCode: string;
  details: Record<string, unknown>;
}

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

function ancestorsRootToLeaf(stackId: string, indexes: RuntimeIndexes): string[] {
  const result: string[] = [];
  let current: string | undefined = stackId;
  while (current) {
    result.push(current);
    current = indexes.parentByStackId.get(current);
  }
  return result.reverse();
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

function scopeApplies(scope: ScopeRef, stackId: string, indexes: RuntimeIndexes): boolean {
  if (scope.kind === 'sleeve') return true;
  return ancestorsRootToLeaf(stackId, indexes).includes(scope.neoStackId);
}

function orderedSelectedStacksFromController(
  sleeve: Sleeve,
  selected: Set<string>,
  indexes: RuntimeIndexes,
): string[] {
  const ordered: string[] = [];

  const visit = (stackId: string): void => {
    if (selected.has(stackId)) ordered.push(stackId);
    for (const child of indexes.childrenByStackId.get(stackId) ?? []) visit(child);
  };

  visit(sleeve.controllerNeoStackId);
  return ordered;
}

function firstMissingSelectedAncestor(
  stackId: string,
  selected: Set<string>,
  indexes: RuntimeIndexes,
): string | undefined {
  for (const ancestorId of ancestorsRootToLeaf(stackId, indexes).slice(0, -1)) {
    if (!selected.has(ancestorId)) return ancestorId;
  }
  return undefined;
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

function mergeAuthorityCeilingType(
  merge: NonNullable<NeoBlock['merges']>[number],
  indexes: RuntimeIndexes,
): MoltType | undefined {
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

function orderScopedAttachmentsForBlock<T extends { scope: ScopeRef }>(
  attachments: T[],
  stackId: string,
  indexes: RuntimeIndexes,
): T[] {
  const ancestorOrder = ancestorsRootToLeaf(stackId, indexes);
  const depth = (scope: ScopeRef): number => {
    if (scope.kind === 'sleeve') return 0;
    const index = ancestorOrder.indexOf(scope.neoStackId);
    return index < 0 ? Number.MAX_SAFE_INTEGER : index + 1;
  };

  return attachments
    .map((attachment, authoredIndex) => ({ attachment, authoredIndex }))
    .filter(({ attachment }) => scopeApplies(attachment.scope, stackId, indexes))
    .sort(
      (a, b) => depth(a.attachment.scope) - depth(b.attachment.scope) || a.authoredIndex - b.authoredIndex,
    )
    .map(({ attachment }) => attachment);
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

  orderScopedAttachmentsForBlock(sleeve.scopedMolt ?? [], stackId, indexes)
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
    orderScopedAttachmentsForBlock(overlay.attachments, stackId, indexes)
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

function selectionTargetNotExecutableDiagnostic(
  targetKind: 'neostack' | 'neoblock',
  targetId: string,
  availability: Availability,
  path: string,
  extraDetails: Record<string, unknown> = {},
): CompilerDiagnostic {
  return errorDiagnostic(
    'SELECTION_TARGET_NOT_EXECUTABLE',
    `Selected ${targetKind === 'neostack' ? 'NeoStack' : 'NeoBlock'} ${targetId} has effective state ${availability.state} and cannot participate in this compile.`,
    path,
    {
      targetId,
      targetKind,
      effectiveState: availability.state,
      blockingObjectId: availability.blocker?.blockingObjectId ?? targetId,
      blockingReason: availability.blocker?.blockingReason ?? 'not_executable',
      blockingSource: availability.blocker?.blockingSource ?? 'configuration',
      ...(availability.blocker?.governanceRuleId ? { governanceRuleId: availability.blocker.governanceRuleId } : {}),
      ...(availability.blocker?.inheritedFromId ? { inheritedFromId: availability.blocker.inheritedFromId } : {}),
      ...(availability.blocker?.path ? { blockingPath: availability.blocker.path } : {}),
      ...extraDetails,
    },
  );
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
        `NeoBlock ${neoBlock.id} matched more than one Secondary Directive. compiler-vnext does not support implicit coexistence of multiple simultaneously matching Secondary Directives in this schema/compiler version.`,
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
    sleeve.neoStacks.map((stack) => [stack.id, 'ready']),
  );
  const finalNeoBlockStates: Record<string, RuntimeState> = Object.fromEntries(
    sleeve.neoBlocks.map((block) => [block.id, 'ready']),
  );

  const directStackDisabled = new Map<string, DirectDisable>();
  const directBlockDisabled = new Map<string, DirectDisable>();
  const directStackOffByRule = new Map<string, string>();
  const directBlockOffByRule = new Map<string, string>();
  const appliedGovernanceRules = (sleeve.governance ?? []).filter((rule) =>
    new Set(selection.activeGovernanceRuleIds ?? []).has(rule.id),
  );

  sleeve.neoStacks
    .filter((stack) => stack.defaultState === 'disabled')
    .forEach((stack) => {
      directStackDisabled.set(stack.id, {
        path: `neoStacks.${stack.id}.defaultState`,
        reason: 'authored_disabled',
      });
    });
  (selection.disabledNeoStackIds ?? []).forEach((stackId) => {
    directStackDisabled.set(stackId, {
      path: 'selection.disabledNeoStackIds',
      reason: 'human_disabled',
    });
  });

  sleeve.neoBlocks
    .filter((block) => block.defaultState === 'disabled')
    .forEach((block) => {
      directBlockDisabled.set(block.id, {
        path: `neoBlocks.${block.id}.defaultState`,
        reason: 'authored_disabled',
      });
    });
  (selection.disabledNeoBlockIds ?? []).forEach((blockId) => {
    directBlockDisabled.set(blockId, {
      path: 'selection.disabledNeoBlockIds',
      reason: 'human_disabled',
    });
  });

  for (const rule of appliedGovernanceRules) {
    for (const stackId of rule.offNeoStackIds ?? []) {
      if (!directStackOffByRule.has(stackId)) directStackOffByRule.set(stackId, rule.id);
    }
    for (const blockId of rule.offNeoBlockIds ?? []) {
      if (!directBlockOffByRule.has(blockId)) directBlockOffByRule.set(blockId, rule.id);
    }
  }

  const stackAvailabilityCache = new Map<string, Availability>();
  const blockAvailabilityCache = new Map<string, Availability>();

  const stackAvailability = (stackId: string): Availability => {
    const cached = stackAvailabilityCache.get(stackId);
    if (cached) return cached;

    const directOffRuleId = directStackOffByRule.get(stackId);
    if (directOffRuleId) {
      const value: Availability = {
        state: 'off',
        blocker: {
          effectiveState: 'off',
          blockingObjectId: directOffRuleId,
          blockingReason: 'governance_off',
          blockingSource: 'governance',
          governanceRuleId: directOffRuleId,
        },
      };
      stackAvailabilityCache.set(stackId, value);
      return value;
    }

    const parentId = indexes.parentByStackId.get(stackId);
    const parentAvailability = parentId ? stackAvailability(parentId) : undefined;
    if (parentId && parentAvailability?.state === 'off') {
      const value: Availability = {
        state: 'off',
        blocker: {
          effectiveState: 'off',
          blockingObjectId: parentId,
          blockingReason: 'ancestor_governance_off',
          blockingSource: 'ancestor',
          inheritedFromId: parentId,
          ...(parentAvailability.blocker?.governanceRuleId
            ? { governanceRuleId: parentAvailability.blocker.governanceRuleId }
            : {}),
        },
      };
      stackAvailabilityCache.set(stackId, value);
      return value;
    }

    const directDisabled = directStackDisabled.get(stackId);
    if (directDisabled) {
      const value: Availability = {
        state: 'disabled',
        blocker: {
          effectiveState: 'disabled',
          blockingObjectId: stackId,
          blockingReason: directDisabled.reason,
          blockingSource: 'configuration',
          path: directDisabled.path,
        },
      };
      stackAvailabilityCache.set(stackId, value);
      return value;
    }

    if (parentId && parentAvailability?.state === 'disabled') {
      const value: Availability = {
        state: 'disabled',
        blocker: {
          effectiveState: 'disabled',
          blockingObjectId: parentId,
          blockingReason: 'ancestor_disabled',
          blockingSource: 'ancestor',
          inheritedFromId: parentId,
          ...(parentAvailability.blocker?.path ? { path: parentAvailability.blocker.path } : {}),
        },
      };
      stackAvailabilityCache.set(stackId, value);
      return value;
    }

    const value: Availability = { state: 'ready' };
    stackAvailabilityCache.set(stackId, value);
    return value;
  };

  const blockAvailability = (blockId: string): Availability => {
    const cached = blockAvailabilityCache.get(blockId);
    if (cached) return cached;

    const directOffRuleId = directBlockOffByRule.get(blockId);
    if (directOffRuleId) {
      const value: Availability = {
        state: 'off',
        blocker: {
          effectiveState: 'off',
          blockingObjectId: directOffRuleId,
          blockingReason: 'governance_off',
          blockingSource: 'governance',
          governanceRuleId: directOffRuleId,
        },
      };
      blockAvailabilityCache.set(blockId, value);
      return value;
    }

    const stackId = indexes.stackByNeoBlockId.get(blockId);
    const containingStackAvailability = stackId ? stackAvailability(stackId) : undefined;
    if (stackId && containingStackAvailability?.state === 'off') {
      const value: Availability = {
        state: 'off',
        blocker: {
          effectiveState: 'off',
          blockingObjectId: stackId,
          blockingReason: 'container_neostack_off',
          blockingSource:
            containingStackAvailability.blocker?.blockingSource === 'ancestor' ? 'ancestor' : 'governance',
          inheritedFromId:
            containingStackAvailability.blocker?.blockingSource === 'ancestor'
              ? containingStackAvailability.blocker.inheritedFromId ?? stackId
              : undefined,
          ...(containingStackAvailability.blocker?.governanceRuleId
            ? { governanceRuleId: containingStackAvailability.blocker.governanceRuleId }
            : {}),
        },
      };
      blockAvailabilityCache.set(blockId, value);
      return value;
    }

    const directDisabled = directBlockDisabled.get(blockId);
    if (directDisabled) {
      const value: Availability = {
        state: 'disabled',
        blocker: {
          effectiveState: 'disabled',
          blockingObjectId: blockId,
          blockingReason: directDisabled.reason,
          blockingSource: 'configuration',
          path: directDisabled.path,
        },
      };
      blockAvailabilityCache.set(blockId, value);
      return value;
    }

    if (stackId && containingStackAvailability?.state === 'disabled') {
      const value: Availability = {
        state: 'disabled',
        blocker: {
          effectiveState: 'disabled',
          blockingObjectId: stackId,
          blockingReason: 'container_neostack_disabled',
          blockingSource:
            containingStackAvailability.blocker?.blockingSource === 'ancestor' ? 'ancestor' : 'configuration',
          inheritedFromId:
            containingStackAvailability.blocker?.blockingSource === 'ancestor'
              ? containingStackAvailability.blocker.inheritedFromId ?? stackId
              : undefined,
          ...(containingStackAvailability.blocker?.path
            ? { path: containingStackAvailability.blocker.path }
            : {}),
        },
      };
      blockAvailabilityCache.set(blockId, value);
      return value;
    }

    const value: Availability = { state: 'ready' };
    blockAvailabilityCache.set(blockId, value);
    return value;
  };

  for (const stack of sleeve.neoStacks) {
    const availability = stackAvailability(stack.id);
    finalNeoStackStates[stack.id] = availability.state;
    if (availability.state === 'disabled') {
      events.push({
        seq: nextSeq(),
        type: 'NEOSTACK_DISABLED',
        subjectId: stack.id,
        data: stackTraceData(stack.id, indexes),
      });
    } else if (availability.state === 'off') {
      events.push({
        seq: nextSeq(),
        type: 'NEOSTACK_OFF',
        subjectId: stack.id,
        data: stackTraceData(stack.id, indexes),
      });
    }
  }

  for (const block of sleeve.neoBlocks) {
    const availability = blockAvailability(block.id);
    finalNeoBlockStates[block.id] = availability.state;
    const stackId = indexes.stackByNeoBlockId.get(block.id);
    if (!stackId) continue;
    if (availability.state === 'disabled') {
      events.push({
        seq: nextSeq(),
        type: 'NEOBLOCK_DISABLED',
        subjectId: block.id,
        data: neoBlockTraceData(block.id, stackId, indexes),
      });
    } else if (availability.state === 'off') {
      events.push({
        seq: nextSeq(),
        type: 'NEOBLOCK_OFF',
        subjectId: block.id,
        data: neoBlockTraceData(block.id, stackId, indexes),
      });
    }
  }

  for (const rule of appliedGovernanceRules) {
    events.push({
      seq: nextSeq(),
      type: 'GOVERNANCE_RULE_APPLIED',
      subjectId: rule.id,
      data: { name: rule.name },
    });
  }

  const requestedStacks = new Set(selection.activeNeoStackIds);
  const requestedBlocks = new Set(selection.activeNeoBlockIds);
  const controllerReachableStacks = new Set([
    sleeve.controllerNeoStackId,
    ...descendantsOf(sleeve.controllerNeoStackId, indexes),
  ]);
  const executableSelectedStacks = new Set<string>();
  const selectedStackBlockers = new Map<string, SelectedStackBlockContext>();
  const seenSelectedStacks = new Set<string>();

  for (const stackId of selection.activeNeoStackIds) {
    if (seenSelectedStacks.has(stackId)) continue;
    seenSelectedStacks.add(stackId);

    if (!controllerReachableStacks.has(stackId)) {
      const diagnostic = errorDiagnostic(
        'ACTIVE_NEOSTACK_OUTSIDE_CONTROLLER_TREE',
        `Selected NeoStack ${stackId} is not reachable from the Controller NeoStack.`,
        'selection.activeNeoStackIds',
        {
          selectedNeoStackId: stackId,
          controllerNeoStackId: sleeve.controllerNeoStackId,
          blockingReason: 'outside_controller_tree',
          blockingSource: 'selection',
        },
      );
      diagnostics.push(diagnostic);
      selectedStackBlockers.set(stackId, {
        diagnosticCode: diagnostic.code,
        details: diagnostic.details ?? {},
      });
      events.push({
        seq: nextSeq(),
        type: 'NEOSTACK_SELECTION_BLOCKED',
        subjectId: stackId,
        data: {
          ...stackTraceData(stackId, indexes),
          diagnosticCode: diagnostic.code,
          ...(diagnostic.details ?? {}),
        },
      });
      continue;
    }

    const missingAncestorNeoStackId = firstMissingSelectedAncestor(stackId, requestedStacks, indexes);
    if (missingAncestorNeoStackId) {
      const diagnostic = errorDiagnostic(
        'SELECTION_MISSING_ANCESTOR',
        `Selected NeoStack ${stackId} requires selected ancestor ${missingAncestorNeoStackId}. compiler-vnext does not infer missing route ancestors.`,
        'selection.activeNeoStackIds',
        {
          selectedNeoStackId: stackId,
          missingAncestorNeoStackId,
          expectedPath: ancestorsRootToLeaf(stackId, indexes),
          blockingReason: 'missing_selected_ancestor',
          blockingSource: 'selection',
        },
      );
      diagnostics.push(diagnostic);
      selectedStackBlockers.set(stackId, {
        diagnosticCode: diagnostic.code,
        details: diagnostic.details ?? {},
      });
      events.push({
        seq: nextSeq(),
        type: 'NEOSTACK_SELECTION_BLOCKED',
        subjectId: stackId,
        data: {
          ...stackTraceData(stackId, indexes),
          diagnosticCode: diagnostic.code,
          ...(diagnostic.details ?? {}),
        },
      });
      continue;
    }

    const availability = stackAvailability(stackId);
    if (availability.state !== 'ready') {
      const diagnostic = selectionTargetNotExecutableDiagnostic(
        'neostack',
        stackId,
        availability,
        'selection.activeNeoStackIds',
      );
      diagnostics.push(diagnostic);
      selectedStackBlockers.set(stackId, {
        diagnosticCode: diagnostic.code,
        details: diagnostic.details ?? {},
      });
      events.push({
        seq: nextSeq(),
        type: 'NEOSTACK_SELECTION_BLOCKED',
        subjectId: stackId,
        data: {
          ...stackTraceData(stackId, indexes),
          diagnosticCode: diagnostic.code,
          ...(diagnostic.details ?? {}),
        },
      });
      continue;
    }

    executableSelectedStacks.add(stackId);
  }

  const activeNeoStackIds = orderedSelectedStacksFromController(sleeve, executableSelectedStacks, indexes);
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
    .filter((stack) => finalNeoStackStates[stack.id] === 'ready')
    .forEach((stack) => {
      events.push({
        seq: nextSeq(),
        type: 'NEOSTACK_READY',
        subjectId: stack.id,
        data: stackTraceData(stack.id, indexes),
      });
    });

  const executableSelectedBlocks = new Set<string>();
  const seenSelectedBlocks = new Set<string>();

  for (const blockId of selection.activeNeoBlockIds) {
    if (seenSelectedBlocks.has(blockId)) continue;
    seenSelectedBlocks.add(blockId);

    const stackId = indexes.stackByNeoBlockId.get(blockId);
    const attemptData = stackId ? neoBlockTraceData(blockId, stackId, indexes) : {};

    if (!stackId) {
      const diagnostic = errorDiagnostic(
        'SELECTION_NEOBLOCK_CONTAINER_UNKNOWN',
        `Selected NeoBlock ${blockId} is not placed in any NeoStack.`,
        'selection.activeNeoBlockIds',
        {
          targetId: blockId,
          targetKind: 'neoblock',
          blockingReason: 'container_unknown',
          blockingSource: 'selection',
        },
      );
      diagnostics.push(diagnostic);
      events.push({
        seq: nextSeq(),
        type: 'NEOBLOCK_SELECTION_ATTEMPTED',
        subjectId: blockId,
        data: attemptData,
      });
      events.push({
        seq: nextSeq(),
        type: 'NEOBLOCK_SELECTION_BLOCKED',
        subjectId: blockId,
        data: {
          diagnosticCode: diagnostic.code,
          ...(diagnostic.details ?? {}),
        },
      });
      continue;
    }

    if (!requestedStacks.has(stackId)) {
      const diagnostic = errorDiagnostic(
        'SELECTION_NEOBLOCK_CONTAINER_NOT_SELECTED',
        `Selected NeoBlock ${blockId} requires selected containing NeoStack ${stackId}. compiler-vnext does not infer missing route ancestors or containers.`,
        'selection.activeNeoBlockIds',
        {
          targetId: blockId,
          targetKind: 'neoblock',
          containerNeoStackId: stackId,
          blockingObjectId: stackId,
          blockingReason: 'container_not_selected',
          blockingSource: 'selection',
        },
      );
      diagnostics.push(diagnostic);
      events.push({
        seq: nextSeq(),
        type: 'NEOBLOCK_SELECTION_ATTEMPTED',
        subjectId: blockId,
        data: attemptData,
      });
      events.push({
        seq: nextSeq(),
        type: 'NEOBLOCK_SELECTION_BLOCKED',
        subjectId: blockId,
        data: {
          ...attemptData,
          diagnosticCode: diagnostic.code,
          ...(diagnostic.details ?? {}),
        },
      });
      continue;
    }

    if (!activeStackSet.has(stackId)) {
      const containerState = finalNeoStackStates[stackId];
      if (containerState === 'off' || containerState === 'disabled') {
        const diagnostic = selectionTargetNotExecutableDiagnostic(
          'neoblock',
          blockId,
          blockAvailability(blockId),
          'selection.activeNeoBlockIds',
          { containerNeoStackId: stackId },
        );
        diagnostics.push(diagnostic);
        events.push({
          seq: nextSeq(),
          type: 'NEOBLOCK_SELECTION_ATTEMPTED',
          subjectId: blockId,
          data: attemptData,
        });
        events.push({
          seq: nextSeq(),
          type: 'NEOBLOCK_SELECTION_BLOCKED',
          subjectId: blockId,
          data: {
            ...attemptData,
            diagnosticCode: diagnostic.code,
            ...(diagnostic.details ?? {}),
          },
        });
        continue;
      }

      const containerBlocker = selectedStackBlockers.get(stackId);
      const diagnostic = errorDiagnostic(
        'SELECTION_NEOBLOCK_CONTAINER_NOT_EXECUTABLE',
        `Selected NeoBlock ${blockId} requires executable containing NeoStack ${stackId}.`,
        'selection.activeNeoBlockIds',
        {
          targetId: blockId,
          targetKind: 'neoblock',
          containerNeoStackId: stackId,
          blockingObjectId: stackId,
          blockingReason: 'container_not_executable',
          blockingSource: 'selection',
          ...(containerBlocker ? { containerDiagnosticCode: containerBlocker.diagnosticCode } : {}),
          ...(containerBlocker?.details ?? {}),
        },
      );
      diagnostics.push(diagnostic);
      events.push({
        seq: nextSeq(),
        type: 'NEOBLOCK_SELECTION_ATTEMPTED',
        subjectId: blockId,
        data: attemptData,
      });
      events.push({
        seq: nextSeq(),
        type: 'NEOBLOCK_SELECTION_BLOCKED',
        subjectId: blockId,
        data: {
          ...attemptData,
          diagnosticCode: diagnostic.code,
          ...(diagnostic.details ?? {}),
        },
      });
      continue;
    }

    const availability = blockAvailability(blockId);
    if (availability.state !== 'ready') {
      const diagnostic = selectionTargetNotExecutableDiagnostic(
        'neoblock',
        blockId,
        availability,
        'selection.activeNeoBlockIds',
        { containerNeoStackId: stackId },
      );
      diagnostics.push(diagnostic);
      events.push({
        seq: nextSeq(),
        type: 'NEOBLOCK_SELECTION_ATTEMPTED',
        subjectId: blockId,
        data: attemptData,
      });
      events.push({
        seq: nextSeq(),
        type: 'NEOBLOCK_SELECTION_BLOCKED',
        subjectId: blockId,
        data: {
          ...attemptData,
          diagnosticCode: diagnostic.code,
          ...(diagnostic.details ?? {}),
        },
      });
      continue;
    }

    executableSelectedBlocks.add(blockId);
  }

  const orderedSelectedBlocks: string[] = [];
  for (const stackId of activeNeoStackIds) {
    const stack = indexes.neoStacks.get(stackId)!;
    for (const row of stack.neoBlockRows.slice().sort((a, b) => a.row - b.row)) {
      for (const blockId of row.neoBlockIds) {
        if (executableSelectedBlocks.has(blockId)) orderedSelectedBlocks.push(blockId);
      }
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
        data: {
          ...blockData,
          activeTriggerIds: outcome.activeTriggerIds,
          secondaryDirectiveId: outcome.resolved.secondaryDirectiveId,
        },
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
    if (!resolvedNeoBlockIds.has(block.id) && finalNeoBlockStates[block.id] === 'ready') {
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
