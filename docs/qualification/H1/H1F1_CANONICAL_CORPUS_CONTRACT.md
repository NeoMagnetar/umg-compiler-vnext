# H1-F1 Canonical Corpus Contract

- **Task:** H1-F1 Canonical Corpus Contract definition (draft, pre-freeze)
- **Source state anchor:** `C:\.openclaw\workspace\umg-compiler` at repository head `764ac06fdbb14c74ee5afe5cd799ec261ea047b0`
- **Inputs used:** `H1C1`, `H1D2`, `H1E1D`, `H1E1E_A`, `H1E1E_B`, `H1E1E_C`

## Scope and non-finality

H1-F1 defines the normative contract for canonical corpus evidence only. It does **not** select/finalize corpus scenario set, freeze corpus version, or implement H2 mechanics.

---

## CORPUS REQUIREMENT FAMILY

Create only:

- `UMG-CONF-CORPUS-001` to `UMG-CONF-CORPUS-008`

### `UMG-CONF-CORPUS-001`
- **Normative Statement:** H1 requirements remain the semantic authority; canonical corpus cases are evidence artifacts and cannot redefine normative requirements.
- **Authority:** `H1C1` sections 31 and `H1D2` ratification of family/ID usage.
- **Observable Conformance Evidence:** Evidence map entries from A/B/C must remain traceable to their originating normative requirement IDs.
- **Notes/Exclusions:** A normative requirement omitted from corpus does not become invalid.

### `UMG-CONF-CORPUS-002`
- **Normative Statement:** A corpus case must explicitly identify minimum identity fields and provenance of its fixture/selection context.
- **Authority:** `H1C1` sections 27, 31 and public contract evidence structure from A/B/C.
- **Observable Conformance Evidence:** Case records include `CASE_ID`, optional `INPUT_SLEEVE`, optional `COMPILE_SELECTION`, and explicit outcome class.
- **Notes/Exclusions:** Sleeve/selection pair is required only when the artifact under test depends on both.

### `UMG-CONF-CORPUS-003`
- **Normative Statement:** Canonical success cases must define explicit expected public outcomes for at least one frozen public object model.
- **Authority:** `H1C1` sections 31, normative contract sections for public output.
- **Observable Conformance Evidence:** Success case includes explicit `EXPECTED_RESULT` and marks one-or-more of `CompileResult`, `RuntimeSpec`, `Trace`, `Diagnostics`, `runtimeHash` as asserted.
- **Notes/Exclusions:** No requirement to assert every public object in every case.

### `UMG-CONF-CORPUS-004`
- **Normative Statement:** Canonical failure cases must provide structured failure expectations, including class and terminal stage where available.
- **Authority:** `H1C1` contract intent and failure sections in public-runtime/diagnostic/compatibility families.
- **Observable Conformance Evidence:** Case records include `SUCCESS_OR_FAILURE: failure`, `EXPECTED_FAILURE_CLASS`, and optional `EXPECTED_DIAGNOSTIC_CODE(S)` / `EXPECTED_TERMINAL_STAGE` / `EXPECTED_RUNTIME_NULL_BEHAVIOR`.
- **Notes/Exclusions:** Exact diagnostic prose is not required.

### `UMG-CONF-CORPUS-005`
- **Normative Statement:** Canonical case linkage to requirements must be evidence-based and explicit.
- **Authority:** `H1C1` sections 27, 31 plus evidence-map source-of-truth rules in H1E1E.
- **Observable Conformance Evidence:** Each case records `PRIMARY_REQUIREMENTS_PROVEN` and may include `SECONDARY_REQUIREMENTS_PROVEN` with rationale tied to observed artifact outputs.
- **Notes/Exclusions:** Family similarity alone is insufficient for linkage.

### `UMG-CONF-CORPUS-006`
- **Normative Statement:** Canonical evidence must be interface-neutral across non-CLI implementation boundaries.
- **Authority:** `H1C1` plus `H1-C1` neutral-reference intent.
- **Observable Conformance Evidence:** Cases avoid dependency on CLI formatting, raw stdout/stderr text, shell return conventions, process exit semantics, and filesystem quirks.
- **Notes/Exclusions:** CLI-specific corpus can be introduced separately under its own namespace; not part of this contract.

### `UMG-CONF-CORPUS-007`
- **Normative Statement:** Canonical corpus cases can reference existing fixtures, expected outputs, and selections without cloning data.
- **Authority:** `H1E1D` evidence inventory and existing fixture/test evidence corpus.
- **Observable Conformance Evidence:** Case records include stable fixture/selection/output identifiers and can point to existing paths.
- **Notes/Exclusions:** When reused, identity and integrity checks must be independently inspectable before final freeze.

