# H1-F2 Canonical Corpus Selection

H1F2_STATUS: COMPLETE
SOURCE_HEAD: `f1d24e18405c30fab32ee2e05beb29e3832b7e01`
SEMANTIC_BASELINE_HEAD: `764ac06fdbb14c74ee5afe5cd799ec261ea047b0`

SELECTED_CASE_COUNT: `13`
SUCCESS_CASE_COUNT: `12`
FAILURE_CASE_COUNT: `1`
MIXED_CASE_COUNT: `0`

SELECTED_CASES:

- CASE_ID: `CC-001`
  - SOURCE_SCENARIO_ID: `S_H1_BASELINE_NORMAL`
  - SUCCESS_OR_FAILURE: `success`
  - INPUT_SLEEVE: `fixtures/dealership.sleeve.json`
  - COMPILE_SELECTION: `fixtures/requests/normal.selection.json`
  - EXPECTED_RESULT: `fixtures/expected/normal.compile-result.json` (`CompileResult`, `RuntimeSpec`, `Trace`, `runtimeHash`)
  - PRIMARY_REQUIREMENTS_PROVEN:
    - `UMG-CONF-INPUT-001`
    - `UMG-CONF-RUNTIME-001`
    - `UMG-CONF-TRACE-001`
    - `UMG-CONF-HASH-001`
    - `UMG-CONF-OBS-001`
    - `UMG-CONF-COMPAT-001`
    - `UMG-CONF-STRUCT-007`
  - SECONDARY_REQUIREMENTS_PROVEN:
    - `UMG-CONF-STATE-002` (selection and active ID baseline context)
  - PRIMARY_FAMILIES: `INPUT`, `RUNTIME`, `TRACE`, `HASH`, `OBS`, `STRUCT`, `COMPAT`
  - TEST_EVIDENCE: `test/run-fixtures.mjs`; `test/public-output-contract.mjs`; `test/trace-registry-contract.mjs`; `test/runtime-hash-contract.mjs`; `test/version-compatibility-contract.mjs`
  - WHY_CANONICAL: Baseline deterministic success with canonical output and hash assertions across core public-object outputs.
  - WHY_NOT_REDUNDANT: Retains a single executable pair reused by several suites while still serving as an independent canonical anchor for public output, trace, hash, and compatibility checks.

- CASE_ID: `CC-002A`
  - SOURCE_SCENARIO_ID: `S_H1_DIRECTIVE_GEOMETRY`
  - SUCCESS_OR_FAILURE: `success`
  - INPUT_SLEEVE: `fixtures/directive-geometry.sleeve.json`
  - COMPILE_SELECTION: `fixtures/requests/directive-geometry.selection.json`
  - EXPECTED_RESULT: `EXPLICIT_ASSERTION_RESULT` (`test/directive-geometry-contract.mjs` assertions on resolved lane IDs and trace order)
  - PRIMARY_REQUIREMENTS_PROVEN:
    - `UMG-CONF-DIR-001`
    - `UMG-CONF-DIR-002`
    - `UMG-CONF-GEOM-001`
    - `UMG-CONF-GEOM-002`
    - `UMG-CONF-MOLT-001`
  - PRIMARY_FAMILIES: `DIR`, `GEOM`, `MOLT`
  - SECONDARY_SUPPORTING_REQUIREMENTS:
    - `UMG-CONF-GEOM-008`
    - `UMG-CONF-GEOM-009`
    - `UMG-CONF-MOLT-007`
    - `UMG-CONF-MOLT-008`
  - TEST_EVIDENCE: `test/directive-geometry-contract.mjs`
  - WHY_CANONICAL: Ordered structural/directive fixture for positive directive+geometry behavior.
  - WHY_NOT_REDUNDANT: Focused counterpart to shuffled ordering case, demonstrating direct-path determinism.

