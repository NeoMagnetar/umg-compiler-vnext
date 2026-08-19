# H1-C1 Conformance Specification Skeleton

## 1. Document Identity
- Purpose: Define the top-level structure for the future normative UMG Compiler vNext conformance specification.
- Authority source(s): `docs/qualification/H1/H1A_CONFORMANCE_SOURCE_INVENTORY.md`, `docs/qualification/H1/H1B_AUTHORITY_PRECEDENCE_MATRIX.md`, `docs/qualification/H1/H1B1_RUNTIME_HASH_PRECEDENCE.md`.
- Planned requirement family: `UMG-CONF-GLOBAL-###`.
- Known exclusions: No requirements are normative in this document; no behavior is fixed yet.
- Unresolved status: Waiting for H1-C2/H1-C3 requirement drafting before any normative statement.

## 2. Status and Version Scope
- Purpose: Fix the publication and source context that the specification governs.
- Authority source(s): `package.json`, `docs/qualification/H1/H1A_CONFORMANCE_SOURCE_INVENTORY.md`.
- Planned requirement family: `UMG-CONF-GLOBAL-###` with version-tracking aliases.
- Known exclusions: Does not replace Git branch or release workflow artifacts.
- Unresolved status: Versioning strategy is identified but numeric semantics and compatibility policy still require explicit requirement-level binding in later sections.

## 3. Purpose
- Purpose: State that the specification captures normative conformance expectations for compiler behavior and outputs.
- Authority source(s): `docs/SEMANTIC_FREEZE_v0.1.md`, `docs/qualification/H1/H1B_AUTHORITY_PRECEDENCE_MATRIX.md`.
- Planned requirement family: `UMG-CONF-GLOBAL-###`.
- Known exclusions: Excludes release packaging and contributor process.
- Unresolved status: No open conflicts on purpose statement.

## 4. Conformance Target
- Purpose: Declare the compiler/library interfaces and outputs in scope.
- Authority source(s): `docs/SEMANTIC_FREEZE_v0.1.md`, `schemas/SCHEMA_REGISTRY.json`, `schemas/COMPATIBILITY_MATRIX.json`.
- Planned requirement family: `UMG-CONF-GLOBAL-###` + `UMG-CONF-CORE-###`.
- Known exclusions: Does not include test harness implementation details or local build tooling.
- Unresolved status: Targeting includes interface-neutral core; this remains final unless explicitly narrowed by later canon updates.

## 5. Normative Language
- Purpose: Define how MUST/MUST NOT/SHOULD/MAY will be interpreted during requirement writing.
- Authority source(s): `docs/qualification/H1/H1B_AUTHORITY_PRECEDENCE_MATRIX.md`.
- Planned requirement family: `UMG-CONF-GLOBAL-###`.
- Known exclusions: No semantic terms are introduced in this skeleton.
- Unresolved status: Normative vocabulary conventions still to be finalized in H1-C2.

## 6. Authority and Precedence
- Purpose: Establish normative interpretation order for artifacts and evidence.
- Authority source(s): `docs/qualification/H1/H1B_AUTHORITY_PRECEDENCE_MATRIX.md`, `docs/qualification/H1/H1B1_RUNTIME_HASH_PRECEDENCE.md`, `docs/SEMANTIC_FREEZE_v0.1.md`, `schemas/*`.
- Planned requirement family: `UMG-CONF-GLOBAL-###`.
- Known exclusions: No new precedence rules beyond existing evidence.
- Unresolved status: None.

## 7. Core Terminology
- Purpose: Define terms used consistently in all requirement families.
- Authority source(s): `docs/SEMANTIC_FREEZE_v0.1.md`, `schemas/SCHEMA_REGISTRY.json`, existing fixture and test naming conventions.
- Planned requirement family: `UMG-CONF-GLOBAL-###`.
- Known exclusions: No operational formalism of internal compiler algorithms.
- Unresolved status: Terminology normalization across all domains still pending.

## 8. Input Conformance
- Purpose: Define what constitutes valid/invalid input envelopes for conformance checks.
- Authority source(s): `schemas/SCHEMA_REGISTRY.json`, `schemas/SCHEMA_README`, `test/public-output-contract.mjs`.
- Planned requirement family: `UMG-CONF-INPUT-###`.
- Known exclusions: CLI parsing syntax and shell UX are excluded pending interface boundary section.
- Unresolved status: Structural-only vs semantic input requirements still need precise split in H1-C2.

