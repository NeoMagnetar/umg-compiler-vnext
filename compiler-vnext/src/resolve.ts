import type { DiagnosticSubject } from './diagnostic-registry.js';
import { MOLT_AUTHORITY_ORDER } from './constants.js';
import { errorDiagnostic } from './errors.js';
import { createTraceEvent } from './trace-event-registry.js';
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
  TraceEventType,
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
  governanceRuleIds?: string[];
  directGovernanceRuleIds?: string[];
  inheritedGovernanceRuleIds?: string[];
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

function firstGovernanceRuleId(ids: string[]): string | undefined {
  return ids[0];
}

function appendGovernanceRuleId(targets: Map<string, string[]>, targetId: string, ruleId: string): void {
  const current = targets.get(targetId) ?? [];
  current.push(ruleId);
  targets.set(targetId, current);
}

function orderedGovernanceRuleIds(ids: Iterable<string>, governanceOrder: Map<string, number>): string[] {
  return [...new Set(ids)].sort(
    (left, right) =>
      (governanceOrder.get(left) ?? Number.MAX_SAFE_INTEGER) -
      (governanceOrder.get(right) ?? Number.MAX_SAFE_INTEGER),
  );
}

function governanceRuleIdsFromBlocker(blocker: StateBlocker | undefined): string[] {
  if (!blocker) return [];
  if (blocker.governanceRuleIds?.length) return blocker.governanceRuleIds;
  return blocker.governanceRuleId ? [blocker.governanceRuleId] : [];
}

