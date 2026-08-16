import { canonicalize } from './canonicalize.js';
import { MOLT_AUTHORITY_ORDER } from './constants.js';
import { validateDiagnosticAgainstRegistry } from './diagnostic-registry.js';
import { internalOutputContractViolationDiagnostic } from './errors.js';
import { computeRuntimeHash } from './runtime-hash.js';
import {
  TRACE_STAGE_ORDER,
  validateTraceEventAgainstRegistry,
} from './trace-event-registry.js';
import {
  structurallyValidateCompileResult,
  structurallyValidateRuntimeSpec,
  structurallyValidateTrace,
} from './schema-validation.js';
import type {
  CompileResult,
  CompilerDiagnostic,
  PromptPart,
  ResolvedLane,
  ResolvedMoltBlock,
  RuntimeSpec,
  Trace,
  TraceEventType,
  ValidationResult,
} from './types.js';

const MOLT_AUTHORITY_INDEX = new Map(MOLT_AUTHORITY_ORDER.map((type, index) => [type, index]));

function sameValue(left: unknown, right: unknown): boolean {
  return canonicalize(left) === canonicalize(right);
}

function prefixedPath(prefix: string, path: string | undefined): string {
  if (!path) return prefix;
  return /^\[\d+\]/.test(path) ? `${prefix}${path}` : `${prefix}.${path}`;
}

function pushViolation(
  diagnostics: CompilerDiagnostic[],
  message: string,
  path?: string,
  details?: Record<string, unknown>,
): void {
  diagnostics.push(internalOutputContractViolationDiagnostic({ ...details, message, path }));
}

function pushPrefixedDiagnostics(
  target: CompilerDiagnostic[],
  diagnostics: CompilerDiagnostic[],
  prefix: string,
): void {
  diagnostics.forEach((diagnostic) => {
    target.push({
      ...diagnostic,
      path: prefixedPath(prefix, diagnostic.path),
    });
  });
}

function validateRegisteredDiagnostics(
  input: CompilerDiagnostic[],
  path: string,
  diagnostics: CompilerDiagnostic[],
): void {
  input.forEach((diagnostic, index) => {
    validateDiagnosticAgainstRegistry(diagnostic).forEach((issue) => {
      pushViolation(
        diagnostics,
        issue.message,
        `${path}[${index}]${issue.field ? `.${issue.field}` : ''}`,
      );
    });
  });
}

function validateProvenance(
  block: ResolvedMoltBlock,
  path: string,
  diagnostics: CompilerDiagnostic[],
): void {
  switch (block.sourceMode) {
    case 'local':
      if (block.sourceId !== block.id) {
        pushViolation(diagnostics, 'Local provenance must use the block id as sourceId.', `${path}.sourceId`);
      }
      if (block.sourceScope !== undefined) {
        pushViolation(diagnostics, 'Local provenance cannot include sourceScope.', `${path}.sourceScope`);
      }
      if (block.overlayId !== undefined) {
        pushViolation(diagnostics, 'Local provenance cannot include overlayId.', `${path}.overlayId`);
      }
      if (block.mergeId !== undefined) {
        pushViolation(diagnostics, 'Local provenance cannot include mergeId.', `${path}.mergeId`);
      }
      break;

    case 'scoped':
      if (block.sourceScope === undefined) {
        pushViolation(diagnostics, 'Scoped provenance requires sourceScope.', `${path}.sourceScope`);
      }
      if (block.overlayId !== undefined) {
        pushViolation(diagnostics, 'Scoped provenance cannot include overlayId.', `${path}.overlayId`);
      }
      if (block.mergeId !== undefined) {
        pushViolation(diagnostics, 'Scoped provenance cannot include mergeId.', `${path}.mergeId`);
      }
      break;

    case 'overlay':
      if (block.sourceScope === undefined) {
        pushViolation(diagnostics, 'Overlay provenance requires sourceScope.', `${path}.sourceScope`);
      }
      if (block.overlayId === undefined) {
        pushViolation(diagnostics, 'Overlay provenance requires overlayId.', `${path}.overlayId`);
      }
      if (block.mergeId !== undefined) {
        pushViolation(diagnostics, 'Overlay provenance cannot include mergeId.', `${path}.mergeId`);
      }
      break;

    case 'merge':
      if (block.mergeId === undefined) {
        pushViolation(diagnostics, 'Merge provenance requires mergeId.', `${path}.mergeId`);
      }
      if (block.sourceId !== block.mergeId) {
        pushViolation(diagnostics, 'Merge provenance must use the merge id as sourceId.', `${path}.sourceId`);
      }
      if (block.sourceScope !== undefined) {
        pushViolation(diagnostics, 'Merge provenance cannot include sourceScope.', `${path}.sourceScope`);
      }
      if (block.overlayId !== undefined) {
        pushViolation(diagnostics, 'Merge provenance cannot include overlayId.', `${path}.overlayId`);
      }
      break;
  }
}