## 9. Structural Validation
- Purpose: Specify which validation constraints are structural and scope-controlled.
- Authority source(s): `schemas/umg-compiler-vnext.schema.json`, per-schema files, `schemas/SCHEMA_README`.
- Planned requirement family: `UMG-CONF-STRUCT-###`.
- Known exclusions: Relational and semantic validation in TS code path.
- Unresolved status: No conflict between schema and non-schema authority currently detected.

## 10. MOLT Semantic Conformance
- Purpose: Capture frozen MOLT semantics and any explicitly extended behavior.
- Authority source(s): `docs/SEMANTIC_FREEZE_v0.1.md`.
- Planned requirement family: `UMG-CONF-MOLT-###`.
- Known exclusions: No algorithmic implementation details.
- Unresolved status: Any MOLT-related extension beyond freeze remains for future canon updates.

## 11. NeoStack / NeoBlock Geometry
- Purpose: Constrain structural and behavioral rules for stack/block topology.
- Authority source(s): `docs/SEMANTIC_FREEZE_v0.1.md`, related contract tests.
- Planned requirement family: `UMG-CONF-GEOM-###`.
- Known exclusions: Internal memory/indexing representations.
- Unresolved status: Evidence points to existing tests, but exact formal wording is pending.

## 12. State and Selection Semantics
- Purpose: Scope state model and selection outcomes as conformance obligations.
- Authority source(s): `docs/SEMANTIC_FREEZE_v0.1.md`, `test/state-selection-contract.mjs`, `test/qualification-container-unknown-regression.mjs`.
- Planned requirement family: `UMG-CONF-STATE-###`.
- Known exclusions: Test harness implementation for scenario generation.
- Unresolved status: Confirm requirement granularity for failure precedence.

## 13. Governance OFF
- Purpose: Define behavior when governance is OFF and OFF interactions are evaluated.
- Authority source(s): `docs/SEMANTIC_FREEZE_v0.1.md`, `test/governance-contract.mjs`.
- Planned requirement family: `UMG-CONF-GOV-###`.
- Known exclusions: Policy recommendation text outside compiler behavior.
- Unresolved status: None.

## 14. Prime / Secondary Directives
- Purpose: Define authoritative behavior and restrictions for directive placement and activation.
- Authority source(s): `docs/SEMANTIC_FREEZE_v0.1.md`, `test/directive-geometry-contract.mjs`.
- Planned requirement family: `UMG-CONF-DIR-###`.
- Known exclusions: UI/editor-specific rendering behavior.
- Unresolved status: None.

## 15. Bundle / Overlay Semantics
- Purpose: Define constraints for bundle construction, overlay application, and provenance.
- Authority source(s): `docs/SEMANTIC_FREEZE_v0.1.md`, `test/bundle-overlay-contract.mjs`, `test/merge-contract.mjs`.
- Planned requirement family: `UMG-CONF-BUNDLE-###`.
- Known exclusions: Internal optimization around bundle data structures.
- Unresolved status: No direct conflict, but coverage of all malformed overlay permutations is pending.

## 16. Merge Semantics
- Purpose: Specify merge validity, authority checks, and event-side effects.
- Authority source(s): `docs/SEMANTIC_FREEZE_v0.1.md`, `test/merge-contract.mjs`.
- Planned requirement family: `UMG-CONF-MERGE-###`.
- Known exclusions: Storage model for merged payloads.
- Unresolved status: None.

## 17. RuntimeSpec Conformance
- Purpose: Capture required RuntimeSpec presence, fields, and relationship constraints.
- Authority source(s): `schemas/SCHEMA_REGISTRY.json`, `schemas/runtime-spec.schema.json`, `test/public-output-contract.mjs`, `test/state-selection-contract.mjs`.
- Planned requirement family: `UMG-CONF-RUNTIME-###`.
- Known exclusions: Internal symbol-resolution implementation internals.
- Unresolved status: Trace/runtime linkage details from trace contracts are cross-linked with section 18.

## 18. Trace Conformance
- Purpose: Define trace output constraints, event vocabulary, and stage discipline.
- Authority source(s): `schemas/trace.schema.json`, `schemas/TRACE_EVENT_REGISTRY.json`, `test/trace-registry-contract.mjs`, `test/trace-emission-coverage.mjs`.
- Planned requirement family: `UMG-CONF-TRACE-###`.
- Known exclusions: Internal event-emission logger implementation details.
- Unresolved status: None.

