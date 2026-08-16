import { DIAGNOSTIC_REGISTRY_VERSION } from './version-contract.js';

export const DIAGNOSTIC_LEVELS = ['error', 'warning'] as const;
export type DiagnosticLevel = (typeof DIAGNOSTIC_LEVELS)[number];

export const DIAGNOSTIC_STAGES = [
  'structural',
  'semantic',
  'resolution',
  'output',
  'internal',
] as const;
export type DiagnosticStage = (typeof DIAGNOSTIC_STAGES)[number];

export const DIAGNOSTIC_SUBJECT_KINDS = [
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
] as const;
export type DiagnosticSubjectKind = (typeof DIAGNOSTIC_SUBJECT_KINDS)[number];

export interface DiagnosticSubject {
  kind: DiagnosticSubjectKind;
  id?: string;
}

export interface DiagnosticRegistryEntry {
  readonly level: DiagnosticLevel;
  readonly stage: DiagnosticStage;
  readonly allowedSubjectKinds: readonly DiagnosticSubjectKind[];
  readonly summary: string;
  readonly requiredDetailKeys: readonly string[];
}

interface DiagnosticContractIssue {
  field: string;
  message: string;
}

const ANY_STRUCTURAL_DOCUMENT = ['sleeve', 'selection', 'runtime', 'trace', 'compile_result'] as const;
const GEOMETRY_OWNER = ['neoblock', 'bundle'] as const;
const OPTIONAL_ID_SUBJECT_KINDS = new Set<DiagnosticSubjectKind>([
  'compiler',
  'selection',
  'runtime',
  'trace',
  'compile_result',
]);
const NO_REQUIRED_DETAILS = [] as const;

function entry(
  level: DiagnosticLevel,
  stage: DiagnosticStage,
  allowedSubjectKinds: readonly DiagnosticSubjectKind[],
  summary: string,
  requiredDetailKeys: readonly string[] = NO_REQUIRED_DETAILS,
): DiagnosticRegistryEntry {
  return {
    level,
    stage,
    allowedSubjectKinds,
    summary,
    requiredDetailKeys,
  };
}