### `UMG-CONF-CORPUS-008`
- **Normative Statement:** Non-canonical qualification methods remain valid evidence but do not acquire canonical-case status.
- **Authority:** H1 evidence baseline and existing property/fuzz/metamorphic/test inventories.
- **Observable Conformance Evidence:** Artifact inventory distinguishes contract scenarios from property/fuzz/metamorphic evidence entries.
- **Notes/Exclusions:** Canonical corpus is a curated subset only.

---

## CORPUS AUTHORITY MODEL

1. **Normative authority:** H1 requirements remain normative truth.
2. **Canonical evidence role:** Canonical cases provide executable/reference evidence mapping.
3. **Non-inversion rule:** Corpus does not replace, edit, or narrow requirement meanings.
4. **Coverage rule:** Absence from corpus does not imply non-conformance.
5. **Composability:** A single canonical case may prove multiple requirements.

## CANONICAL CASE MODEL

Every canonical case entry uses:

- `CASE_ID`
- `INPUT_SLEEVE` *(optional when not required for the requirement under test)*
- `COMPILE_SELECTION` *(optional when not required for the requirement under test)*
- `EXPECTED_RESULT`
- `SUCCESS_OR_FAILURE`
- `REQUIREMENT_IDS_PROVEN`
- Optional secondary fields: `SECONDARY_REQUIREMENTS_PROVEN`

Failure-only entries additionally require:

- `EXPECTED_FAILURE_CLASS`
- Optional `EXPECTED_DIAGNOSTIC_CODE(S)`
- Optional `EXPECTED_TERMINAL_STAGE`
- Optional `EXPECTED_RUNTIME_NULL_BEHAVIOR`

This model is intentionally minimal so that non-Node and non-CLI conformers can implement the same logical contract.

## SUCCESS CASE MODEL

Success cases require a concrete public outcome statement anchored in one or more frozen public objects (`CompileResult`, `RuntimeSpec`, `Trace`, `Diagnostics`, `runtimeHash`) and a deterministic interpretation of expected state.

## FAILURE CASE MODEL

Failure cases must include explicit failure class and, where determinable, diagnostic class list and terminal stage.

## REQUIREMENT LINKAGE MODEL

- Linkage is many-to-many.
- `PRIMARY_REQUIREMENTS_PROVEN` is mandatory.
- `SECONDARY_REQUIREMENTS_PROVEN` is optional with rationale.
- Evidence must be deducible from observed outputs asserted by the case.

## INTERFACE NEUTRALITY MODEL

Canonical cases must not depend on:

- CLI argument parsing details
- shell-level output capture semantics
- stdout/stderr formatting
- process exit code conventions
- local filesystem layout conventions

Unless a dedicated CLI-only corpus namespace is adopted later.

## H2 RELATIONSHIP

- H1 defines corpus semantics, case identity, and expected outcomes.
- H2 will provide conformance-runner execution mechanics.
- H2 may not redefine H1 semantics.
- Runner transport, scheduling, and implementation details are out of H1 corpus scope.

---

## PROVISIONAL CASE EXAMPLES (not selected/final)

The following examples describe reusable evidence points from current artifacts and are not normative selection decisions.

| CASE_ID | INPUT_SLEEVE | COMPILE_SELECTION | EXPECTED_RESULT | SUCCESS_OR_FAILURE | REQUIREMENT_IDS_PROVEN |
| --- | --- | --- | --- | --- | --- |
| CC-PROTOTYPE-CORE-01 | existing H1 baseline fixture group | `S_H1_BASELINE_NORMAL` selection path | success, RuntimeSpec + CompileResult | success | `UMG-CONF-CORPUS-001`, `UMG-CONF-CORPUS-002`, `UMG-CONF-CORPUS-003`, `UMG-CONF-CORPUS-007` |
| CC-PROTOTYPE-DIAG-01 | existing failure fixture group | `S_H1_ROUTE_RATIONALE` selection path | failure with diagnostics class mapping | failure | `UMG-CONF-CORPUS-004`, `UMG-CONF-CORPUS-005`, `UMG-CONF-CORPUS-006` |
| CC-PROTOTYPE-TRACE-01 | existing trace fixture | `S_H1_TRACE_*` selection path | Trace and diagnostics assertions | success | `UMG-CONF-CORPUS-005`, `UMG-CONF-CORPUS-008` |

## DEFERRED ITEMS

- H2 runner implementation and transport binding
- CLI-specific corpus and cross-implementation runner execution policy

## COVERAGE STATEMENT AND STATUS FIELDS

- **CORPUS REQUIREMENT COUNT:** 8
- **CORPUS AUTHORITY MODEL:** normative-binding + evidence-only evidenceing
- **CORPUS VERSION IDENTITY STATUS:** `RATIFIED`