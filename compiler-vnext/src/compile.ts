import { COMPILE_RESULT_SCHEMA_VERSION, COMPILER_VERSION } from './constants.js';
import { sha256Canonical } from './canonicalize.js';
import {
  internalCompilerErrorDiagnostic,
  internalOutputContractViolationDiagnostic,
} from './errors.js';
import { validateCompileResultContract } from './public-output-contract.js';
import { resolveSleeve } from './resolve.js';
import { structurallyValidateSelection, structurallyValidateSleeve } from './schema-validation.js';
import { validateCanonicalSelection } from './validate.js';
import type {
  CompileResult,
  CompileSelection,
  CompilerDiagnostic,
  RuntimeSpec,
  Sleeve,
  Trace,
  TraceEvent,
} from './types.js';

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

    const { runtimeHash: actualRuntimeHash, ...runtimeWithoutHash } = candidate.runtime;
    const expectedRuntimeHash = sha256Canonical(runtimeWithoutHash);
    if (actualRuntimeHash !== expectedRuntimeHash) {
      contractDiagnostics.push(
        internalOutputContractViolationDiagnostic({
          message: 'RuntimeSpec runtimeHash must equal the canonical hash of the runtime payload.',
          path: 'runtime.runtimeHash',
          expectedRuntimeHash,
          actualRuntimeHash,
        }),
      );
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
    {
      seq: 1,
      type: 'SOURCE_VALIDATED',
      subjectId: sleeve.id,
      data: {
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
      },
    },
  ];
  if (selection.routeRationale !== undefined) {
    sourceEvents.push({
      seq: sourceEvents.length + 1,
      type: 'ROUTE_SELECTION_RECEIVED',
      subjectId: sleeve.id,
      data: { routeRationale: selection.routeRationale },
    });
  }

  const validationEvents: TraceEvent[] = validation.diagnostics.map((diagnostic, index) => ({
    seq: sourceEvents.length + index + 1,
    type: diagnostic.level === 'error' ? 'VALIDATION_ERROR' : 'VALIDATION_WARNING',
    data: { code: diagnostic.code, message: diagnostic.message, path: diagnostic.path },
  }));

  if (validation.diagnostics.some((diagnostic) => diagnostic.level === 'error')) {
    const trace: Trace = {
      schemaVersion: 'umg.compiler-vnext.trace.v0.1',
      compilerVersion: COMPILER_VERSION,
      sleeveId: sleeve.id,
      compiledAt: selection.compiledAt,
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

  if (hasErrors) {
    const errorEvents: TraceEvent[] = resolution.diagnostics
      .filter((diagnostic) => diagnostic.level === 'error')
      .map((diagnostic, index) => ({
        seq: offset + resolutionEvents.length + index + 1,
        type: 'VALIDATION_ERROR',
        data: { code: diagnostic.code, message: diagnostic.message, path: diagnostic.path },
      }));
    const trace: Trace = {
      schemaVersion: 'umg.compiler-vnext.trace.v0.1',
      compilerVersion: COMPILER_VERSION,
      sleeveId: sleeve.id,
      compiledAt: selection.compiledAt,
      events: [...sourceEvents, ...validationEvents, ...resolutionEvents, ...errorEvents],
      diagnostics,
      finalNeoStackStates: resolution.finalNeoStackStates,
      finalNeoBlockStates: resolution.finalNeoBlockStates,
    };
    return finalizeCompileResult(buildFailureCompileResult(diagnostics, trace), sleeve, selection);
  }

  const runtimeWithoutHash = {
    schemaVersion: 'umg.compiler-vnext.runtime.v0.1' as const,
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
    runtimeHash: sha256Canonical(runtimeWithoutHash),
  };

  const effectiveMoltBlockCount = new Set(runtime.promptParts.map((part) => part.id)).size;

  const runtimeCompiledEvent: TraceEvent = {
    seq: offset + resolutionEvents.length + 1,
    type: 'RUNTIME_COMPILED',
    subjectId: sleeve.id,
    data: {
      runtimeHash: runtime.runtimeHash,
      promptPartCount: runtime.promptParts.length,
      totalNeoStacks: sleeve.neoStacks.length,
      totalNeoBlocks: sleeve.neoBlocks.length,
      totalMoltBlocks: sleeve.moltBlocks.length,
      activeNeoStacks: resolution.activeNeoStackIds.length,
      activeNeoBlocks: resolution.resolvedNeoBlocks.length,
      effectiveMoltBlocks: effectiveMoltBlockCount,
    },
  };
  const resetEvent: TraceEvent = {
    seq: runtimeCompiledEvent.seq + 1,
    type: 'POST_RUN_RESET_DECLARED',
    subjectId: sleeve.id,
    data: runtime.resetPlan,
  };

  const trace: Trace = {
    schemaVersion: 'umg.compiler-vnext.trace.v0.1',
    compilerVersion: COMPILER_VERSION,
    sleeveId: sleeve.id,
    compiledAt: selection.compiledAt,
    events: [...sourceEvents, ...validationEvents, ...resolutionEvents, runtimeCompiledEvent, resetEvent],
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
