# H1-C11 RuntimeHash + Determinism Requirements

This document adds normative requirements for `UMG-CONF-HASH-###` and
`UMG-CONF-DET-###` in the vNext H1 family.

## RUNTIMEHASH PUBLIC CONTRACT REQUIREMENTS

1. UMG-CONF-HASH-001
Normative Statement: A successful `CompileResult` MUST include a non-null `runtime` with a required `runtimeHash` field.
Authority: `schemas/umg-compiler-vnext.schema.json` (`RuntimeSpec.runtimeHash` required), `docs/RUNTIME_HASH_CONTRACT.md`, `docs/qualification/H1/H1C8_RUNTIME_PUBLIC_OUTPUT_REQUIREMENTS.md`.
Observable Conformance Evidence: success result contains `status: "success"` and runtime object; H1-C8 success model requires `runtime` present.
Notes/Exclusions: failure envelopes remain governed by H1-C8 and must not expose executable runtime on failure.

2. UMG-CONF-HASH-002
Normative Statement: Hashing MUST use hash profile `umg.compiler-vnext.runtime-hash.v0.1` and hash algorithm `SHA-256`.
Authority: `docs/RUNTIME_HASH_CONTRACT.md`; `schemas/RUNTIME_HASH_PROFILE.json`; `test/runtime-hash-contract.mjs` validates profile constants.
Observable Conformance Evidence: runtime-hash tests read and assert the profile fields.
Notes/Exclusions: hash profile name is authoritative input to the payload, not a replacement for the compiler semantic version.

3. UMG-CONF-HASH-003
Normative Statement: The canonical hash payload MUST consist of `hashProfileVersion`, `runtimeSchemaVersion`, `sleeveId`, `controllerNeoStackId`, `activeNeoStackIds`, `resolvedNeoBlocks`, `promptParts`, and `resetPlan`.
Authority: `docs/RUNTIME_HASH_CONTRACT.md` semantic projection list; `schemas/RUNTIME_HASH_PROFILE.json` `includedTopLevelFields`.
Observable Conformance Evidence: payload returned by `buildRuntimeHashPayload` in `src/runtime-hash.ts` follows these fields; canonicalization and hash tests consume this shape.
Notes/Exclusions: nested schema and prompt projection details below are part of the same projection.

4. UMG-CONF-HASH-004
Normative Statement: The following inputs MUST NOT affect the hash: `compilerVersion`, `sleeveName`, `compiledAt`, `diagnostics`, and `runtimeHash`.
Authority: `schemas/RUNTIME_HASH_PROFILE.json` `excludedMetadata`; `docs/RUNTIME_HASH_CONTRACT.md` Top-level metadata exclusion and invariance section.
Observable Conformance Evidence: mutation cases in `test/runtime-hash-contract.mjs` keep hash invariant when these fields are changed.
Notes/Exclusions: excluded metadata may still be used by other contracts (e.g., public output and trace).

5. UMG-CONF-HASH-005
Normative Statement: `resolvedNeoBlocks`, their lanes, and prompt parts contribute to the hash only through frozen semantic identity fields and provenance, excluding presentation fields (`name`, `ResolvedMoltBlock.title`, `PromptPart.title`).
Authority: `docs/RUNTIME_HASH_CONTRACT.md` semantic projection and exclusion lists.
Observable Conformance Evidence: contract tests mutate semantic identities and expect hash changes, while title/name mutations are invariant.
Notes/Exclusions: lane/order/provenance includes `sourceMode`, `sourceId`, optional `sourceScope`, optional `overlayId`, optional `mergeId`; lane includes `moltType`, `geometrySource`, optional `bundleId`, `scoped`, `rows`.

6. UMG-CONF-HASH-006
Normative Statement: `resetPlan` MUST be included in the hash payload with fields `neoStackIds`, `neoBlockIds`, and `targetState`.
Authority: `docs/RUNTIME_HASH_CONTRACT.md`; `schemas/RUNTIME_HASH_PROFILE.json`.
Observable Conformance Evidence: reset-plan mutations are asserted to change hash in `test/runtime-hash-contract.mjs`.
Notes/Exclusions: no alternate reset-plan projection is defined for hash purposes.

7. UMG-CONF-HASH-007
Normative Statement: Hash input canonicalization MUST omit undefined values, recursively canonicalize objects, sort object keys lexicographically with comparator `left < right ? -1 : left > right ? 1 : 0`, preserve array order and duplicates, reject undefined entries in arrays, serialize `-0` as `0`, and reject unsupported types (`BigInt`, `function`, `symbol`, `NaN`, `Infinity`, `-Infinity`).
Authority: `docs/RUNTIME_HASH_CONTRACT.md`; `schemas/RUNTIME_HASH_PROFILE.json` (`canonicalization`); `test/runtime-hash-contract.mjs` canonicalization vectors.
Observable Conformance Evidence: canonicalization tests for supported/unsupported values and deterministic expected canonical JSON.
Notes/Exclusions: implementation details of hashing stack are not normative.

