import type {
  DiagnosticCode,
  DiagnosticLevel,
  DiagnosticStage,
  DiagnosticSubject,
} from './diagnostic-registry.js';
import type { TraceEventType, TraceStage } from './trace-event-registry.js';

export const MOLT_TYPES = [
  'trigger',
  'directive',
  'instruction',
  'subject',
  'primary',
  'philosophy',
  'blueprint',
] as const;

export type MoltType = (typeof MOLT_TYPES)[number];
export type BundleMoltType = Exclude<MoltType, 'trigger' | 'directive'>;
export type ScopedMoltType = 'instruction' | 'philosophy' | 'blueprint';

export type AuthoredState = 'ready' | 'disabled';
export type RuntimeState = 'ready' | 'active' | 'off' | 'disabled';
export type SourceMode = 'local' | 'scoped' | 'overlay' | 'merge';
export type RouteRationale = Record<string, unknown>;

export interface SourceProvenance {
  sourceId?: string;
  sourceVersion?: string;
  sourceUri?: string;
  notes?: string;
}

export interface MoltBlock {
  id: string;
  type: MoltType;
  content: string;
  title?: string;
  tags?: string[];
  provenance?: SourceProvenance;
}

export interface GeometryRow {
  /** One-based authored structural tier. Smaller row number means earlier read order only. */
  row: number;
  /** Left-to-right authored read order. All members are semantic peers on this tier. */
  blockIds: string[];
}

export type LaneGeometryMap = Partial<Record<MoltType, GeometryRow[]>>;

export interface MoltBundle {
  id: string;
  name?: string;
  moltType: BundleMoltType;
  rows: GeometryRow[];
}

export interface SecondaryDirective {
  id: string;
  directiveBlockId: string;
  triggerBlockId: string;
  /**
   * Lane-specific bundles selected when this Secondary Directive is active.
   * A missing bundle means that lane falls back to Base Geometry.
   */
  bundles?: Partial<Record<BundleMoltType, string>>;
}

export interface MergeDeclaration {
  id: string;
  sourceBlockIds: string[];
  /** Pre-authored result. vNext does not generate merge prose inside the compiler. */
  resultBlockId: string;
}

export interface NeoBlock {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  defaultState?: AuthoredState;
  /** Local MOLT blocks owned by this NeoBlock. */
  moltBlockIds: string[];
  /** Exactly one local Directive block. */
  primeDirectiveId: string;
  secondaryDirectives?: SecondaryDirective[];
  baseGeometry: LaneGeometryMap;
  bundles?: MoltBundle[];
  merges?: MergeDeclaration[];
}

export interface NeoBlockRow {
  /** One-based authored structural tier inside the containing NeoStack. */
  row: number;
  /** Left-to-right authored peer order only. This creates no numeric weighting. */
  neoBlockIds: string[];
}

export interface NeoStackRow {
  /** One-based authored structural tier inside the containing NeoStack. */
  row: number;
  /** Left-to-right authored peer order only. This creates no numeric weighting. */
  neoStackIds: string[];
}

export interface NeoStack {
  id: string;
  name: string;
  /** Brief context capsule only. It creates no rules or authority. */
  skill: string;
  tags?: string[];
  defaultState?: AuthoredState;
  neoBlockRows: NeoBlockRow[];
  childStackRows?: NeoStackRow[];
}

export type ScopeRef =
  | { kind: 'sleeve' }
  | { kind: 'neostack'; neoStackId: string };

export interface ScopedMoltAttachment {
  id: string;
  blockId: string;
  scope: ScopeRef;
}

export interface Overlay {
  id: string;
  name: string;
  attachments: ScopedMoltAttachment[];
}

export interface GovernanceRule {
  id: string;
  name: string;
  description: string;
  offNeoStackIds?: string[];
  offNeoBlockIds?: string[];
}

export interface Sleeve {
  schemaVersion: 'umg.compiler-vnext.sleeve.v0.1';
  id: string;
  name: string;
  description?: string;
  controllerNeoStackId: string;
  moltBlocks: MoltBlock[];
  neoBlocks: NeoBlock[];
  neoStacks: NeoStack[];
  scopedMolt?: ScopedMoltAttachment[];
  overlays?: Overlay[];
  governance?: GovernanceRule[];
}