## 19. Diagnostic Conformance
- Purpose: Define diagnostic vocabularies, allowed code/stage combinations, and required emission intent.
- Authority source(s): `schemas/DIAGNOSTIC_REGISTRY.json`, `test/diagnostic-registry-contract.mjs`, `test/diagnostic-emission-coverage.mjs`, `test/failure-contract.mjs`.
- Planned requirement family: `UMG-CONF-DIAG-###`.
- Known exclusions: Exact human-readable formatting style when not explicit in contract.
- Unresolved status: Mapping between registry codes and every failure edge remains to be expanded later.

## 20. RuntimeHash Conformance
- Purpose: Define runtimeHash as a public contract artifact and enforceable profile-driven behavior.
- Authority source(s): `docs/qualification/H1/H1B1_RUNTIME_HASH_PRECEDENCE.md`, `schemas/RUNTIME_HASH_PROFILE.json`, `schemas/COMPATIBILITY_MATRIX.json`, `test/runtime-hash-contract.mjs`.
- Planned requirement family: `UMG-CONF-HASH-###`.
- Known exclusions: Internal hashing implementation details beyond declared profile.
- Unresolved status: Profile precedence confirmed; detailed per-case requirement text deferred.

## 21. Version Compatibility
- Purpose: Define accepted schema and registry combinations under compatibility policy.
- Authority source(s): `schemas/COMPATIBILITY_MATRIX.json`, `test/version-compatibility-contract.mjs`.
- Planned requirement family: `UMG-CONF-COMPAT-###`.
- Known exclusions: SemVer-style inference beyond repository-declared policy.
- Unresolved status: None.

## 22. Determinism
- Purpose: Specify what determinism is known to be guaranteed versus empirically tested.
- Authority source(s): `schemas/RUNTIME_HASH_PROFILE.json`, `test/runtime-hash-contract.mjs`, `test/deterministic-fuzz-contract.mjs`, `test/property-metamorphic-contract.mjs`.
- Planned requirement family: `UMG-CONF-DET-###`.
- Known exclusions: General CPU/OS reproducibility claims not explicitly written as semantic obligations.
- Unresolved status: Cross-platform determinism remains evidence-backed in current layer.

## 23. Public Observable Behavior
- Purpose: Capture externally visible outputs and required visible fields.
- Authority source(s): `schemas/SCHEMA_REGISTRY.json`, `schemas/compile-result.schema.json`, `test/public-output-contract.mjs`, fixture expectations.
- Planned requirement family: `UMG-CONF-OBS-###`.
- Known exclusions: Logging format not used as primary conformance channel unless explicitly required.
- Unresolved status: Stable once output family mapping is finalized.

## 24. Interface-Neutral Core Boundary
- Purpose: Define that H1 conformance is not bound to Node CLI and should remain implementation-agnostic at API/core-contract level.
- Authority source(s): `docs/qualification/H1/H1B2_CLI_PUBLIC_CONTRACT_DECISION.md` (when present), `docs/qualification/H1/H1B1_RUNTIME_HASH_PRECEDENCE.md`, `docs/qualification/H1/H1B_AUTHORITY_PRECEDENCE_MATRIX.md`.
- Planned requirement family: `UMG-CONF-CORE-###`.
- Known exclusions: CLI transport details and package launch specifics.
- Unresolved status: H1-B2 file was not present at current read time; this boundary remains based on prior decision intent and should be restated explicitly in final H1-C2.

## 25. Reference CLI Compatibility Boundary
- Purpose: Specify that CLI behavior is a reference compatibility surface, not the core conformance binder.
- Authority source(s): `test/cli-contract.mjs`, `package.json`, `README.md`, prior CLI review records.
- Planned requirement family: `UMG-CONF-CLI-###`.
- Known exclusions: Non-Node conformance requirements and language-agnostic compiler APIs.
- Unresolved status: None for H1-C1 architecture.

## 26. Failure Conformance
- Purpose: Define required failure signaling, status classes, and non-success output expectations.
- Authority source(s): `test/failure-contract.mjs`, `schemas/DIAGNOSTIC_REGISTRY.json`, `test/diagnostic-emission-coverage.mjs`.
- Planned requirement family: `UMG-CONF-FAIL-###`.
- Known exclusions: Error string formatting in the absence of explicit requirement.
- Unresolved status: Fine-grained per-failure code family matrix deferred.

