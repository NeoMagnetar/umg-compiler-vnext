import { readFileSync, writeFileSync } from 'node:fs';
import { compileSleeve, validateSleeve } from './index.js';

class CliUsageError extends Error {}
class CliToolingError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function usage(): never {
  process.stderr.write(
    [
      'UMG_VNEXT_CLI_ERROR INVALID_USAGE',
      'UMG Compiler vNext experimental CLI',
      '',
      'Usage:',
      '  umg-vnext validate <sleeve.json>',
      '  umg-vnext compile <sleeve.json> <selection.json> [output.json]',
      '',
    ].join('\n'),
  );
  throw new CliUsageError('Invalid CLI arguments');
}

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CliToolingError('INPUT_READ_FAILED', `${path}: ${message}`);
  }
}

function writeOutput(path: string, output: string): void {
  try {
    writeFileSync(path, output, 'utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CliToolingError('OUTPUT_WRITE_FAILED', `${path}: ${message}`);
  }
}

const [, , command, ...args] = process.argv;

try {
  if (command === 'validate') {
    if (args.length !== 1) usage();
    const result = validateSleeve(readJson(args[0]));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.diagnostics.some((item) => item.level === 'error') ? 1 : 0;
  } else if (command === 'compile') {
    if (args.length < 2 || args.length > 3) usage();
    const result = compileSleeve(readJson(args[0]), readJson(args[1]));
    const output = `${JSON.stringify(result, null, 2)}\n`;
    if (args[2]) writeOutput(args[2], output);
    else process.stdout.write(output);
    process.exitCode = result.status === 'success' ? 0 : 1;
  } else {
    usage();
  }
} catch (error) {
  if (error instanceof CliUsageError) {
    process.exitCode = 2;
  } else if (error instanceof CliToolingError) {
    process.stderr.write(`UMG_VNEXT_CLI_ERROR ${error.code}: ${error.message}\n`);
    process.exitCode = 2;
  } else {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`UMG_VNEXT_CLI_ERROR UNRECOVERABLE_TOOLING_FAILURE: ${message}\n`);
    process.exitCode = 2;
  }
}
