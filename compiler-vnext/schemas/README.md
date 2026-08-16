# UMG compiler-vnext JSON Schemas

These schemas describe the **experimental vNext reference implementation** in `code/compiler-vnext/src/types.ts`.

## Boundary

JSON Schema validates document shape. It intentionally does **not** replace compiler semantic validation. The TypeScript validator remains authoritative for relationships that JSON Schema cannot safely express without duplicating compiler logic, including:

- globally unique IDs;
- local reference integrity;
- Prime Directive placement;
- required local MOLT presence inside Base Geometry;
- same-MOLT Bundle membership;
- Secondary Directive → Trigger/Directive/Bundle reference correctness;
- one Trigger binding to one Secondary Directive in this experiment;
- Merge authority conservation and Trigger exclusion;
- scoped MOLT type restrictions and referenced NeoStack existence;
- NeoStack parent uniqueness and cycle detection;
- Controller-tree reachability;
- READY/ACTIVE/OFF/DISABLED runtime resolution.

## Entry schemas

- `sleeve.schema.json`
- `compile-selection.schema.json`
- `runtime-spec.schema.json`
- `trace.schema.json`
- `compile-result.schema.json`

`umg-compiler-vnext.schema.json` contains all shared `$defs`.

`SCHEMA_REGISTRY.json` maps document kinds to versions, schemas, and examples.
