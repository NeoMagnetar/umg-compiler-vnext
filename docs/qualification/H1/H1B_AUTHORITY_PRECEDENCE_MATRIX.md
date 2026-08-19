# H1-B Authority & Precedence Matrix

Repository: `C:\.openclaw\workspace\umg-compiler`  
Source head baseline for this review: `764ac06fdbb14c74ee5afe5cd799ec261ea047b0`  
This matrix is derived from existing artifacts only; no compiler behavior or data files were changed.

## Scope and evidence set

- Authoritative source baseline: `docs/SEMANTIC_FREEZE_v0.1.md`
- Registry/contract registry sources:
  - `schemas/SCHEMA_REGISTRY.json`
  - `schemas/COMPATIBILITY_MATRIX.json`
  - `schemas/DIAGNOSTIC_REGISTRY.json`
  - `schemas/TRACE_EVENT_REGISTRY.json`
  - `schemas/RUNTIME_HASH_PROFILE.json`
- Contract tests used as evidence:
  - `test/version-compatibility-contract.mjs`
  - `test/trace-registry-contract.mjs`
  - `test/trace-emission-coverage.mjs`
  - `test/state-selection-contract.mjs`
  - `test/runtime-hash-contract.mjs`
  - `test/public-output-contract.mjs`
  - `test/diagnostic-registry-contract.mjs`
  - `test/diagnostic-emission-coverage.mjs`
  - `test/cli-contract.mjs`
  - `test/merge-contract.mjs`
  - `test/bundle-overlay-contract.mjs`
  - `test/governance-contract.mjs`
  - `test/directive-geometry-contract.mjs`
  - `test/pathological-robustness-contract.mjs`
  - `test/property-metamorphic-contract.mjs`
  - `test/deterministic-fuzz-contract.mjs`
  - `test/qualification-container-unknown-regression.mjs`

## Domain authority mapping

1) Frozen semantic behavior
- Authoritative artifact(s): `docs/SEMANTIC_FREEZE_v0.1.md`
- Supporting artifact(s): `schemas/SCHEMA_REGISTRY.json`, `schemas/COMPATIBILITY_MATRIX.json`, targeted regression/contract tests
- Evidence: `SEMANTIC_FREEZE_v0.1.md` enumerates frozen domains (composition, selection, directives, bundle, governance, etc.) and lists explicit `B4A` boundaries.
- Explicit or inferred: **Explicit**
- Sources agree: **Yes** (for listed domains)
- Tension/contradiction: none for named frozen domains; open tension for newer artifacts on trace/diagnostic/runtimeHash because freeze labels them outside scope.
- Proposed disposition: **CONFIRMED**

2) Structural/schema validity
- Authoritative artifact(s): `schemas/SCHEMA_REGISTRY.json`, `schemas/*.schema.json`, `schemas/umg-compiler-vnext.schema.json`, `schemas/README.md`
- Supporting artifact(s): `test/version-compatibility-contract.mjs`, `test/public-output-contract.mjs`, schema validation tests
- Evidence: versioned document kinds + structural schemas + explicit README scope note (“JSON Schema validates shape”); contract tests assert schema versions and structural validation.
- Explicit or inferred: **Explicit**
- Sources agree: **Yes**
- Tension/contradiction: none
- Proposed disposition: **CONFIRMED**

3) Public input/output shape
- Authoritative artifact(s): `schemas/SCHEMA_REGISTRY.json`, `schemas/runtime-spec.schema.json`, `schemas/trace.schema.json`, `schemas/compile-result schema`, `schemas/compatibility matrix`, `test/public-output-contract.mjs`, `test/version-compatibility-contract.mjs`
- Supporting artifact(s): `schemas/SCHEMA_README` for contract semantics boundary, fixtures as golden expected outputs
- Evidence: version checks in `version-compatibility-contract.mjs`, `public-output-contract.mjs` asserting required presence/absence of runtime/trace by status.
- Explicit or inferred: **Explicit + inferred (for combined behavior)**
- Sources agree: **Yes**
- Tension/contradiction: none
- Proposed disposition: **CONFIRMED**

