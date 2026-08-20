import { readFile } from 'node:fs/promises';
import {
  buildRuntimeHashPayload,
  compileSleeve,
  computeRuntimeHash,
  validateSelection,
  validateSleeve,
} from 'umg-compiler-vnext';

const dataRoot = new URL('../../data/', import.meta.url);
const sleeve = JSON.parse(await readFile(new URL('basic.sleeve.json', dataRoot), 'utf8'));
const selection = JSON.parse(await readFile(new URL('basic.selection.json', dataRoot), 'utf8'));

const sleeveValidation = validateSleeve(sleeve);
const selectionValidation = validateSelection(sleeve, selection);
if (sleeveValidation.diagnostics.some((item) => item.level === 'error')) {
  throw new Error(`Sleeve validation failed: ${JSON.stringify(sleeveValidation.diagnostics)}`);
}
if (selectionValidation.diagnostics.some((item) => item.level === 'error')) {
  throw new Error(`Selection validation failed: ${JSON.stringify(selectionValidation.diagnostics)}`);
}

const result = compileSleeve(sleeve, selection);
if (result.status !== 'success' || !result.runtime || !result.trace) {
  throw new Error(`Compile failed: ${JSON.stringify(result.diagnostics)}`);
}

const recomputedHash = computeRuntimeHash(result.runtime);
if (recomputedHash !== result.runtime.runtimeHash) {
  throw new Error('Runtime hash verification failed.');
}

const hashPayload = buildRuntimeHashPayload(result.runtime);
process.stdout.write(
  `${JSON.stringify(
    {
      status: result.status,
      compilerVersion: result.compilerVersion,
      runtimeHash: result.runtime.runtimeHash,
      activeNeoStackIds: result.runtime.activeNeoStackIds,
      promptPartCount: result.runtime.promptParts.length,
      diagnosticCount: result.diagnostics.length,
      traceTerminalStage: result.trace.terminalStage,
      traceEventCount: result.trace.events.length,
      hashProfileVersion: hashPayload.hashProfileVersion,
    },
    null,
    2,
  )}\n`,
);
