import {
  internalCompilerErrorDiagnostic,
  internalOutputContractViolationDiagnostic,
} from './errors.js';
import { validateCompileResultContract } from './public-output-contract.js';
import { resolveSleeve } from './resolve.js';
import { computeRuntimeHash } from './runtime-hash.js';
import { structurallyValidateSelection, structurallyValidateSleeve } from './schema-validation.js';
import { createTraceEvent } from './trace-event-registry.js';
import { validateCanonicalSelection } from './validate.js';
import {
  COMPILE_RESULT_SCHEMA_VERSION,
  COMPILER_VERSION,
  RUNTIME_SCHEMA_VERSION,
  TRACE_SCHEMA_VERSION,
} from './version-contract.js';
import type {
  CompileResult,
  CompileSelection,
  CompilerDiagnostic,
  RuntimeSpec,
  Sleeve,
  Trace,
  TraceEvent,
  TraceEventType,
} from './types.js';

function sortedKeys(input: Record<string, unknown>): string[] {
  return Object.keys(input).sort();
}

function pushTraceCoverageViolation(
  contractDiagnostics: CompilerDiagnostic[],
  message: string,
  path: string,
  details?: Record<string, unknown>,
): void {
  contractDiagnostics.push(
    internalOutputContractViolationDiagnostic({
      message,
      path,
      ...details,
    }),
  );
}

function diagnosticTraceEventType(diagnostic: CompilerDiagnostic): TraceEventType {
  if (diagnostic.stage === 'semantic') {
    return diagnostic.level === 'error' ? 'VALIDATION_ERROR' : 'VALIDATION_WARNING';
  }
  if (diagnostic.stage === 'resolution') {
    return diagnostic.level === 'error' ? 'RESOLUTION_ERROR' : 'RESOLUTION_WARNING';
  }
  throw new Error(`Trace does not expose ${diagnostic.stage} diagnostics.`);
}

function diagnosticTraceEvent(
  diagnostic: CompilerDiagnostic,
  diagnosticIndex: number,
  seq: number,
): TraceEvent {
  return createTraceEvent(seq, diagnosticTraceEventType(diagnostic), diagnostic.subject, {
    diagnosticIndex,
    code: diagnostic.code,
    message: diagnostic.message,
    ...(diagnostic.path ? { path: diagnostic.path } : {}),
  });
}