function validateLane(lane: ResolvedLane, path: string, diagnostics: CompilerDiagnostic[]): void {
  if (lane.geometrySource === 'bundle') {
    if (!lane.bundleId) {
      pushViolation(diagnostics, 'Bundle geometry requires bundleId.', `${path}.bundleId`);
    }
  } else if (lane.bundleId !== undefined) {
    pushViolation(diagnostics, 'Non-bundle geometry cannot include bundleId.', `${path}.bundleId`);
  }

  if (lane.moltType === 'trigger' && lane.geometrySource !== 'evaluated-trigger-lane') {
    pushViolation(
      diagnostics,
      'Trigger lanes must use evaluated-trigger-lane geometrySource.',
      `${path}.geometrySource`,
    );
  }
  if (lane.moltType === 'directive' && lane.geometrySource !== 'generated-directive-lane') {
    pushViolation(
      diagnostics,
      'Directive lanes must use generated-directive-lane geometrySource.',
      `${path}.geometrySource`,
    );
  }
  if (
    lane.moltType !== 'trigger' &&
    lane.moltType !== 'directive' &&
    (lane.geometrySource === 'evaluated-trigger-lane' || lane.geometrySource === 'generated-directive-lane')
  ) {
    pushViolation(
      diagnostics,
      'Only trigger/directive lanes may use generated geometry sources.',
      `${path}.geometrySource`,
    );
  }

  let previousRow = 0;
  lane.rows.forEach((row, rowIndex) => {
    if (row.row <= previousRow) {
      pushViolation(diagnostics, 'Resolved lane rows must be strictly ascending.', `${path}.rows[${rowIndex}].row`);
    }
    previousRow = row.row;
    row.blocks.forEach((block, blockIndex) =>
      validateProvenance(block, `${path}.rows[${rowIndex}].blocks[${blockIndex}]`, diagnostics),
    );
  });
  lane.scoped.forEach((block, index) =>
    validateProvenance(block, `${path}.scoped[${index}]`, diagnostics),
  );
}

function expectedPromptParts(runtime: RuntimeSpec, diagnostics: CompilerDiagnostic[]): PromptPart[] {
  const activeStackIds = new Set(runtime.activeNeoStackIds);
  const neoStackByNeoBlockId = new Map<string, string>();

  runtime.promptParts.forEach((part, index) => {
    if (!activeStackIds.has(part.neoStackId)) {
      pushViolation(
        diagnostics,
        'PromptPart neoStackId must refer to an active NeoStack.',
        `promptParts[${index}].neoStackId`,
      );
    }

    const existing = neoStackByNeoBlockId.get(part.neoBlockId);
    if (existing && existing !== part.neoStackId) {
      pushViolation(
        diagnostics,
        'PromptParts for the same NeoBlock must share one neoStackId.',
        `promptParts[${index}].neoStackId`,
      );
    } else if (!existing) {
      neoStackByNeoBlockId.set(part.neoBlockId, part.neoStackId);
    }
  });

  const result: PromptPart[] = [];
  runtime.resolvedNeoBlocks.forEach((neoBlock, blockIndex) => {
    const neoStackId = neoStackByNeoBlockId.get(neoBlock.id);
    const expectedCount = neoBlock.lanes.reduce(
      (count, lane) => count + lane.scoped.length + lane.rows.reduce((rowCount, row) => rowCount + row.blocks.length, 0),
      0,
    );
    if (!neoStackId) {
      if (expectedCount > 0) {
        pushViolation(
          diagnostics,
          'Resolved NeoBlock contributions must appear in promptParts.',
          `resolvedNeoBlocks[${blockIndex}]`,
          { neoBlockId: neoBlock.id },
        );
      }
      return;
    }

    neoBlock.lanes.forEach((lane) => {
      const laneOrder = (MOLT_AUTHORITY_INDEX.get(lane.moltType) ?? -1) + 1;
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
      lane.rows.forEach((row) => {
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
      });
    });
  });

  return result;
}

