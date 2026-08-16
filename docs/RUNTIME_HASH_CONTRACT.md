# compiler-vnext Runtime Hash Contract

This document freezes the B5A runtime-hash profile for `compiler-vnext`.

Exact runtime-hash profile compatibility and compiler association are frozen in
[VERSION_COMPATIBILITY_CONTRACT.md](VERSION_COMPATIBILITY_CONTRACT.md).

`runtimeHash` is a deterministic fingerprint and integrity identifier for the
semantic runtime projection.

It is not:

- a digital signature
- authorization
- proof of authenticity
- an independent security boundary

## Profile

- profile version: `umg.compiler-vnext.runtime-hash.v0.1`
- hash algorithm: `SHA-256`
- encoding: `UTF-8`
- unicode normalization: `none`

## Canonicalization

Objects:

- omit properties whose value is `undefined`
- object insertion order is ignored
- keys are sorted with `left < right ? -1 : left > right ? 1 : 0`
- values are recursively canonicalized

Arrays:

- preserve exact element order
- preserve duplicates
- never sort
- `undefined` entries are invalid

Primitives:

- `null` is preserved
- booleans are preserved
- strings are preserved exactly
- finite JSON numbers are supported
- `-0` canonicalizes as `0`

Unsupported values anywhere in hash input:

- `BigInt`
- `function`
- `symbol`
- `NaN`
- `Infinity`
- `-Infinity`

Strings are hashed from their exact JavaScript string value as UTF-8 bytes.
No Unicode normalization is performed.

## Semantic Projection

The runtime-hash payload is:

- `hashProfileVersion`
- `runtimeSchemaVersion`
- `sleeveId`
- `controllerNeoStackId`
- `activeNeoStackIds`
- `resolvedNeoBlocks`
- `promptParts`
- `resetPlan`

Top-level metadata excluded from the hash:

- `compilerVersion`
- `sleeveName`
- `compiledAt`
- `diagnostics`
- `runtimeHash`

`resolvedNeoBlocks` include:

- `id`
- `state`
- `postRunState`
- `primeDirectiveId`
- `secondaryDirectiveId` when present
- `activeTriggerIds`
- `lanes`

`resolvedNeoBlocks.name` is excluded.

Each lane includes:

- `moltType`
- `geometrySource`
- `bundleId` when present
- `scoped`
- `rows`

Each resolved MOLT contribution includes:

- `id`
- `type`
- `content`
- `sourceMode`
- `sourceId`
- `sourceScope` when present
- `overlayId` when present
- `mergeId` when present

`ResolvedMoltBlock.title` is excluded.

Each `promptPart` includes the semantic MOLT projection plus:

- `neoStackId`
- `neoBlockId`
- `laneOrder`
- `scopeLayer`
- `row`
- `column`

`PromptPart.title` is excluded. Duplicate explicit contributions are retained.

`resetPlan` is part of runtime identity and includes:

- `neoStackIds`
- `neoBlockIds`
- `targetState`

## Invariance And Sensitivity

`runtimeHash` must remain invariant when only these fields change:

- `compilerVersion`
- `compiledAt`
- `sleeveName`
- `ResolvedNeoBlock.name`
- `ResolvedMoltBlock.title`
- `PromptPart.title`
- `diagnostics`
- Trace-only information
- `routeRationale`

`runtimeHash` must change when semantic projection changes, including:

- runtime identity fields
- active NeoStack membership or order
- resolved NeoBlock ids, directives, triggers, and lanes
- lane geometry source or bundle binding
- included MOLT identity, type, content, and provenance
- prompt-part structural coordinates
- `resetPlan`
- hash profile version

Test vectors are frozen in:

- `fixtures/hash/HASH_TEST_VECTORS.json`