function finalizeCompileResult(
  candidate: CompileResult,
  sleeve: Sleeve,
  selection: CompileSelection,
): CompileResult {
  const contractDiagnostics = validateCompileResultContract(candidate).diagnostics;
  if (candidate.compilerVersion !== COMPILER_VERSION) {
    contractDiagnostics.push(
      internalOutputContractViolationDiagnostic({
        message: 'CompileResult compilerVersion must match the compiler version constant.',
        path: 'compilerVersion',
      }),
    );
  }

  if (candidate.trace) {
    if (candidate.trace.sleeveId !== sleeve.id) {
      contractDiagnostics.push(
        internalOutputContractViolationDiagnostic({
          message: 'Trace sleeveId must match the compiled sleeve.',
          path: 'trace.sleeveId',
        }),
      );
    }
    if (candidate.trace.compiledAt !== selection.compiledAt) {
      contractDiagnostics.push(
        internalOutputContractViolationDiagnostic({
          message: 'Trace compiledAt must match the supplied selection timestamp.',
          path: 'trace.compiledAt',
        }),
      );
    }

    const expectedNeoStackIds = sleeve.neoStacks.map((stack) => stack.id).sort();
    const actualNeoStackIds = sortedKeys(candidate.trace.finalNeoStackStates);
    if (JSON.stringify(actualNeoStackIds) !== JSON.stringify(expectedNeoStackIds)) {
      pushTraceCoverageViolation(
        contractDiagnostics,
        'Trace finalNeoStackStates must contain exactly the canonical Sleeve.neoStacks ids.',
        'trace.finalNeoStackStates',
        {
          expectedNeoStackIds,
          actualNeoStackIds,
        },
      );
    }

    const expectedNeoBlockIds = sleeve.neoBlocks.map((block) => block.id).sort();
    const actualNeoBlockIds = sortedKeys(candidate.trace.finalNeoBlockStates);
    if (JSON.stringify(actualNeoBlockIds) !== JSON.stringify(expectedNeoBlockIds)) {
      pushTraceCoverageViolation(
        contractDiagnostics,
        'Trace finalNeoBlockStates must contain exactly the canonical Sleeve.neoBlocks ids.',
        'trace.finalNeoBlockStates',
        {
          expectedNeoBlockIds,
          actualNeoBlockIds,
        },
      );
    }

    if (candidate.status === 'failure' && candidate.trace.terminalStage === 'semantic') {
      for (const [stackId, state] of Object.entries(candidate.trace.finalNeoStackStates)) {
        if (state !== 'ready' && state !== 'disabled') {
          pushTraceCoverageViolation(
            contractDiagnostics,
            'Semantic failure Trace finalNeoStackStates may only contain ready or disabled states.',
            `trace.finalNeoStackStates.${stackId}`,
            { state },
          );
        }
      }
      for (const [blockId, state] of Object.entries(candidate.trace.finalNeoBlockStates)) {
        if (state !== 'ready' && state !== 'disabled') {
          pushTraceCoverageViolation(
            contractDiagnostics,
            'Semantic failure Trace finalNeoBlockStates may only contain ready or disabled states.',
            `trace.finalNeoBlockStates.${blockId}`,
            { state },
          );
        }
      }
    }
  }

  if (candidate.runtime) {
    if (candidate.runtime.sleeveId !== sleeve.id) {
      contractDiagnostics.push(
        internalOutputContractViolationDiagnostic({
          message: 'RuntimeSpec sleeveId must match the compiled sleeve.',
          path: 'runtime.sleeveId',
        }),
      );
    }
    if (candidate.runtime.sleeveName !== sleeve.name) {
      contractDiagnostics.push(
        internalOutputContractViolationDiagnostic({
          message: 'RuntimeSpec sleeveName must match the compiled sleeve.',
          path: 'runtime.sleeveName',
        }),
      );
    }
    if (candidate.runtime.controllerNeoStackId !== sleeve.controllerNeoStackId) {
      contractDiagnostics.push(
        internalOutputContractViolationDiagnostic({
          message: 'RuntimeSpec controllerNeoStackId must match the compiled sleeve.',
          path: 'runtime.controllerNeoStackId',
        }),
      );
    }
    if (candidate.runtime.compiledAt !== selection.compiledAt) {
      contractDiagnostics.push(
        internalOutputContractViolationDiagnostic({
          message: 'RuntimeSpec compiledAt must match the supplied selection timestamp.',
          path: 'runtime.compiledAt',
        }),
      );
    }

    try {
      const expectedRuntimeHash = computeRuntimeHash(candidate.runtime);
      const actualRuntimeHash = candidate.runtime.runtimeHash;
      if (actualRuntimeHash !== expectedRuntimeHash) {
        contractDiagnostics.push(
          internalOutputContractViolationDiagnostic({
            message: 'RuntimeSpec runtimeHash must equal computeRuntimeHash(runtime).',
            path: 'runtime.runtimeHash',
            expectedRuntimeHash,
            actualRuntimeHash,
          }),
        );
      }
    } catch (error) {
      contractDiagnostics.push(
        internalOutputContractViolationDiagnostic({
          message: 'RuntimeSpec runtimeHash could not be computed from the frozen runtime-hash payload.',
          path: 'runtime.runtimeHash',
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }

    if (candidate.trace) {
      candidate.runtime.activeNeoStackIds.forEach((stackId, index) => {
        if (candidate.trace?.finalNeoStackStates[stackId] !== 'active') {
          pushTraceCoverageViolation(
            contractDiagnostics,
            'RuntimeSpec activeNeoStackIds must be active in Trace finalNeoStackStates.',
            `trace.finalNeoStackStates.${stackId}`,
            { runtimeIndex: index, traceState: candidate.trace?.finalNeoStackStates[stackId] },
          );
        }
      });

      candidate.runtime.resolvedNeoBlocks.forEach((neoBlock, index) => {
        if (candidate.trace?.finalNeoBlockStates[neoBlock.id] !== 'active') {
          pushTraceCoverageViolation(
            contractDiagnostics,
            'RuntimeSpec resolvedNeoBlocks ids must be active in Trace finalNeoBlockStates.',
            `trace.finalNeoBlockStates.${neoBlock.id}`,
            { runtimeIndex: index, traceState: candidate.trace?.finalNeoBlockStates[neoBlock.id] },
          );
        }
      });
    }
  }

  if (contractDiagnostics.length > 0) {
    return buildFailureCompileResult(
      [internalOutputContractViolationDiagnostic({ violations: contractDiagnostics })],
      null,
    );
  }

  return candidate;
}

function buildFailureCompileResult(
  diagnostics: CompilerDiagnostic[],
  trace: Trace | null,
): CompileResult {
  const safeDiagnostics =
    diagnostics.some((diagnostic) => diagnostic.level === 'error')
      ? diagnostics
      : [...diagnostics, internalCompilerErrorDiagnostic()];

  return {
    schemaVersion: COMPILE_RESULT_SCHEMA_VERSION,
    compilerVersion: COMPILER_VERSION,
    status: 'failure',
    runtime: null,
    trace,
    hasErrors: true,
    diagnostics: safeDiagnostics,
  };
}

function buildSuccessCompileResult(
  runtime: RuntimeSpec,
  trace: Trace,
  diagnostics: CompilerDiagnostic[],
): CompileResult {
  return {
    schemaVersion: COMPILE_RESULT_SCHEMA_VERSION,
    compilerVersion: COMPILER_VERSION,
    status: 'success',
    runtime,
    trace,
    hasErrors: false,
    diagnostics,
  };
}

function compileCanonicalSleeve(sleeve: Sleeve, selection: CompileSelection): CompileResult {
  const validation = validateCanonicalSelection(sleeve, selection);
  const sourceEvents: TraceEvent[] = [
    createTraceEvent(1, 'SOURCE_VALIDATED', { kind: 'sleeve', id: sleeve.id }, {
        sleeveSchemaVersion: sleeve.schemaVersion,
        selectionSchemaVersion: selection.schemaVersion,
        controllerNeoStackId: sleeve.controllerNeoStackId,
        route: {
          neoStackIds: selection.activeNeoStackIds,
          neoBlockIds: selection.activeNeoBlockIds,
        },
        triggerStateTrueIds: Object.keys(selection.triggerState)
          .filter((id) => selection.triggerState[id] === true)
          .sort(),
        activeOverlayIds: selection.activeOverlayIds ?? [],
        activeGovernanceRuleIds: selection.activeGovernanceRuleIds ?? [],
        disabledNeoStackIds: selection.disabledNeoStackIds ?? [],
        disabledNeoBlockIds: selection.disabledNeoBlockIds ?? [],
        routeRationale: selection.routeRationale === undefined ? 'not_supplied' : 'supplied',
        counts: {
          neoStacks: sleeve.neoStacks.length,
          neoBlocks: sleeve.neoBlocks.length,
          moltBlocks: sleeve.moltBlocks.length,
          scopedMoltAttachments: sleeve.scopedMolt?.length ?? 0,
          overlays: sleeve.overlays?.length ?? 0,
          governanceRules: sleeve.governance?.length ?? 0,
          validationErrors: validation.diagnostics.filter((diagnostic) => diagnostic.level === 'error').length,
            validationWarnings: validation.diagnostics.filter((diagnostic) => diagnostic.level === 'warning').length,
          },
    }),
  ];
  if (selection.routeRationale !== undefined) {
    sourceEvents.push(
      createTraceEvent(sourceEvents.length + 1, 'ROUTE_SELECTION_RECEIVED', { kind: 'selection' }, {
        routeRationale: selection.routeRationale,
      }),
    );
  }

  const validationEvents: TraceEvent[] = validation.diagnostics.map((diagnostic, index) =>
    diagnosticTraceEvent(diagnostic, index, sourceEvents.length + index + 1),
  );

  if (validation.diagnostics.some((diagnostic) => diagnostic.level === 'error')) {
    const trace: Trace = {
      schemaVersion: TRACE_SCHEMA_VERSION,
      compilerVersion: COMPILER_VERSION,
      sleeveId: sleeve.id,
      compiledAt: selection.compiledAt,
      terminalStage: 'semantic',
      events: [...sourceEvents, ...validationEvents],
      diagnostics: validation.diagnostics,
      finalNeoStackStates: Object.fromEntries(
        sleeve.neoStacks.map((stack) => [stack.id, stack.defaultState ?? 'ready']),
      ),
      finalNeoBlockStates: Object.fromEntries(
        sleeve.neoBlocks.map((block) => [block.id, block.defaultState ?? 'ready']),
      ),
    };
    return finalizeCompileResult(buildFailureCompileResult(validation.diagnostics, trace), sleeve, selection);
  }

  const resolution = resolveSleeve(sleeve, selection);
  const diagnostics = [...validation.diagnostics, ...resolution.diagnostics];
  const hasErrors = diagnostics.some((diagnostic) => diagnostic.level === 'error');
  const offset = sourceEvents.length + validationEvents.length;
  const resolutionEvents = resolution.events.map((event) => ({ ...event, seq: event.seq + offset }));
  const resolutionDiagnosticEvents = resolution.diagnostics.map((diagnostic, index) =>
    diagnosticTraceEvent(
      diagnostic,
      validation.diagnostics.length + index,
      offset + resolutionEvents.length + index + 1,
    ),
  );

  if (hasErrors) {
    const trace: Trace = {
      schemaVersion: TRACE_SCHEMA_VERSION,
      compilerVersion: COMPILER_VERSION,
      sleeveId: sleeve.id,
      compiledAt: selection.compiledAt,
      terminalStage: 'resolution',
      events: [...sourceEvents, ...validationEvents, ...resolutionEvents, ...resolutionDiagnosticEvents],
      diagnostics,
      finalNeoStackStates: resolution.finalNeoStackStates,
      finalNeoBlockStates: resolution.finalNeoBlockStates,
    };
    return finalizeCompileResult(buildFailureCompileResult(diagnostics, trace), sleeve, selection);
  }

  const runtimeWithoutHash: Omit<RuntimeSpec, 'runtimeHash'> = {
    schemaVersion: RUNTIME_SCHEMA_VERSION,
    compilerVersion: COMPILER_VERSION,
    sleeveId: sleeve.id,
    sleeveName: sleeve.name,
    controllerNeoStackId: sleeve.controllerNeoStackId,
    compiledAt: selection.compiledAt,
    activeNeoStackIds: resolution.activeNeoStackIds,
    resolvedNeoBlocks: resolution.resolvedNeoBlocks,
    promptParts: resolution.promptParts,
    diagnostics,
    resetPlan: {
      neoStackIds: resolution.activeNeoStackIds,
      neoBlockIds: resolution.resolvedNeoBlocks.map((block) => block.id),
      targetState: 'ready' as const,
    },
  };

  const runtime: RuntimeSpec = {
    ...runtimeWithoutHash,
    runtimeHash: computeRuntimeHash(runtimeWithoutHash),
  };

  const effectiveMoltBlockCount = new Set(runtime.promptParts.map((part) => part.id)).size;

  const runtimeCompiledEvent: TraceEvent = {
    ...createTraceEvent(
      offset + resolutionEvents.length + resolutionDiagnosticEvents.length + 1,
      'RUNTIME_COMPILED',
      { kind: 'runtime' },
      {
      runtimeHash: runtime.runtimeHash,
      promptPartCount: runtime.promptParts.length,
      totalNeoStacks: sleeve.neoStacks.length,
      totalNeoBlocks: sleeve.neoBlocks.length,
      totalMoltBlocks: sleeve.moltBlocks.length,
      activeNeoStacks: resolution.activeNeoStackIds.length,
      activeNeoBlocks: resolution.resolvedNeoBlocks.length,
      effectiveMoltBlocks: effectiveMoltBlockCount,
      },
    ),
  };
  const resetEvent: TraceEvent = {
    ...createTraceEvent(
      runtimeCompiledEvent.seq + 1,
      'POST_RUN_RESET_DECLARED',
      { kind: 'runtime' },
      runtime.resetPlan,
    ),
  };

  const trace: Trace = {
    schemaVersion: TRACE_SCHEMA_VERSION,
    compilerVersion: COMPILER_VERSION,
    sleeveId: sleeve.id,
    compiledAt: selection.compiledAt,
    terminalStage: 'post_run',
    events: [
      ...sourceEvents,
      ...validationEvents,
      ...resolutionEvents,
      ...resolutionDiagnosticEvents,
      runtimeCompiledEvent,
      resetEvent,
    ],
    diagnostics,
    finalNeoStackStates: resolution.finalNeoStackStates,
    finalNeoBlockStates: resolution.finalNeoBlockStates,
  };

  return finalizeCompileResult(buildSuccessCompileResult(runtime, trace, diagnostics), sleeve, selection);
}

export function compileSleeve(sleeve: unknown, selection: unknown): CompileResult {
  try {
    const structuralSleeve = structurallyValidateSleeve(sleeve);
    const structuralSelection = structurallyValidateSelection(selection);
    if (!structuralSleeve.ok || !structuralSelection.ok) {
      const structuralDiagnostics: CompilerDiagnostic[] = [];
      if (!structuralSleeve.ok) structuralDiagnostics.push(...structuralSleeve.diagnostics);
      if (!structuralSelection.ok) structuralDiagnostics.push(...structuralSelection.diagnostics);
      return buildFailureCompileResult(structuralDiagnostics, null);
    }

    return compileCanonicalSleeve(structuralSleeve.value, structuralSelection.value);
  } catch {
    return buildFailureCompileResult([internalCompilerErrorDiagnostic()], null);
  }
}