- CASE_ID: `CC-002B`
  - SOURCE_SCENARIO_ID: `S_H1_DIRECTIVE_GEOMETRY`
  - SUCCESS_OR_FAILURE: `success`
  - INPUT_SLEEVE: `fixtures/directive-geometry.sleeve.json`
  - COMPILE_SELECTION: `fixtures/requests/directive-geometry-shuffled.selection.json`
  - EXPECTED_RESULT: `EXPLICIT_ASSERTION_RESULT` (`test/directive-geometry-contract.mjs` invariance assertions comparing resolved geometry against the ordered baseline)
  - PRIMARY_REQUIREMENTS_PROVEN:
    - `UMG-CONF-DIR-001`
    - `UMG-CONF-DIR-002`
    - `UMG-CONF-GEOM-001`
    - `UMG-CONF-GEOM-002`
    - `UMG-CONF-MOLT-001`
  - PRIMARY_FAMILIES: `DIR`, `GEOM`, `MOLT`
  - SECONDARY_SUPPORTING_REQUIREMENTS:
    - `UMG-CONF-GEOM-008`
    - `UMG-CONF-GEOM-009`
    - `UMG-CONF-MOLT-007`
    - `UMG-CONF-MOLT-008`
  - TEST_EVIDENCE: `test/directive-geometry-contract.mjs`
  - WHY_CANONICAL: Confirms ordering invariance for structural path selection under shuffled input ordering.
  - WHY_NOT_REDUNDANT: Different execution that is still executable and directly comparable to CC-002A.

- CASE_ID: `CC-003A`
  - SOURCE_SCENARIO_ID: `S_H1_STATE_SELECTION_CLOSED`
  - SUCCESS_OR_FAILURE: `success`
  - INPUT_SLEEVE: `fixtures/state-selection.sleeve.json`
  - COMPILE_SELECTION: `fixtures/requests/state-selection-closed.selection.json`
  - EXPECTED_RESULT: `EXPLICIT_ASSERTION_RESULT` (`test/state-selection-contract.mjs` asserts closed-path success fields and trace)
  - PRIMARY_REQUIREMENTS_PROVEN:
    - `UMG-CONF-STATE-001`
    - `UMG-CONF-STATE-003`
    - `UMG-CONF-GOV-001`
  - SECONDARY_SUPPORTING_REQUIREMENTS:
    - `UMG-CONF-DIR-013`
    - `UMG-CONF-STATE-010`
  - PRIMARY_FAMILIES: `STATE`, `TRACE`, `GOV`
  - TEST_EVIDENCE: `test/state-selection-contract.mjs`; `test/trace-registry-contract.mjs`
  - WHY_CANONICAL: Single execution proving closed-state baseline behavior and active stack activation.
  - WHY_NOT_REDUNDANT: Provides the closed-path state boundary needed before considering resolution failures.

