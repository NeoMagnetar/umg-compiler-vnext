import type { DiagnosticSubject, DiagnosticSubjectKind } from './diagnostic-registry.js';
import { TRACE_EVENT_REGISTRY_VERSION } from './version-contract.js';

export const TRACE_STAGES = ['intake', 'semantic', 'resolution', 'output', 'post_run'] as const;
export type TraceStage = (typeof TRACE_STAGES)[number];

export const TRACE_STAGE_ORDER: Record<TraceStage, number> = {
  intake: 0,
  semantic: 1,
  resolution: 2,
  output: 3,
  post_run: 4,
};

export const TRACE_SUBJECT_ID_POLICIES = ['required', 'optional', 'forbidden'] as const;
export type TraceSubjectIdPolicy = (typeof TRACE_SUBJECT_ID_POLICIES)[number];

export interface TraceEventRegistryEntry {
  readonly stage: TraceStage;
  readonly allowedSubjectKinds: readonly DiagnosticSubjectKind[];
  readonly subjectIdPolicy: TraceSubjectIdPolicy;
  readonly summary: string;
  readonly requiredDataKeys: readonly string[];
}

const NO_REQUIRED_DATA_KEYS = [] as const;

function entry(
  stage: TraceStage,
  allowedSubjectKinds: readonly DiagnosticSubjectKind[],
  subjectIdPolicy: TraceSubjectIdPolicy,
  summary: string,
  requiredDataKeys: readonly string[] = NO_REQUIRED_DATA_KEYS,
): TraceEventRegistryEntry {
  return {
    stage,
    allowedSubjectKinds,
    subjectIdPolicy,
    summary,
    requiredDataKeys,
  };
}

