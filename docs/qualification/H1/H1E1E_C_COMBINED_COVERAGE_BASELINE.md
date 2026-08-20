# H1-E1E-C Combined Coverage Baseline

H1E1E_C_STATUS:
SOURCE_HEAD: `764ac06fdbb14c74ee5afe5cd799ec261ea047b0`

CORE_IDS: 126
PUBLIC_IDS: 126
ID_INTERSECTION: 0
COMBINED_UNIQUE_IDS: 252

FIXTURE_AND_TEST_COVERAGE: 166
DIRECT_FIXTURE_COVERAGE: 1
DIRECT_CONTRACT_TEST_COVERAGE: 69
INDIRECT_ONLY: 10
NO_CURRENT_COVERAGE: 0
CANON_DECISION_ONLY: 6

DIRECTLY_COVERED_TOTAL: 236
DIRECT_COVERAGE_PERCENT: 93.65%
EVIDENCE_ACCOUNTED_PERCENT: 100.00%

FAMILY_COVERAGE:
| FAMILY | TOTAL | FIXTURE_AND_TEST | DIRECT_FIXTURE | DIRECT_TEST | INDIRECT | UNCOVERED | CANON_DECISION_ONLY | DIRECTLY_COVERED | DIRECT_COVERAGE_PERCENT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| GLOBAL | 5 | 0 | 0 | 0 | 0 | 0 | 5 | 0 | 0.00 |
| INPUT | 6 | 1 | 0 | 5 | 0 | 0 | 0 | 6 | 100.00 |
| STRUCT | 8 | 1 | 0 | 7 | 0 | 0 | 0 | 8 | 100.00 |
| MOLT | 8 | 0 | 0 | 6 | 2 | 0 | 0 | 6 | 75.00 |
| GEOM | 9 | 7 | 0 | 0 | 2 | 0 | 0 | 7 | 77.78 |
| STATE | 10 | 6 | 1 | 2 | 1 | 0 | 0 | 9 | 90.00 |
| GOV | 16 | 14 | 0 | 2 | 0 | 0 | 0 | 16 | 100.00 |
| DIR | 13 | 12 | 0 | 0 | 1 | 0 | 0 | 12 | 92.31 |
| BUNDLE | 31 | 31 | 0 | 0 | 0 | 0 | 0 | 31 | 100.00 |
| MERGE | 20 | 20 | 0 | 0 | 0 | 0 | 0 | 20 | 100.00 |
| RUNTIME | 17 | 16 | 0 | 0 | 1 | 0 | 0 | 16 | 94.12 |
| OBS | 12 | 12 | 0 | 0 | 0 | 0 | 0 | 12 | 100.00 |
| TRACE | 28 | 17 | 0 | 10 | 1 | 0 | 0 | 27 | 96.43 |
| DIAG | 24 | 10 | 0 | 13 | 1 | 0 | 0 | 23 | 95.83 |
| HASH | 10 | 6 | 0 | 4 | 0 | 0 | 0 | 10 | 100.00 |
| DET | 8 | 3 | 0 | 4 | 0 | 0 | 1 | 7 | 87.50 |
| COMPAT | 17 | 4 | 0 | 12 | 1 | 0 | 0 | 16 | 94.12 |