4) RuntimeSpec behavior
- Authoritative artifact(s): `docs/SEMANTIC_FREEZE_v0.1.md` (`resolved cognition, ...`), `schemas/runtime-spec.schema.json`, `schemas/SCHEMA_REGISTRY.json`
- Supporting artifact(s): `test/state-selection-contract.mjs`, `test/public-output-contract.mjs`, `test/merge-contract.mjs`
- Evidence: explicit frozen mention of RuntimeSpec + schema and contract version alignment; runtime-focused assertions for active ids, resolved blocks, diagnostics placement.
- Explicit or inferred: **Explicit + inferred**
- Sources agree: **Mostly yes**
- Tension/contradiction: no direct conflict, but runtime semantics are partly in TS validator (called out by README as non-schema authority)
- Proposed disposition: **CONFIRMED**

5) Trace structure
- Authoritative artifact(s): `schemas/trace.schema.json`, `schemas/SCHEMA_REGISTRY.json`, `schemas/TRACE_EVENT_REGISTRY.json`, `test/trace-registry-contract.mjs`
- Supporting artifact(s): `test/public-output-contract.mjs`, `test/trace-emission-coverage.mjs`
- Evidence: trace schema version assertions and trace contract validators in tests.
- Explicit or inferred: **Explicit**
- Sources agree: **Yes**
- Tension/contradiction: none
- Proposed disposition: **CONFIRMED**

6) Trace event vocabulary
- Authoritative artifact(s): `schemas/TRACE_EVENT_REGISTRY.json`
- Supporting artifact(s): `dist/trace-event-registry.js` JSON projection (tested in `trace-registry-contract.mjs`), `test/trace-emission-coverage.mjs`
- Evidence: registry entry matching and exhaustive emitted-type coverage assertions.
- Explicit or inferred: **Explicit**
- Sources agree: **Yes**
- Tension/contradiction: none
- Proposed disposition: **CONFIRMED**

7) Diagnostics / error codes
- Authoritative artifact(s): `schemas/DIAGNOSTIC_REGISTRY.json`
- Supporting artifact(s): `test/diagnostic-registry-contract.mjs`, `test/diagnostic-emission-coverage.mjs`, error constructors
- Evidence: registry conformance plus emitted-code audits and source scan in tests.
- Explicit or inferred: **Explicit**
- Sources agree: **Yes**
- Tension/contradiction: none
- Proposed disposition: **CONFIRMED**

8) Runtime hash and determinism
- Authoritative artifact(s): `schemas/RUNTIME_HASH_PROFILE.json`, `schemas/COMPATIBILITY_MATRIX.json` (`runtimeHashProfile` binding), `test/runtime-hash-contract.mjs`
- Supporting artifact(s): `test/deterministic-fuzz-contract.mjs`
- Evidence: profile property checks and invariance/mutation sensitivity assertions.
- Explicit or inferred: **Explicit**
- Sources agree: **Yes**
- Tension/contradiction: Freeze explicitly excluded runtimeHash redesign; this is an open governance scope question but no contradiction in current behavior.
- Proposed disposition: **NEEDS_EXPLICIT_PRECEDENCE**

9) Version compatibility
- Authoritative artifact(s): `schemas/COMPATIBILITY_MATRIX.json`, `schemas/SCHEMA_REGISTRY.json`, package/contract version constants, `test/version-compatibility-contract.mjs`
- Supporting artifact(s): compatibility assertions in CLI path if used
- Evidence: exact policy (`exactManifestMembership`, `inferFromSemver=false`, exact schema/version checks) is asserted in contract test.
- Explicit or inferred: **Explicit**
- Sources agree: **Yes**
- Tension/contradiction: none
- Proposed disposition: **CONFIRMED**