## 27. Conformance Corpus Relationship
- Purpose: Define how fixture and expected output artifacts interact with normative requirement drafting.
- Authority source(s): `fixtures/**`, `test/fixture-cases.mjs`, `docs/qualification/H1/H1A_CONFORMANCE_SOURCE_INVENTORY.md`.
- Planned requirement family: `UMG-CONF-CORPUS-###`.
- Known exclusions: Authoring process for new fixtures.
- Unresolved status: Corpus extension criteria remain for later tasks.

## 28. Requirement Identification System
- Purpose: Establish stable, domain-scoped IDs for all future conformance requirements.
- Authority source(s): This document and existing H1 mapping artifacts.
- Planned requirement family: `UMG-CONF-GLOBAL-###` and domain families listed above.
- Known exclusions: No test-specific or filename-tied IDs.
- Unresolved status: Final ID format syntax remains stable pending first full requirement authoring draft.

Proposed namespaces:
- `UMG-CONF-GLOBAL-###`
- `UMG-CONF-INPUT-###`
- `UMG-CONF-STRUCT-###`
- `UMG-CONF-MOLT-###`
- `UMG-CONF-GEOM-###`
- `UMG-CONF-STATE-###`
- `UMG-CONF-GOV-###`
- `UMG-CONF-DIR-###`
- `UMG-CONF-BUNDLE-###`
- `UMG-CONF-MERGE-###`
- `UMG-CONF-RUNTIME-###`
- `UMG-CONF-TRACE-###`
- `UMG-CONF-DIAG-###`
- `UMG-CONF-HASH-###`
- `UMG-CONF-COMPAT-###`
- `UMG-CONF-DET-###`
- `UMG-CONF-OBS-###`
- `UMG-CONF-CORE-###`
- `UMG-CONF-CLI-###`
- `UMG-CONF-FAIL-###`
- `UMG-CONF-CORPUS-###`
- `UMG-CONF-ACCEPT-###`

## 29. Conformance Levels / Disposition
- Purpose: Define how strictness (confirmed, explicit, evidence-only, implementation-only) will be reported per requirement.
- Authority source(s): `docs/qualification/H1/H1B_AUTHORITY_PRECEDENCE_MATRIX.md`.
- Planned requirement family: `UMG-CONF-GLOBAL-###`.
- Known exclusions: Grading implementation-style checks as semantic obligations.
- Unresolved status: Disposition taxonomy to be applied as requirements are authored in subsequent H1 tasks.

## 30. Exclusions and Implementation Freedom
- Purpose: Separate normative behavior from implementation liberty and optimization freedom.
- Authority source(s): `schemas/SCHEMA_README`, `docs/SEMANTIC_FREEZE_v0.1.md`.
- Planned requirement family: `UMG-CONF-GLOBAL-###`.
- Known exclusions: Internal control flow, message formatting, and runtime internals unless explicitly surfaced.
- Unresolved status: None.

## 31. H1 Canonical Corpus Linkage
- Purpose: Map requirement families to canonical artifacts and fixtures for evidence traceability.
- Authority source(s): `docs/qualification/H1/H1A_CONFORMANCE_SOURCE_INVENTORY.md`, test suite set, fixture index.
- Planned requirement family: `UMG-CONF-CORPUS-###`.
- Known exclusions: New corpus creation belongs to later H1/H2 corpus tasks.
- Unresolved status: Link map format to be finalized in H1-C2.

## 32. H1 Acceptance Criteria
- Purpose: Define what evidence is required before H1 completion is claimed.
- Authority source(s): `docs/qualification/H1/H1B_AUTHORITY_PRECEDENCE_MATRIX.md`, `docs/qualification/H1/H1A_CONFORMANCE_SOURCE_INVENTORY.md`.
- Planned requirement family: `UMG-CONF-ACCEPT-###`.
- Known exclusions: H2 acceptance gates and release criteria.
- Unresolved status: Numeric checklist values to be set at completion.

## 33. Future H2 Runner Relationship
- Purpose: Delineate that H1 creates the normative skeleton and H2 will implement executable runner updates.
- Authority source(s): current phased task structure and H1 preparatory reports.
- Planned requirement family: `UMG-CONF-GLOBAL-###`.
- Known exclusions: No direct implementation requirements for H2 runner details in this file.
- Unresolved status: H2 handoff is pending.