INDIRECT_REQUIREMENTS:
| REQUIREMENT_ID | FAMILY | CURRENT_EVIDENCE | GAP_TYPE | WHY_NOT_DIRECT | RECOMMENDED_REMEDIATION |
| --- | --- | --- | --- | --- | --- |
| UMG-CONF-COMPAT-002 | COMPAT | S_H1_COMPATIBILITY_REGRESSION (test/version-compatibility-contract.mjs); policy and matrix assertions describe compatibility inference ban but do not assert as a one-off requirement case. | PROPERTY_TEST_ONLY | Compatibility inference is currently validated via corpus policy and matrix consistency instead of an explicit non-semver decision assertion. | NEW_CONTRACT_ASSERTION |
| UMG-CONF-DIAG-020 | DIAG | S_H1_MULTI_SECONDARY_ERROR and S_H1_ROUTE_RATIONALE; warning tolerance is observed inside mixed success/failure suites (diagnostic-emission-coverage). | PROPERTY_TEST_ONLY | Warning-only success behavior is inferred from mixed outcome sets; no direct warning-boundary test targets this contract sentence alone. | NEW_CONTRACT_ASSERTION |
| UMG-CONF-DIR-013 | DIR | S_H1_MULTI_SECONDARY_ERROR / S_H1_SECONDARY_B across state-selection-contract coverage; tie/ordering behavior is implied by existing pass/fail fixtures. | BOUNDARY_CASE_NEEDED | Ranking/non-priority boundary is observed indirectly and is not asserted with an isolated boundary requirement check. | NEW_CONTRACT_ASSERTION |
| UMG-CONF-GEOM-008 | GEOM | S_H1_DIRECTIVE_GEOMETRY with directive-geometry/trace-registry fixtures; ordering semantics inferred through trace-context assertions. | PROPERTY_TEST_ONLY | Geometry/trace context relation is confirmed indirectly through trace checks, not by a dedicated normative assertion. | NEW_CONTRACT_ASSERTION |
| UMG-CONF-GEOM-009 | GEOM | S_H1_DIRECTIVE_GEOMETRY with directive-geometry/trace-registry fixtures; same mixed-assertion coverage model as GEOM-008. | PROPERTY_TEST_ONLY | Boundary ordering for geometry token edge semantics is not isolated as a direct contract assertion. | NEW_CONTRACT_ASSERTION |
| UMG-CONF-MOLT-007 | MOLT | S_H1_DIRECTIVE_GEOMETRY via directive-geometry + public-output coverage; exclusion (legacy lane/persona) inferred. | BOUNDARY_CASE_NEEDED | Legacy lane/persona exclusion is derived from schema/authority context rather than requirement-scoped behavioral check. | NEW_CONTRACT_ASSERTION |
| UMG-CONF-MOLT-008 | MOLT | S_H1_DIRECTIVE_GEOMETRY via directive-geometry + public-output coverage; legacy lane/persona exclusion edge cases not enumerated. | BOUNDARY_CASE_NEEDED | Exclusionary semantics are shared across geometry and legacy-token boundary edges but not directly tested for this contract requirement. | NEW_CONTRACT_ASSERTION |
| UMG-CONF-RUNTIME-017 | RUNTIME | S_H1_BASELINE_NORMAL / S_H1_ROUTE_RATIONALE with public-output contracts; contract excludes internal runtime side effects by omission in success outputs. | BOUNDARY_CASE_NEEDED | Current evidence proves output shape compliance but not explicit refusal of runtime/internal side-effect exposure for this boundary. | NEW_CONTRACT_ASSERTION |
| UMG-CONF-STATE-010 | STATE | No dedicated scenario row; only inferred from governance/state behavior in governance-contract test flow. | BOUNDARY_CASE_NEEDED | Non-priority state semantics are not directly asserted as a contract-first boundary test. | NEW_CONTRACT_ASSERTION |
| UMG-CONF-TRACE-014 | TRACE | S_H1_STATE_SELECTION_CLOSED and S_H1_MULTI_SECONDARY_ERROR (trace-registry-contract), with ordering inferred by terminal-stage constraints across fixtures. | BOUNDARY_CASE_NEEDED | Stage/family ordering is validated as an aggregate invariant rather than explicit requirement-first test case. | NEW_CONTRACT_ASSERTION |

