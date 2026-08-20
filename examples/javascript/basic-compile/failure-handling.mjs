import { readFile } from 'node:fs/promises';
import { compileSleeve } from 'umg-compiler-vnext';

const dataRoot = new URL('../../data/', import.meta.url);
const sleeve = JSON.parse(await readFile(new URL('basic.sleeve.json', dataRoot), 'utf8'));
const selection = JSON.parse(await readFile(new URL('basic.selection.json', dataRoot), 'utf8'));

const structuralSleeve = structuredClone(sleeve);
delete structuralSleeve.name;
const structural = compileSleeve(structuralSleeve, selection);

const semanticSleeve = structuredClone(sleeve);
semanticSleeve.neoBlocks[0].primeDirectiveId = 'I.EXAMPLE.STEP';
const semantic = compileSleeve(semanticSleeve, selection);

const multipleSelection = structuredClone(selection);
multipleSelection.triggerState['T.EXAMPLE.FOCUSED'] = true;
multipleSelection.triggerState['T.EXAMPLE.SAFE'] = true;
const multiple = compileSleeve(sleeve, multipleSelection);

const multipleCodes = multiple.diagnostics.map((item) => item.code);
if (structural.status !== 'failure' || structural.runtime !== null || structural.trace !== null) {
  throw new Error('Structural failure did not obey the fail-closed contract.');
}
if (semantic.status !== 'failure' || semantic.runtime !== null || semantic.trace === null) {
  throw new Error('Semantic failure did not obey the fail-closed contract.');
}
if (multiple.status !== 'failure' || multiple.runtime !== null || multiple.trace === null) {
  throw new Error('Resolution failure did not obey the fail-closed contract.');
}
if (!multipleCodes.includes('MULTIPLE_SECONDARY_DIRECTIVE_MATCH')) {
  throw new Error('Expected MULTIPLE_SECONDARY_DIRECTIVE_MATCH diagnostic.');
}

process.stdout.write(
  `${JSON.stringify(
    {
      structural: {
        status: structural.status,
        runtime: structural.runtime,
        trace: structural.trace,
        stages: [...new Set(structural.diagnostics.map((item) => item.stage))],
      },
      semantic: {
        status: semantic.status,
        runtime: semantic.runtime,
        traceTerminalStage: semantic.trace.terminalStage,
        codes: semantic.diagnostics.map((item) => item.code),
      },
      multipleSecondary: {
        status: multiple.status,
        runtime: multiple.runtime,
        traceTerminalStage: multiple.trace.terminalStage,
        codes: multipleCodes,
      },
    },
    null,
    2,
  )}\n`,
);