function diagnosticEventType(diagnostic: CompilerDiagnostic): TraceEventType | null {
  if (diagnostic.stage === 'semantic') {
    return diagnostic.level === 'error' ? 'VALIDATION_ERROR' : 'VALIDATION_WARNING';
  }
  if (diagnostic.stage === 'resolution') {
    return diagnostic.level === 'error' ? 'RESOLUTION_ERROR' : 'RESOLUTION_WARNING';
  }
  return null;
}

function validateTraceStateMapStates(
  trace: Trace,
  diagnostics: CompilerDiagnostic[],
): void {
  if (trace.terminalStage !== 'semantic') return;

  for (const [stackId, state] of Object.entries(trace.finalNeoStackStates)) {
    if (state !== 'ready' && state !== 'disabled') {
      pushViolation(
        diagnostics,
        'Semantic failure Trace finalNeoStackStates may only contain ready or disabled states.',
        `finalNeoStackStates.${stackId}`,
      );
    }
  }

  for (const [blockId, state] of Object.entries(trace.finalNeoBlockStates)) {
    if (state !== 'ready' && state !== 'disabled') {
      pushViolation(
        diagnostics,
        'Semantic failure Trace finalNeoBlockStates may only contain ready or disabled states.',
        `finalNeoBlockStates.${blockId}`,
      );
    }
  }
}