AUTHORITY_ONLY_REQUIREMENTS:
| REQUIREMENT_ID | AUTHORITY_STATUS | RUNTIME_TEST_APPROPRIATE | NOTES |
| --- | --- | --- | --- |
| UMG-CONF-DET-006 | H1-D1 RATIFIED | NO | Cross-process RuntimeHash reproducibility is a ratified governance decision; no multi-process runner is the canonical test in this lane. |
| UMG-CONF-GLOBAL-001 | H1-D2 RATIFIED | NO | Global conformance policy established by normative governance family decisions; intentionally authority-only. |
| UMG-CONF-GLOBAL-002 | H1-D2 RATIFIED | NO | Global conformance policy established by normative governance family decisions; intentionally authority-only. |
| UMG-CONF-GLOBAL-003 | H1-D2 RATIFIED | NO | Global conformance policy established by normative governance family decisions; intentionally authority-only. |
| UMG-CONF-GLOBAL-004 | H1-D2 RATIFIED | NO | Global conformance policy established by normative governance family decisions; intentionally authority-only. |
| UMG-CONF-GLOBAL-005 | H1-D2 RATIFIED | NO | Global conformance policy established by normative governance family decisions; intentionally authority-only. |

P0_GAPS:
- none

P1_GAPS:
- none

P2_GAPS:
- none

MINIMAL_REMEDIATION_ACTIONS:
- none

RECOMMENDED_EXISTING_CANONICAL_CORPUS:
| SCENARIO_ID | SUCCESS_OR_FAILURE | PRIMARY_FAMILIES | WHY_INCLUDE |
| --- | --- | --- | --- |
| S_H1_BASELINE_NORMAL | success | GLOBAL, INPUT, STRUCT, OBS, TRACE, DIAG, HASH | Core canonical success path covering public output, hash determinism, and baseline public contract baseline assertions. |
| S_H1_DIRECTIVE_GEOMETRY | mixed | DIR, GEOM, MOLT, MERGE | Highest-density semantics scenario for directive, geometry, and MOLT constraints. |
| S_H1_STATE_SELECTION_CLOSED | mixed | STATE, GOV, TRACE, FAIL | Covers blocked/closed-state edges, diagnostics, and trace ordering on failure mode. |
| S_H1_MULTI_SECONDARY_ERROR | failure | STATE, TRACE, DIAG, FAIL, COMPAT | High-value conflict/failure case already mapped to trace, diagnostic, and compatibility families. |
| S_H1_GOVERNANCE_OFF | success | GOV, STATE, TRACE | Directly validates governance-off branch semantics and state suppression behavior. |
| S_H1_BUNDLE_OVERLAY_BASE | success | BUNDLE, GOV, DIR | Orthogonal to directive/multi-secondary paths; proves overlay/bundle scoping and composition behavior. |
| S_H1_BUNDLE_OVERLAY_OVERLAYS_AB | success | BUNDLE, GOV, STATE | Adds deterministic overlay ordering branch absent from baseline bundle scenario. |
| S_H1_MERGE_CONTRACT_BASE | success | MERGE, DIR, STATE | Essential for merge precedence and authority propagation evidence. |
| S_H1_RUNTIME_HASH | mixed | HASH, DET, RUNTIME | Consolidates hash invariance, mutation sensitivity, and runtime-profile determinism behavior across scenarios. |
| S_H1_COMPATIBILITY_REGRESSION | mixed | COMPAT, FAIL | Targets exact-manifest compatibility/failure boundaries and version-matrix behavior. |

SPECIFICATION_COVERAGE_STATUS:
- complete / evidence-classified (all 252 requirements have one of the allowed classifications)

CORPUS_FORMALIZATION_STATUS:
- formally frozen

H2_RUNNER_STATUS:
- not started

CANON_DECISIONS_REQUIRED:
- none

CONFLICTS_FOUND:
- none

SEMANTIC_CHANGES:
- none

NEXT_LANE:
- H1 closure complete; H2 handoff pending

FILES_CHANGED:
- docs/qualification/H1/H1E1E_C_COMBINED_COVERAGE_BASELINE.md
