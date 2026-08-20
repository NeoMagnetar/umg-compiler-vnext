# JavaScript API Guide

## Contract status

**Normative:** Import compiler functions from the package root only. Paths under `src/` and generated module paths below `dist/` are not application API imports.

```js
import {
  buildRuntimeHashPayload,
  compileSleeve,
  computeRuntimeHash,
  validateSelection,
  validateSleeve,
} from 'umg-compiler-vnext';
```

The runnable source is `examples/javascript/basic-compile/index.mjs`.

## Validation and compile

```js
const sleeveResult = validateSleeve(sleeve);
const selectionResult = validateSelection(sleeve, selection);

const errors = [...sleeveResult.diagnostics, ...selectionResult.diagnostics]
  .filter((diagnostic) => diagnostic.level === 'error');

if (errors.length > 0) {
  // Return or display structured diagnostics. Do not silently repair input.
}

const result = compileSleeve(sleeve, selection);
if (result.status === 'failure') {
  // result.runtime is null
  // result.trace is null only for structural failure
  // result.diagnostics contains the public failure contract
} else {
  const runtime = result.runtime;
  const trace = result.trace;
}
```

Expected invalid input is returned as structured data rather than thrown through the public compile API. Callers should still catch file, network, JSON parsing, and other integration-layer errors.

## Runtime hash helpers

```js
const expected = computeRuntimeHash(result.runtime);
if (expected !== result.runtime.runtimeHash) {
  throw new Error('RuntimeSpec integrity mismatch');
}

const protectedProjection = buildRuntimeHashPayload(result.runtime);
```

**Normative:** Do not calculate a replacement hash over arbitrary JSON. `computeRuntimeHash()` applies the frozen protected projection and canonical hashing contract. `compiledAt`, diagnostics, display names, and the `runtimeHash` field itself are intentionally outside that protected projection.

## Diagnostics

Each diagnostic has a stable code, level, stage, and subject contract:

```js
for (const diagnostic of result.diagnostics) {
  logger[diagnostic.level]({
    code: diagnostic.code,
    stage: diagnostic.stage,
    subject: diagnostic.subject,
    path: diagnostic.path,
    details: diagnostic.details,
    message: diagnostic.message,
  });
}
```

Branch on `code`, `level`, `stage`, and structured fields. Message wording is presentation text, not the primary machine discriminator.

## Trace

```js
if (result.trace) {
  for (const event of result.trace.events) {
    audit.write({ seq: event.seq, type: event.type, stage: event.stage, subject: event.subject, data: event.data });
  }
}
```

**Normative:** Trace events explain validation and resolution. Never execute Trace as if it were `RuntimeSpec`.

## Failure examples

Run:

```bash
node examples/javascript/basic-compile/failure-handling.mjs
```

It proves:

- missing required Sleeve data produces structural failure, `runtime=null`, `trace=null`;
- invalid Prime Directive ownership produces semantic failure, `runtime=null`, semantic Trace;
- two matching Secondary Directives produce resolution failure with `MULTIPLE_SECONDARY_DIRECTIVE_MATCH`, `runtime=null`, resolution Trace.
