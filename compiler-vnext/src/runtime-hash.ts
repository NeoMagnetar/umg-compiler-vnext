import { sha256Canonical } from './canonicalize.js';
import { RUNTIME_HASH_PROFILE_VERSION } from './version-contract.js';
import type {
  PromptPart,
  ResolvedGeometryRow,
  ResolvedLane,
  ResolvedMoltBlock,
  ResolvedNeoBlock,
  RuntimeSpec,
  ScopeRef,
} from './types.js';

type RuntimeHashInput = Pick<
  RuntimeSpec,
  | 'schemaVersion'
  | 'sleeveId'
  | 'controllerNeoStackId'
  | 'activeNeoStackIds'
  | 'resolvedNeoBlocks'
  | 'promptParts'
  | 'resetPlan'
> &
  Partial<Pick<RuntimeSpec, 'compilerVersion' | 'sleeveName' | 'compiledAt' | 'diagnostics' | 'runtimeHash'>>;

function projectScope(scope: ScopeRef): ScopeRef {
  return scope.kind === 'sleeve'
    ? { kind: 'sleeve' }
    : { kind: 'neostack', neoStackId: scope.neoStackId };
}

function projectResolvedMolt(block: ResolvedMoltBlock) {
  return {
    id: block.id,
    type: block.type,
    content: block.content,
    sourceMode: block.sourceMode,
    sourceId: block.sourceId,
    ...(block.sourceScope !== undefined ? { sourceScope: projectScope(block.sourceScope) } : {}),
    ...(block.overlayId !== undefined ? { overlayId: block.overlayId } : {}),
    ...(block.mergeId !== undefined ? { mergeId: block.mergeId } : {}),
  };
}

function projectPromptPart(part: PromptPart) {
  return {
    ...projectResolvedMolt(part),
    neoStackId: part.neoStackId,
    neoBlockId: part.neoBlockId,
    laneOrder: part.laneOrder,
    scopeLayer: part.scopeLayer,
    row: part.row,
    column: part.column,
  };
}

function projectResolvedRow(row: ResolvedGeometryRow) {
  return {
    row: row.row,
    blocks: row.blocks.map(projectResolvedMolt),
  };
}

function projectResolvedLane(lane: ResolvedLane) {
  return {
    moltType: lane.moltType,
    geometrySource: lane.geometrySource,
    ...(lane.bundleId !== undefined ? { bundleId: lane.bundleId } : {}),
    scoped: lane.scoped.map(projectResolvedMolt),
    rows: lane.rows.map(projectResolvedRow),
  };
}

function projectResolvedNeoBlock(neoBlock: ResolvedNeoBlock) {
  return {
    id: neoBlock.id,
    state: neoBlock.state,
    postRunState: neoBlock.postRunState,
    primeDirectiveId: neoBlock.primeDirectiveId,
    ...(neoBlock.secondaryDirectiveId !== undefined
      ? { secondaryDirectiveId: neoBlock.secondaryDirectiveId }
      : {}),
    activeTriggerIds: [...neoBlock.activeTriggerIds],
    lanes: neoBlock.lanes.map(projectResolvedLane),
  };
}

export function buildRuntimeHashPayload(runtime: RuntimeHashInput) {
  return {
    hashProfileVersion: RUNTIME_HASH_PROFILE_VERSION,
    runtimeSchemaVersion: runtime.schemaVersion,
    sleeveId: runtime.sleeveId,
    controllerNeoStackId: runtime.controllerNeoStackId,
    activeNeoStackIds: [...runtime.activeNeoStackIds],
    resolvedNeoBlocks: runtime.resolvedNeoBlocks.map(projectResolvedNeoBlock),
    promptParts: runtime.promptParts.map(projectPromptPart),
    resetPlan: {
      neoStackIds: [...runtime.resetPlan.neoStackIds],
      neoBlockIds: [...runtime.resetPlan.neoBlockIds],
      targetState: runtime.resetPlan.targetState,
    },
  };
}

export function computeRuntimeHash(runtime: RuntimeHashInput): string {
  return sha256Canonical(buildRuntimeHashPayload(runtime));
}
