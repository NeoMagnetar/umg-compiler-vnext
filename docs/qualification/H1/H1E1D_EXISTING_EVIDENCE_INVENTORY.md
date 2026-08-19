# H1-E1D Existing Qualification Evidence Inventory

## Repository context

- Repo: `C:\.openclaw\workspace\umg-compiler`
- Expected branch: `publication/v0.1.0-experimental`
- Expected HEAD: `764ac06fdbb14c74ee5afe5cd799ec261ea047b0`
- Working set: existing fixture + contract evidence only.
- Requirement count baseline retained from `H1/H1E1B_REQUIREMENT_COUNT_RECONCILIATION.md`: **252**

## 1. Fixture Inventory

| PATH | CLASS | PRIMARY_SCENARIO | RELATED_ARTIFACTS | USED_BY_TESTS | NOTES |
| --- | --- | --- | --- | --- | --- |
| `fixtures/bundle-overlay.sleeve.json` | SLEEVE | `S_H1_BUNDLE_OVERLAY_BASE` | `fixtures/requests/bundle-overlay-base.selection.json` + `fixtures/requests/bundle-overlay-secondary-b.selection.json` + `fixtures/requests/bundle-overlay-overlays-ab.selection.json` + `fixtures/requests/bundle-overlay-overlays-ba.selection.json` + `fixtures/requests/bundle-overlay-sibling-overlay.selection.json` | `bundle-overlay-contract.mjs`; `governance-contract.mjs`; `pathological-robustness-contract.mjs`; `property-metamorphic-contract.mjs`; `trace-registry-contract.mjs`; `diagnostic-emission-coverage.mjs` | Multi-selection overlay behavior driver. |
| `fixtures/bundle-reorder-alt.sleeve.json` | SLEEVE | `S_H1_BUNDLE_REORDER_ALT` | `fixtures/requests/bundle-reorder.selection.json`; `fixtures/expected/bundle-reorder-alt.compile-result.json` | `fixture-cases.mjs`; `run-fixtures.mjs` | Alternate reorder shape used with shared bundle reorder selection. |
| `fixtures/bundle-reorder-base.sleeve.json` | SLEEVE | `S_H1_BUNDLE_REORDER_BASE` | `fixtures/requests/bundle-reorder.selection.json`; `fixtures/expected/bundle-reorder-base.compile-result.json` | `fixture-cases.mjs`; `run-fixtures.mjs`; `runtime-hash-contract.mjs` | Alternate/same selection with different source order. |
| `fixtures/dealership.sleeve.json` | SLEEVE | `S_H1_BASELINE_NORMAL` | `fixtures/requests/normal.selection.json`; `fixtures/requests/secondary-b.selection.json`; `fixtures/requests/secondary-c.selection.json`; `fixtures/requests/secondary-b-overlay.selection.json`; `fixtures/requests/multi-secondary-error.selection.json`; `fixtures/requests/governance-off.selection.json`; `fixtures/requests/disabled-sales.selection.json`; `fixtures/requests/route-rationale.selection.json`; `fixtures/requests/normal.selection.json` | `cli-contract.mjs`; `diagnostic-emission-coverage.mjs`; `diagnostic-registry-contract.mjs`; `directive-geometry-contract.mjs`; `failure-contract.mjs`; `fixture-cases.mjs`; `pathological-robustness-contract.mjs`; `property-metamorphic-contract.mjs`; `public-output-contract.mjs`; `run-fixtures.mjs`; `runtime-hash-contract.mjs`; `state-selection-contract.mjs`; `trace-emission-coverage.mjs`; `version-compatibility-contract.mjs` | Core baseline sleeve for most positive and negative compile cases. |
| `fixtures/directive-geometry.sleeve.json` | SLEEVE | `S_H1_DIRECTIVE_GEOMETRY` | `fixtures/requests/directive-geometry.selection.json`; `fixtures/requests/directive-geometry-shuffled.selection.json` | `directive-geometry-contract.mjs` | Structural/geometry canonical-order regression fixture. |
| `fixtures/hash/HASH_TEST_VECTORS.json` | SUPPORTING_FIXTURE | `S_H1_RUNTIME_HASH` | Runtime hash mutation table used by `runtime-hash-contract.mjs` | `runtime-hash-contract.mjs` | Hash mutation vectors only; no compile input. |
| `fixtures/invalid/cross-lane-bundle.sleeve.json` | SLEEVE | `S_H1_INVALID_CROSS_LANE_BUNDLE` | `fixtures/dealership.sleeve.json` selection pairs in run-fixtures | `run-fixtures.mjs` | Negative structural fixture for cross-lane bundle member type validation. |
| `fixtures/invalid/directive-secondary-in-base.sleeve.json` | SLEEVE | `S_H1_INVALID_DIRECTIVE_SECONDARY_BASE` | `fixtures/requests/normal.selection.json` | `diagnostic-registry-contract.mjs`; `failure-contract.mjs`; `run-fixtures.mjs`; `trace-registry-contract.mjs`; `version-compatibility-contract.mjs` | Base-geometry/secondary conflict structural+semantic failure source. |
| `fixtures/invalid/upward-merge.sleeve.json` | SLEEVE | `S_H1_INVALID_UPWARD_MERGE` | `fixtures/requests/normal.selection.json` | `run-fixtures.mjs`; `property-metamorphic-contract.mjs` | Merge authority escalation failure source. |
| `fixtures/merge-contract.sleeve.json` | SLEEVE | `S_H1_MERGE_CONTRACT_BASE` | `fixtures/requests/merge-contract-base.selection.json`; `fixtures/requests/merge-contract-bundle.selection.json`; `fixtures/requests/merge-contract-overlay.selection.json` | `diagnostic-emission-coverage.mjs`; `governance-contract.mjs`; `merge-contract.mjs`; `pathological-robustness-contract.mjs`; `property-metamorphic-contract.mjs` | Merge family baseline fixture with success/failure merge matrix. |
| `fixtures/merge-directive.sleeve.json` | SLEEVE | `S_H1_MERGE_DIRECTIVE` | `fixtures/requests/merge-directive.selection.json` | `directive-geometry-contract.mjs`; `fixture-cases.mjs`; `merge-contract.mjs`; `property-metamorphic-contract.mjs` | Merge + directive geometry interaction fixture. |
| `fixtures/state-selection.sleeve.json` | SLEEVE | `S_H1_STATE_SELECTION_CLOSED` | `fixtures/requests/state-selection-closed.selection.json`; `fixtures/requests/state-selection-disabled-sibling.selection.json`; `fixtures/requests/state-selection-off-sibling.selection.json` | `diagnostic-emission-coverage.mjs`; `diagnostic-registry-contract.mjs`; `governance-contract.mjs`; `pathological-robustness-contract.mjs`; `property-metamorphic-contract.mjs`; `qualification-container-unknown-regression.mjs`; `state-selection-contract.mjs`; `trace-registry-contract.mjs` | Main state/selection resolution fixture and container/ancestor edge-case driver. |
| `fixtures/structure-routing.sleeve.json` | SLEEVE | `S_H1_STRUCTURE_ROUTING` | `fixtures/requests/structure-routing.selection.json` | `fixture-cases.mjs`; `property-metamorphic-contract.mjs`; `run-fixtures.mjs` | Structural routing fixture asserting active-stack ordering and resolved IDs. |
| `fixtures/expected/bundle-reorder-alt.compile-result.json` | EXPECTED_SUCCESS | `S_H1_BUNDLE_REORDER_ALT` | `fixtures/bundle-reorder-alt.sleeve.json`; `fixtures/requests/bundle-reorder.selection.json` | `fixture-cases.mjs` | Golden expected result (hash + trace + runtime). |
| `fixtures/expected/bundle-reorder-base.compile-result.json` | EXPECTED_SUCCESS | `S_H1_BUNDLE_REORDER_BASE` | `fixtures/bundle-reorder-base.sleeve.json`; `fixtures/requests/bundle-reorder.selection.json` | `fixture-cases.mjs` | Golden expected result (hash + trace + runtime). |
| `fixtures/expected/disabled-sales.compile-result.json` | EXPECTED_SUCCESS | `S_H1_DISABLED_SALES` | `fixtures/dealership.sleeve.json`; `fixtures/requests/disabled-sales.selection.json` | `fixture-cases.mjs` | Human-off state outcome for sales branch. |
| `fixtures/expected/governance-off.compile-result.json` | EXPECTED_SUCCESS | `S_H1_GOVERNANCE_OFF` | `fixtures/dealership.sleeve.json`; `fixtures/requests/governance-off.selection.json` | `fixture-cases.mjs` | Governance OFF branch excluded from compiled output. |
| `fixtures/expected/merge-directive.compile-result.json` | EXPECTED_SUCCESS | `S_H1_MERGE_DIRECTIVE` | `fixtures/merge-directive.sleeve.json`; `fixtures/requests/merge-directive.selection.json` | `fixture-cases.mjs` | Merge-directive success with merge result selected as secondary directive. |
| `fixtures/expected/multi-secondary-error.compile-result.json` | EXPECTED_FAILURE | `S_H1_MULTI_SECONDARY_ERROR` | `fixtures/dealership.sleeve.json`; `fixtures/requests/multi-secondary-error.selection.json` | `fixture-cases.mjs` | Explicitly encodes multi-secondary diagnostic failure. |
| `fixtures/expected/normal.compile-result.json` | EXPECTED_SUCCESS | `S_H1_BASELINE_NORMAL` | `fixtures/dealership.sleeve.json`; `fixtures/requests/normal.selection.json` | `fixture-cases.mjs` | Baseline normal compile output. |
| `fixtures/expected/route-rationale.compile-result.json` | EXPECTED_SUCCESS | `S_H1_ROUTE_RATIONALE` | `fixtures/dealership.sleeve.json`; `fixtures/requests/route-rationale.selection.json` | `fixture-cases.mjs` | Confirms route rationale metadata does not alter effective output/runtime hash. |
| `fixtures/expected/secondary-b.compile-result.json` | EXPECTED_SUCCESS | `S_H1_SECONDARY_B` | `fixtures/dealership.sleeve.json`; `fixtures/requests/secondary-b.selection.json` | `fixture-cases.mjs` | Baseline secondary-B scenario with deterministic selection and trace checks. |
| `fixtures/expected/secondary-b-overlay.compile-result.json` | EXPECTED_SUCCESS | `S_H1_SECONDARY_B_OVERLAY` | `fixtures/dealership.sleeve.json`; `fixtures/requests/secondary-b-overlay.selection.json` | `fixture-cases.mjs` | Secondary-B + overlay active scenario. |
| `fixtures/expected/secondary-c.compile-result.json` | EXPECTED_SUCCESS | `S_H1_SECONDARY_C` | `fixtures/dealership.sleeve.json`; `fixtures/requests/secondary-c.selection.json` | `fixture-cases.mjs` | Secondary-C variant for directive precedence checks. |
| `fixtures/expected/structure-routing.compile-result.json` | EXPECTED_SUCCESS | `S_H1_STRUCTURE_ROUTING` | `fixtures/structure-routing.sleeve.json`; `fixtures/requests/structure-routing.selection.json` | `fixture-cases.mjs` | Structural routing behavior canonical baseline. |
| `fixtures/requests/bundle-overlay-base.selection.json` | SELECTION | `S_H1_BUNDLE_OVERLAY_BASE` | `fixtures/bundle-overlay.sleeve.json`; `fixtures/state-selection.sleeve.json` in governance/state tests | `bundle-overlay-contract.mjs`; `governance-contract.mjs`; `pathological-robustness-contract.mjs`; `property-metamorphic-contract.mjs`; `trace-registry-contract.mjs` | Base-selection baseline in overlay suite. |
| `fixtures/requests/bundle-overlay-overlays-ab.selection.json` | SELECTION | `S_H1_BUNDLE_OVERLAY_OVERLAYS_AB` | `fixtures/bundle-overlay.sleeve.json`; `fixtures/requests/bundle-overlay-overlays-ba.selection.json` | `bundle-overlay-contract.mjs`; `governance-contract.mjs`; `pathological-robustness-contract.mjs`; `property-metamorphic-contract.mjs` | Explicit overlay stacking A then B. |
| `fixtures/requests/bundle-overlay-overlays-ba.selection.json` | SELECTION | `S_H1_BUNDLE_OVERLAY_OVERLAYS_BA` | `fixtures/bundle-overlay.sleeve.json`; `fixtures/requests/bundle-overlay-overlays-ab.selection.json` | `bundle-overlay-contract.mjs`; `property-metamorphic-contract.mjs` | Explicit overlay stacking B then A. |
| `fixtures/requests/bundle-overlay-sibling-overlay.selection.json` | SELECTION | `S_H1_BUNDLE_OVERLAY_SIBLING_OVERLAY` | `fixtures/bundle-overlay.sleeve.json` | `bundle-overlay-contract.mjs`; `property-metamorphic-contract.mjs` | Includes sibling overlay selection branch. |
| `fixtures/requests/bundle-overlay-secondary-b.selection.json` | SELECTION | `S_H1_BUNDLE_OVERLAY_SECONDARY_B` | `fixtures/bundle-overlay.sleeve.json` | `bundle-overlay-contract.mjs`; `governance-contract.mjs`; `pathological-robustness-contract.mjs`; `property-metamorphic-contract.mjs` | Targets secondary-B overlay behavior branch. |
| `fixtures/requests/bundle-reorder.selection.json` | SELECTION | `S_H1_BUNDLE_REORDER_BASE` | `fixtures/bundle-reorder-base.sleeve.json`; `fixtures/bundle-reorder-alt.sleeve.json`; `runtime-hash-contract.mjs` | `fixture-cases.mjs`; `runtime-hash-contract.mjs` | Shared selection for bundle reorder variants and hash mutation tests. |
| `fixtures/requests/directive-geometry.selection.json` | SELECTION | `S_H1_DIRECTIVE_GEOMETRY` | `fixtures/directive-geometry.sleeve.json`; `fixtures/requests/directive-geometry-shuffled.selection.json` | `directive-geometry-contract.mjs` | Structural scenario for canonical directive geometry. |
| `fixtures/requests/directive-geometry-shuffled.selection.json` | SELECTION | `S_H1_DIRECTIVE_GEOMETRY` | `fixtures/directive-geometry.sleeve.json`; `fixtures/requests/directive-geometry.selection.json` | `directive-geometry-contract.mjs` | Mutated order invariance assertion for same semantic result. |
| `fixtures/requests/disabled-sales.selection.json` | SELECTION | `S_H1_DISABLED_SALES` | `fixtures/dealership.sleeve.json`; `fixtures/requests/disabled-sales.selection.json` | `fixture-cases.mjs`; `property-metamorphic-contract.mjs`; `trace-emission-coverage.mjs` | Disabled sales subtree state + trace event assertions. |
| `fixtures/requests/governance-off.selection.json` | SELECTION | `S_H1_GOVERNANCE_OFF` | `fixtures/dealership.sleeve.json`; `fixtures/requests/governance-off.selection.json` | `fixture-cases.mjs`; `property-metamorphic-contract.mjs` | Governance OFF branch selection. |
| `fixtures/requests/merge-contract-base.selection.json` | SELECTION | `S_H1_MERGE_CONTRACT_BASE` | `fixtures/merge-contract.sleeve.json`; `fixtures/requests/merge-contract-bundle.selection.json`; `fixtures/requests/merge-contract-overlay.selection.json` | `governance-contract.mjs`; `merge-contract.mjs`; `pathological-robustness-contract.mjs`; `property-metamorphic-contract.mjs` | Merge base success and authority-edge tests. |
| `fixtures/requests/merge-contract-bundle.selection.json` | SELECTION | `S_H1_MERGE_CONTRACT_BUNDLE` | `fixtures/merge-contract.sleeve.json`; `fixtures/requests/merge-contract-base.selection.json` | `merge-contract.mjs`; `pathological-robustness-contract.mjs`; `property-metamorphic-contract.mjs` | Merge bundle branch selected for geometry replacement. |
| `fixtures/requests/merge-contract-overlay.selection.json` | SELECTION | `S_H1_MERGE_CONTRACT_OVERLAY` | `fixtures/merge-contract.sleeve.json`; `fixtures/requests/merge-contract-bundle.selection.json` | `merge-contract.mjs`; `pathological-robustness-contract.mjs`; `property-metamorphic-contract.mjs` | Merge + overlay branch selection for overlay precedence assertions. |
| `fixtures/requests/merge-directive.selection.json` | SELECTION | `S_H1_MERGE_DIRECTIVE` | `fixtures/merge-directive.sleeve.json`; `fixtures/requests/normal.selection.json` | `directive-geometry-contract.mjs`; `fixture-cases.mjs`; `merge-contract.mjs`; `property-metamorphic-contract.mjs` | Merge result via directive selection. |
| `fixtures/requests/multi-secondary-error.selection.json` | SELECTION | `S_H1_MULTI_SECONDARY_ERROR` | `fixtures/dealership.sleeve.json`; `fixtures/dealership.sleeve.json` variants | `cli-contract.mjs`; `failure-contract.mjs`; `fixture-cases.mjs`; `pathological-robustness-contract.mjs`; `property-metamorphic-contract.mjs`; `public-output-contract.mjs`; `state-selection-contract.mjs`; `version-compatibility-contract.mjs` | Dual-secondary conflict selection failure driver. |
| `fixtures/requests/normal.selection.json` | SELECTION | `S_H1_BASELINE_NORMAL` | `fixtures/dealership.sleeve.json`; `fixtures/directive-geometry.sleeve.json` | `diagnostic-emission-coverage.mjs`; `directive-geometry-contract.mjs`; `fixture-cases.mjs`; `pathological-robustness-contract.mjs`; `property-metamorphic-contract.mjs`; `runtime-hash-contract.mjs`; `trace-registry-contract.mjs`; `version-compatibility-contract.mjs` | Canonical normal selection in many suites. |
| `fixtures/requests/route-rationale.selection.json` | SELECTION | `S_H1_ROUTE_RATIONALE` | `fixtures/dealership.sleeve.json`; `fixtures/requests/normal.selection.json` | `fixture-cases.mjs`; `property-metamorphic-contract.mjs`; `runtime-hash-contract.mjs`; `run-fixtures.mjs` | Rationale metadata path for public-output invariance checks. |
| `fixtures/requests/secondary-b.selection.json` | SELECTION | `S_H1_SECONDARY_B` | `fixtures/dealership.sleeve.json`; `fixtures/requests/secondary-c.selection.json` | `cli-contract.mjs`; `directive-geometry-contract.mjs`; `failure-contract.mjs`; `fixture-cases.mjs`; `pathological-robustness-contract.mjs`; `property-metamorphic-contract.mjs`; `public-output-contract.mjs`; `runtime-hash-contract.mjs`; `version-compatibility-contract.mjs` | Primary secondary directive selection fixture. |
| `fixtures/requests/secondary-b-overlay.selection.json` | SELECTION | `S_H1_SECONDARY_B_OVERLAY` | `fixtures/dealership.sleeve.json`; `fixtures/requests/secondary-b.selection.json` | `fixture-cases.mjs`; `runtime-hash-contract.mjs` | Secondary-B with overlay selected. |
| `fixtures/requests/secondary-c.selection.json` | SELECTION | `S_H1_SECONDARY_C` | `fixtures/dealership.sleeve.json`; `fixtures/requests/secondary-b.selection.json` | `fixture-cases.mjs` | Secondary-C variant for directive ordering checks. |
| `fixtures/requests/state-selection-closed.selection.json` | SELECTION | `S_H1_STATE_SELECTION_CLOSED` | `fixtures/state-selection.sleeve.json`; `fixtures/requests/state-selection-disabled-sibling.selection.json`; `fixtures/requests/state-selection-off-sibling.selection.json` | `diagnostic-emission-coverage.mjs`; `diagnostic-registry-contract.mjs`; `governance-contract.mjs`; `pathological-robustness-contract.mjs`; `property-metamorphic-contract.mjs`; `qualification-container-unknown-regression.mjs`; `state-selection-contract.mjs`; `trace-registry-contract.mjs` | Base state-selection case for active path + resolution failure matrix. |
| `fixtures/requests/state-selection-disabled-sibling.selection.json` | SELECTION | `S_H1_STATE_SELECTION_DISABLED_SIBLING` | `fixtures/state-selection.sleeve.json`; `fixtures/requests/state-selection-closed.selection.json` | `state-selection-contract.mjs` | Disabled sibling state outcome branch. |
| `fixtures/requests/state-selection-off-sibling.selection.json` | SELECTION | `S_H1_STATE_SELECTION_OFF_SIBLING` | `fixtures/state-selection.sleeve.json`; `fixtures/requests/state-selection-closed.selection.json` | `state-selection-contract.mjs` | Off sibling state outcome branch. |
| `fixtures/requests/structure-routing.selection.json` | SELECTION | `S_H1_STRUCTURE_ROUTING` | `fixtures/structure-routing.sleeve.json` | `fixture-cases.mjs`; `property-metamorphic-contract.mjs` | Secondary structure-routing selection used for routing path assertions. |