export const DIAGNOSTIC_REGISTRY = {
  ACTIVE_NEOSTACK_OUTSIDE_CONTROLLER_TREE: entry(
    'error',
    'resolution',
    ['neostack'],
    'A selected NeoStack is outside the Controller NeoStack tree.',
    ['selectedNeoStackId', 'controllerNeoStackId', 'blockingReason', 'blockingSource'],
  ),
  ARRAY_TOO_SHORT: entry(
    'error',
    'structural',
    ANY_STRUCTURAL_DOCUMENT,
    'An array failed a structural minimum length requirement.',
    ['documentKind', 'minimumItems'],
  ),
  BUNDLE_REFERENCE_TYPE_MISMATCH: entry(
    'error',
    'semantic',
    ['secondary_directive'],
    'A Secondary Directive references a Bundle for the wrong lane type.',
  ),
  CONTROLLER_HAS_PARENT: entry(
    'error',
    'semantic',
    ['sleeve'],
    'The Controller NeoStack is not the apex of the tree.',
  ),
  CONTROLLER_NOT_SELECTED: entry(
    'error',
    'semantic',
    ['selection'],
    'The compile selection omitted the Controller NeoStack.',
  ),
  DIRECTIVE_BASE_GEOMETRY_CANON_VIOLATION: entry(
    'error',
    'semantic',
    ['neoblock'],
    'Directive Base Geometry violates the Prime/Secondary Directive canon.',
    ['primeDirectiveId', 'authoredRows'],
  ),
  DUPLICATE_BUNDLE_ID: entry(
    'error',
    'semantic',
    ['neoblock'],
    'Bundle IDs are duplicated inside one NeoBlock.',
    ['duplicateIds'],
  ),
  DUPLICATE_GEOMETRY_MEMBER: entry(
    'error',
    'semantic',
    GEOMETRY_OWNER,
    'A lane geometry repeats a block member.',
    ['duplicateBlockIds'],
  ),
  DUPLICATE_GEOMETRY_ROW: entry(
    'error',
    'semantic',
    GEOMETRY_OWNER,
    'A lane geometry repeats a row number.',
    ['duplicateRows'],
  ),
  DUPLICATE_GLOBAL_ID: entry(
    'error',
    'semantic',
    ['sleeve'],
    'Canonical object IDs are duplicated across the Sleeve.',
    ['duplicateIds'],
  ),
  DUPLICATE_LOCAL_MOLT_ID: entry(
    'error',
    'semantic',
    ['neoblock'],
    'A NeoBlock repeats a local MOLT block id.',
    ['duplicateIds'],
  ),
  DUPLICATE_MERGE_ID: entry(
    'error',
    'semantic',
    ['neoblock'],
    'Merge relation IDs are duplicated inside one NeoBlock.',
    ['duplicateIds'],
  ),
  DUPLICATE_MERGE_RESULT: entry(
    'error',
    'semantic',
    ['neoblock'],
    'More than one Merge declaration targets the same result block.',
    ['resultBlockId', 'mergeIds'],
  ),
  DUPLICATE_MODULE_ROW: entry(
    'error',
    'semantic',
    ['neostack'],
    'A NeoStack repeats a module row number.',
    ['duplicateRows'],
  ),
  DUPLICATE_MODULE_ROW_MEMBER: entry(
    'error',
    'semantic',
    ['neostack'],
    'A NeoStack repeats a member inside one parent geometry.',
    ['duplicateIds'],
  ),
  DUPLICATE_OVERLAY_ID: entry(
    'error',
    'semantic',
    ['overlay'],
    'Overlay IDs are duplicated.',
    ['duplicateIds'],
  ),
  DUPLICATE_SECONDARY_DIRECTIVE_ID: entry(
    'error',
    'semantic',
    ['neoblock'],
    'Secondary Directive relation IDs are duplicated inside one NeoBlock.',
    ['duplicateIds'],
  ),
  DUPLICATE_SELECTION_ID: entry(
    'error',
    'semantic',
    ['selection'],
    'A selection id list contains duplicates.',
    ['duplicateIds'],
  ),
  EMPTY_GEOMETRY: entry(
    'error',
    'semantic',
    GEOMETRY_OWNER,
    'A lane geometry is missing all rows.',
  ),
  EMPTY_GEOMETRY_ROW: entry(
    'error',
    'semantic',
    GEOMETRY_OWNER,
    'A lane geometry row is missing all members.',
  ),
  EMPTY_MODULE_ROW: entry(
    'error',
    'semantic',
    ['neostack'],
    'A NeoStack row is missing all members.',
  ),
  GOVERNANCE_RULE_NO_TARGETS: entry(
    'error',
    'semantic',
    ['governance'],
    'A Governance rule does not target any NeoStack or NeoBlock.',
  ),
  INTERNAL_COMPILER_ERROR: entry(
    'error',
    'internal',
    ['compiler'],
    'The compiler failed unexpectedly.',
  ),
  INTERNAL_OUTPUT_CONTRACT_VIOLATION: entry(
    'error',
    'output',
    ['compile_result'],
    'The compiler produced output that violates the public output contract.',
  ),
  INVALID_COMPILED_AT: entry(
    'error',
    'semantic',
    ['selection'],
    'The selection compiledAt value is not a valid ISO-8601 timestamp.',
  ),
  INVALID_CONST_VALUE: entry(
    'error',
    'structural',
    ANY_STRUCTURAL_DOCUMENT,
    'A field failed a structural const requirement.',
    ['documentKind', 'received'],
  ),
  INVALID_ENUM_VALUE: entry(
    'error',
    'structural',
    ANY_STRUCTURAL_DOCUMENT,
    'A field failed a structural enum requirement.',
    ['documentKind', 'received'],
  ),
  INVALID_FIELD_FORMAT: entry(
    'error',
    'structural',
    ANY_STRUCTURAL_DOCUMENT,
    'A field failed a structural format requirement.',
    ['documentKind', 'format'],
  ),
  INVALID_FIELD_TYPE: entry(
    'error',
    'structural',
    ANY_STRUCTURAL_DOCUMENT,
    'A field failed a structural type requirement.',
    ['documentKind', 'expectedType', 'receivedType'],
  ),
  INVALID_GEOMETRY_ROW: entry(
    'error',
    'semantic',
    GEOMETRY_OWNER,
    'A lane geometry row number is not a positive integer.',
  ),
  INVALID_MERGE_RESULT: entry(
    'error',
    'semantic',
    ['merge'],
    'A Merge result does not reference a local pre-authored result block.',
  ),
  INVALID_MERGE_SOURCE: entry(
    'error',
    'semantic',
    ['merge'],
    'A Merge source does not reference a local MOLT block.',
  ),
  INVALID_MODULE_ROW: entry(
    'error',
    'semantic',
    ['neostack'],
    'A NeoStack row number is not a positive integer.',
  ),
  INVALID_NUMERIC_RANGE: entry(
    'error',
    'structural',
    ANY_STRUCTURAL_DOCUMENT,
    'A numeric field failed a structural minimum requirement.',
    ['documentKind', 'minimum'],
  ),
  INVALID_PRIME_DIRECTIVE: entry(
    'error',
    'semantic',
    ['neoblock'],
    'A NeoBlock primeDirectiveId is not one local Directive block.',
  ),
  INVALID_ROUTE_RATIONALE: entry(
    'error',
    'semantic',
    ['selection'],
    'The selection routeRationale value is not a JSON object.',
  ),
  INVALID_SECONDARY_DIRECTIVE_BLOCK: entry(
    'error',
    'semantic',
    ['secondary_directive'],
    'A Secondary Directive does not reference a local Directive block.',
  ),
  INVALID_SECONDARY_TRIGGER_BLOCK: entry(
    'error',
    'semantic',
    ['secondary_directive'],
    'A Secondary Directive does not reference a local Trigger block.',
  ),
  INVALID_UNION_SHAPE: entry(
    'error',
    'structural',
    ANY_STRUCTURAL_DOCUMENT,
    'A value does not match any supported structural union shape.',
    ['documentKind'],
  ),
  LANE_MEMBER_TYPE_MISMATCH: entry(
    'error',
    'semantic',
    GEOMETRY_OWNER,
    'A lane member has the wrong MOLT type for the lane.',
    ['blockId', 'actualType', 'expectedType'],
  ),
  MERGE_AUTHORITY_ESCALATION: entry(
    'error',
    'semantic',
    ['merge'],
    'A Merge attempts to produce higher authority than its sources allow.',
    ['sourceTypes', 'resultType', 'highestAuthorizedType'],
  ),
  MERGE_CHAIN_UNSUPPORTED: entry(
    'error',
    'semantic',
    ['merge'],
    'A Merge references the result of another Merge.',
    ['dependencyMergeIds', 'sourceBlockIds'],
  ),
  MERGE_CYCLE: entry(
    'error',
    'semantic',
    ['neoblock'],
    'A NeoBlock declares a cyclic Merge dependency.',
    ['mergeIds', 'resultBlockIds'],
  ),
  MERGE_DUPLICATE_SOURCE: entry(
    'error',
    'structural',
    ANY_STRUCTURAL_DOCUMENT,
    'A Merge declaration repeats a source block id.',
  ),
  MERGE_RESULT_IS_SOURCE: entry(
    'error',
    'semantic',
    ['merge'],
    'A Merge result is also listed as a Merge source.',
    ['resultBlockId'],
  ),
  MERGE_RESULT_NOT_PLACED: entry(
    'error',
    'semantic',
    ['merge'],
    'A Merge result is not placed through Prime/Secondary Directive, Base Geometry, or a Bundle.',
    ['resultBlockId'],
  ),
  MERGE_RESULT_SCOPED_UNSUPPORTED: entry(
    'error',
    'semantic',
    ['scoped_attachment'],
    'A Merge result is referenced through scopedMolt or Overlay attachments.',
    ['blockId', 'attachmentId', 'sourceKind', 'ownerNeoBlockId'],
  ),
  MERGE_TOO_FEW_SOURCES: entry(
    'error',
    'structural',
    ANY_STRUCTURAL_DOCUMENT,
    'A Merge declaration has fewer than two source block ids.',
    ['documentKind', 'minimumItems'],
  ),
  MISSING_REQUIRED_FIELD: entry(
    'error',
    'structural',
    ANY_STRUCTURAL_DOCUMENT,
    'A required field is missing.',
    ['documentKind', 'missingProperty'],
  ),
  MULTIPLE_NEOSTACK_PARENTS: entry(
    'error',
    'semantic',
    ['neostack'],
    'A NeoStack appears beneath more than one parent.',
    ['parents'],
  ),
  MULTIPLE_SECONDARY_DIRECTIVE_MATCH: entry(
    'error',
    'resolution',
    ['neoblock'],
    'More than one Secondary Directive matched one active NeoBlock.',
    ['secondaryDirectiveIds'],
  ),
  NEOBLOCK_IN_MULTIPLE_NEOSTACKS: entry(
    'error',
    'semantic',
    ['neostack'],
    'A NeoBlock appears in more than one NeoStack.',
    ['neoStacks'],
  ),
  NEOBLOCK_WITHOUT_NEOSTACK: entry(
    'error',
    'semantic',
    ['neoblock'],
    'A NeoBlock is not placed in any NeoStack.',
  ),
  NEOSTACK_CYCLE: entry(
    'error',
    'semantic',
    ['neostack'],
    'A NeoStack cycle exists in the parent tree.',
  ),
  NONCONTIGUOUS_GEOMETRY_ROWS: entry(
    'error',
    'semantic',
    GEOMETRY_OWNER,
    'Lane geometry rows are not one-based contiguous integers.',
    ['actualRows', 'expectedRows'],
  ),
  NONCONTIGUOUS_MODULE_ROWS: entry(
    'error',
    'semantic',
    ['neostack'],
    'NeoStack rows are not one-based contiguous integers.',
    ['actualRows', 'expectedRows'],
  ),
  NONLOCAL_GEOMETRY_MEMBER: entry(
    'error',
    'semantic',
    GEOMETRY_OWNER,
    'A lane geometry references a non-local MOLT block.',
  ),
  NO_TRIGGER_MATCH_FOR_ACTIVE_NEOBLOCK: entry(
    'error',
    'resolution',
    ['neoblock'],
    'An active NeoBlock has no true Trigger state.',
    ['neoBlockId', 'triggerBlockIds'],
  ),
  ORPHAN_LOCAL_DIRECTIVE: entry(
    'error',
    'semantic',
    ['neoblock'],
    'A non-Prime local Directive is not connected to a Secondary Directive or Merge.',
    ['directiveBlockIds'],
  ),
  ORPHAN_NEOSTACK: entry(
    'error',
    'semantic',
    ['neostack'],
    'A NeoStack is not properly parented beneath the Controller NeoStack.',
    ['controllerNeoStackId', 'reason'],
  ),
  PRIME_AS_SECONDARY_DIRECTIVE: entry(
    'error',
    'semantic',
    ['secondary_directive'],
    'A Prime Directive is also declared as a Secondary Directive.',
  ),
  REQUIRED_BASE_LANE_MISSING: entry(
    'error',
    'semantic',
    ['neoblock'],
    'A required Base Geometry lane is missing from a NeoBlock.',
  ),
  REQUIRED_MOLT_MISSING: entry(
    'error',
    'semantic',
    ['neoblock'],
    'A required local MOLT authority is missing from a NeoBlock.',
    ['moltType'],
  ),
  SCOPED_MOLT_TYPE_UNSUPPORTED: entry(
    'error',
    'semantic',
    ['scoped_attachment'],
    'A scopedMolt or Overlay attachment references an unsupported MOLT type.',
  ),
  SELECTION_MISSING_ANCESTOR: entry(
    'error',
    'resolution',
    ['neostack'],
    'A selected NeoStack is missing a selected ancestor.',
    ['selectedNeoStackId', 'missingAncestorNeoStackId', 'expectedPath', 'blockingReason', 'blockingSource'],
  ),
  SELECTION_NEOBLOCK_CONTAINER_NOT_EXECUTABLE: entry(
    'error',
    'resolution',
    ['neoblock'],
    'A selected NeoBlock is inside a selected but non-executable containing NeoStack.',
    ['targetId', 'targetKind', 'containerNeoStackId', 'blockingObjectId', 'blockingReason', 'blockingSource'],
  ),
  SELECTION_NEOBLOCK_CONTAINER_NOT_SELECTED: entry(
    'error',
    'resolution',
    ['neoblock'],
    'A selected NeoBlock is missing a selected containing NeoStack.',
    ['targetId', 'targetKind', 'containerNeoStackId', 'blockingObjectId', 'blockingReason', 'blockingSource'],
  ),
  SELECTION_NEOBLOCK_CONTAINER_UNKNOWN: entry(
    'error',
    'resolution',
    ['neoblock'],
    'A selected NeoBlock is not placed in any NeoStack.',
    ['targetId', 'targetKind', 'blockingReason', 'blockingSource'],
  ),
  SELECTION_TARGET_NOT_EXECUTABLE: entry(
    'error',
    'resolution',
    ['neostack', 'neoblock'],
    'A selected target has an effective state that prevents execution.',
    ['targetId', 'targetKind', 'effectiveState', 'blockingReason', 'blockingSource'],
  ),
  STRING_TOO_SHORT: entry(
    'error',
    'structural',
    ANY_STRUCTURAL_DOCUMENT,
    'A string failed a structural minimum length requirement.',
    ['documentKind', 'minimumLength'],
  ),
  STRUCTURAL_SCHEMA_VIOLATION: entry(
    'error',
    'structural',
    ANY_STRUCTURAL_DOCUMENT,
    'A value failed structural JSON Schema validation.',
    ['documentKind', 'keyword'],
  ),
  TRIGGER_BOUND_TO_MULTIPLE_SECONDARIES: entry(
    'error',
    'semantic',
    ['neoblock'],
    'One Trigger is bound to multiple Secondary Directives.',
    ['triggerBlockIds'],
  ),
  TRIGGER_MERGE_UNSUPPORTED: entry(
    'error',
    'semantic',
    ['merge'],
    'A Merge uses Trigger blocks, which are outside compiler-vnext Merge semantics.',
  ),
  TRIGGER_STATE_TYPE_MISMATCH: entry(
    'error',
    'semantic',
    ['molt_block'],
    'A triggerState entry references a non-trigger MOLT block.',
    ['actualType', 'expectedType'],
  ),
  UNKNOWN_ACTIVE_GOVERNANCE_RULE: entry(
    'error',
    'semantic',
    ['governance'],
    'The selection references an unknown active Governance rule.',
  ),
  UNKNOWN_ACTIVE_NEOBLOCK: entry(
    'error',
    'semantic',
    ['neoblock'],
    'The selection references an unknown active NeoBlock.',
  ),
  UNKNOWN_ACTIVE_NEOSTACK: entry(
    'error',
    'semantic',
    ['neostack'],
    'The selection references an unknown active NeoStack.',
  ),
  UNKNOWN_ACTIVE_OVERLAY: entry(
    'error',
    'semantic',
    ['overlay'],
    'The selection references an unknown active Overlay.',
  ),
  UNKNOWN_BUNDLE_REFERENCE: entry(
    'error',
    'semantic',
    ['secondary_directive'],
    'A Secondary Directive references an unknown Bundle.',
  ),
  UNKNOWN_CHILD_NEOSTACK: entry(
    'error',
    'semantic',
    ['neostack'],
    'A NeoStack references an unknown child NeoStack.',
  ),
  UNKNOWN_CONTROLLER_NEOSTACK: entry(
    'error',
    'semantic',
    ['sleeve'],
    'The Sleeve controllerNeoStackId does not reference an authored NeoStack.',
  ),
  UNKNOWN_DISABLED_NEOBLOCK: entry(
    'error',
    'semantic',
    ['neoblock'],
    'The selection references an unknown disabled NeoBlock.',
  ),
  UNKNOWN_DISABLED_NEOSTACK: entry(
    'error',
    'semantic',
    ['neostack'],
    'The selection references an unknown disabled NeoStack.',
  ),
  UNKNOWN_FIELD: entry(
    'error',
    'structural',
    ANY_STRUCTURAL_DOCUMENT,
    'An unexpected field is present.',
    ['documentKind', 'field'],
  ),
  UNKNOWN_GOVERNANCE_NEOBLOCK_TARGET: entry(
    'error',
    'semantic',
    ['governance'],
    'A Governance rule targets an unknown NeoBlock.',
  ),
  UNKNOWN_GOVERNANCE_NEOSTACK_TARGET: entry(
    'error',
    'semantic',
    ['governance'],
    'A Governance rule targets an unknown NeoStack.',
  ),
  UNKNOWN_LOCAL_MOLT_BLOCK: entry(
    'error',
    'semantic',
    ['neoblock'],
    'A NeoBlock references an unknown local MOLT block.',
  ),
  UNKNOWN_MOLT_BLOCK: entry(
    'error',
    'semantic',
    GEOMETRY_OWNER,
    'A lane geometry references an unknown MOLT block.',
  ),
  UNKNOWN_NEOBLOCK_IN_NEOSTACK: entry(
    'error',
    'semantic',
    ['neostack'],
    'A NeoStack references an unknown NeoBlock.',
  ),
  UNKNOWN_SCOPED_MOLT_BLOCK: entry(
    'error',
    'semantic',
    ['scoped_attachment'],
    'A scopedMolt or Overlay attachment references an unknown MOLT block.',
  ),
  UNKNOWN_SCOPED_NEOSTACK: entry(
    'error',
    'semantic',
    ['scoped_attachment'],
    'A scopedMolt or Overlay attachment references an unknown NeoStack scope.',
  ),
  UNKNOWN_TRIGGER_STATE_ID: entry(
    'error',
    'semantic',
    ['molt_block'],
    'A triggerState entry references an unknown MOLT block id.',
  ),
  UNREACHABLE_LOCAL_MOLT_BLOCK: entry(
    'warning',
    'semantic',
    ['neoblock'],
    'A local MOLT block is unreachable from authored runtime surfaces.',
    ['blockIds'],
  ),
  UNSUPPORTED_COMPILE_RESULT_SCHEMA: entry(
    'error',
    'structural',
    ['compile_result'],
    'The CompileResult schemaVersion is unsupported.',
    ['documentKind', 'received'],
  ),
  UNSUPPORTED_RUNTIME_SCHEMA: entry(
    'error',
    'structural',
    ['runtime'],
    'The RuntimeSpec schemaVersion is unsupported.',
    ['documentKind', 'received'],
  ),
  UNSUPPORTED_SELECTION_SCHEMA: entry(
    'error',
    'structural',
    ['selection'],
    'The CompileSelection schemaVersion is unsupported.',
    ['documentKind', 'received'],
  ),
  UNSUPPORTED_SLEEVE_SCHEMA: entry(
    'error',
    'structural',
    ['sleeve'],
    'The Sleeve schemaVersion is unsupported.',
    ['documentKind', 'received'],
  ),
  UNSUPPORTED_TRACE_SCHEMA: entry(
    'error',
    'structural',
    ['trace'],
    'The Trace schemaVersion is unsupported.',
    ['documentKind', 'received'],
  ),
} as const satisfies Record<string, DiagnosticRegistryEntry>;