8. UMG-CONF-HASH-008
Normative Statement: Hash serialization is UTF-8 with no Unicode normalization; object key order is non-significant and array order is significant for hash input.
Authority: `docs/RUNTIME_HASH_CONTRACT.md`; `schemas/RUNTIME_HASH_PROFILE.json`.
Observable Conformance Evidence: contract fixture vectors and unsupported/defined-order hash checks.
Notes/Exclusions: this is stable contract behavior, not specific language/runtime output formatting policy.

9. UMG-CONF-HASH-009
Normative Statement: On success path, if computed runtime hash differs from emitted `runtimeHash` or cannot be computed, compilation must fail with output-contract violation and may not return a successful result.
Authority: `src/compile.ts` `finalizeCompileResult` checks; `docs/SEMANTIC_FREEZE_v0.1.md` + `docs/qualification/H1/H1C8_RUNTIME_PUBLIC_OUTPUT_REQUIREMENTS.md` fail-closed output obligations.
Observable Conformance Evidence: recomputation in compile path and mismatch/error-to-`internalOutputContractViolation` path; success/failure envelope rules in H1-C8.
Notes/Exclusions: hash mismatch is a structured diagnostic condition, not an implementation exception.

10. UMG-CONF-HASH-010
Normative Statement: Hash profile identity, hash algorithm, and projection must be stable across a version of profile that is itself version-identified by `hashProfileVersion`; hash generation is profile-bound.
Authority: `schemas/RUNTIME_HASH_PROFILE.json` and `docs/RUNTIME_HASH_CONTRACT.md`.
Observable Conformance Evidence: `hashProfileVersion` mutation changes the hash; test verifies profile constant equality.
Notes/Exclusions: profile migration policy belongs to version compatibility, which is deferred.

## DETERMINISM REQUIREMENTS

11. UMG-CONF-DET-001
Normative Statement: Deterministic canonicalization behavior in the hash profile is normative; repeated canonicalization of the same value under the frozen rules MUST produce the same canonical string.
Authority: `docs/RUNTIME_HASH_CONTRACT.md`; `schemas/RUNTIME_HASH_PROFILE.json`; `test/runtime-hash-contract.mjs` vectors.
Observable Conformance Evidence: vectorized canonical JSON assertions in the runtime hash contract test.
Notes/Exclusions: this governs hash serialization determinism, not entire compiler scheduling.

12. UMG-CONF-DET-002
Normative Statement: Same canonical payload and stable profile identity SHALL produce identical `runtimeHash` values (same input payload â†’ same hex output).
Authority: canonicalization and algorithm rules above.
Observable Conformance Evidence: deterministic replay assertions in `test/deterministic-fuzz-contract.mjs` and `test/property-metamorphic-contract.mjs`.
Notes/Exclusions: this is payload-hash determinism, not a universal byte-for-byte compiler output guarantee.

13. UMG-CONF-DET-003
Normative Statement: Hash sensitivity and invariance categories are frozen only where specified: changing runtime identity, active IDs/order, resolved semantic fields, lane geometry/source/bundle/provenance, prompt-part coordinates, `resetPlan`, or `hashProfileVersion` MUST change the hash; changing excluded metadata MUST NOT.
Authority: `docs/RUNTIME_HASH_CONTRACT.md` and `test/runtime-hash-contract.mjs`.
Observable Conformance Evidence: explicit invariance and `expectHashChange` coverage.
Notes/Exclusions: finite test mutation sets are not generalized beyond categories already stated in the contract.

14. UMG-CONF-DET-004
Normative Statement: `same canonical sleeve + same selection + same compiler/profile version` must preserve hash result in current test authority; broader byte-identical CompileResult guarantees are not frozen beyond existing output contracts.
Authority: `test/deterministic-fuzz-contract.mjs` replay and `test/property-metamorphic-contract.mjs` exact replay; H1-C8 output envelope.
Observable Conformance Evidence: replay checks compare `CompileResult` and hash equality for repeated compilation of identical fixture inputs.
Notes/Exclusions: no new global canonical-output identity law is added for all mutable fields not in runtime-hash projection.

15. UMG-CONF-DET-005
Normative Statement: Provenance and platform/runtime implementation details are not required: a conforming implementation may compute the frozen profile in any language, including non-Node environments.
Authority: prior H1 normative scope for interface neutrality and this taskâ€™s explicit requirement.
Observable Conformance Evidence: no Node-only constraint is stated in hash contract for normative outcomes.
Notes/Exclusions: JavaScript helper function and `node:crypto` mechanics are non-normative implementation details.

