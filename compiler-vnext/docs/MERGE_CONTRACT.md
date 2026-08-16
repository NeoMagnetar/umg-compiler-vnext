# Merge Contract

`compiler-vnext` Merge is a local authored provenance declaration.

## Definition

MergeDeclaration freezes three fields:

- `id`
- `sourceBlockIds[]`
- `resultBlockId`

Each Merge:

- belongs to one NeoBlock
- requires at least two sources
- requires unique source IDs
- requires local source MOLT Blocks
- requires one pre-authored local result MOLT Block
- does not synthesize result content inside the compiler

## Identity

The result is explicit authored content, not compiler-generated prose.

- `resultBlockId` must not equal any `sourceBlockId`
- one `resultBlockId` may be declared by only one Merge within a NeoBlock
- sources may be reused by multiple Merge declarations as long as each result remains distinct

## Authority

Merge conserves authority. It does not create authority.

- Trigger cannot be a Merge source
- Trigger cannot be a Merge result
- same-ceiling results are allowed
- downward results are allowed
- upward escalation is rejected with `MERGE_AUTHORITY_ESCALATION`

Examples:

- `directive + philosophy -> directive` is valid
- `instruction + philosophy -> instruction` is valid
- `directive + blueprint -> instruction` is valid
- `instruction + philosophy -> directive` is invalid

## Placement

Merge does not place itself into effective cognition.

Every Merge result must be explicitly placed through at least one authored local structure:

- `primeDirectiveId`
- `secondaryDirectives[].directiveBlockId`
- a Base Geometry row
- a Bundle row

If the result is declared only inside `merges[]` and nowhere else in those authored structures, validation fails with `MERGE_RESULT_NOT_PLACED`.

Placed-but-inactive Merge results are valid and dormant. A Bundle-only Merge result is valid even when the Bundle is inactive for the current compile.

## Provenance

When a placed Merge result becomes active:

- the resolved MOLT block uses `sourceMode = "merge"`
- `mergeId` is preserved on the resolved block
- `MERGE_VALIDATED` is emitted in Trace

Trace keeps local Merge provenance auditable with:

- `mergeId`
- `neoBlockId`
- `sources[]`
- `result`
- `authorityCeiling`
- `authorityCheck`

## Locality

Merge remains local to the owning NeoBlock in this compiler version.

- sources must be local
- results must be local
- Merge results cannot be attached through `sleeve.scopedMolt`
- Merge results cannot be attached through Overlay attachments

Those scoped/overlay uses are rejected with `MERGE_RESULT_SCOPED_UNSUPPORTED`.

## Composition Boundaries

Merge sources need not independently activate in the current RuntimeSpec. They only need to:

- exist
- remain local
- satisfy type validation
- satisfy authority rules

Scoped MOLT and Overlay contributions may coexist with active Merge results, but they remain separate provenance systems:

- scoped content is not added to `sourceBlockIds`
- overlay content is not added to `sourceBlockIds`
- scoped or overlay content does not alter Merge authority ceiling
- scoped or overlay content does not alter the Merge result

## Unsupported Dependencies

Merge-of-Merge is deferred by design in `compiler-vnext`.

- acyclic Merge chaining is rejected with `MERGE_CHAIN_UNSUPPORTED`
- cyclic Merge dependencies are rejected with `MERGE_CYCLE`
- cycle detection is explicit and fail-closed

## Ownership Boundary

Merge does not override B1 executable-state rules.

- OFF ownership still blocks compilation
- DISABLED ownership still blocks compilation
- Merge cannot restore OFF cognition
- Merge cannot restore DISABLED cognition

## Explicit Non-Goals

Merge is not Bundle.
Merge is not Overlay.
Merge is not Governance.
Merge does not place itself.
Merge does not create authority.
