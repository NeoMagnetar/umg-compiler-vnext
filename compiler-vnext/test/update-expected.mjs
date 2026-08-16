import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileSleeve } from '../dist/index.js';
import { compileCases } from './fixture-cases.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

function json(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

for (const testCase of compileCases) {
  const sleeve = json(testCase.sleevePath);
  const selection = json(testCase.selectionPath);
  const result = compileSleeve(sleeve, selection);
  const outputPath = resolve(root, testCase.expectedPath);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

process.stdout.write(`updated ${compileCases.length} compiler-vnext expected compile results\n`);
