# UMG Compiler vNext Integration Guide

## Status and scope

**Normative:** The compiler behavior described here is the frozen v0.1 contract qualified by H1 and H2. H3 documents and exercises that contract; it does not add compiler law.

**Non-normative:** Suggested deployment shapes and application patterns are integration advice.

The H2-qualified compiler baseline is Git commit `29cb63900dbfd35c64e076b0af72c5fbac71b9f1`. The package identifies itself as `umg-compiler-vnext@0.1.0-experimental`. The repository has a `v0.1.0-experimental` tag, but that tag points to the earlier semantic baseline and does not include H2 or H3 qualification tooling.

## The boundary

```text
Caller / Controller                         Compiler                         Runtime
interprets request and context              validates and resolves           executes RuntimeSpec
produces explicit CompileSelection   ->     deterministic cognition   ->     reports execution separately
```

**Normative:** AI may interpret. The compiler resolves.

- A caller, controller, or AI-facing layer may interpret natural language and context.
- That layer must provide explicit `activeNeoStackIds`, `activeNeoBlockIds`, `triggerState`, optional overlays/governance, and an explicit `compiledAt` in `CompileSelection`.
- The compiler does not infer intent, call a model, rewrite cognition, invent trigger state, or select a route.
- A runtime consumes `RuntimeSpec`. `Trace` explains the compile; it is not executable authority.

## Qualified installation method

No npm-registry publication exists. `package.json` is private. Use an exact Git checkout and build it locally:

```bash
git clone https://github.com/NeoMagnetar/umg-compiler-vnext.git
cd umg-compiler-vnext
git checkout 29cb63900dbfd35c64e076b0af72c5fbac71b9f1
npm ci
npm run build
```

For an installable local artifact, pack only after the build:

```bash
mkdir -p artifacts
npm pack --pack-destination artifacts
```

Install the resulting `umg-compiler-vnext-0.1.0-experimental.tgz` into a consumer:

```bash
npm install /absolute/path/to/umg-compiler-vnext-0.1.0-experimental.tgz
```

This is a local artifact workflow, not npm publication. Pin the source commit and retain the tarball hash in deployment provenance.

## Basic flow

1. Parse the Sleeve and selection as data.
2. Call `validateSleeve(sleeve)`.
3. Call `validateSelection(sleeve, selection)`.
4. If no error diagnostics exist, call `compileSleeve(sleeve, selection)`.
5. Branch on `CompileResult.status`; never assume `runtime` exists.
6. On success, pass `result.runtime` to the runtime boundary.
7. Store or display `result.trace` and `result.diagnostics` for observability.
8. Optionally recompute `computeRuntimeHash(result.runtime)` before execution.

Runnable examples live under `examples/`. Start with:

```bash
npm ci
npm run build
node examples/javascript/basic-compile/index.mjs
```

## Public outputs

**Normative:** `CompileResult` is the public envelope.

- Success: `status="success"`, `runtime!=null`, `trace!=null`, `hasErrors=false`.
- Failure: `status="failure"`, `runtime=null`, `hasErrors=true`.
- Structural failure: `trace=null`.
- Semantic or resolution failure: a meaningful `trace` is present.
- `RuntimeSpec` is executor-facing authority.
- `Trace` is forensic explanation.
- `CompileResult.diagnostics` is the aggregate diagnostic list.

See the focused guides in this directory for JavaScript, TypeScript, CLI, conformance, server, Studio, and authoring integration.