16. UMG-CONF-DET-006
Normative Statement: For identical canonical RuntimeHash payloads using the same runtime hash profile version and hash algorithm, separate processes in conforming implementations MUST produce the same `runtimeHash`.
Authority: `docs/RUNTIME_HASH_CONTRACT.md`, `schemas/RUNTIME_HASH_PROFILE.json`, `docs/qualification/H1/H1C11_RUNTIME_HASH_DETERMINISM_REQUIREMENTS.md` (H1-D1), and `docs/qualification/H1/H1B1_RUNTIME_HASH_PRECEDENCE.md`.
Observable Conformance Evidence: Existing hash determinism obligations already require that same payload + same profile + same algorithm produce identical runtimeHash in same-process execution (`test/runtime-hash-contract.mjs`, `test/deterministic-fuzz-contract.mjs`, `test/property-metamorphic-contract.mjs`); H1-D1 ratifies that same obligation as a cross-process RuntimeHash portability boundary.
Notes/Exclusions: This requirement is RUNTIMEHASH CROSS-PROCESS PORTABILITY only. It does not establish GENERAL COMPILER CROSS-PROCESS DETERMINISM (no byte-identical `CompileResult`, no deterministic `compiledAt`, no identical scheduling/CLI behavior, no full cross-platform compiler-output identity).
17. UMG-CONF-DET-007
Normative Statement: Deterministic fuzz/moreomorphic replay evidence applies as qualification evidence for deterministic behavior; it is not itself the semantic contract for cross-process or transport-level determinism.
Authority: `test/deterministic-fuzz-contract.mjs`, `test/property-metamorphic-contract.mjs`.
Observable Conformance Evidence: test suite names and assertions on exact replay under the same process fixtures.
Notes/Exclusions: test iteration counts, seeds, and harness mechanics are not normative.

18. UMG-CONF-DET-008
Normative Statement: `runtimeHash` is part of hash payload integrity; it is not used to alter semantic selection, cognition, governance, or runtime shape beyond integrity verification and validation failure handling.
Authority: `src/compile.ts` validation path; `docs/RUNTIME_HASH_CONTRACT.md`.
Observable Conformance Evidence: mismatch paths remain output-contract violations only; compilation does not branch behavior on hash except verification.
Notes/Exclusions: governance, merge, overlay, and prompt execution semantics remain governed by their own C-family documents.

## Requirement Summary

- HASH count: 10
- DET count: 8
- total: 18

## HASH PROFILE MODEL

- Profile identity: `umg.compiler-vnext.runtime-hash.v0.1`
- Algorithm: `SHA-256`
- Canonical payload: `hashProfileVersion`, `runtimeSchemaVersion`, `sleeveId`, `controllerNeoStackId`, `activeNeoStackIds`, `resolvedNeoBlocks`, `promptParts`, `resetPlan` with frozen semantic subtree fields.
- Serialization: UTF-8 JSON canonicalization, `unicodeNormalization: none`, lexical object key order, array order significant, undefined omission, unsupported-type rejection.
- Excluded material: `compilerVersion`, `sleeveName`, `compiledAt`, `diagnostics`, `runtimeHash`, and trace-only fields (including `routeRationale`) plus presentation fields not in payload (`name`, `title` variants).

## HASH SENSITIVITY MODEL

- Must affect hash: `hashProfileVersion`, `runtimeSchemaVersion`, `sleeveId`, `controllerNeoStackId`, `activeNeoStackIds` (including order), resolved block identity and directives/triggers/lanes, lane geometry/provenance, resolved MOLT identity/type/content/provenance, prompt part coordinates/id mappings, and `resetPlan`.
- Must not affect hash: `compilerVersion`, `compiledAt`, `sleeveName`, `diagnostics`, `runtimeHash`, `ResolvedNeoBlock.name`, `ResolvedMoltBlock.title`, `PromptPart.title`, and known trace-only metadata.
- Not universally specified: cross-process scheduling order, process/thread timing, file-system path order, Node runtime behavior, and unspecified internal cache or harness effects.

## DETERMINISM CLASSIFICATION

- SHA-256 identical canonical bytes: EXPLICIT_PUBLIC_CONTRACT
- Canonicalization determinism: EXPLICIT_PUBLIC_CONTRACT
- Cross-process RuntimeHash reproducibility: EXPLICIT_PUBLIC_CONTRACT
- General compile determinism: QUALIFICATION_EVIDENCE_ONLY
- Cross-platform full compiler reproducibility: QUALIFICATION_EVIDENCE_ONLY

## AUTHORITY MODEL

- Normative: `docs/RUNTIME_HASH_CONTRACT.md`, `schemas/RUNTIME_HASH_PROFILE.json`, `schemas/umg-compiler-vnext.schema.json` (for successful runtime field presence), `docs/qualification/H1/H1C8_RUNTIME_PUBLIC_OUTPUT_REQUIREMENTS.md` references.
- Qualification evidence: `test/runtime-hash-contract.mjs`, `test/deterministic-fuzz-contract.mjs`, `test/property-metamorphic-contract.mjs`, `test/public-output-contract.mjs`.
- Implementation detail: `src/runtime-hash.ts`, `src/canonicalize.ts`, `src/compile.ts`, seed/harness internals, and `node:crypto` usage.

- H1-D1 (Ratified Canon Decision): Same canonical RuntimeHash payload under the same profile version and hash algorithm MUST produce identical runtimeHash across separate processes; this applies only to RuntimeHash portability and does not extend to full compiler cross-process determinism.

## DEFERRED_ITEMS

- broader multi-platform corpus qualification
- H2 executable cross-implementation conformance runner
- version compatibility requirements
- CLI transport

