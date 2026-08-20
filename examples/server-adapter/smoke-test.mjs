import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCompilerServer } from './server.mjs';

const exampleRoot = dirname(fileURLToPath(import.meta.url));
const dataRoot = resolve(exampleRoot, '..', 'data');
const sleeve = JSON.parse(await readFile(resolve(dataRoot, 'basic.sleeve.json'), 'utf8'));
const selection = JSON.parse(await readFile(resolve(dataRoot, 'basic.selection.json'), 'utf8'));
const server = createCompilerServer();

await new Promise((resolveListen, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolveListen);
});

try {
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('Server did not expose a TCP address.');
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const request = async (path, init) => {
    const response = await fetch(`${baseUrl}${path}`, init);
    return { status: response.status, body: await response.json() };
  };

  const health = await request('/health');
  const info = await request('/compiler/info');
  const validation = await request('/validate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sleeve, selection }),
  });
  const compile = await request('/compile', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sleeve, selection }),
  });

  if (health.status !== 200 || health.body.status !== 'ok') throw new Error('Health endpoint failed.');
  if (info.status !== 200 || info.body.compilerVersion !== '0.1.0-experimental') {
    throw new Error('Compiler info endpoint failed.');
  }
  if (validation.status !== 200 || validation.body.diagnostics.length !== 0) {
    throw new Error('Validation endpoint failed.');
  }
  if (compile.status !== 200 || compile.body.status !== 'success' || compile.body.runtime === null) {
    throw new Error('Compile endpoint failed.');
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        health: health.body.status,
        compilerVersion: info.body.compilerVersion,
        validationDiagnostics: validation.body.diagnostics.length,
        compileStatus: compile.body.status,
        runtimeHash: compile.body.runtime.runtimeHash,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await new Promise((resolveClose, reject) => server.close((error) => (error ? reject(error) : resolveClose())));
}