## 2. Scenario Inventory

| SCENARIO_ID | SLEEVE | SELECTION | EXPECTED_RESULT | SUCCESS_OR_FAILURE | PRIMARY_BEHAVIOR | SECONDARY_BEHAVIORS | TESTS_USING_SCENARIO |
| --- | --- | --- | --- | --- | --- | --- |
| `S_H1_BASELINE_NORMAL` | `fixtures/dealership.sleeve.json` | `fixtures/requests/normal.selection.json` | `fixtures/expected/normal.compile-result.json` | success | Baseline compile and default state activation. | Route rationale not supplied; trace/runtime schema fields verified; canonical stack activation. | `run-fixtures.mjs`; `runtime-hash-contract.mjs`; `public-output-contract.mjs`; `trace-registry-contract.mjs`; `diagnostic-emission-coverage.mjs`; `version-compatibility-contract.mjs`; `cli-contract.mjs` |
| `S_H1_SECONDARY_B` | `fixtures/dealership.sleeve.json` | `fixtures/requests/secondary-b.selection.json` | `fixtures/expected/secondary-b.compile-result.json` | success | Secondary-B selection and merged prompt row order. | Merge validation trace, secondary directive selection, hash parity with related scenarios. | `run-fixtures.mjs`; `runtime-hash-contract.mjs`; `trace-registry-contract.mjs`; `failure-contract.mjs`; `state-selection-contract.mjs` |
| `S_H1_SECONDARY_C` | `fixtures/dealership.sleeve.json` | `fixtures/requests/secondary-c.selection.json` | `fixtures/expected/secondary-c.compile-result.json` | success | Secondary-C selection precedence branch. | Non-selected prompt path changes in secondary branch. | `run-fixtures.mjs` |
| `S_H1_SECONDARY_B_OVERLAY` | `fixtures/dealership.sleeve.json` | `fixtures/requests/secondary-b-overlay.selection.json` | `fixtures/expected/secondary-b-overlay.compile-result.json` | success | Secondary-B plus active overlay path. | Scoped+overlay interop and philosophy scope checks. | `run-fixtures.mjs`; `runtime-hash-contract.mjs` |
| `S_H1_MULTI_SECONDARY_ERROR` | `fixtures/dealership.sleeve.json` | `fixtures/requests/multi-secondary-error.selection.json` | `fixtures/expected/multi-secondary-error.compile-result.json` | failure | Multiple secondary directive match failure. | Resolution failure trace + diagnostics; trace terminal status. | `run-fixtures.mjs`; `failure-contract.mjs`; `cli-contract.mjs`; `public-output-contract.mjs`; `version-compatibility-contract.mjs` |
| `S_H1_GOVERNANCE_OFF` | `fixtures/dealership.sleeve.json` | `fixtures/requests/governance-off.selection.json` | `fixtures/expected/governance-off.compile-result.json` | success | Governance OFF exclusion removes branch from runtime. | Governance event emission ordering and reset plan updates. | `run-fixtures.mjs`; `governance-contract.mjs`; `bundle-overlay-contract.mjs` |
| `S_H1_DISABLED_SALES` | `fixtures/dealership.sleeve.json` | `fixtures/requests/disabled-sales.selection.json` | `fixtures/expected/disabled-sales.compile-result.json` | success | Human-disabled subtree filtering in active tree. | Final state assertions for disabled stacks/blocks and trace emission coverage. | `run-fixtures.mjs`; `trace-emission-coverage.mjs`; `property-metamorphic-contract.mjs` |
| `S_H1_ROUTE_RATIONALE` | `fixtures/dealership.sleeve.json` | `fixtures/requests/route-rationale.selection.json` | `fixtures/expected/route-rationale.compile-result.json` | success | Route rationale metadata capture without semantic drift. | Runtime hash equality with non-rationale baseline. | `run-fixtures.mjs`; `runtime-hash-contract.mjs` |
| `S_H1_MERGE_DIRECTIVE` | `fixtures/merge-directive.sleeve.json` | `fixtures/requests/merge-directive.selection.json` | `fixtures/expected/merge-directive.compile-result.json` | success | Merge result from directive merge path. | Merge validated event detail and authority ceiling pass. | `run-fixtures.mjs`; `directive-geometry-contract.mjs`; `merge-contract.mjs` |
| `S_H1_STRUCTURE_ROUTING` | `fixtures/structure-routing.sleeve.json` | `fixtures/requests/structure-routing.selection.json` | `fixtures/expected/structure-routing.compile-result.json` | success | Structural routing across neo-stacks and node path resolution. | Reset-plan ordering and trace state transitions. | `run-fixtures.mjs`; `property-metamorphic-contract.mjs` |
| `S_H1_BUNDLE_REORDER_BASE` | `fixtures/bundle-reorder-base.sleeve.json` | `fixtures/requests/bundle-reorder.selection.json` | `fixtures/expected/bundle-reorder-base.compile-result.json` | success | Bundle reorder base lane source behavior. | Stable resolved row set; alternate hash from geometry order changes. | `run-fixtures.mjs`; `runtime-hash-contract.mjs` |
| `S_H1_BUNDLE_REORDER_ALT` | `fixtures/bundle-reorder-alt.sleeve.json` | `fixtures/requests/bundle-reorder.selection.json` | `fixtures/expected/bundle-reorder-alt.compile-result.json` | success | Alternate bundle ordering in same logical source. | RuntimeHash divergence with preserved logical payload after stripping bundle-mutation surface. | `run-fixtures.mjs` |
| `S_H1_DIRECTIVE_GEOMETRY` | `fixtures/directive-geometry.sleeve.json` | `fixtures/requests/directive-geometry.selection.json` + `fixtures/requests/directive-geometry-shuffled.selection.json` | generated assertions (no new fixed expected file) | mixed | Canonical directive geometry validation and ordering invariance. | Failures for invalid prime/secondary directives and orphan/parent anomalies. | `directive-geometry-contract.mjs` |
| `S_H1_STATE_SELECTION_CLOSED` | `fixtures/state-selection.sleeve.json` | `fixtures/requests/state-selection-closed.selection.json` | generated assertions (no fixed expected file) | mixed | Closed active path for state selection. | Off/disabled branch resolution, missing ancestor, container-not-selected, target-not-executable diagnostics. | `state-selection-contract.mjs`; `qualification-container-unknown-regression.mjs`; `trace-registry-contract.mjs`; `governance-contract.mjs`; `diagnostic-emission-coverage.mjs`; `diagnostic-registry-contract.mjs` |
| `S_H1_STATE_SELECTION_DISABLED_SIBLING` | `fixtures/state-selection.sleeve.json` | `fixtures/requests/state-selection-disabled-sibling.selection.json` | generated assertions | success | Sibling disabled state removes resolved branch content. | Active ID lists and final stack/block state assertions. | `state-selection-contract.mjs` |
| `S_H1_STATE_SELECTION_OFF_SIBLING` | `fixtures/state-selection.sleeve.json` | `fixtures/requests/state-selection-off-sibling.selection.json` | generated assertions | success | Sibling OFF state branch removal outcome. | Active ID lists and final stack/block state assertions. | `state-selection-contract.mjs` |
| `S_H1_BUNDLE_OVERLAY_BASE` | `fixtures/bundle-overlay.sleeve.json` | `fixtures/requests/bundle-overlay-base.selection.json` | generated assertions | success | Bundle + base overlay baseline. | Scoping IDs and geometry composition with overlays absent. | `bundle-overlay-contract.mjs`; `governance-contract.mjs`; `trace-registry-contract.mjs`; `property-metamorphic-contract.mjs` |
| `S_H1_BUNDLE_OVERLAY_SECONDARY_B` | `fixtures/bundle-overlay.sleeve.json` | `fixtures/requests/bundle-overlay-secondary-b.selection.json` | generated assertions | success | Secondary-B with overlay baseline branch. | Bundle fallback geometry vs secondary-specific geometry. | `bundle-overlay-contract.mjs`; `governance-contract.mjs` |
| `S_H1_BUNDLE_OVERLAY_OVERLAYS_AB` | `fixtures/bundle-overlay.sleeve.json` | `fixtures/requests/bundle-overlay-overlays-ab.selection.json` | generated assertions | success | Active overlay ordering when A then B. | Scoped/philosophy source traces and fallback order assertions. | `bundle-overlay-contract.mjs`; `governance-contract.mjs`; `pathological-robustness-contract.mjs` |
| `S_H1_BUNDLE_OVERLAY_OVERLAYS_BA` | `fixtures/bundle-overlay.sleeve.json` | `fixtures/requests/bundle-overlay-overlays-ba.selection.json` | generated assertions | success | Active overlay ordering when B then A. | Non-equivalence checks against AB path in expected order. | `bundle-overlay-contract.mjs`; `pathological-robustness-contract.mjs`; `property-metamorphic-contract.mjs` |
| `S_H1_BUNDLE_OVERLAY_SIBLING_OVERLAY` | `fixtures/bundle-overlay.sleeve.json` | `fixtures/requests/bundle-overlay-sibling-overlay.selection.json` | generated assertions | success | Sibling overlay branch in overlay selection. | Explicit overlay scope checks for sibling scoping and scoped ordering. | `bundle-overlay-contract.mjs`; `property-metamorphic-contract.mjs` |
| `S_H1_MERGE_CONTRACT_BASE` | `fixtures/merge-contract.sleeve.json` | `fixtures/requests/merge-contract-base.selection.json` | generated assertions | success | Merge from base geometry to instruction result path. | Merge trace shape and source/authority verification. | `merge-contract.mjs`; `governance-contract.mjs`; `pathological-robustness-contract.mjs` |
| `S_H1_MERGE_CONTRACT_BUNDLE` | `fixtures/merge-contract.sleeve.json` | `fixtures/requests/merge-contract-bundle.selection.json` | generated assertions | success | Merge applying replacement geometry from bundle. | `bundleId` and prompt source mode transitions. | `merge-contract.mjs`; `pathological-robustness-contract.mjs`; `property-metamorphic-contract.mjs` |
| `S_H1_MERGE_CONTRACT_OVERLAY` | `fixtures/merge-contract.sleeve.json` | `fixtures/requests/merge-contract-overlay.selection.json` | generated assertions | success | Merge + overlay coexistence. | Scoped + overlay source layering for merged results. | `merge-contract.mjs`; `pathological-robustness-contract.mjs` |
| `S_H1_INVALID_DIRECTIVE_SECONDARY_BASE` | `fixtures/invalid/directive-secondary-in-base.sleeve.json` | `fixtures/requests/normal.selection.json` | generated failure assertions | failure | Secondary directive declared in base geometry rejection. | Multi-test diagnostics for base-geometry canonicality. | `diagnostic-registry-contract.mjs`; `failure-contract.mjs`; `run-fixtures.mjs`; `trace-registry-contract.mjs`; `version-compatibility-contract.mjs` |
| `S_H1_INVALID_UPWARD_MERGE` | `fixtures/invalid/upward-merge.sleeve.json` | generated/normal selection context | generated failure assertions | failure | Merge authority escalation validation. | MERGE authority and cycle/unsupported invariants in property and generated robustness tests. | `run-fixtures.mjs`; `property-metamorphic-contract.mjs` |
| `S_H1_INVALID_CROSS_LANE_BUNDLE` | `fixtures/invalid/cross-lane-bundle.sleeve.json` | generated validation context | generated failure assertions | failure | Cross-lane bundle lane type mismatch handling. | Structural schema-stage diagnostic presence. | `run-fixtures.mjs` |
| `S_H1_RUNTIME_HASH` | `fixtures/dealership.sleeve.json`; `fixtures/bundle-reorder-base.sleeve.json`; `fixtures/requests/normal.selection.json`; `fixtures/requests/secondary-b.selection.json`; `fixtures/requests/route-rationale.selection.json`; `fixtures/requests/secondary-b-overlay.selection.json`; `fixtures/requests/bundle-reorder.selection.json` | generated assertions + runtime fixtures | mixed | Hash profile stability and mutation sensitivity. | Determinism across lane content and payload field changes. | `runtime-hash-contract.mjs` |
| `S_H1_COMPATIBILITY_REGRESSION` | `fixtures/dealership.sleeve.json`; `fixtures/invalid/directive-secondary-in-base.sleeve.json` | `fixtures/requests/normal.selection.json`; `fixtures/requests/multi-secondary-error.selection.json`; `fixtures/requests/secondary-b.selection.json` | generated assertions | mixed | Compiler contract compatibility constants and version/profile consistency. | Compatibility failure path assertions (`schemaRegistry`, `diagnosticRegistry`, `runtimeHashProfile`). | `version-compatibility-contract.mjs` |