export function validateTraceContract(input: unknown): ValidationResult {
  const structural = structurallyValidateTrace(input);
  if (!structural.ok) return { diagnostics: structural.diagnostics };
  const trace: Trace = structural.value;
  const diagnostics: CompilerDiagnostic[] = [];

  validateRegisteredDiagnostics(trace.diagnostics, 'diagnostics', diagnostics);
  const semanticDiagnosticIndexes: number[] = [];
  const resolutionDiagnosticIndexes: number[] = [];
  const semanticEventIndexes: number[] = [];
  const resolutionEventIndexes: number[] = [];
  let previousStageOrder = -1;
  let runtimeCompiledCount = 0;
  let resetDeclaredCount = 0;

  trace.diagnostics.forEach((diagnostic, index) => {
    if (diagnostic.stage !== 'semantic' && diagnostic.stage !== 'resolution') {
      pushViolation(
        diagnostics,
        'Trace diagnostics may only contain semantic or resolution diagnostics.',
        `diagnostics[${index}].stage`,
      );
      return;
    }

    if (diagnostic.stage === 'semantic') {
      semanticDiagnosticIndexes.push(index);
    } else {
      resolutionDiagnosticIndexes.push(index);
    }
  });

  trace.events.forEach((event, index) => {
    if (event.seq !== index + 1) {
      pushViolation(
        diagnostics,
        'Trace events must use contiguous seq values starting at 1.',
        `events[${index}].seq`,
      );
    }

    const stageOrder = TRACE_STAGE_ORDER[event.stage];
    if (stageOrder < previousStageOrder) {
      pushViolation(
        diagnostics,
        'Trace event stages must be monotonic: intake -> semantic -> resolution -> output -> post_run.',
        `events[${index}].stage`,
      );
    }
    previousStageOrder = Math.max(previousStageOrder, stageOrder);

    validateTraceEventAgainstRegistry(event).forEach((issue) => {
      pushViolation(
        diagnostics,
        issue.message,
        `events[${index}]${issue.field ? `.${issue.field}` : ''}`,
      );
    });

    if (event.type === 'RUNTIME_COMPILED') runtimeCompiledCount += 1;
    if (event.type === 'POST_RUN_RESET_DECLARED') resetDeclaredCount += 1;

    if (
      event.type !== 'VALIDATION_ERROR' &&
      event.type !== 'VALIDATION_WARNING' &&
      event.type !== 'RESOLUTION_ERROR' &&
      event.type !== 'RESOLUTION_WARNING'
    ) {
      return;
    }

    const diagnosticIndex = event.data.diagnosticIndex;
    if (typeof diagnosticIndex !== 'number' || !Number.isInteger(diagnosticIndex)) {
      pushViolation(
        diagnostics,
        'Diagnostic Trace events must use an integer diagnosticIndex.',
        `events[${index}].data.diagnosticIndex`,
      );
      return;
    }
    if (diagnosticIndex < 0 || diagnosticIndex >= trace.diagnostics.length) {
      pushViolation(
        diagnostics,
        'Diagnostic Trace events must reference an in-range Trace.diagnostics index.',
        `events[${index}].data.diagnosticIndex`,
      );
      return;
    }

    const linkedDiagnostic = trace.diagnostics[diagnosticIndex];
    const expectedType = diagnosticEventType(linkedDiagnostic);
    if (!expectedType) {
      pushViolation(
        diagnostics,
        'Diagnostic Trace events may only link semantic or resolution diagnostics.',
        `events[${index}].data.diagnosticIndex`,
      );
      return;
    }

    if (event.data.code !== linkedDiagnostic.code) {
      pushViolation(
        diagnostics,
        'Diagnostic Trace event data.code must equal the linked Trace.diagnostics code.',
        `events[${index}].data.code`,
      );
    }
    if (event.stage !== linkedDiagnostic.stage) {
      pushViolation(
        diagnostics,
        'Diagnostic Trace event stage must equal the linked Trace.diagnostics stage.',
        `events[${index}].stage`,
      );
    }
    if (!sameValue(event.subject, linkedDiagnostic.subject)) {
      pushViolation(
        diagnostics,
        'Diagnostic Trace event subject must equal the linked Trace.diagnostics subject.',
        `events[${index}].subject`,
      );
    }
    if (event.type !== expectedType) {
      pushViolation(
        diagnostics,
        'Diagnostic Trace event type must match the linked Trace.diagnostics stage and level.',
        `events[${index}].type`,
      );
    }

    if (linkedDiagnostic.stage === 'semantic') {
      semanticEventIndexes.push(diagnosticIndex);
    } else {
      resolutionEventIndexes.push(diagnosticIndex);
    }
  });

  if (!sameValue(semanticEventIndexes, semanticDiagnosticIndexes)) {
    pushViolation(
      diagnostics,
      'All semantic Trace diagnostics must map 1:1 to ordered VALIDATION events.',
      'events',
    );
  }

  if (!sameValue(resolutionEventIndexes, resolutionDiagnosticIndexes)) {
    pushViolation(
      diagnostics,
      'All resolution Trace diagnostics must map 1:1 to ordered RESOLUTION events.',
      'events',
    );
  }

  switch (trace.terminalStage) {
    case 'semantic':
      if (trace.events.some((event) => TRACE_STAGE_ORDER[event.stage] > TRACE_STAGE_ORDER.semantic)) {
        pushViolation(
          diagnostics,
          'Semantic failure Trace must not contain resolution, output, or post_run events.',
          'events',
        );
      }
      if (runtimeCompiledCount !== 0) {
        pushViolation(
          diagnostics,
          'Semantic failure Trace must not contain RUNTIME_COMPILED.',
          'events',
        );
      }
      if (resetDeclaredCount !== 0) {
        pushViolation(
          diagnostics,
          'Semantic failure Trace must not contain POST_RUN_RESET_DECLARED.',
          'events',
        );
      }
      validateTraceStateMapStates(trace, diagnostics);
      break;

    case 'resolution':
      if (trace.events.some((event) => TRACE_STAGE_ORDER[event.stage] > TRACE_STAGE_ORDER.resolution)) {
        pushViolation(
          diagnostics,
          'Resolution failure Trace must not contain output or post_run events.',
          'events',
        );
      }
      if (runtimeCompiledCount !== 0) {
        pushViolation(
          diagnostics,
          'Resolution failure Trace must not contain RUNTIME_COMPILED.',
          'events',
        );
      }
      if (resetDeclaredCount !== 0) {
        pushViolation(
          diagnostics,
          'Resolution failure Trace must not contain POST_RUN_RESET_DECLARED.',
          'events',
        );
      }
      break;

    case 'post_run':
      if (runtimeCompiledCount !== 1) {
        pushViolation(
          diagnostics,
          'Successful Trace must contain exactly one RUNTIME_COMPILED event.',
          'events',
        );
      }
      if (resetDeclaredCount !== 1) {
        pushViolation(
          diagnostics,
          'Successful Trace must contain exactly one POST_RUN_RESET_DECLARED event.',
          'events',
        );
      }
      if (trace.events.length < 2) {
        pushViolation(
          diagnostics,
          'Successful Trace must end with RUNTIME_COMPILED and POST_RUN_RESET_DECLARED.',
          'events',
        );
      } else {
        const runtimeEvent = trace.events[trace.events.length - 2];
        const resetEvent = trace.events[trace.events.length - 1];
        if (runtimeEvent.type !== 'RUNTIME_COMPILED') {
          pushViolation(
            diagnostics,
            'Successful Trace must use RUNTIME_COMPILED as the penultimate event.',
            `events[${trace.events.length - 2}].type`,
          );
        }
        if (resetEvent.type !== 'POST_RUN_RESET_DECLARED') {
          pushViolation(
            diagnostics,
            'Successful Trace must use POST_RUN_RESET_DECLARED as the final event.',
            `events[${trace.events.length - 1}].type`,
          );
        }
      }
      break;

    default:
      pushViolation(
        diagnostics,
        'Trace terminalStage must be semantic, resolution, or post_run.',
        'terminalStage',
      );
      break;
  }

  return { diagnostics };
}

