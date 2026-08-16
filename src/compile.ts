import { COMPILER_VERSION } from './constants.js';
import { sha256Canonical } from './canonicalize.js';
import { resolveSleeve } from './resolve.js';
import { validateSelection } from './validate.js';
import type { CompileResult, CompileSelection, RuntimeSpec, Sleeve, Trace, TraceEvent } from './types.js';

export function compileSleeve(sleeve: Sleeve, selection: CompileSelection): CompileResult {
  const validation = validateSelection(sleeve, selection);
  const validationEvents: TraceEvent[] = validation.diagnostics.map((diagnostic, index) => ({
    seq: index + 1,
    type: diagnostic.level === 'error' ? 'VALIDATION_ERROR' : 'VALIDATION_WARNING',
    data: { code: diagnostic.code, message: diagnostic.message, path: diagnostic.path },
  }));

  if (validation.diagnostics.some((diagnostic) => diagnostic.level === 'error')) {
    const trace: Trace = {
      schemaVersion: 'umg.compiler-vnext.trace.v0.1',
      compilerVersion: COMPILER_VERSION,
      sleeveId: sleeve.id,
      compiledAt: selection.compiledAt,
      events: validationEvents,
      diagnostics: validation.diagnostics,
      finalNeoStackStates: Object.fromEntries(
        sleeve.neoStacks.map((stack) => [stack.id, stack.defaultState ?? 'ready']),
      ),
      finalNeoBlockStates: Object.fromEntries(
        sleeve.neoBlocks.map((block) => [block.id, block.defaultState ?? 'ready']),
      ),
    };
    return { trace, hasErrors: true };
  }

  const resolution = resolveSleeve(sleeve, selection);
  const diagnostics = [...validation.diagnostics, ...resolution.diagnostics];
  const hasErrors = diagnostics.some((diagnostic) => diagnostic.level === 'error');
  const offset = validationEvents.length;
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
      events: [...validationEvents, ...resolutionEvents, ...errorEvents],
      diagnostics,
      finalNeoStackStates: resolution.finalNeoStackStates,
      finalNeoBlockStates: resolution.finalNeoBlockStates,
    };
    return { trace, hasErrors: true };
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

  const runtimeCompiledEvent: TraceEvent = {
    seq: offset + resolutionEvents.length + 1,
    type: 'RUNTIME_COMPILED',
    subjectId: sleeve.id,
    data: { runtimeHash: runtime.runtimeHash, promptPartCount: runtime.promptParts.length },
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
    events: [...validationEvents, ...resolutionEvents, runtimeCompiledEvent, resetEvent],
    diagnostics,
    finalNeoStackStates: resolution.finalNeoStackStates,
    finalNeoBlockStates: resolution.finalNeoBlockStates,
  };

  return { runtime, trace, hasErrors: false };
}
