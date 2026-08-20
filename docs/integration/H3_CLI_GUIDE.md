# CLI Guide

## Build and entry points

After `npm ci && npm run build`, use the package binary when installed or the built entry point in a source checkout:

```bash
umg-vnext validate sleeve.json
umg-vnext compile sleeve.json selection.json
umg-vnext compile sleeve.json selection.json compile-result.json
```

Source-checkout equivalent:

```bash
node dist/cli.js validate examples/data/basic.sleeve.json
node dist/cli.js compile examples/data/basic.sleeve.json examples/data/basic.selection.json
node dist/cli.js compile examples/data/basic.sleeve.json examples/data/basic.selection.json compile-result.json
```

When an output path is supplied, the canonical `CompileResult` JSON is written to that file. Otherwise it is written to stdout.

## Exit status

**Normative:**

| Exit | Meaning | Output |
| ---: | --- | --- |
| `0` | Validation or compile success | JSON on stdout, or compile JSON in requested output file |
| `1` | Expected compiler/validation failure | Structured validation or `CompileResult` JSON |
| `2` | Invalid usage, input read/parse failure, output write failure, or unrecoverable tooling failure | `UMG_VNEXT_CLI_ERROR` on stderr |

Do not treat exit `1` as malformed tooling output; parse the returned compiler contract. Do not mix logs into stdout when stdout carries JSON.

Run the cross-platform CLI example:

```bash
node examples/cli/run.mjs
```

It exercises validation, output-file compilation, a compiler failure, and a tooling/usage failure, and asserts exit codes `0`, `1`, and `2`.