export const TRACE_EVENT_REGISTRY = {
  SOURCE_VALIDATED: entry(
    'intake',
    ['sleeve'],
    'required',
    'Canonical authored sources and selection summary were accepted for semantic compilation.',
    [
      'sleeveSchemaVersion',
      'selectionSchemaVersion',
      'controllerNeoStackId',
      'route',
      'triggerStateTrueIds',
      'activeOverlayIds',
      'activeGovernanceRuleIds',
      'disabledNeoStackIds',
      'disabledNeoBlockIds',
      'routeRationale',
      'counts',
    ],
  ),
  ROUTE_SELECTION_RECEIVED: entry(
    'intake',
    ['selection'],
    'forbidden',
    'Route rationale was supplied by the caller.',
    ['routeRationale'],
  ),
  VALIDATION_ERROR: entry(
    'semantic',
    [
      'compiler',
      'sleeve',
      'selection',
      'molt_block',
      'neoblock',
      'neostack',
      'secondary_directive',
      'bundle',
      'merge',
      'scoped_attachment',
      'overlay',
      'governance',
      'runtime',
      'trace',
      'compile_result',
    ],
    'optional',
    'A semantic error diagnostic was recorded.',
    ['diagnosticIndex', 'code'],
  ),
  VALIDATION_WARNING: entry(
    'semantic',
    [
      'compiler',
      'sleeve',
      'selection',
      'molt_block',
      'neoblock',
      'neostack',
      'secondary_directive',
      'bundle',
      'merge',
      'scoped_attachment',
      'overlay',
      'governance',
      'runtime',
      'trace',
      'compile_result',
    ],
    'optional',
    'A semantic warning diagnostic was recorded.',
    ['diagnosticIndex', 'code'],
  ),
  RESOLUTION_ERROR: entry(
    'resolution',
    [
      'compiler',
      'sleeve',
      'selection',
      'molt_block',
      'neoblock',
      'neostack',
      'secondary_directive',
      'bundle',
      'merge',
      'scoped_attachment',
      'overlay',
      'governance',
      'runtime',
      'trace',
      'compile_result',
    ],
    'optional',
    'A resolution error diagnostic was recorded.',
    ['diagnosticIndex', 'code'],
  ),
  RESOLUTION_WARNING: entry(
    'resolution',
    [
      'compiler',
      'sleeve',
      'selection',
      'molt_block',
      'neoblock',
      'neostack',
      'secondary_directive',
      'bundle',
      'merge',
      'scoped_attachment',
      'overlay',
      'governance',
      'runtime',
      'trace',
      'compile_result',
    ],
    'optional',
    'A resolution warning diagnostic was recorded.',
    ['diagnosticIndex', 'code'],
  ),
  NEOSTACK_SELECTION_BLOCKED: entry(
    'resolution',
    ['neostack'],
    'required',
    'A selected NeoStack could not enter execution.',
    ['diagnosticCode'],
  ),
  NEOSTACK_ACTIVE: entry(
    'resolution',
    ['neostack'],
    'required',
    'A NeoStack is active in the resolved route.',
    ['depth'],
  ),
  NEOSTACK_READY: entry(
    'resolution',
    ['neostack'],
    'required',
    'A NeoStack remains ready after resolution.',
    ['depth'],
  ),
  NEOSTACK_DISABLED: entry(
    'resolution',
    ['neostack'],
    'required',
    'A NeoStack is disabled by authored or caller configuration.',
    ['depth'],
  ),
  NEOSTACK_OFF: entry(
    'resolution',
    ['neostack'],
    'required',
    'A NeoStack is off by governance or inherited state.',
    ['depth'],
  ),
  NEOBLOCK_SELECTION_ATTEMPTED: entry(
    'resolution',
    ['neoblock'],
    'required',
    'Resolution attempted to activate a NeoBlock.',
    ['neoStackId', 'rowInNeoStack'],
  ),
  NEOBLOCK_SELECTION_BLOCKED: entry(
    'resolution',
    ['neoblock'],
    'required',
    'A selected NeoBlock could not enter execution.',
    ['diagnosticCode', 'neoStackId'],
  ),
  NEOBLOCK_ACTIVE: entry(
    'resolution',
    ['neoblock'],
    'required',
    'A NeoBlock is active in the resolved route.',
    ['neoStackId', 'rowInNeoStack'],
  ),
  NEOBLOCK_READY: entry(
    'resolution',
    ['neoblock'],
    'required',
    'A NeoBlock remains ready after resolution.',
    ['neoStackId', 'rowInNeoStack'],
  ),
  NEOBLOCK_DISABLED: entry(
    'resolution',
    ['neoblock'],
    'required',
    'A NeoBlock is disabled by authored or caller configuration.',
    ['neoStackId', 'rowInNeoStack'],
  ),
  NEOBLOCK_OFF: entry(
    'resolution',
    ['neoblock'],
    'required',
    'A NeoBlock is off by governance or container state.',
    ['neoStackId', 'rowInNeoStack'],
  ),
  NEOBLOCK_RESOLUTION_FAILED: entry(
    'resolution',
    ['neoblock'],
    'required',
    'Resolution failed while activating a NeoBlock.',
    ['neoStackId'],
  ),
  TRIGGER_EVALUATED: entry(
    'resolution',
    ['molt_block'],
    'required',
    'A Trigger block was evaluated against selection state.',
    ['active', 'matched', 'neoBlockId'],
  ),
  PRIME_DIRECTIVE_APPLIED: entry(
    'resolution',
    ['molt_block'],
    'required',
    'A Prime Directive was applied to an active NeoBlock.',
    ['neoBlockId'],
  ),
  SECONDARY_DIRECTIVE_SELECTED: entry(
    'resolution',
    ['secondary_directive'],
    'required',
    'A Secondary Directive relation was selected.',
    ['directiveBlockId', 'triggerBlockId'],
  ),
  BASE_GEOMETRY_APPLIED: entry(
    'resolution',
    ['neoblock'],
    'required',
    'Base geometry contributed to a resolved lane.',
    ['moltType'],
  ),
  BUNDLE_APPLIED: entry(
    'resolution',
    ['bundle'],
    'required',
    'A Bundle replaced base geometry for a lane.',
    ['neoBlockId', 'moltType', 'secondaryDirectiveId'],
  ),
  GEOMETRY_RESOLVED: entry(
    'resolution',
    ['neoblock'],
    'required',
    'A lane geometry surface was resolved.',
    ['neoBlockId', 'moltType', 'source', 'rows', 'readOrder'],
  ),
  MOLT_READY: entry(
    'resolution',
    ['molt_block'],
    'required',
    'A local MOLT block remained ready instead of becoming effective output.',
    ['neoBlockId', 'reason'],
  ),
  SCOPED_MOLT_APPLIED: entry(
    'resolution',
    ['scoped_attachment'],
    'required',
    'A scoped attachment contributed cognition.',
    ['blockId', 'scope', 'neoBlockId', 'neoStackId', 'moltType'],
  ),
  OVERLAY_APPLIED: entry(
    'resolution',
    ['scoped_attachment'],
    'required',
    'An Overlay attachment contributed cognition.',
    ['blockId', 'overlayId', 'scope', 'neoBlockId', 'neoStackId', 'moltType'],
  ),
  MERGE_VALIDATED: entry(
    'resolution',
    ['merge'],
    'required',
    'A Merge result passed authority checks and placement.',
    ['neoBlockId', 'sources', 'result', 'authorityCeiling', 'authorityCheck'],
  ),
  GOVERNANCE_RULE_APPLIED: entry(
    'resolution',
    ['governance'],
    'required',
    'A Governance rule was active for this compile.',
    ['name'],
  ),
  RUNTIME_COMPILED: entry(
    'output',
    ['runtime'],
    'forbidden',
    'RuntimeSpec construction completed successfully.',
    [
      'runtimeHash',
      'promptPartCount',
      'totalNeoStacks',
      'totalNeoBlocks',
      'totalMoltBlocks',
      'activeNeoStacks',
      'activeNeoBlocks',
      'effectiveMoltBlocks',
    ],
  ),
  POST_RUN_RESET_DECLARED: entry(
    'post_run',
    ['runtime'],
    'forbidden',
    'ResetPlan was declared for the host runtime.',
    ['neoStackIds', 'neoBlockIds', 'targetState'],
  ),
} as const satisfies Record<string, TraceEventRegistryEntry>;

