# H1-A Conformance Source Inventory

Validation scope check:

- Current branch: `publication/v0.1.0-experimental`
- HEAD: `764ac06fdbb14c74ee5afe5cd799ec261ea047b0`
- `git status`: clean tracked tree with only untracked workspace artifacts (`compiler-v0/`, `compiler-vnext/`, `dist/`)
- Source line target: `C:\.openclaw\workspace\umg-compiler` (clean root for vNext publication lineage)

This inventory is read-only with respect to compiler behavior and only catalogs existing conformance-relevant materials.

## 1) Frozen contract / semantic documents
- **`docs/SEMANTIC_FREEZE_v0.1.md`**  
  - **Verifies/defines:** Canonical semantic baseline and change-control scope (including commit pointers and explicit frozen-domain list).  
  - **Role:** **Normative** (for frozen semantics and contract boundaries).  
  - **Related paths:** `compiler-vnext/` source behavior, historical source-chain branches.  
  - **Notes / ambiguity:** Explicitly excludes some areas from freeze (`trace`, `diagnostic`, and `runtimeHash` redesign mentioned as non-frozen), creating intentional split between frozen and active contract work.

- **`schemas/SCHEMA_REGISTRY.json`**  
  - **Verifies/defines:** Canonical mapping of kinds to schema IDs/versions and compatibility intent.  
  - **Role:** **Normative/Reference** for boundary-facing object validation and parser expectations.  
  - **Related:** `schemas/README.md`, `schemas/COMPATIBILITY_MATRIX.json`, tests that load registry entries.

- **`schemas/COMPATIBILITY_MATRIX.json`**  
  - **Verifies/defines:** Allowed version pairs and directionality of compatibility.  
  - **Role:** **Normative** for public contract compatibility behavior.  
  - **Related:** `test/version-compatibility-contract.mjs`.

## 2) Schemas
- **`schemas/umg-compiler-vnext.schema.json`**  
  - **Verifies/defines:** Root schema composition and reusable `$defs` for contracts.  
  - **Role:** **Normative for structure**; semantics remain JS-validator-authoritative where indicated.  
  - **Related:** `schemas/runtime-spec.schema.json`, `schemas/trace.schema.json`, `schemas/DIAGNOSTIC_REGISTRY.json`, `schemas/TRACE_EVENT_REGISTRY.json`.

- **`schemas/runtime-spec.schema.json`, `schemas/trace.schema.json`**  
  - **Verifies/defines:** Runtime/trace payload schema contracts and required keys.  
  - **Role:** **Normative (structural)**.  
  - **Related:** runtime tests + trace tests.

- **`schemas/DIAGNOSTIC_REGISTRY.json`, `schemas/TRACE_EVENT_REGISTRY.json`**  
  - **Verifies/defines:** Allowed diagnostic/trace event identifiers, stages, subjects, and payload-key expectations.  
  - **Role:** **Normative (contract keyspace + vocabulary)**.  
  - **Related:** `test/diagnostic-registry-contract.mjs`, `test/diagnostic-emission-coverage.mjs`, `test/trace-registry-contract.mjs`, `test/trace-emission-coverage.mjs`.

- **`schemas/RUNTIME_HASH_PROFILE.json`, `schemas/COMPATIBILITY_MATRIX.json`**  
  - **Verifies/defines:** Hash-determinism profile shape and compatibility gates.  
  - **Role:** **Normative/Supporting** for deterministic hash contract scope and version behavior.

- **`schemas/SCHEMA_README` evidence**  
  - **Verifies/defines:** In `schemas/README.md`, schema is explicitly structural; runtime/relational checks are in code.  
  - **Role:** **Supporting** interpretation note that limits schema authority.

## 3) Test suites
- **Contract tests in `test/*.contract.mjs`**:  
  `version-compatibility-contract.mjs`, `trace-registry-contract.mjs`, `trace-emission-coverage.mjs`, `state-selection-contract.mjs`, `runtime-hash-contract.mjs`, `public-output-contract.mjs`, `qualification-container-unknown-regression.mjs`, `property-metamorphic-contract.mjs`, `pathological-robustness-contract.mjs`, `merge-contract.mjs`, `governance-contract.mjs`, `failure-contract.mjs`, `directive-geometry-contract.mjs`, `diagnostic-registry-contract.mjs`, `diagnostic-emission-coverage.mjs`, `deterministic-fuzz-contract.mjs`, `cli-contract.mjs`, `bundle-overlay-contract.mjs`.  
  - **Verifies/defines:** Behavior contracts across compatibility, trace sequencing, failure behavior, deterministic properties, diagnostic/trace integrity, CLI/public output and pathology.  
  - **Role:** **Normative evidence** for published contract intent (when assertions target public outputs) and **supporting** when exercising implementation details.  
  - **Related fixtures:** `fixtures/**`, `test/fixture-cases.mjs`, `test/run-fixtures.mjs`.