## 3. Test Inventory

| PATH | CATEGORY | PRIMARY_CONTRACT | FIXTURES_USED | DIRECT_PUBLIC_OBSERVABLE_TEST | PROPERTY_OR_METAMORPHIC | IMPLEMENTATION_COUPLED | NOTES |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `test/bundle-overlay-contract.mjs` | SCOPED_OVERLAY | Scoped overlay, bundle fallback, and overlay order/validation semantics | `bundle-overlay.sleeve.json`; `bundle-overlay-*` selection fixtures | yes | no | no | Includes success and failure overlay cases, scoped IDs, and unresolved overlay failure diagnostics. |
| `test/cli-contract.mjs` | PUBLIC_OUTPUT | CLI invocation contract and usage/failure exit behavior | `fixtures/dealership.sleeve.json`; `fixtures/requests/secondary-b.selection.json`; `fixtures/requests/multi-secondary-error.selection.json` | yes | no | no | Verifies CLI argument validation and compile failure output codes. |
| `test/deterministic-fuzz-contract.mjs` | DETERMINISM | Runtime/compile determinism under synthetic fixture fuzzing | generated fixtures | yes | yes | no | Randomized invariant testing across generated selections/fixtures. |
| `test/diagnostic-emission-coverage.mjs` | DIAGNOSTIC | Diagnostic code existence, schema, and envelope metadata | `dealership.sleeve.json`; `state-selection.sleeve.json`; `bundle-overlay.sleeve.json`; `merge-contract.sleeve.json`; `normal/secondary/route` selections | yes | no | no | Largest explicit coverage list for diagnostic codes. |
| `test/diagnostic-registry-contract.mjs` | DIAGNOSTIC | Registry completeness and code staging/subject assertions | `dealership.sleeve.json`; `state-selection.sleeve.json`; `state-selection-closed.selection.json`; `invalid/directive-secondary-in-base.sleeve.json` | yes | no | no | Ensures diagnostic registry and emitted diagnostics align by code, stage, and subject. |
| `test/directive-geometry-contract.mjs` | MOLT_GEOMETRY | Canonical directive geometry relationships and invalid directive-geometry combos | `directive-geometry.sleeve.json`; `dealership.sleeve.json`; `merge-directive.sleeve.json`; `normal/secondary/merge-directive/directive-geometry` selections | yes | no | no | Success and failure checks on prime/secondary directives and deterministic shuffle invariance. |
| `test/failure-contract.mjs` | FAILURE | Failure envelope consistency for canonical error cases | `dealership.sleeve.json`; `invalid/directive-secondary-in-base.sleeve.json`; `multi-secondary-error.selection.json`; `secondary-b.selection.json` | yes | no | no | Covers structural + semantic failure families and direct error-code assertions. |
| `test/governance-contract.mjs` | GOVERNANCE | Governance OFF/ON behavior, ordering, and selection blocking | `state-selection.sleeve.json`; `bundle-overlay.sleeve.json`; `merge-contract.sleeve.json`; `state-selection-closed.selection.json`; related overlay/merge selections | yes | no | no | Validates governance rule effects through trace and final state transitions. |
| `test/merge-contract.mjs` | MERGE | Merge success/failure contracts and authority checks | `merge-contract.sleeve.json`; `merge-directive.sleeve.json`; `bundle-overlay.sleeve.json`; merge selections | yes | no | no | Includes merge trace shape checks and multiple explicit merge error-code families. |
| `test/pathological-robustness-contract.mjs` | DETERMINISM | Robustness/regression invariants on stressed generated scenarios | `bundle-overlay.sleeve.json`; `dealership.sleeve.json`; `merge-contract.sleeve.json`; state/merge/bundle variant requests | yes | yes | no | Extensive invariants and regression set, including hash stability and graph/cycle cases. |
| `test/property-metamorphic-contract.mjs` | DETERMINISM | Ordered invariance and authority/multiplicity metamorphic laws | generated scenarios built from `dealership`, `bundle-overlay`, `merge-contract`, `state-selection`, `merge-directive`; plus `invalid/upward-merge.sleeve.json` | yes | yes | no | Explicitly includes metamorphic assertions for ordering, authority ceiling, and merge authority escalation. |
| `test/public-output-contract.mjs` | PUBLIC_OUTPUT | Public contract validation for compile/runtime/trace JSON shape and mutation rejection | `dealership.sleeve.json`; `normal/secondary` selections; `multi-secondary-error.selection.json` | yes | no | no | Verifies contract validators and negative mutation tests (bad hash/bad runtime fields). |
| `test/qualification-container-unknown-regression.mjs` | STATE_SELECTION | Regression for missing/unknown neoblock containers at resolution | `state-selection.sleeve.json`; `state-selection-closed.selection.json` | yes | no | no | Exercises container_unknown/ container_not_selected behaviors and trace diagnostics. |
| `test/run-fixtures.mjs` | STRUCTURAL | Golden canonical fixture execution and output equality checks | fixture-cases matrix + all 11 compile-result fixtures and `invalid/*` sleeves | yes | no | no | Primary executable harness for repository canonical fixtures. |
| `test/runtime-hash-contract.mjs` | RUNTIME_HASH | RuntimeHash payload/profile and mutation sensitivity | `fixtures/hash/HASH_TEST_VECTORS.json`; `dealership.sleeve.json`; `bundle-reorder-base.sleeve.json`; `normal/secondary-b/route-rationale/secondary-b-overlay/bundle-reorder` selections | yes | yes | no | Contains deterministic mutation matrix for hashed runtime fields. |
| `test/state-selection-contract.mjs` | STATE_SELECTION | State activation semantics and blocked-resolution diagnostics | `state-selection.sleeve.json`; `state-selection-*` selections | yes | no | no | Covers success activation and a wide set of resolution failures. |
| `test/trace-emission-coverage.mjs` | TRACE | Trace event emission presence/coverage constraints | `dealership.sleeve.json`; `disabled-sales.selection.json` | yes | no | no | Ensures event list includes required overlay/scoped/governance/merge markers. |
| `test/trace-registry-contract.mjs` | TRACE | Trace contract structure and terminal-state consistency | `normal`, `secondary-b`, `secondary-b-overlay`, `route-rationale`, `multi-secondary-error`, `state-selection` fixtures and invalid secondary fixture | yes | no | no | Verifies trace contract plus terminal stage and monotonic event expectations. |
| `test/version-compatibility-contract.mjs` | COMPATIBILITY | Contract schema registry/runtime hash profile compatibility checks | `dealership.sleeve.json`; `state-selection-closed.selection.json`; `invalid/directive-secondary-in-base.sleeve.json`; normal/secondary selections | yes | no | no | Verifies registry versions and compatibility-related invariants. |

