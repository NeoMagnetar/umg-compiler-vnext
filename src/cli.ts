import { readFileSync, writeFileSync } from 'node:fs';
import { compileSleeve, validateSleeve } from './index.js';
import type { CompileSelection, Sleeve } from './types.js';

function usage(): never {
  process.stderr.write(
    [
      'UMG Compiler vNext experimental CLI',
      '',
      'Usage:',
      '  umg-vnext validate <sleeve.json>',
      '  umg-vnext compile <sleeve.json> <selection.json> [output.json]',
      '',
    ].join('\n'),
  );
  process.exitCode = 2;
  throw new Error('Invalid CLI arguments');
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

const [, , command, ...args] = process.argv;

try {
  if (command === 'validate') {
    if (args.length !== 1) usage();
    const sleeve = readJson<Sleeve>(args[0]);
    const result = validateSleeve(sleeve);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.diagnostics.some((item) => item.level === 'error') ? 1 : 0;
  } else if (command === 'compile') {
    if (args.length < 2 || args.length > 3) usage();
    const sleeve = readJson<Sleeve>(args[0]);
    const selection = readJson<CompileSelection>(args[1]);
    const result = compileSleeve(sleeve, selection);
    const output = `${JSON.stringify(result, null, 2)}\n`;
    if (args[2]) writeFileSync(args[2], output, 'utf8');
    else process.stdout.write(output);
    process.exitCode = result.hasErrors ? 1 : 0;
  } else {
    usage();
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message !== 'Invalid CLI arguments') {
    process.stderr.write(`umg-vnext failed: ${message}\n`);
    process.exitCode = 1;
  }
}
