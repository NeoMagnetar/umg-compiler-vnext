import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  compileSleeve,
  computeRuntimeHash,
  validateSelection,
  validateSleeve,
  type CompileResult,
  type CompileSelection,
  type CompilerDiagnostic,
  type RuntimeSpec,
  type Sleeve,
  type Trace,
} from 'umg-compiler-vnext';

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

function errorDiagnostics(diagnostics: CompilerDiagnostic[]): CompilerDiagnostic[] {
  return diagnostics.filter((item) => item.level === 'error');
}

function requireSuccess(result: CompileResult): { runtime: RuntimeSpec; trace: Trace } {
  if (result.status !== 'success' || result.runtime === null || result.trace === null) {
    throw new Error(`Compile failed: ${JSON.stringify(result.diagnostics)}`);
  }
  return { runtime: result.runtime, trace: result.trace };
}

const dataRoot = resolve(process.cwd(), 'examples', 'data');
const sleeve = await readJson<Sleeve>(resolve(dataRoot, 'basic.sleeve.json'));
const selection = await readJson<CompileSelection>(resolve(dataRoot, 'basic.selection.json'));

const sleeveErrors = errorDiagnostics(validateSleeve(sleeve).diagnostics);
const selectionErrors = errorDiagnostics(validateSelection(sleeve, selection).diagnostics);
if (sleeveErrors.length > 0 || selectionErrors.length > 0) {
  throw new Error(`Validation failed: ${JSON.stringify([...sleeveErrors, ...selectionErrors])}`);
}

const result = compileSleeve(sleeve, selection);
const { runtime, trace } = requireSuccess(result);
if (computeRuntimeHash(runtime) !== runtime.runtimeHash) {
  throw new Error('Runtime hash verification failed.');
}

process.stdout.write(
  `${JSON.stringify(
    {
      status: result.status,
      runtimeHash: runtime.runtimeHash,
      resolvedNeoBlocks: runtime.resolvedNeoBlocks.length,
      promptParts: runtime.promptParts.length,
      traceEvents: trace.events.length,
      diagnostics: result.diagnostics.length,
    },
    null,
    2,
  )}\n`,
);