## 4. Canonical Suitability Classification

- `STRONG_CANONICAL_CANDIDATE`
  - `S_H1_BASELINE_NORMAL`
  - `S_H1_SECONDARY_B`
  - `S_H1_SECONDARY_C`
  - `S_H1_SECONDARY_B_OVERLAY`
  - `S_H1_MULTI_SECONDARY_ERROR`
  - `S_H1_GOVERNANCE_OFF`
  - `S_H1_DISABLED_SALES`
  - `S_H1_ROUTE_RATIONALE`
  - `S_H1_MERGE_DIRECTIVE`
  - `S_H1_STRUCTURE_ROUTING`
  - `S_H1_BUNDLE_REORDER_BASE`
  - `S_H1_BUNDLE_REORDER_ALT`
  - `S_H1_DIRECTIVE_GEOMETRY`
  - `S_H1_STATE_SELECTION_CLOSED`
  - `S_H1_STATE_SELECTION_DISABLED_SIBLING`
  - `S_H1_STATE_SELECTION_OFF_SIBLING`
  - `S_H1_BUNDLE_OVERLAY_BASE`
  - `S_H1_BUNDLE_OVERLAY_SECONDARY_B`
  - `S_H1_BUNDLE_OVERLAY_OVERLAYS_AB`
  - `S_H1_BUNDLE_OVERLAY_OVERLAYS_BA`
  - `S_H1_BUNDLE_OVERLAY_SIBLING_OVERLAY`
  - `S_H1_MERGE_CONTRACT_BASE`
  - `S_H1_MERGE_CONTRACT_BUNDLE`
  - `S_H1_MERGE_CONTRACT_OVERLAY`
  - `S_H1_RUNTIME_HASH`