- **Harness/support:** `test/run-fixtures.mjs`, `test/fixture-cases.mjs`, `test/update-expected.mjs`  
  - **Verifies/defines:** How contract tests map fixtures to expected outcomes.  
  - **Role:** **Implementation-specific** for harness behavior, supporting the contractual tests.

## 4) Canonical or expected-output fixtures
- **`fixtures/expected/*.compile-result.json`**  
  - **Verifies/defines:** Golden expected compile output shape/content.  
  - **Role:** **Normative** for output contract expectations.  

- **`fixtures/*.sleeve.json` (core set)**  
  - **Verifies/defines:** Canonical compile inputs for merge/selection/state/directive/runtime/failure cases.  
  - **Role:** **Normative support** for behavior claims made in contract tests.  

- **`fixtures/requests/*.selection.json`, `fixtures/invalid/*.json`**  
  - **Verifies/defines:** Input validation and error-trigger paths.  
  - **Role:** **Supporting/Normative** depending on whether exercised by contract assertions.

## 5) Failure/diagnostic contracts
- **`test/failure-contract.mjs`**, **`test/diagnostic-registry-contract.mjs`**, **`test/diagnostic-emission-coverage.mjs`**  
  - **Verifies/defines:** Failure surface expectations, diagnostic catalog presence, and emission consistency.  
  - **Role:** **Normative** for what failures/diagnostics are contractually required.

- **`schemas/DIAGNOSTIC_REGISTRY.json`** + `test/diagnostic-emission-coverage.mjs`  
  - **Verifies/defines:** Allowed codes/stages and whether diagnostics are emitted in expected contexts.  
  - **Role:** **Normative/Supporting**, with registry as normative vocabulary and tests as enforcement.

## 6) RuntimeSpec contracts
- **`schemas/runtime-spec.schema.json`** and **`schemas/SCHEMA_REGISTRY.json`**  
  - **Verifies/defines:** Structural and versioned RuntimeSpec fields and validation path.  
  - **Role:** **Normative (structural)**.

- **Runtime assertions in tests:** `test/state-selection-contract.mjs`, `test/directive-geometry-contract.mjs`, `test/public-output-contract.mjs`, `test/merge-contract.mjs`  
  - **Verifies/defines:** Runtime output composition and selection/merge behavior.  
  - **Role:** **Normative** for externally visible runtime behavior.

## 7) Trace contracts
- **`schemas/trace.schema.json`**, **`schemas/TRACE_EVENT_REGISTRY.json`**  
  - **Verifies/defines:** Trace event shape and contract vocabulary.  
  - **Role:** **Normative (structural + event-key)**.

- **`test/trace-registry-contract.mjs`, `test/trace-emission-coverage.mjs`**  
  - **Verifies/defines:** Emitted trace sequence ordering, monotonic stage progression, terminal state expectations, and registry conformance.  
  - **Role:** **Normative** for trace contract behavior.

## 8) Determinism/hash contracts
- **`schemas/RUNTIME_HASH_PROFILE.json`** and **`fixtures/hash/HASH_TEST_VECTORS.json`**  
  - **Verifies/defines:** Hash profile configuration and deterministic input vectors.  
  - **Role:** **Normative support** for reproducibility policy.

- **`test/runtime-hash-contract.mjs`, `test/deterministic-fuzz-contract.mjs`**  
  - **Verifies/defines:** Hash invariance properties and mutation-sensitivity behavior under deterministic runs.  
  - **Role:** **Normative** for deterministic/hash stability claims.

## 9) CLI/public-boundary contracts
- **`test/cli-contract.mjs`**  
  - **Verifies/defines:** CLI flag/command behavior and observable failure paths.  
  - **Role:** **Normative** for public developer interface behavior.

- **`test/public-output-contract.mjs`**, package metadata (`package.json`)  
  - **Verifies/defines:** Public artifacts shape/fields and package-distribution constraints.  
  - **Role:** **Normative support** for distribution boundary.

## 10) Qualification/fuzz/pathological tests
- **`test/pathological-robustness-contract.mjs`**, **`test/deterministic-fuzz-contract.mjs`**, **`test/property-metamorphic-contract.mjs`**, **`test/qualification-container-unknown-regression.mjs`**  
  - **Verifies/defines:** Unknown-path resilience, pathological input handling, fuzz invariants, and container-unknown behavior under qualification conditions.  
  - **Role:** **Supporting/Normative** as qualification evidence; some checks are guardrails for future semantic robustness.

