# Server Adapter Guide

## Architecture

```text
Browser / Studio
      |
      | CompileRequest { sleeve, selection }
      v
Node compiler service
      |
      | compileSleeve() from package root
      v
CompileResult
      |
      v
Studio adapter / display and RuntimeSpec consumer
```

The runnable example is `examples/server-adapter/server.mjs`.

## Endpoints

| Endpoint | Request | Response |
| --- | --- | --- |
| `GET /health` | none | `{ "status": "ok" }` |
| `GET /compiler/info` | none | Public compiler/schema version and compatibility information |
| `POST /validate` | `{ "sleeve": ... }` or `{ "sleeve": ..., "selection": ... }` | Exact `ValidationResult` |
| `POST /compile` | `{ "sleeve": ..., "selection": ... }` | Exact `CompileResult` |

Start it:

```bash
npm ci
npm run build
node examples/server-adapter/server.mjs
```

Smoke test all endpoints without a persistent process:

```bash
node examples/server-adapter/smoke-test.mjs
```

## Boundary guarantees

**Normative:** The adapter calls the public compiler API and returns its real validation/compile contracts. It does not alter `CompileResult`, repair selections, rewrite cognition, infer triggers, translate compiler-v0 data, or call an AI/model.

Compiler failures are valid HTTP responses containing `status="failure"`; they are not converted into tooling exceptions. Malformed HTTP/JSON requests are adapter failures and use a separate `INVALID_REQUEST` response.

**Non-normative:** The example intentionally omits production authentication, TLS, authorization, rate limiting, request provenance, persistent audit storage, and deployment-specific body limits. Add those around the compiler boundary without changing compiler inputs or outputs.