10) State selection
- Authoritative artifact(s): `docs/SEMANTIC_FREEZE_v0.1.md` (selection semantics in frozen scope), `test/state-selection-contract.mjs`, `test/qualification-container-unknown-regression.mjs`, `test/governance-contract.mjs` (selection + state effects)
- Supporting artifact(s): trace/state assertions in diagnostics and governance tests
- Evidence: required target/executability behaviors, final states, off/disabled ancestry, blocked selection events.
- Explicit or inferred: **Explicit for intent, inferred for exact ordering/details**
- Sources agree: **Yes**
- Tension/contradiction: none
- Proposed disposition: **CONFIRMED**

11) Governance OFF
- Authoritative artifact(s): `docs/SEMANTIC_FREEZE_v0.1.md` (governance semantics in frozen domain), `test/governance-contract.mjs`, trace coverage in `state-selection` fixtures
- Supporting artifact(s): `test/merge-contract.mjs` and `test/bundle-overlay-contract.mjs` for inheritance/provenance examples under governance-off conditions
- Evidence: deterministic off-state diagnostics and trace data (`blockingReason`, `blockingSource`, `NEOBLOCK_OFF`, `NEOSTACK_OFF`), rule-application ordering checks.
- Explicit or inferred: **Explicit + inferred**
- Sources agree: **Yes**
- Tension/contradiction: none
- Proposed disposition: **CONFIRMED**

12) Merge behavior
- Authoritative artifact(s): `docs/SEMANTIC_FREEZE_v0.1.md` (`Merge semantics`), `test/merge-contract.mjs`
- Supporting artifact(s): `schemas/TRACE_EVENT_REGISTRY.json` (`MERGE_VALIDATED`), `test/public-output-contract.mjs`
- Evidence: Merge authority checks, authority ceiling, source/result lanes, merge-suppression semantics around scoped sources.
- Explicit or inferred: **Explicit + inferred**
- Sources agree: **Yes**
- Tension/contradiction: none
- Proposed disposition: **CONFIRMED**

13) Bundle / Overlay behavior
- Authoritative artifact(s): `docs/SEMANTIC_FREEZE_v0.1.md` (`Overlay semantics`, `Bundle semantics`), `test/bundle-overlay-contract.mjs`, `test/merge-contract.mjs`
- Supporting artifact(s): `schemas/DIAGNOSTIC_REGISTRY` diagnostics for bundle/scoped errors; `TRACE_EVENT_REGISTRY` overlays events
- Evidence: explicit bundle-source selection and overlay application/inclusion invariants.
- Explicit or inferred: **Explicit + inferred**
- Sources agree: **Yes**
- Tension/contradiction: none
- Proposed disposition: **CONFIRMED**

14) Prime / Secondary Directive geometry
- Authoritative artifact(s): `docs/SEMANTIC_FREEZE_v0.1.md` (`Prime and Secondary Directive behavior`), `test/directive-geometry-contract.mjs`
- Supporting artifact(s): trace assertions in state-selection/trace tests and merge geometry fixtures
- Evidence: primary/secondary directive lane composition behavior, ignored metadata order invariance, and invalid prime binding errors.
- Explicit or inferred: **Explicit + inferred**
- Sources agree: **Yes**
- Tension/contradiction: none
- Proposed disposition: **CONFIRMED**

15) CLI behavior
- Authoritative artifact(s): `test/cli-contract.mjs` is the only explicit artifact asserting CLI UX/error codes
- Supporting artifact(s): `dist/cli.js` runtime behavior (executable evidence captured by tests), likely documentation in package scripts/entrypoint via package setup
- Evidence: invocation outcomes, stderr/stdout contracts, exit codes, output write path semantics
- Explicit or inferred: **Inferred from test assertions**
- Sources agree: **No formal structural contract file + only test evidence; partial confidence**
- Tension/contradiction: none
- Proposed disposition: **NEEDS_CANON_DECISION**