export type DiagnosticCode = keyof typeof DIAGNOSTIC_REGISTRY;

export function getDiagnosticRegistryEntry(code: DiagnosticCode): DiagnosticRegistryEntry {
  return DIAGNOSTIC_REGISTRY[code];
}

function ownProperty<T extends object>(value: T, key: PropertyKey): key is keyof T {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function isDiagnosticCode(value: string): value is DiagnosticCode {
  return ownProperty(DIAGNOSTIC_REGISTRY, value);
}

export function diagnosticRegistryAsJson(): {
  registryVersion: typeof DIAGNOSTIC_REGISTRY_VERSION;
  entries: Record<string, DiagnosticRegistryEntry>;
} {
  return {
    registryVersion: DIAGNOSTIC_REGISTRY_VERSION,
    entries: Object.fromEntries(
      Object.entries(DIAGNOSTIC_REGISTRY)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([code, registryEntry]) => [
          code,
          {
            level: registryEntry.level,
            stage: registryEntry.stage,
            allowedSubjectKinds: [...registryEntry.allowedSubjectKinds],
            summary: registryEntry.summary,
            requiredDetailKeys: [...registryEntry.requiredDetailKeys],
          },
        ]),
    ),
  };
}

export function validateDiagnosticAgainstRegistry(diagnostic: {
  code?: unknown;
  level?: unknown;
  stage?: unknown;
  subject?: { kind?: unknown; id?: unknown } | null;
  details?: unknown;
}): DiagnosticContractIssue[] {
  const issues: DiagnosticContractIssue[] = [];
  if (typeof diagnostic.code !== 'string' || !isDiagnosticCode(diagnostic.code)) {
    issues.push({
      field: 'code',
      message: `Diagnostic code ${JSON.stringify(diagnostic.code)} is not registered.`,
    });
    return issues;
  }

  const entry = getDiagnosticRegistryEntry(diagnostic.code);
  if (diagnostic.level !== entry.level) {
    issues.push({
      field: 'level',
      message: `Diagnostic ${diagnostic.code} must use level ${entry.level}.`,
    });
  }
  if (diagnostic.stage !== entry.stage) {
    issues.push({
      field: 'stage',
      message: `Diagnostic ${diagnostic.code} must use stage ${entry.stage}.`,
    });
  }

  const subject = diagnostic.subject;
  if (!subject || typeof subject !== 'object') {
    issues.push({
      field: 'subject',
      message: `Diagnostic ${diagnostic.code} must include a subject.`,
    });
    return issues;
  }

  if (typeof subject.kind !== 'string' || !DIAGNOSTIC_SUBJECT_KINDS.includes(subject.kind as DiagnosticSubjectKind)) {
    issues.push({
      field: 'subject.kind',
      message: `Diagnostic ${diagnostic.code} must use a registered subject kind.`,
    });
  } else if (!entry.allowedSubjectKinds.includes(subject.kind as DiagnosticSubjectKind)) {
    issues.push({
      field: 'subject.kind',
      message: `Diagnostic ${diagnostic.code} cannot use subject kind ${subject.kind}.`,
    });
  }

  if (subject.id !== undefined) {
    if (typeof subject.id !== 'string' || subject.id.length === 0) {
      issues.push({
        field: 'subject.id',
        message: `Diagnostic ${diagnostic.code} subject.id must be a non-empty string when supplied.`,
      });
    }
  } else if (
    subject.kind === 'sleeve'
      ? entry.stage !== 'structural'
      : typeof subject.kind === 'string' && !OPTIONAL_ID_SUBJECT_KINDS.has(subject.kind as DiagnosticSubjectKind)
  ) {
    issues.push({
      field: 'subject.id',
      message: `Diagnostic ${diagnostic.code} must include subject.id for subject kind ${subject.kind}.`,
    });
  }

  const details =
    diagnostic.details && typeof diagnostic.details === 'object'
      ? (diagnostic.details as Record<string, unknown>)
      : undefined;
  for (const key of entry.requiredDetailKeys) {
    if (details?.[key] === undefined) {
      issues.push({
        field: `details.${key}`,
        message: `Diagnostic ${diagnostic.code} must include details.${key}.`,
      });
    }
  }

  return issues;
}
