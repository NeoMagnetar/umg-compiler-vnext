# H2 Conformance Runner Guide

## Run the frozen suite

Build the subject first, then run:

```bash
npm ci
npm run build
node h2/conformance/runner.mjs --json
```

Write the machine result to a file:

```bash
node h2/conformance/runner.mjs --json --output conformance-result.json
```

Test another compiler checkout or unpacked subject:

```bash
node h2/conformance/runner.mjs --subject-root /absolute/path/to/subject --json
```

The external subject must expose the qualified root-package contract and built distribution expected by H1. The runner does not import the repository's compiler internals.

## Result meaning

The result schema is `UMG_VNEXT_CONFORMANCE_RESULT.v0.1`.

**Normative:** The frozen suite contains 13 canonical cases covering 39 unique H1 requirement IDs. A qualified reference run reports:

```json
{
  "total": 13,
  "passed": 13,
  "failed": 0,
  "skipped": 0,
  "conformant": true
}
```

`conformant=false` means at least one required case failed, a required case was missing/skipped, corpus integrity failed, or another normative comparison failed. It is not a best-effort pass. Do not promote or execute a subject as H1-conformant from that result.

Corpus hashes are verified from exact Git blob bytes at the selected corpus `HEAD`; checkout CRLF conversion is not silently normalized into canonical identity.

Run the integration example:

```bash
node examples/conformance/run.mjs
```
