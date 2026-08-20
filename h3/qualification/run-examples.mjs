#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');

const exampleGroups = [
  {
    id: 'javascript',
    commands: [
      ['examples/javascript/basic-compile/index.mjs'],
      ['examples/javascript/basic-compile/failure-handling.mjs'],
    ],
  },
  { id: 'typescript', commands: [['examples/typescript/basic-compile/run.mjs']] },
  { id: 'cli', commands: [['examples/cli/run.mjs']] },
  { id: 'conformance', commands: [['examples/conformance/run.mjs']] },
  { id: 'server_adapter', commands: [['examples/server-adapter/smoke-test.mjs']] },
];

function runNode(args, cwd) {
  const child = spawnSync(process.execPath, args, {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
  });
  return {
    command: [process.execPath, ...args],
    status: child.status,
    signal: child.signal ?? null,
    stdout: child.stdout ?? '',
    stderr: child.stderr ?? '',
    passed: child.status === 0,
  };
}

export function runExamples(root = repoRoot) {
  const groups = exampleGroups.map((group) => {
    const executions = group.commands.map((args) => runNode(args, root));
    return {
      id: group.id,
      passed: executions.every((item) => item.passed),
      executions,
    };
  });
  return {
    total: groups.length,
    passed: groups.filter((item) => item.passed).length,
    failed: groups.filter((item) => !item.passed).length,
    allPassed: groups.every((item) => item.passed),
    groups,
  };
}

function parseArgs(args) {
  const options = { json: false, output: null };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--json') options.json = true;
    else if (arg === '--output') options.output = args[++index];
    else throw new Error(`Unknown option: ${arg}`);
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = runExamples();
  const output = `${JSON.stringify(result, null, 2)}\n`;
  if (options.output) writeFileSync(resolve(process.cwd(), options.output), output, 'utf8');
  if (options.json && !options.output) process.stdout.write(output);
  if (!options.json && !options.output) {
    process.stdout.write(`H3 examples: ${result.passed}/${result.total} passed\n`);
  }
  process.exitCode = result.allPassed ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 2;
  }
}