16) Pathological / robustness behavior
- Authoritative artifact(s): `test/pathological-robustness-contract.mjs`, `test/deterministic-fuzz-contract.mjs`
- Supporting artifact(s): `test/property-metamorphic-contract.mjs`
- Evidence: contract violations are expected in fuzz cases, strict registry checks under stress, persisted failure reporting, and stage/validation conformance.
- Explicit or inferred: **Inferred (qualification evidence)**
- Sources agree: **No separate normative text**
- Tension/contradiction: none
- Proposed disposition: **IMPLEMENTATION_ONLY**

17) Metamorphic properties
- Authoritative artifact(s): `test/property-metamorphic-contract.mjs`
- Supporting artifact(s): `test/deterministic-fuzz-contract.mjs`, `test/pathological-robustness-contract.mjs`
- Evidence: deterministic replay, permuted ordering invariances, hash projections, and cross-view consistency checks.
- Explicit or inferred: **Inferred**
- Sources agree: **No single normative reference outside tests**
- Tension/contradiction: none
- Proposed disposition: **IMPLEMENTATION_ONLY**

18) Fuzz-derived invariants
- Authoritative artifact(s): `test/deterministic-fuzz-contract.mjs`, `test/pathological-robustness-contract.mjs`
- Supporting artifact(s): `schemas/DIAGNOSTIC_REGISTRY.json`, `schemas/TRACE_EVENT_REGISTRY.json`, hash/profile assertions
- Evidence: family-based generation, replay invariance, registry conformance under mutation, and invariant checks recorded as contract violations.
- Explicit or inferred: **Inferred/qualification evidence**
- Sources agree: **No separate normative text**
- Tension/contradiction: none
- Proposed disposition: **IMPLEMENTATION_ONLY**

## H1-B ambiguity check: SEMANTIC_FREEZE vs newer trace/diagnostic/runtimeHash artifacts

- `docs/SEMANTIC_FREEZE_v0.1.md` explicitly marks trace design, diagnostic registry evolution, and runtimeHash redesign as outside the historical freeze.
- `schemas/TRACE_EVENT_REGISTRY.json`, `schemas/DIAGNOSTIC_REGISTRY.json`, `schemas/RUNTIME_HASH_PROFILE.json`, and their matching contract tests define concrete behavior and constraints that were not part of the frozen list.
- Conclusion: **B) refine previously unspecified public behavior**.  
- No direct semantic contradiction was observed in the checked artifacts; this is a scope/authority expansion question rather than conflicting logic.

## PRECEDENCE MODEL

Proposed conservative precedence ladder for H1:

1. `SEMANTIC_CANON`  
   - `docs/SEMANTIC_FREEZE_v0.1.md` for historically frozen behavior (composition, selection, directives, merge, governance, runtime/trace output contract constraints).
2. `STRUCTURAL_CONTRACT`  
   - `schemas/SCHEMA_REGISTRY.json`, `schemas/COMPATIBILITY_MATRIX.json`, versioned document schemas.
3. `PUBLIC_OBSERVABLE_CONTRACT`  
   - `test/public-output-contract.mjs` + `test/version-compatibility-contract.mjs` for externally visible version, presence/absence, and failure mode invariants.
4. `QUALIFICATION_EVIDENCE`  
   - Contract suites asserting behavior with explicit invariants (`state`, `merge`, `bundle`, `runtime hash`, `trace`, `diagnostics`, CLI, fuzz).
5. `IMPLEMENTATION_DETAIL`  
   - Fixtures, harness behavior, and internal tooling patterns that are not codified as normative domain contracts.

When domains overlap, apply highest precedence that explicitly defines the claim; escalate to `NEEDS_CANON_DECISION` for domains with only test-backed behavior and no explicit spec file.