- CASE_ID: `CC-004`
  - SOURCE_SCENARIO_ID: `S_H1_MULTI_SECONDARY_ERROR`
  - SUCCESS_OR_FAILURE: `failure`
  - INPUT_SLEEVE: `fixtures/dealership.sleeve.json`
  - COMPILE_SELECTION: `fixtures/requests/multi-secondary-error.selection.json`
  - EXPECTED_RESULT: `fixtures/expected/multi-secondary-error.compile-result.json` (`CompileResult` + diagnostics + null runtime)`
  - PRIMARY_REQUIREMENTS_PROVEN:
    - `UMG-CONF-STATE-006`
    - `UMG-CONF-FAIL-001`
    - `UMG-CONF-COMPAT-001`
  - SECONDARY_SUPPORTING_REQUIREMENTS:
    - `UMG-CONF-DIAG-020`
    - `UMG-CONF-COMPAT-002`
  - PRIMARY_FAMILIES: `STATE`, `DIAG`, `TRACE`, `FAIL`, `COMPAT`
  - TEST_EVIDENCE: `test/failure-contract.mjs`; `test/diagnostic-emission-coverage.mjs`; `test/trace-registry-contract.mjs`; `test/version-compatibility-contract.mjs`; `test/public-output-contract.mjs`
  - EXPECTED_FAILURE_CLASS: `failure`
  - EXPECTED_DIAGNOSTIC_CODES: `MULTIPLE_SECONDARY_DIRECTIVE_MATCH`
  - EXPECTED_TERMINAL_STAGE: `resolution`
  - EXPECTED_RUNTIME_NULL_BEHAVIOR: `runtime: null`
  - WHY_CANONICAL: Required boundary for conflict failure and deterministic failure shape.
  - WHY_NOT_REDUNDANT: Multi-secondary collision is a distinct policy boundary not represented by success-only cases.

- CASE_ID: `CC-005`
  - SOURCE_SCENARIO_ID: `S_H1_GOVERNANCE_OFF`
  - SUCCESS_OR_FAILURE: `success`
  - INPUT_SLEEVE: `fixtures/dealership.sleeve.json`
  - COMPILE_SELECTION: `fixtures/requests/governance-off.selection.json`
  - EXPECTED_RESULT: `fixtures/expected/governance-off.compile-result.json` (`CompileResult`)
  - PRIMARY_REQUIREMENTS_PROVEN:
    - `UMG-CONF-GOV-001`
    - `UMG-CONF-GOV-002`
    - `UMG-CONF-GOV-008`
    - `UMG-CONF-STATE-008`
  - SECONDARY_REQUIREMENTS_PROVEN:
    - `UMG-CONF-GOV-009`
  - PRIMARY_FAMILIES: `GOV`, `STATE`, `OBS`
  - TEST_EVIDENCE: `test/governance-contract.mjs`; `test/state-selection-contract.mjs`; `test/diagnostic-emission-coverage.mjs`
  - WHY_CANONICAL: Explicit governance-off boundary for public output suppression semantics.
  - WHY_NOT_REDUNDANT: No other selected case covers governance rule-off exclusion as a full success execution.

- CASE_ID: `CC-006`
  - SOURCE_SCENARIO_ID: `S_H1_BUNDLE_OVERLAY_BASE`
  - SUCCESS_OR_FAILURE: `success`
  - INPUT_SLEEVE: `fixtures/bundle-overlay.sleeve.json`
  - COMPILE_SELECTION: `fixtures/requests/bundle-overlay-base.selection.json`
  - EXPECTED_RESULT: `EXPLICIT_ASSERTION_RESULT` (`test/bundle-overlay-contract.mjs` generated invariants and scope assertions)
  - PRIMARY_REQUIREMENTS_PROVEN:
    - `UMG-CONF-BUNDLE-001`
    - `UMG-CONF-BUNDLE-002`
    - `UMG-CONF-OBS-001`
  - SECONDARY_REQUIREMENTS_PROVEN:
    - `UMG-CONF-GOV-001`
  - PRIMARY_FAMILIES: `BUNDLE`, `OBS`, `GOV`
  - TEST_EVIDENCE: `test/bundle-overlay-contract.mjs`; `test/governance-contract.mjs`; `test/pathological-robustness-contract.mjs`
  - WHY_CANONICAL: Baseline bundle composition behavior in a stable, reusable fixture pair.
  - WHY_NOT_REDUNDANT: Distinct from merge and state-selection families and demonstrates bundle base behavior.

- CASE_ID: `CC-007`
  - SOURCE_SCENARIO_ID: `S_H1_BUNDLE_OVERLAY_OVERLAYS_AB`
  - SUCCESS_OR_FAILURE: `success`
  - INPUT_SLEEVE: `fixtures/bundle-overlay.sleeve.json`
  - COMPILE_SELECTION: `fixtures/requests/bundle-overlay-overlays-ab.selection.json`
  - EXPECTED_RESULT: `EXPLICIT_ASSERTION_RESULT` (`test/bundle-overlay-contract.mjs` overlay ordering assertions)
  - PRIMARY_REQUIREMENTS_PROVEN:
    - `UMG-CONF-BUNDLE-001`
    - `UMG-CONF-TRACE-001`
    - `UMG-CONF-TRACE-007`
  - SECONDARY_REQUIREMENTS_PROVEN:
    - `UMG-CONF-OBS-002`
  - PRIMARY_FAMILIES: `BUNDLE`, `TRACE`
  - TEST_EVIDENCE: `test/bundle-overlay-contract.mjs`; `test/trace-registry-contract.mjs`
  - WHY_CANONICAL: Adds explicit overlay ordering behavior not covered by CC-006.
  - WHY_NOT_REDUNDANT: Demonstrates A/B overlay ordering with stable deterministic scope.

- CASE_ID: `CC-008`
  - SOURCE_SCENARIO_ID: `S_H1_MERGE_CONTRACT_BASE`
  - SUCCESS_OR_FAILURE: `success`
  - INPUT_SLEEVE: `fixtures/merge-contract.sleeve.json`
  - COMPILE_SELECTION: `fixtures/requests/merge-contract-base.selection.json`
  - EXPECTED_RESULT: `EXPLICIT_ASSERTION_RESULT` (`test/merge-contract.mjs` success merge trace and resolved prompt assertions)
  - PRIMARY_REQUIREMENTS_PROVEN:
    - `UMG-CONF-MERGE-001`
    - `UMG-CONF-MERGE-002`
    - `UMG-CONF-MERGE-003`
  - SECONDARY_REQUIREMENTS_PROVEN:
    - `UMG-CONF-DIR-001`
    - `UMG-CONF-GOV-001`
  - PRIMARY_FAMILIES: `MERGE`, `DIR`, `GOV`
  - TEST_EVIDENCE: `test/merge-contract.mjs`; `test/governance-contract.mjs`; `test/pathological-robustness-contract.mjs`
  - WHY_CANONICAL: Provides atomic merge precedence and merge-trace evidence on a single selection pair.
  - WHY_NOT_REDUNDANT: Covers merge execution semantics not represented by directive-geometry or state-cases.

- CASE_ID: `CC-009B`
  - SOURCE_SCENARIO_ID: `S_H1_SECONDARY_B`
  - SUCCESS_OR_FAILURE: `success`
  - INPUT_SLEEVE: `fixtures/dealership.sleeve.json`
  - COMPILE_SELECTION: `fixtures/requests/secondary-b.selection.json`
  - EXPECTED_RESULT: `EXPLICIT_ASSERTION_RESULT` (`test/runtime-hash-contract.mjs` runtime hash and determinism invariance checks)
  - PRIMARY_REQUIREMENTS_PROVEN:
    - `UMG-CONF-HASH-001`
    - `UMG-CONF-DET-001`
    - `UMG-CONF-RUNTIME-001`
  - SECONDARY_REQUIREMENTS_PROVEN:
    - `UMG-CONF-HASH-002`
  - PRIMARY_FAMILIES: `RUNTIME`, `HASH`, `DET`
  - TEST_EVIDENCE: `test/runtime-hash-contract.mjs`; `test/run-fixtures.mjs`; `test/public-output-contract.mjs`
  - RELATED_AUTHORITY_REQUIREMENT: `UMG-CONF-DET-006`
  - RELATED_AUTHORITY:
    - `H1-D1 RATIFIED`
  - WHY_CANONICAL: Secondary-B success path used for hash invariance and deterministic-runtime assertions.
  - WHY_NOT_REDUNDANT: Distinct execution pair from CC-001 and CC-003 and retained because it exercises runtime hash determinism.

- CASE_ID: `CC-009C`
  - SOURCE_SCENARIO_ID: `S_H1_ROUTE_RATIONALE`
  - SUCCESS_OR_FAILURE: `success`
  - INPUT_SLEEVE: `fixtures/dealership.sleeve.json`
  - COMPILE_SELECTION: `fixtures/requests/route-rationale.selection.json`
  - EXPECTED_RESULT: `EXPLICIT_ASSERTION_RESULT` (`test/runtime-hash-contract.mjs` runtime hash parity and canonical payload assertions)
  - PRIMARY_REQUIREMENTS_PROVEN:
    - `UMG-CONF-HASH-001`
    - `UMG-CONF-HASH-002`
    - `UMG-CONF-RUNTIME-001`
  - PRIMARY_FAMILIES: `HASH`, `RUNTIME`, `DET`
  - TEST_EVIDENCE: `test/runtime-hash-contract.mjs`
  - WHY_CANONICAL: Confirms non-semantic route metadata does not perturb runtime hash or output intent.
  - WHY_NOT_REDUNDANT: Adds metadata-insensitivity boundary separate from secondary-B hash case.

- CASE_ID: `CC-009D`
  - SOURCE_SCENARIO_ID: `S_H1_SECONDARY_B_OVERLAY`
  - SUCCESS_OR_FAILURE: `success`
  - INPUT_SLEEVE: `fixtures/dealership.sleeve.json`
  - COMPILE_SELECTION: `fixtures/requests/secondary-b-overlay.selection.json`
  - EXPECTED_RESULT: `EXPLICIT_ASSERTION_RESULT` (`test/runtime-hash-contract.mjs` runtime hash sensitivity/mutation assertions)
  - PRIMARY_REQUIREMENTS_PROVEN:
    - `UMG-CONF-HASH-001`
    - `UMG-CONF-RUNTIME-001`
  - SECONDARY_REQUIREMENTS_PROVEN:
    - `UMG-CONF-DET-001`
  - PRIMARY_FAMILIES: `HASH`, `RUNTIME`, `DET`
  - TEST_EVIDENCE: `test/runtime-hash-contract.mjs`
  - WHY_CANONICAL: Exercises overlay interaction with deterministic hash payload expectations.
  - WHY_NOT_REDUNDANT: Covers a different geometry/source layer than CC-002 and CC-009B.

- CASE_ID: `CC-009E`
  - SOURCE_SCENARIO_ID: `S_H1_BUNDLE_REORDER_BASE`
  - SUCCESS_OR_FAILURE: `success`
  - INPUT_SLEEVE: `fixtures/bundle-reorder-base.sleeve.json`
  - COMPILE_SELECTION: `fixtures/requests/bundle-reorder.selection.json`
  - EXPECTED_RESULT: `EXPLICIT_ASSERTION_RESULT` (`test/runtime-hash-contract.mjs` geometry-order mutation/hash sensitivity)
  - PRIMARY_REQUIREMENTS_PROVEN:
    - `UMG-CONF-HASH-001`
    - `UMG-CONF-HASH-002`
    - `UMG-CONF-RUNTIME-001`
    - `UMG-CONF-TRACE-001`
  - PRIMARY_FAMILIES: `HASH`, `RUNTIME`, `TRACE`
  - TEST_EVIDENCE: `test/runtime-hash-contract.mjs`
  - WHY_CANONICAL: Includes nontrivial bundle geometry ordering context for runtime hash mutation boundaries.
  - WHY_NOT_REDUNDANT: Provides a unique fixture pair not covered by route/secondary hash cases.

FAMILIES_REPRESENTED:
`BUNDLE`, `COMPAT`, `DIAG`, `DIR`, `FAIL`, `GOV`, `GEOM`, `HASH`, `INPUT`, `MERGE`, `MOLT`, `OBS`, `RUNTIME`, `STATE`, `STRUCT`, `TRACE`

UNIQUE_PRIMARY_REQUIREMENTS_PROVEN: `28`
UNIQUE_PRIMARY_PLUS_SECONDARY_REQUIREMENTS_PROVEN: `33`

INDIRECT_REQUIREMENTS_ALREADY_CLOSED_BY_SELECTED_CORPUS:
`NONE`

INDIRECT_REQUIREMENTS_STILL_REQUIRING_REMEDIATION:
`NONE`

PENDING_REMEDIATION_ACTIONS:
`NONE`

CORPUS_BALANCE:
- SUCCESS_PATH: `REPRESENTED`
- STRUCTURAL_FAILURE: `NOT_REPRESENTED`
- SEMANTIC_FAILURE: `REPRESENTED`
- RESOLUTION_FAILURE: `REPRESENTED`
- COMPATIBILITY_FAILURE: `NOT_REPRESENTED`
- STATE/GOVERNANCE: `REPRESENTED`
- DIRECTIVE/GEOMETRY: `REPRESENTED`
- BUNDLE/OVERLAY: `REPRESENTED`
- MERGE: `REPRESENTED`
- RUNTIME/PUBLIC OUTPUT: `REPRESENTED`
- TRACE/DIAGNOSTICS: `REPRESENTED`
- RUNTIMEHASH: `REPRESENTED`

CORPUS_VERSION_IDENTITY_STATUS: `RATIFIED`
CORPUS_SELECTION_STATUS: `CANONICAL CORPUS SELECTION FROZEN`

CANON_DECISIONS_REQUIRED: `none`
CONFLICTS_FOUND: `none`
SEMANTIC_CHANGES: `none`

SAFE_TO_BEGIN_EVIDENCE_REMEDIATION: `YES`
SAFE_TO_FREEZE_CORPUS: `YES`

F2_SELECTION_NOW_COMPLIANT: `YES`

FIXTURE_INTEGRITY:
- `fixtures/dealership.sleeve.json`
  - `1DA470ADAEDBBD104C97E3DD195C840EBCD2112E6B1750B872218A097311F284`
- `fixtures/requests/normal.selection.json`
  - `1CEABC8C71B86E9F7F602C861E62386210355A9C3F7BE63CC2874A29105A4C14`
- `fixtures/expected/normal.compile-result.json`
  - `C299E6140B4EDDC43B4F97CA9680A769D7DF08CBB7E1DD65ADA20712F8A9B1C3`
- `fixtures/directive-geometry.sleeve.json`
  - `048E4D9E8D4D21F4314206CA140DAD93611DD5E4BCAE5E1762469BA4C5AC0A9B`
- `fixtures/requests/directive-geometry.selection.json`
  - `6F441D07302571E1FAB8A58D10AA2BCC78217706D4B070FC6D8DBC444A497DD6`
- `fixtures/requests/directive-geometry-shuffled.selection.json`
  - `74D58A8150CFC365FD290C62D8416116FF5806310C51366AD416F60C2DA0C837`
- `fixtures/state-selection.sleeve.json`
  - `5A982223FA47B185C5B44954F574E426F7C0D36D94CADB5FE8DBCA2503E44A9E`
- `fixtures/requests/state-selection-closed.selection.json`
  - `E481275F20C707596E264CADC27305C0AD7DB096CD0E16611E77E624A864B19C`
- `fixtures/expected/multi-secondary-error.compile-result.json`
  - `2644F8A1E850D525366CC81F1E013645F555E431827BACF7A701EEFD2F03D96A`
- `fixtures/requests/multi-secondary-error.selection.json`
  - `3090D79B405AAAF8C9052799BCAFFAE7A0CEF7498B744249F4F8EEB291A3C13F`
- `fixtures/requests/governance-off.selection.json`
  - `1D932247DC798DD50DBFF06980F03831622F56EBC55C61F3E778E49D0606C2F3`
- `fixtures/expected/governance-off.compile-result.json`
  - `B82B1D5EFF658102E96A0EDED8C5C29736767DCD2D62F4DB1354936B9590075D`
- `fixtures/bundle-overlay.sleeve.json`
  - `3BDDAC8181CBA29D34C502FBC434F9E501966F09D17886BF50CD369161F1147B`
- `fixtures/requests/bundle-overlay-base.selection.json`
  - `A9B050C7DB285A3D769CFD42A786FA84D7B389586F38CE60A245DF773E0A66BF`
- `fixtures/requests/bundle-overlay-overlays-ab.selection.json`
  - `C970C0A287592F696ECAFBFA91FE5DFC5B2EF7490C73306F7A6CC302C5A3FCD3`
- `fixtures/merge-contract.sleeve.json`
  - `5C6A71B78A8D3308859C9FDA66848EB8F06EB54D2FAB2B9B0D29C471EEB6D2BD`
- `fixtures/requests/merge-contract-base.selection.json`
  - `C2C858007150CB8A022078D0AE27658FB84D13932A5335CC68C00AD4E19A1E1B`
- `fixtures/requests/secondary-b.selection.json`
  - `9C0A82A4FA3109D377B2CD3C47528DA2022BD9F6AB7AAF06DCE8EC5924D7E18D`
- `fixtures/requests/route-rationale.selection.json`
  - `B234D8E6F6B023BC57240544619CC6E6EB7B040A6B710BAC8289080C51A62CCF`
- `fixtures/requests/secondary-b-overlay.selection.json`
  - `9DDD23F62D122C8CEA71C304B664E1B05787F9146FC317C57AA055EAB196B68F`
- `fixtures/bundle-reorder-base.sleeve.json`
  - `C0821C34A774FB0CEF1E15DD691A68B829F2AEE385DF70F365028531531D7D27`
- `fixtures/requests/bundle-reorder.selection.json`
  - `661BC6DC8DEECAB6012F9B6BA46AEBADAC30C19B93A966195CB8E8B681E7A860`
- `fixtures/invalid/directive-secondary-in-base.sleeve.json`
  - `784BB68916A910448E40D682495DAEF6C9DD17EFBAE2209187A8331C58B39AB2`

NEXT_LANE: `H1 closure complete; H2 handoff pending`

NEW_FIXTURES_CREATED: `none`
TESTS_CHANGED: `none`
COMPILER_CHANGED: `none`

FILES_CHANGED:
- `docs/qualification/H1/H1F2_CANONICAL_CORPUS_SELECTION.md`
