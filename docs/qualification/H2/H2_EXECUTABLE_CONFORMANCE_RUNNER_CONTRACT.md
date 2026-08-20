# H2 Executable Conformance Runner Contract

This document defines the H2 executable conformance runner for the frozen H1 UMG compiler-vNext corpus.

## Scope

H2 adds deterministic execution mechanics for the frozen H1 conformance specification. It does not alter compiler semantics, H1 corpus artifacts, expected outputs, schemas, or runtime/trace diagnostics.

## Normative Inputs

- Frozen H1 corpus manifest: `docs/qualification/H1/H1F4B_CORPUS_INTEGRITY_MANIFEST.json`
- Frozen H1 case selection contract: `docs/qualification/H1/H1F2_CANONICAL_CORPUS_SELECTION.md`
- Frozen H1 hash method correction: `docs/qualification/H1/H1F4C4_CORPUS_HASH_METHOD_CORRECTION.md`
- Frozen H1 case corpus and expected outputs under `fixtures/` and `test/`

## Canonical Byte Rule

Canonical corpus identity is based on the exact canonical bytes defined by H1.

- The runner must verify corpus inputs using exact bytes from the frozen source definition.
- The runner must not depend on checkout-specific text normalization or `autocrlf`.
- Windows CRLF conversion must not create false corpus identity.
- The runner must fail closed on any corpus hash mismatch.

## Runner Responsibilities

The runner must:

1. Load the frozen H1 conformance definition.
2. Verify corpus integrity before case execution.
3. Execute every required normative H1 case.
4. Compare actual compiler outputs against frozen expectations.
5. Validate the machine-readable result against `UMG_VNEXT_CONFORMANCE_RESULT.v0.1`.
6. Fail closed on any normative mismatch.

## CLI Contract

The preferred entry point is:

```bash
node h2/conformance/runner.mjs [options]
```

Required options:

- `--help`
- `--json`
- `--output <file>`

Subject/compiler selection:

- `--subject-root <dir>` selects the compiler subject root.
- The runner must not require internal compiler imports when the subject is external.

## Result Contract

The emitted machine-readable result must be the H1-defined:

- `UMG_VNEXT_CONFORMANCE_RESULT.v0.1`

Minimum required summary fields:

- `total`
- `passed`
- `failed`
- `skipped`
- `conformant`

The runner must validate its own output schema before reporting success.

## Case Evidence Requirements

For each required case, the runner must capture:

- `caseId`
- `requirementIds`
- `status`
- `input integrity`
- `execution status`
- `expected status`
- `actual status`
- `expected canonical result/hash`
- `actual canonical result/hash`
- `expected runtimeHash` where applicable
- `actual runtimeHash`
- `diagnostic comparison`
- `trace comparison`
- `runtime projection comparison`
- `failure reason` if any

## Fail-Closed Conditions

The runner must fail when it encounters:

- corrupt corpus file
- wrong corpus hash
- missing required case
- unexpected case failure
- unexpected case success
- wrong canonical `CompileResult`
- wrong protected `runtimeHash`
- wrong diagnostic contract
- wrong trace contract
- wrong runtime projection
- invalid result-schema output
- required test skipped

No best-effort pass is allowed.

## Evidence Expectations

The qualified H2 workflow must include:

- positive self-test against the frozen/reference compiler candidate
- negative controls using isolated temporary mutations only
- repeated deterministic execution
- Windows and Linux/WSL2 semantic parity
- fresh-clone verification
- a hash manifest for the generated evidence artifacts

## Canonical Evidence Projection

Determinism and cross-platform fingerprints canonicalize the complete result after excluding only these explicitly non-normative execution-environment fields:

- `generatedAt`
- `subject.root`
- `corpus.root`

All case outcomes, requirement IDs, integrity hashes, expected and actual canonical result hashes, protected runtime hashes, diagnostic comparisons, trace comparisons, runtime projections, manifest content, subject commit identity, and summary fields remain in the canonical fingerprint.

The Linux parity run clones the repository into a WSL2 Linux-native temporary filesystem. It does not execute the corpus from the Windows-mounted checkout.

## Non-Goals

H2 must not:

- begin H3 or H4
- begin Phase I
- set `integration_ready=true`
- modify compiler semantics
- modify frozen corpus artifacts
- modify expected outputs
- modify schemas