export function validateRuntimeSpecContract(input: unknown): ValidationResult {
  const structural = structurallyValidateRuntimeSpec(input);
  if (!structural.ok) return { diagnostics: structural.diagnostics };
  const runtime: RuntimeSpec = structural.value;
  const diagnostics: CompilerDiagnostic[] = [];

  validateRegisteredDiagnostics(runtime.diagnostics, 'diagnostics', diagnostics);

  if (runtime.diagnostics.some((diagnostic) => diagnostic.level === 'error')) {
    pushViolation(
      diagnostics,
      'RuntimeSpec diagnostics must not contain error diagnostics.',
      'diagnostics',
    );
  }

  if (!sameValue(runtime.resetPlan.neoStackIds, runtime.activeNeoStackIds)) {
    pushViolation(
      diagnostics,
      'ResetPlan neoStackIds must equal activeNeoStackIds.',
      'resetPlan.neoStackIds',
    );
  }

  if (!sameValue(runtime.resetPlan.neoBlockIds, runtime.resolvedNeoBlocks.map((neoBlock) => neoBlock.id))) {
    pushViolation(
      diagnostics,
      'ResetPlan neoBlockIds must equal resolvedNeoBlocks ids in resolved order.',
      'resetPlan.neoBlockIds',
    );
  }

  runtime.resolvedNeoBlocks.forEach((neoBlock, blockIndex) => {
    let previousAuthorityIndex = -1;
    const seenLaneTypes = new Set<string>();

    neoBlock.lanes.forEach((lane, laneIndex) => {
      const authorityIndex = MOLT_AUTHORITY_INDEX.get(lane.moltType);
      if (authorityIndex === undefined) {
        pushViolation(
          diagnostics,
          'Resolved lane must use a canonical MOLT authority lane.',
          `resolvedNeoBlocks[${blockIndex}].lanes[${laneIndex}].moltType`,
        );
      } else {
        if (authorityIndex <= previousAuthorityIndex) {
          pushViolation(
            diagnostics,
            'Resolved lanes must remain in canonical MOLT authority order.',
            `resolvedNeoBlocks[${blockIndex}].lanes[${laneIndex}].moltType`,
          );
        }
        previousAuthorityIndex = authorityIndex;
      }

      if (seenLaneTypes.has(lane.moltType)) {
        pushViolation(
          diagnostics,
          'Resolved lanes must not repeat a MOLT authority lane.',
          `resolvedNeoBlocks[${blockIndex}].lanes[${laneIndex}].moltType`,
        );
      }
      seenLaneTypes.add(lane.moltType);

      validateLane(lane, `resolvedNeoBlocks[${blockIndex}].lanes[${laneIndex}]`, diagnostics);
    });
  });

  runtime.promptParts.forEach((part, index) =>
    validateProvenance(part, `promptParts[${index}]`, diagnostics),
  );

  const expected = expectedPromptParts(runtime, diagnostics);
  if (!sameValue(runtime.promptParts, expected)) {
    pushViolation(
      diagnostics,
      'PromptParts must be the deterministic flattened sequence of resolved cognition.',
      'promptParts',
      {
        expectedCount: expected.length,
        actualCount: runtime.promptParts.length,
      },
    );
  }

  try {
    const expectedRuntimeHash = computeRuntimeHash(runtime);
    if (runtime.runtimeHash !== expectedRuntimeHash) {
      pushViolation(
        diagnostics,
        'RuntimeSpec runtimeHash must equal computeRuntimeHash(runtime).',
        'runtimeHash',
        {
          expectedRuntimeHash,
          actualRuntimeHash: runtime.runtimeHash,
        },
      );
    }
  } catch (error) {
    pushViolation(
      diagnostics,
      'RuntimeSpec runtimeHash could not be computed from the frozen runtime-hash payload.',
      'runtimeHash',
      {
        error: error instanceof Error ? error.message : String(error),
      },
    );
  }

  return { diagnostics };
}

