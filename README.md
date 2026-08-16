# UMG Compiler vNext — Experimental Reference Package

This package is a **side-by-side experimental compiler**, not an in-place replacement for `compiler-v0`.

It implements the current pre-ratification working model:

- `MOLT Block -> NeoBlock -> NeoStack -> Sleeve`
- fixed MOLT lanes
- one Prime Directive per NeoBlock
- `baseGeometry.directive` authors the Prime Directive row only
- optional Secondary Directives selected by externally supplied Trigger state
- same-MOLT-only Bundles
- vertical tiers and horizontal peers
- left-to-right deterministic read order
- `READY / ACTIVE / OFF / DISABLED`
- explicit pre-authored Merge results with authority-conservation checks
- scoped Instruction, Philosophy, and Blueprint
- temporary explicit Overlays
- extra-MOLT Governance OFF
- deterministic RuntimeSpec and Trace
- no compiler-side generative synthesis

## Run

```bash
npm install
npm test
```

Without installing dependencies, the package can also build where a compatible `tsc` is already available:

```bash
tsc -p tsconfig.json
node test/run-fixtures.mjs
```

## CLI

```bash
node dist/cli.js validate fixtures/dealership.sleeve.json
node dist/cli.js compile \
  fixtures/dealership.sleeve.json \
  fixtures/requests/secondary-b.selection.json \
  /tmp/secondary-b.result.json
```

## Important boundary

The compiler does not interpret natural language and does not invent Trigger state or route rationale. The caller supplies explicit `triggerState`, active NeoStacks, active NeoBlocks, optional `routeRationale`, Overlays, Governance rules, and human-disabled modules.