- `SUPPORTING_ONLY`
  - `S_H1_INVALID_DIRECTIVE_SECONDARY_BASE`
  - `S_H1_INVALID_UPWARD_MERGE`
  - `S_H1_INVALID_CROSS_LANE_BUNDLE`
  - `S_H1_COMPATIBILITY_REGRESSION`
- `QUALIFICATION_ONLY`: none
- `NOT_CORPUS_SUITABLE`: none

## 5. High-Value Existing Scenarios

- normal successful compile: `S_H1_BASELINE_NORMAL` (STRONG evidence)
- Secondary Directive selection: `S_H1_SECONDARY_B` / `S_H1_SECONDARY_C`
- multiple Secondary failure: `S_H1_MULTI_SECONDARY_ERROR`
- Bundle behavior: `S_H1_BUNDLE_REORDER_BASE`; `S_H1_BUNDLE_REORDER_ALT`; `S_H1_BUNDLE_OVERLAY_*`
- scoped MOLT: `S_H1_DIRECTIVE_GEOMETRY`
- Overlay behavior: `S_H1_SECONDARY_B_OVERLAY`; `S_H1_BUNDLE_OVERLAY_*`
- Governance OFF: `S_H1_GOVERNANCE_OFF`
- Merge success: `S_H1_MERGE_DIRECTIVE`; `S_H1_MERGE_CONTRACT_*`
- Merge authority failure: `S_H1_INVALID_UPWARD_MERGE`
- structural failure: `S_H1_INVALID_CROSS_LANE_BUNDLE`
- semantic failure: `S_H1_MULTI_SECONDARY_ERROR`; `S_H1_INVALID_DIRECTIVE_SECONDARY_BASE`
- resolution failure: `S_H1_STATE_SELECTION_CLOSED`
- compatibility failure: `S_H1_COMPATIBILITY_REGRESSION`
- RuntimeHash behavior: `S_H1_RUNTIME_HASH`