function blockerTraceData(blocker: StateBlocker | undefined): Record<string, unknown> {
  if (!blocker) return {};

  return {
    blockingObjectId: blocker.blockingObjectId,
    blockingReason: blocker.blockingReason,
    blockingSource: blocker.blockingSource,
    ...(blocker.governanceRuleId ? { governanceRuleId: blocker.governanceRuleId } : {}),
    ...(blocker.governanceRuleIds?.length ? { governanceRuleIds: blocker.governanceRuleIds } : {}),
    ...(blocker.directGovernanceRuleIds?.length
      ? { directGovernanceRuleIds: blocker.directGovernanceRuleIds }
      : {}),
    ...(blocker.inheritedGovernanceRuleIds?.length
      ? { inheritedGovernanceRuleIds: blocker.inheritedGovernanceRuleIds }
      : {}),
    ...(blocker.inheritedFromId ? { inheritedFromId: blocker.inheritedFromId } : {}),
    ...(blocker.path ? { blockingPath: blocker.path } : {}),
  };
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

function pushTraceEvent(
  events: TraceEvent[],
  nextSeq: () => number,
  type: TraceEventType,
  subject: DiagnosticSubject,
  data: Record<string, unknown>,
): void {
  events.push(createTraceEvent(nextSeq(), type, subject, data));
}

function emitGeometryResolved(
  neoBlockId: string,
  moltType: MoltType,
  rows: ResolvedGeometryRow[],
  bundleId: string | undefined,
  events: TraceEvent[],
  nextSeq: () => number,
): void {
  pushTraceEvent(events, nextSeq, 'GEOMETRY_RESOLVED', { kind: 'neoblock', id: neoBlockId }, {
      neoBlockId,
      moltType,
      source: bundleId ? 'bundle' : 'base',
      bundleId,
      rows: geometryRowsAsIds(rows),
      readOrder: geometryReadOrder(rows),
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
      pushTraceEvent(events, nextSeq, 'SCOPED_MOLT_APPLIED', { kind: 'scoped_attachment', id: attachment.id }, {
          blockId: block.id,
          source: 'scoped',
          attachmentId: attachment.id,
          scope: attachment.scope,
          neoBlockId,
          neoStackId: stackId,
          moltType: block.type,
      });
    });

  for (const overlay of sleeve.overlays ?? []) {
    if (!activeOverlayIds.has(overlay.id)) continue;
    orderScopedAttachmentsForBlock(overlay.attachments, stackId, indexes)
      .forEach((attachment) => {
        const block = indexes.moltBlocks.get(attachment.blockId)!;
        const resolved = scopedMolt(block, attachment.id, attachment.scope, overlay.id);
        append(resolved);
        pushTraceEvent(events, nextSeq, 'OVERLAY_APPLIED', { kind: 'scoped_attachment', id: attachment.id }, {
            blockId: block.id,
            source: 'overlay',
            overlayId: overlay.id,
            attachmentId: attachment.id,
            scope: attachment.scope,
            neoBlockId,
            neoStackId: stackId,
            moltType: block.type,
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
  const subject: DiagnosticSubject = { kind: targetKind, id: targetId };
  const blockerData = availability.blocker
    ? blockerTraceData(availability.blocker)
    : {
        blockingObjectId: targetId,
        blockingReason: 'not_executable',
        blockingSource: 'configuration',
      };
  return errorDiagnostic(
    'SELECTION_TARGET_NOT_EXECUTABLE',
    `Selected ${targetKind === 'neostack' ? 'NeoStack' : 'NeoBlock'} ${targetId} has effective state ${availability.state} and cannot participate in this compile.`,
    subject,
    path,
    {
      targetId,
      targetKind,
      effectiveState: availability.state,
      ...blockerData,
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
    pushTraceEvent(events, nextSeq, 'TRIGGER_EVALUATED', { kind: 'molt_block', id: trigger.id }, {
      active,
      matched: active,
      neoBlockId: neoBlock.id,
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
        { kind: 'neoblock', id: neoBlock.id },
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
        { kind: 'neoblock', id: neoBlock.id },
        `neoBlocks.${neoBlock.id}.secondaryDirectives`,
        { secondaryDirectiveIds: matchedSecondaries.map((secondary) => secondary.id) },
      ),
    );
    return { ok: false, activeTriggerIds, matchedSecondaryDirectiveIds };
  }

  const secondary = matchedSecondaries[0];
  pushTraceEvent(
    events,
    nextSeq,
    'PRIME_DIRECTIVE_APPLIED',
    { kind: 'molt_block', id: neoBlock.primeDirectiveId },
    { neoBlockId: neoBlock.id },
  );
  if (secondary) {
    pushTraceEvent(
      events,
      nextSeq,
      'SECONDARY_DIRECTIVE_SELECTED',
      { kind: 'secondary_directive', id: secondary.id },
      {
        relationId: secondary.id,
        directiveBlockId: secondary.directiveBlockId,
        triggerBlockId: secondary.triggerBlockId,
      },
    );
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
        pushTraceEvent(events, nextSeq, 'BUNDLE_APPLIED', { kind: 'bundle', id: bundle.id }, {
          neoBlockId: neoBlock.id,
          moltType: bundle.moltType,
          secondaryDirectiveId: secondary?.id,
        });

        const activeIds = new Set(bundle.rows.flatMap((row) => row.blockIds));
        localBlocks
          .filter((block) => block.type === moltType && !activeIds.has(block.id))
          .forEach((block) => {
            pushTraceEvent(events, nextSeq, 'MOLT_READY', { kind: 'molt_block', id: block.id }, {
              neoBlockId: neoBlock.id,
              reason: 'omitted_from_active_bundle',
              bundleId: bundle.id,
            });
          });
      } else {
        rows = resolveRows(neoBlock.baseGeometry[moltType] ?? [], indexes, mergeByResult);
        geometrySource = 'base';
        if (rows.length > 0) {
          pushTraceEvent(events, nextSeq, 'BASE_GEOMETRY_APPLIED', { kind: 'neoblock', id: neoBlock.id }, {
            moltType,
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
      pushTraceEvent(events, nextSeq, 'MERGE_VALIDATED', { kind: 'merge', id: merge.id }, {
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
  const directStackOffByRule = new Map<string, string[]>();
  const directBlockOffByRule = new Map<string, string[]>();
  const governanceOrder = new Map((sleeve.governance ?? []).map((rule, index) => [rule.id, index]));
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
      appendGovernanceRuleId(directStackOffByRule, stackId, rule.id);
    }
    for (const blockId of rule.offNeoBlockIds ?? []) {
      appendGovernanceRuleId(directBlockOffByRule, blockId, rule.id);
    }
  }

  const stackAvailabilityCache = new Map<string, Availability>();
  const blockAvailabilityCache = new Map<string, Availability>();

  const stackAvailability = (stackId: string): Availability => {
    const cached = stackAvailabilityCache.get(stackId);
    if (cached) return cached;

    const parentId = indexes.parentByStackId.get(stackId);
    const parentAvailability = parentId ? stackAvailability(parentId) : undefined;
    const directGovernanceRuleIds = orderedGovernanceRuleIds(
      directStackOffByRule.get(stackId) ?? [],
      governanceOrder,
    );
    const inheritedGovernanceRuleIds =
      parentId && parentAvailability?.state === 'off'
        ? orderedGovernanceRuleIds(governanceRuleIdsFromBlocker(parentAvailability.blocker), governanceOrder)
        : [];
    const governanceRuleIds = orderedGovernanceRuleIds(
      [...inheritedGovernanceRuleIds, ...directGovernanceRuleIds],
      governanceOrder,
    );
    if (governanceRuleIds.length) {
      const governanceRuleId = firstGovernanceRuleId(governanceRuleIds);
      const value: Availability = {
        state: 'off',
        blocker: {
          effectiveState: 'off',
          blockingObjectId:
            directGovernanceRuleIds.length > 0
              ? firstGovernanceRuleId(directGovernanceRuleIds)!
              : parentId ?? stackId,
          blockingReason: directGovernanceRuleIds.length > 0 ? 'governance_off' : 'ancestor_governance_off',
          blockingSource: directGovernanceRuleIds.length > 0 ? 'governance' : 'ancestor',
          ...(governanceRuleId ? { governanceRuleId } : {}),
          governanceRuleIds,
          ...(directGovernanceRuleIds.length ? { directGovernanceRuleIds } : {}),
          ...(inheritedGovernanceRuleIds.length ? { inheritedGovernanceRuleIds } : {}),
          ...(parentId && inheritedGovernanceRuleIds.length ? { inheritedFromId: parentId } : {}),
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

    const stackId = indexes.stackByNeoBlockId.get(blockId);
    const containingStackAvailability = stackId ? stackAvailability(stackId) : undefined;
    const directGovernanceRuleIds = orderedGovernanceRuleIds(
      directBlockOffByRule.get(blockId) ?? [],
      governanceOrder,
    );
    const inheritedGovernanceRuleIds =
      stackId && containingStackAvailability?.state === 'off'
        ? orderedGovernanceRuleIds(governanceRuleIdsFromBlocker(containingStackAvailability.blocker), governanceOrder)
        : [];
    const governanceRuleIds = orderedGovernanceRuleIds(
      [...inheritedGovernanceRuleIds, ...directGovernanceRuleIds],
      governanceOrder,
    );
    if (governanceRuleIds.length) {
      const governanceRuleId = firstGovernanceRuleId(governanceRuleIds);
      const value: Availability = {
        state: 'off',
        blocker: {
          effectiveState: 'off',
          blockingObjectId:
            directGovernanceRuleIds.length > 0
              ? firstGovernanceRuleId(directGovernanceRuleIds)!
              : stackId ?? blockId,
          blockingReason: directGovernanceRuleIds.length > 0 ? 'governance_off' : 'container_neostack_off',
          blockingSource:
            directGovernanceRuleIds.length > 0
              ? 'governance'
              : containingStackAvailability?.blocker?.blockingSource === 'ancestor'
                ? 'ancestor'
                : 'governance',
          ...(governanceRuleId ? { governanceRuleId } : {}),
          governanceRuleIds,
          ...(directGovernanceRuleIds.length ? { directGovernanceRuleIds } : {}),
          ...(inheritedGovernanceRuleIds.length ? { inheritedGovernanceRuleIds } : {}),
          ...(stackId && inheritedGovernanceRuleIds.length ? { inheritedFromId: stackId } : {}),
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
      pushTraceEvent(events, nextSeq, 'NEOSTACK_DISABLED', { kind: 'neostack', id: stack.id }, stackTraceData(stack.id, indexes));
    } else if (availability.state === 'off') {
      pushTraceEvent(events, nextSeq, 'NEOSTACK_OFF', { kind: 'neostack', id: stack.id }, {
        ...stackTraceData(stack.id, indexes),
        ...blockerTraceData(availability.blocker),
      });
    }
  }

  for (const block of sleeve.neoBlocks) {
    const availability = blockAvailability(block.id);
    finalNeoBlockStates[block.id] = availability.state;
    const stackId = indexes.stackByNeoBlockId.get(block.id);
    if (!stackId) continue;
    if (availability.state === 'disabled') {
      pushTraceEvent(events, nextSeq, 'NEOBLOCK_DISABLED', { kind: 'neoblock', id: block.id }, neoBlockTraceData(block.id, stackId, indexes));
    } else if (availability.state === 'off') {
      pushTraceEvent(events, nextSeq, 'NEOBLOCK_OFF', { kind: 'neoblock', id: block.id }, {
        ...neoBlockTraceData(block.id, stackId, indexes),
        ...blockerTraceData(availability.blocker),
      });
    }
  }

  for (const rule of appliedGovernanceRules) {
    pushTraceEvent(events, nextSeq, 'GOVERNANCE_RULE_APPLIED', { kind: 'governance', id: rule.id }, {
      name: rule.name,
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
        { kind: 'neostack', id: stackId },
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
      pushTraceEvent(events, nextSeq, 'NEOSTACK_SELECTION_BLOCKED', { kind: 'neostack', id: stackId }, {
        ...stackTraceData(stackId, indexes),
        diagnosticCode: diagnostic.code,
        ...(diagnostic.details ?? {}),
      });
      continue;
    }

    const missingAncestorNeoStackId = firstMissingSelectedAncestor(stackId, requestedStacks, indexes);
    if (missingAncestorNeoStackId) {
      const diagnostic = errorDiagnostic(
        'SELECTION_MISSING_ANCESTOR',
        `Selected NeoStack ${stackId} requires selected ancestor ${missingAncestorNeoStackId}. compiler-vnext does not infer missing route ancestors.`,
        { kind: 'neostack', id: stackId },
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
      pushTraceEvent(events, nextSeq, 'NEOSTACK_SELECTION_BLOCKED', { kind: 'neostack', id: stackId }, {
        ...stackTraceData(stackId, indexes),
        diagnosticCode: diagnostic.code,
        ...(diagnostic.details ?? {}),
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
      pushTraceEvent(events, nextSeq, 'NEOSTACK_SELECTION_BLOCKED', { kind: 'neostack', id: stackId }, {
        ...stackTraceData(stackId, indexes),
        diagnosticCode: diagnostic.code,
        ...(diagnostic.details ?? {}),
      });
      continue;
    }

    executableSelectedStacks.add(stackId);
  }

  const activeNeoStackIds = orderedSelectedStacksFromController(sleeve, executableSelectedStacks, indexes);
  const activeStackSet = new Set(activeNeoStackIds);

  activeNeoStackIds.forEach((stackId, index) => {
    finalNeoStackStates[stackId] = 'active';
    pushTraceEvent(events, nextSeq, 'NEOSTACK_ACTIVE', { kind: 'neostack', id: stackId }, {
      ...stackTraceData(stackId, indexes),
      selectionOrder: index + 1,
    });
  });

  sleeve.neoStacks
    .filter((stack) => finalNeoStackStates[stack.id] === 'ready')
    .forEach((stack) => {
      pushTraceEvent(events, nextSeq, 'NEOSTACK_READY', { kind: 'neostack', id: stack.id }, stackTraceData(stack.id, indexes));
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
        { kind: 'neoblock', id: blockId },
        'selection.activeNeoBlockIds',
        {
          targetId: blockId,
          targetKind: 'neoblock',
          blockingReason: 'container_unknown',
          blockingSource: 'selection',
        },
      );
      diagnostics.push(diagnostic);
      pushTraceEvent(events, nextSeq, 'NEOBLOCK_SELECTION_ATTEMPTED', { kind: 'neoblock', id: blockId }, attemptData);
      pushTraceEvent(events, nextSeq, 'NEOBLOCK_SELECTION_BLOCKED', { kind: 'neoblock', id: blockId }, {
        diagnosticCode: diagnostic.code,
        ...(diagnostic.details ?? {}),
      });
      continue;
    }

    if (!requestedStacks.has(stackId)) {
      const diagnostic = errorDiagnostic(
        'SELECTION_NEOBLOCK_CONTAINER_NOT_SELECTED',
        `Selected NeoBlock ${blockId} requires selected containing NeoStack ${stackId}. compiler-vnext does not infer missing route ancestors or containers.`,
        { kind: 'neoblock', id: blockId },
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
      pushTraceEvent(events, nextSeq, 'NEOBLOCK_SELECTION_ATTEMPTED', { kind: 'neoblock', id: blockId }, attemptData);
      pushTraceEvent(events, nextSeq, 'NEOBLOCK_SELECTION_BLOCKED', { kind: 'neoblock', id: blockId }, {
        ...attemptData,
        diagnosticCode: diagnostic.code,
        ...(diagnostic.details ?? {}),
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
        pushTraceEvent(events, nextSeq, 'NEOBLOCK_SELECTION_ATTEMPTED', { kind: 'neoblock', id: blockId }, attemptData);
        pushTraceEvent(events, nextSeq, 'NEOBLOCK_SELECTION_BLOCKED', { kind: 'neoblock', id: blockId }, {
          ...attemptData,
          diagnosticCode: diagnostic.code,
          ...(diagnostic.details ?? {}),
        });
        continue;
      }

      const containerBlocker = selectedStackBlockers.get(stackId);
      const diagnostic = errorDiagnostic(
        'SELECTION_NEOBLOCK_CONTAINER_NOT_EXECUTABLE',
        `Selected NeoBlock ${blockId} requires executable containing NeoStack ${stackId}.`,
        { kind: 'neoblock', id: blockId },
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
      pushTraceEvent(events, nextSeq, 'NEOBLOCK_SELECTION_ATTEMPTED', { kind: 'neoblock', id: blockId }, attemptData);
      pushTraceEvent(events, nextSeq, 'NEOBLOCK_SELECTION_BLOCKED', { kind: 'neoblock', id: blockId }, {
        ...attemptData,
        diagnosticCode: diagnostic.code,
        ...(diagnostic.details ?? {}),
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
      pushTraceEvent(events, nextSeq, 'NEOBLOCK_SELECTION_ATTEMPTED', { kind: 'neoblock', id: blockId }, attemptData);
      pushTraceEvent(events, nextSeq, 'NEOBLOCK_SELECTION_BLOCKED', { kind: 'neoblock', id: blockId }, {
        ...attemptData,
        diagnosticCode: diagnostic.code,
        ...(diagnostic.details ?? {}),
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
    pushTraceEvent(events, nextSeq, 'NEOBLOCK_SELECTION_ATTEMPTED', { kind: 'neoblock', id: blockId }, blockData);
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
      pushTraceEvent(events, nextSeq, 'NEOBLOCK_ACTIVE', { kind: 'neoblock', id: blockId }, {
        ...blockData,
        activeTriggerIds: outcome.activeTriggerIds,
        secondaryDirectiveId: outcome.resolved.secondaryDirectiveId,
      });
      continue;
    }

    finalNeoBlockStates[blockId] = 'ready';
    const resolutionDiagnostics = diagnostics
      .slice(diagnosticOffset)
      .filter((diagnostic) => diagnostic.level === 'error')
      .map((diagnostic) => diagnostic.code);
    pushTraceEvent(events, nextSeq, 'NEOBLOCK_RESOLUTION_FAILED', { kind: 'neoblock', id: blockId }, {
      ...blockData,
      activeTriggerIds: outcome.activeTriggerIds,
      matchedSecondaryDirectiveIds: outcome.matchedSecondaryDirectiveIds,
      diagnosticCodes: resolutionDiagnostics,
    });
  }

  for (const block of sleeve.neoBlocks) {
    if (!resolvedNeoBlockIds.has(block.id) && finalNeoBlockStates[block.id] === 'ready') {
      const stackId = indexes.stackByNeoBlockId.get(block.id);
      if (!stackId) continue;
      pushTraceEvent(events, nextSeq, 'NEOBLOCK_READY', { kind: 'neoblock', id: block.id }, neoBlockTraceData(block.id, stackId, indexes));
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