export function validateCompileResultContract(input: unknown): ValidationResult {
  const structural = structurallyValidateCompileResult(input);
  if (!structural.ok) return { diagnostics: structural.diagnostics };
  const result: CompileResult = structural.value;
  const diagnostics: CompilerDiagnostic[] = [];

  validateRegisteredDiagnostics(result.diagnostics, 'diagnostics', diagnostics);

  if (result.trace) {
    pushPrefixedDiagnostics(diagnostics, validateTraceContract(result.trace).diagnostics, 'trace');
    if (!sameValue(result.trace.diagnostics, result.diagnostics)) {
      pushViolation(
        diagnostics,
        'Trace diagnostics must equal CompileResult diagnostics.',
        'trace.diagnostics',
      );
    }
    if (result.trace.compilerVersion !== result.compilerVersion) {
      pushViolation(
        diagnostics,
        'Trace compilerVersion must equal CompileResult compilerVersion.',
        'trace.compilerVersion',
      );
    }
    if (result.status === 'success' && result.trace.terminalStage !== 'post_run') {
      pushViolation(
        diagnostics,
        'Successful CompileResult Trace must terminate at post_run.',
        'trace.terminalStage',
      );
    }
    if (
      result.status === 'failure' &&
      result.trace.terminalStage !== 'semantic' &&
      result.trace.terminalStage !== 'resolution'
    ) {
      pushViolation(
        diagnostics,
        'Failed CompileResult Trace must terminate at semantic or resolution.',
        'trace.terminalStage',
      );
    }
  }

  if (result.runtime) {
    pushPrefixedDiagnostics(diagnostics, validateRuntimeSpecContract(result.runtime).diagnostics, 'runtime');
    if (!sameValue(result.runtime.diagnostics, result.diagnostics)) {
      pushViolation(
        diagnostics,
        'RuntimeSpec diagnostics must equal CompileResult diagnostics.',
        'runtime.diagnostics',
      );
    }
    if (result.runtime.compilerVersion !== result.compilerVersion) {
      pushViolation(
        diagnostics,
        'RuntimeSpec compilerVersion must equal CompileResult compilerVersion.',
        'runtime.compilerVersion',
      );
    }
  }

  if (result.runtime && result.trace) {
    if (result.runtime.sleeveId !== result.trace.sleeveId) {
      pushViolation(
        diagnostics,
        'RuntimeSpec sleeveId must equal Trace sleeveId.',
        'runtime.sleeveId',
      );
    }
    if (result.runtime.compiledAt !== result.trace.compiledAt) {
      pushViolation(
        diagnostics,
        'RuntimeSpec compiledAt must equal Trace compiledAt.',
        'runtime.compiledAt',
      );
    }

    result.runtime.activeNeoStackIds.forEach((stackId, index) => {
      if (result.trace?.finalNeoStackStates[stackId] !== 'active') {
        pushViolation(
          diagnostics,
          'RuntimeSpec activeNeoStackIds must be active in Trace finalNeoStackStates.',
          `trace.finalNeoStackStates.${stackId}`,
          { runtimeIndex: index },
        );
      }
    });

    result.runtime.resolvedNeoBlocks.forEach((neoBlock, index) => {
      if (result.trace?.finalNeoBlockStates[neoBlock.id] !== 'active') {
        pushViolation(
          diagnostics,
          'RuntimeSpec resolvedNeoBlocks must be active in Trace finalNeoBlockStates.',
          `trace.finalNeoBlockStates.${neoBlock.id}`,
          { runtimeIndex: index },
        );
      }
    });

    const runtimeCompiledEvent = result.trace.events.find((event) => event.type === 'RUNTIME_COMPILED');
    if (!runtimeCompiledEvent) {
      pushViolation(
        diagnostics,
        'Successful CompileResult Trace must contain RUNTIME_COMPILED.',
        'trace.events',
      );
    } else if (runtimeCompiledEvent.data.runtimeHash !== result.runtime.runtimeHash) {
      pushViolation(
        diagnostics,
        'RUNTIME_COMPILED runtimeHash must equal RuntimeSpec runtimeHash.',
        'trace.events',
      );
    }

    const resetEvent = result.trace.events.find((event) => event.type === 'POST_RUN_RESET_DECLARED');
    if (!resetEvent) {
      pushViolation(
        diagnostics,
        'Successful CompileResult Trace must contain POST_RUN_RESET_DECLARED.',
        'trace.events',
      );
    } else if (!sameValue(resetEvent.data, result.runtime.resetPlan)) {
      pushViolation(
        diagnostics,
        'POST_RUN_RESET_DECLARED data must equal RuntimeSpec.resetPlan.',
        'trace.events',
      );
    }
  }

  const hasErrorDiagnostics = result.diagnostics.some((diagnostic) => diagnostic.level === 'error');
  if (result.status === 'success') {
    if (result.hasErrors !== false) {
      pushViolation(diagnostics, 'Successful CompileResult must set hasErrors=false.', 'hasErrors');
    }
    if (result.runtime === null) {
      pushViolation(diagnostics, 'Successful CompileResult must include RuntimeSpec.', 'runtime');
    }
    if (result.trace === null) {
      pushViolation(diagnostics, 'Successful CompileResult must include Trace.', 'trace');
    }
    if (hasErrorDiagnostics) {
      pushViolation(
        diagnostics,
        'Successful CompileResult must not contain error diagnostics.',
        'diagnostics',
      );
    }
  } else {
    if (result.hasErrors !== true) {
      pushViolation(diagnostics, 'Failed CompileResult must set hasErrors=true.', 'hasErrors');
    }
    if (result.runtime !== null) {
      pushViolation(diagnostics, 'Failed CompileResult must not expose RuntimeSpec.', 'runtime');
    }
    if (!hasErrorDiagnostics) {
      pushViolation(
        diagnostics,
        'Failed CompileResult must contain at least one error diagnostic.',
        'diagnostics',
      );
    }
  }

  return { diagnostics };
}