`NO_EXISTING_SCENARIO` for listed families: `NONE`

## 6. Evidence Strength by Family

- normal successful compile: STRONG
- Secondary Directive selection: STRONG
- multiple Secondary failure: STRONG
- Bundle behavior: STRONG
- scoped MOLT: STRONG
- Overlay behavior: STRONG
- Governance OFF: STRONG
- Merge success: STRONG
- Merge authority failure: STRONG
- structural failure: STRONG
- semantic failure: STRONG
- resolution failure: STRONG
- compatibility failure: MODERATE
- RuntimeHash behavior: STRONG

## 7. Inventory Counts

- TOTAL_RELEVANT_FIXTURE_FILES: `48`
- SLEEVE_COUNT: `12`
- SELECTION_COUNT: `23`
- EXPECTED_SUCCESS_COUNT: `11`
- EXPECTED_FAILURE_COUNT: `1`
- SUPPORTING_FIXTURE_COUNT: `1`
- TOTAL_RELEVANT_TEST_FILES: `18`
- GROUPED_SCENARIO_COUNT: `29`
- STRONG_CANONICAL_CANDIDATE_COUNT: `25`
- SUPPORTING_ONLY_COUNT: `4`
- QUALIFICATION_ONLY_COUNT: `0`
- NOT_CORPUS_SUITABLE_COUNT: `0`

## 8. Next Step Recommendation

- `A. map the 252 requirements to the inventoried evidence`

## 9. Open Items

- `CANON_DECISIONS_REQUIRED`: none
- `CONFLICTS_FOUND`: none
- `SEMANTIC_CHANGES`: none (inventory-only pass; no compiler or test edits)
- `FILES_CHANGED`: `docs/qualification/H1/H1E1D_EXISTING_EVIDENCE_INVENTORY.md`
