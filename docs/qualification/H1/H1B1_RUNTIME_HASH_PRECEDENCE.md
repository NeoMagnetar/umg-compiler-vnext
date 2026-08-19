# H1-B1 RuntimeHash Authority / Precedence

Verification checkpoint:
- Branch: `publication/v0.1.0-experimental` (verified)
- HEAD: `764ac06fdbb14c74ee5afe5cd799ec261ea047b0` (verified)

## Artifact evidence used

- `docs/SEMANTIC_FREEZE_v0.1.md`
- `schemas/RUNTIME_HASH_PROFILE.json`
- `schemas/COMPATIBILITY_MATRIX.json`
- `schemas/runtime-spec.schema.json`
- `schemas/umg-compiler-vnext.schema.json`
- `test/runtime-hash-contract.mjs`
- `test/public-output-contract.mjs`
- fixture expected outputs in `fixtures/expected/*.compile-result.json`
- `docs/qualification/H1/H1A_CONFORMANCE_SOURCE_INVENTORY.md`
- `docs/qualification/H1/H1B_AUTHORITY_PRECEDENCE_MATRIX.md`

## RuntimeHash authority conclusions

1) Is existence of `runtimeHash` part of public observable contract?
- Conclusion: **Yes, it is part of RuntimeSpec shape in success outputs.**
- Authority: `schemas/umg-compiler-vnext.schema.json` (required `runtimeHash` in `RuntimeSpec`), `test/public-output-contract.mjs` (validations for successful/malformed runtime objects), expected success fixtures include populated `runtime.runtimeHash`.
- Classification: **EXPLICIT_PUBLIC_CONTRACT**

2) Is the exact hash algorithm normative?
- Conclusion: **SHA-256 is normative by profile binding.**
- Authority: `schemas/RUNTIME_HASH_PROFILE.json` (`hashAlgorithm: "SHA-256"`) and `test/runtime-hash-contract.mjs` asserting that value.
- Classification: **EXPLICIT_PUBLIC_CONTRACT**

3) Is the exact canonical input material normative?
- Conclusion: **Yes, by profile field selection and canonicalization rules.**
- Authority: `schemas/RUNTIME_HASH_PROFILE.json` (`includedTopLevelFields`, `excludedMetadata`, `canonicalization`), runtime hash test vectors asserting canonicalization output shape.
- Classification: **EXPLICIT_PUBLIC_CONTRACT** for listed material constraints; **SUPPORTING_BUT_NOT_EXPLICIT** for the higher-level claim that these constraints are the complete normative hash contract.

4) Is canonical serialization/order normative?
- Conclusion: **Yes, serialization direction and ordering is normative where declared.**
- Authority: `schemas/RUNTIME_HASH_PROFILE.json` (`objectKeyOrderSignificant`, `arrayOrderSignificant`, comparator and undefined-handling settings), tested in `runtime-hash-contract.mjs`.
- Classification: **EXPLICIT_PUBLIC_CONTRACT**

5) Is the hash profile versioned?
- Conclusion: **Yes.**
- Authority: `schemas/RUNTIME_HASH_PROFILE.json` includes `profileVersion`; `schemas/COMPATIBILITY_MATRIX.json` references `runtimeHashProfile` and tests assert equality with `RUNTIME_HASH_PROFILE_VERSION`.
- Classification: **EXPLICIT_PUBLIC_CONTRACT**

6) What changes are allowed to alter a runtimeHash?
- Conclusion (from assertions): operational changes that affect included hash input:
  - `sleeveId`, `controllerNeoStackId`, active/ordered sets used in payload,
  - resolved block IDs/content/order and lane ordering/types,
  - prompt part content, ids, placement linkage fields, and reset plan ids/order,
  - overlay/merge/scoped metadata that is represented in included fields.
- Authority: `test/runtime-hash-contract.mjs` `expectHashChange(...)` cases.
- Classification: **QUALIFICATION_EVIDENCE**

7) What changes must NOT alter runtimeHash?
- Conclusion (from invariance assertions):
  - `compilerVersion`, `compiledAt`, `sleeveName`,
  - prompt or block display names/titles,
  - runtime `diagnostics`.
  - also `route-rationale` with only trace-only differences does not change hash in validated test case.
- Authority: `test/runtime-hash-contract.mjs` `invarianceCases` and route-rationale case.
- Classification: **QUALIFICATION_EVIDENCE**

8) Is cross-platform / cross-process determinism explicitly required?
- Conclusion: **Not explicitly stated as a cross-process guarantee in freeze/schema, but deterministic behavior is functionally asserted via canonicalization tests and hashes.**
- Authority: `schemas/RUNTIME_HASH_PROFILE.json` (UTF-8 + canonicalization constraints), `test/runtime-hash-contract.mjs` (`HASH_TEST_VECTORS` / deterministic `computeRuntimeHash` assertions).
- Classification: **QUALIFICATION_EVIDENCE_ONLY**

9) If profile and executable test disagree, who governs?
- Conclusion: **`schemas/RUNTIME_HASH_PROFILE.json` should remain the normative source of hash-policy; tests are executable conformance against that policy.**
- If a test asserts outside-profile behavior, it is a test/implementation mismatch for review, not automatic normative override.
- Classification: **EXPLICIT_PUBLIC_CONTRACT (for profile governance)**

10) Semantic/public contract vs qualification/implementation split
- `runtimeHash` existence, shape, and profile bindings are **semantic/public contract** where declared in schema/profile/compatibility artifacts.
- Coverage of specific invariance and sensitivity mutations is currently **qualification evidence** only (`runtime-hash-contract.mjs`).
- Hash implementation details in runtime-hash functions are **implementation detail** (not consulted directly for this review step).

## Proposed precedence for Domain 8

- Confirmed conservative ladder:
  - **RUNTIME_HASH_PROFILE (normative policy source)**
  - **runtime-hash-contract.mjs (qualification evidence that implementation conforms)**
- This is supported by the explicit profile binding, profile-version declaration in the compatibility matrix, and executable assertions verifying that implementation behavior follows those bindings.

## Open canonical questions

- The previous freeze explicitly excludes runtimeHash redesign from the historical frozen scope, so this area is best treated as a post-freeze public contract extension with explicit profile governance.
- No direct contradiction between profile JSON and runtime-hash contract tests was observed in this repository snapshot.

H1B1_STATUS: PASS
SOURCE_HEAD: 764ac06fdbb14c74ee5afe5cd799ec261ea047b0
RUNTIME_HASH_PUBLIC_CONTRACT: EXPLICIT_PUBLIC_CONTRACT (via RuntimeSpec schema + profile binding + compatibility profile reference)
HASH_ALGORITHM_AUTHORITY: EXPLICIT_PUBLIC_CONTRACT
HASH_INPUT_AUTHORITY: EXPLICIT_PUBLIC_CONTRACT (profile) + QUALIFICATION_EVIDENCE for current complete mutation matrix
CANONICALIZATION_AUTHORITY: EXPLICIT_PUBLIC_CONTRACT
CROSS_PLATFORM_DETERMINISM: QUALIFICATION_EVIDENCE_ONLY (no explicit cross-platform statement)
PROFILE_VERSIONING: EXPLICIT_PUBLIC_CONTRACT
PROPOSED_PRECEDENCE: RUNTIME_HASH_PROFILE -> runtime-hash-contract.mjs
NEEDS_CANON_DECISION: None
CONFLICTS_FOUND: none observed
FILES_CHANGED: docs/qualification/H1/H1B1_RUNTIME_HASH_PRECEDENCE.md