export type TraceEventType = keyof typeof TRACE_EVENT_REGISTRY;

export interface TraceEventContractIssue {
  field: string;
  message: string;
}

export interface TraceEventRecord {
  seq: number;
  type: TraceEventType;
  stage: TraceStage;
  subject: DiagnosticSubject;
  data: Record<string, unknown>;
}

function validateSubjectIdPolicy(
  subject: DiagnosticSubject,
  policy: TraceSubjectIdPolicy,
): TraceEventContractIssue[] {
  if (subject.id !== undefined && subject.id.length === 0) {
    return [{ field: 'subject.id', message: 'Trace event subject.id must be non-empty when supplied.' }];
  }

  if (policy === 'required' && !subject.id) {
    return [{ field: 'subject.id', message: 'Trace event subject.id is required for this event type.' }];
  }
  if (policy === 'forbidden' && subject.id !== undefined) {
    return [{ field: 'subject.id', message: 'Trace event subject.id is forbidden for this event type.' }];
  }
  return [];
}

export function validateTraceEventAgainstRegistry(event: {
  type: TraceEventType;
  stage: TraceStage;
  subject: DiagnosticSubject;
  data: Record<string, unknown>;
}): TraceEventContractIssue[] {
  const entry = TRACE_EVENT_REGISTRY[event.type];
  const issues: TraceEventContractIssue[] = [];

  if (event.stage !== entry.stage) {
    issues.push({
      field: 'stage',
      message: `Trace event ${event.type} must use stage ${entry.stage}.`,
    });
  }

  if (!entry.allowedSubjectKinds.includes(event.subject.kind)) {
    issues.push({
      field: 'subject.kind',
      message: `Trace event ${event.type} cannot use subject kind ${event.subject.kind}.`,
    });
  }

  issues.push(...validateSubjectIdPolicy(event.subject, entry.subjectIdPolicy));

  for (const key of entry.requiredDataKeys) {
    if (event.data[key] === undefined) {
      issues.push({
        field: `data.${key}`,
        message: `Trace event ${event.type} requires data.${key}.`,
      });
    }
  }

  return issues;
}

export function createTraceEvent(
  seq: number,
  type: TraceEventType,
  subject: DiagnosticSubject,
  data: Record<string, unknown>,
): TraceEventRecord {
  const event: TraceEventRecord = {
    seq,
    type,
    stage: TRACE_EVENT_REGISTRY[type].stage,
    subject,
    data,
  };
  const issues = validateTraceEventAgainstRegistry(event);
  if (issues.length > 0) {
    throw new Error(issues.map((issue) => issue.message).join(' '));
  }
  return event;
}

export function traceEventRegistryAsJson(): {
  registryVersion: typeof TRACE_EVENT_REGISTRY_VERSION;
  entries: Record<TraceEventType, TraceEventRegistryEntry>;
} {
  return {
    registryVersion: TRACE_EVENT_REGISTRY_VERSION,
    entries: JSON.parse(JSON.stringify(TRACE_EVENT_REGISTRY)) as Record<TraceEventType, TraceEventRegistryEntry>,
  };
}
