import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import {
  COMPILER_VERSION,
  COMPILE_RESULT_SCHEMA_VERSION,
  RUNTIME_SCHEMA_VERSION,
  SELECTION_SCHEMA_VERSION,
  SLEEVE_SCHEMA_VERSION,
  TRACE_SCHEMA_VERSION,
  compileSleeve,
  getCompilerCompatibility,
  validateSelection,
  validateSleeve,
} from 'umg-compiler-vnext';

const MAX_BODY_BYTES = 2 * 1024 * 1024;

function sendJson(response, statusCode, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  });
  response.end(body);
}

async function readJsonBody(request) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > MAX_BODY_BYTES) throw new Error('REQUEST_BODY_TOO_LARGE');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function createCompilerServer() {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://localhost');
      if (request.method === 'GET' && url.pathname === '/health') {
        sendJson(response, 200, { status: 'ok' });
        return;
      }
      if (request.method === 'GET' && url.pathname === '/compiler/info') {
        sendJson(response, 200, {
          compilerVersion: COMPILER_VERSION,
          schemas: {
            sleeve: SLEEVE_SCHEMA_VERSION,
            selection: SELECTION_SCHEMA_VERSION,
            compileResult: COMPILE_RESULT_SCHEMA_VERSION,
            runtime: RUNTIME_SCHEMA_VERSION,
            trace: TRACE_SCHEMA_VERSION,
          },
          compatibility: getCompilerCompatibility(COMPILER_VERSION),
        });
        return;
      }
      if (request.method === 'POST' && url.pathname === '/validate') {
        const body = await readJsonBody(request);
        const result = Object.hasOwn(body, 'selection')
          ? validateSelection(body.sleeve, body.selection)
          : validateSleeve(body.sleeve);
        sendJson(response, 200, result);
        return;
      }
      if (request.method === 'POST' && url.pathname === '/compile') {
        const body = await readJsonBody(request);
        sendJson(response, 200, compileSleeve(body.sleeve, body.selection));
        return;
      }
      sendJson(response, 404, { error: 'NOT_FOUND' });
    } catch (error) {
      sendJson(response, 400, {
        error: 'INVALID_REQUEST',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const port = Number.parseInt(process.env.PORT ?? '8787', 10);
  const server = createCompilerServer();
  server.listen(port, '127.0.0.1', () => {
    process.stdout.write(`UMG compiler example listening on http://127.0.0.1:${port}\n`);
  });
}