## Inconsistencies / ambiguities observed
- **Scope split:** `docs/SEMANTIC_FREEZE_v0.1.md` and existing contracts are partially orthogonal for trace/diagnostic/runtime hash areas; freeze scope states these are outside the historical freeze, while current tests define robust contracts for them. This appears intentional but is a governance ambiguity for final conformance boundary.
- **Schema vs runtime logic:** `schemas/README.md` explicitly states JSON Schema is structural-only; deeper semantic guarantees are JS-validator/runtime enforced, so “normative” is two-tiered and must be interpreted as structural+behavioral layers.

## H1-A status summary
H1A_STATUS: PASS (inventory completed, no source mutation)

SOURCE_HEAD: 764ac06fdbb14c74ee5afe5cd799ec261ea047b0

FILES_REVIEWED:
- docs/SEMANTIC_FREEZE_v0.1.md
- schemas/README.md
- schemas/umg-compiler-vnext.schema.json
- schemas/SCHEMA_REGISTRY.json
- schemas/runtime-spec.schema.json
- schemas/trace.schema.json
- schemas/DIAGNOSTIC_REGISTRY.json
- schemas/TRACE_EVENT_REGISTRY.json
- schemas/RUNTIME_HASH_PROFILE.json
- schemas/COMPATIBILITY_MATRIX.json
- test/version-compatibility-contract.mjs
- test/trace-registry-contract.mjs
- test/trace-emission-coverage.mjs
- test/state-selection-contract.mjs
- test/runtime-hash-contract.mjs
- test/public-output-contract.mjs
- test/qualification-container-unknown-regression.mjs
- test/property-metamorphic-contract.mjs
- test/pathological-robustness-contract.mjs
- test/merge-contract.mjs
- test/governance-contract.mjs
- test/failure-contract.mjs
- test/directive-geometry-contract.mjs
- test/diagnostic-registry-contract.mjs
- test/diagnostic-emission-coverage.mjs
- test/deterministic-fuzz-contract.mjs
- test/cli-contract.mjs
- test/bundle-overlay-contract.mjs
- test/run-fixtures.mjs
- test/fixture-cases.mjs
- test/update-expected.mjs
- fixtures/*.sleeve.json
- fixtures/expected/*.compile-result.json
- fixtures/invalid/*.json
- fixtures/requests/*.selection.json
- fixtures/hash/HASH_TEST_VECTORS.json

NORMATIVE_CANDIDATES:
- docs/SEMANTIC_FREEZE_v0.1.md
- schemas/SCHEMA_REGISTRY.json
- schemas/COMPATIBILITY_MATRIX.json
- schemas/DIAGNOSTIC_REGISTRY.json
- schemas/TRACE_EVENT_REGISTRY.json
- schemas/runtime-spec.schema.json
- schemas/trace.schema.json
- schemas/RUNTIME_HASH_PROFILE.json
- test/cli-contract.mjs
- test/failure-contract.mjs
- test/diagnostic-registry-contract.mjs
- test/diagnostic-emission-coverage.mjs
- test/trace-registry-contract.mjs
- test/trace-emission-coverage.mjs
- test/runtime-hash-contract.mjs
- test/deterministic-fuzz-contract.mjs
- test/state-selection-contract.mjs
- test/merge-contract.mjs
- test/public-output-contract.mjs
- test/pathological-robustness-contract.mjs
- test/property-metamorphic-contract.mjs

SUPPORTING_EVIDENCE:
- test/fixture-cases.mjs + fixtures folder mapping
- test/run-fixtures.mjs + update-expected harness
- schema README constraints (JSON Schema = structural + non-semantic note)
- compatibility contract tests bound to compatibility matrix
- diagnostics/trace registries feeding explicit contract checks

IMPLEMENTATION_SPECIFIC:
- test harness internals and fixture-loading implementation
- execution details of failure message formatting beyond stable contract keys
- local benchmark/perf assumptions in fuzz harness not fully specified in top-level docs

AMBIGUITIES:
- Whether schema-enumerated vocabulary changes without explicit migration notes remain valid in frozen lineage
- Exact boundary between normative “frozen semantics” and active contract extension in trace/diagnostic/hash areas
- Ambiguous governance rule precedence when registry permits structurally valid but behaviorally contested diagnostics/events

POSSIBLE_COVERAGE_GAPS:
- No dedicated negative test corpus explicitly targeting undocumented parser edge permutations for every diagnostic code in registry
- Sparse cross-validation between `schema` and behavior in malformed but schema-valid pathological runtime conditions
- Limited explicit public documentation mapping for some failure code families despite registry presence
- Regression coverage for forward compatibility behavior beyond the immediate contract matrix is thin

FILES_CHANGED:
- docs/qualification/H1/H1A_CONFORMANCE_SOURCE_INVENTORY.md