export interface CompileSelection {
  schemaVersion: 'umg.compiler-vnext.selection.v0.1';
  /** Fixed by caller so deterministic output does not depend on wall-clock time. */
  compiledAt: string;
  activeNeoStackIds: string[];
  activeNeoBlockIds: string[];
  /** Trigger conditions are interpreted outside the deterministic compiler. */
  triggerState: Record<string, boolean>;
  activeOverlayIds?: string[];
  activeGovernanceRuleIds?: string[];
  disabledNeoStackIds?: string[];
  disabledNeoBlockIds?: string[];
  routeRationale?: RouteRationale;
}

export type CompileStatus = 'success' | 'failure';

export type {
  DiagnosticCode,
  DiagnosticLevel,
  DiagnosticStage,
  DiagnosticSubject,
  DiagnosticSubjectKind,
} from './diagnostic-registry.js';
export type {
  TraceEventType,
  TraceStage,
  TraceSubjectIdPolicy,
  TraceEventRegistryEntry,
} from './trace-event-registry.js';

export interface CompilerDiagnostic {
  code: DiagnosticCode;
  level: DiagnosticLevel;
  stage: DiagnosticStage;
  subject: DiagnosticSubject;
  message: string;
  path?: string;
  details?: Record<string, unknown>;
}

export interface TraceEvent {
  seq: number;
  type: TraceEventType;
  stage: TraceStage;
  subject: DiagnosticSubject;
  data: Record<string, unknown>;
}

export interface Trace {
  schemaVersion: 'umg.compiler-vnext.trace.v0.1';
  compilerVersion: string;
  sleeveId: string;
  compiledAt: string;
  terminalStage: TraceStage;
  events: TraceEvent[];
  diagnostics: CompilerDiagnostic[];
  finalNeoStackStates: Record<string, RuntimeState>;
  finalNeoBlockStates: Record<string, RuntimeState>;
}

export interface ResolvedMoltBlock {
  id: string;
  type: MoltType;
  content: string;
  title?: string;
  sourceMode: SourceMode;
  sourceId: string;
  sourceScope?: ScopeRef;
  overlayId?: string;
  mergeId?: string;
}

export interface ResolvedGeometryRow {
  row: number;
  blocks: ResolvedMoltBlock[];
}

export interface ResolvedLane {
  moltType: MoltType;
  /** Broad-to-narrow explicit scoped context. Not merged automatically. */
  scoped: ResolvedMoltBlock[];
  /** Local Base Geometry or selected same-type Bundle. */
  rows: ResolvedGeometryRow[];
  geometrySource: 'base' | 'bundle' | 'generated-directive-lane' | 'evaluated-trigger-lane';
  bundleId?: string;
}

export interface ResolvedNeoBlock {
  id: string;
  name: string;
  state: 'active';
  postRunState: 'ready';
  primeDirectiveId: string;
  secondaryDirectiveId?: string;
  activeTriggerIds: string[];
  lanes: ResolvedLane[];
}

export interface PromptPart extends ResolvedMoltBlock {
  neoStackId: string;
  neoBlockId: string;
  laneOrder: number;
  scopeLayer: number;
  row: number;
  column: number;
}

export interface RuntimeSpec {
  schemaVersion: 'umg.compiler-vnext.runtime.v0.1';
  compilerVersion: string;
  sleeveId: string;
  sleeveName: string;
  controllerNeoStackId: string;
  compiledAt: string;
  activeNeoStackIds: string[];
  resolvedNeoBlocks: ResolvedNeoBlock[];
  promptParts: PromptPart[];
  diagnostics: CompilerDiagnostic[];
  runtimeHash: string;
  resetPlan: {
    neoStackIds: string[];
    neoBlockIds: string[];
    targetState: 'ready';
  };
}

export interface CompileResult {
  schemaVersion: 'umg.compiler-vnext.compile-result.v0.1';
  compilerVersion: string;
  status: CompileStatus;
  runtime: RuntimeSpec | null;
  trace: Trace | null;
  hasErrors: boolean;
  diagnostics: CompilerDiagnostic[];
}

export interface ValidationResult {
  diagnostics: CompilerDiagnostic[];
}
