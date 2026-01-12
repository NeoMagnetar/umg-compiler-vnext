# UMG Compiler v0 Certification

This document certifies the stability, correctness, and determinism of the UMG v0 compiler.

---

## Canonical Entry Point

**File:** `compiler-v0/src/compile.ts`  
**Function:** `compileSleeve(sleeve: Sleeve, triggerState: TriggerState): CompileResult`

No other compile paths exist. The public API is exported via `compiler-v0/src/index.ts`.

---

## 20-Step Pipeline

| Step | Function | File | Purpose |
|------|----------|------|---------|
| 1 | inline | compile.ts:102-105 | Schema validation (sleeve.id, blocks[], stacks[]) |
| 2 | inline | compile.ts:108-131 | Block dedup + moltType + role validation |
| 3 | inline | compile.ts:138-155 | Stack references validation |
| 4 | `normalizeSegments()` | normalizeSegments.ts | Validate bundle/merge segment definitions |
| 5 | `applyMerges()` | applyMerges.ts | Substitute merge sources with resultBlock |
| 6 | `applyBundles()` | applyBundles.ts | Record bundles for runtime (no substitution) |
| 7 | `applyGovernance()` | applyGovernance.ts | Apply forbid/require/prefer/limit rules |
| 8 | inline | compile.ts:236-247 | Filter live blocks (forbidden + role=off) |
| 9 | `resolveAuthority()` | resolveAuthority.ts | Sort by MOLT → priority → id per stack |
| 10 | `selectPrimary()` | selectPrimary.ts | Choose 1 primary per stack |
| 11 | `selectDirective()` | selectDirective.ts | Choose 1 if alternates; else all |
| 12 | `selectInstruction()` | selectInstruction.ts | Choose 1 if alternates; else all |
| 13 | `selectSubject()` | selectSubject.ts | Choose 1 if alternates; else all |
| 14 | `selectBlueprint()` | selectBlueprint.ts | Choose 1 if alternates; else all |
| 15 | inline | compile.ts:380-395 | Philosophy warnings (no selection, keep all) |
| 16 | `buildNeoBlocks()` | buildNeoBlocks.ts | Construct NeoBlocks with active selections |
| 17 | `buildNeoStacks()` | buildNeoStacks.ts | Group NeoBlocks by domainKey |
| 18 | `buildPromptSpec()` | buildPromptSpec.ts | Generate prompt sections |
| 19 | `buildTagIndexes()` | buildTagIndexes.ts | Build tag lookups |
| 20 | inline | compile.ts:502-522 | Assemble RuntimeSpec + emit trace |

---

## 5 Collision Surfaces

| File | Collision Condition | Single Winner? | Priority Used? | Trace Written? |
|------|---------------------|----------------|----------------|----------------|
| `selectPrimary.ts` | Stack has >1 primary blocks bundled as alternates | YES | YES | YES |
| `selectDirective.ts` | Bundle with `intent=alternates` | YES (alternates only) | YES | YES |
| `selectInstruction.ts` | Bundle with `intent=alternates` | YES (alternates only) | YES | YES |
| `selectSubject.ts` | Bundle with `intent=alternates` | YES (alternates only) | YES | YES |
| `selectBlueprint.ts` | Bundle with `intent=alternates` | YES (alternates only) | YES | YES |

---

## Merge Semantics

- **Result block must be authored** — merge does not create new blocks
- **Source blocks are substituted** — removed from blockIds, replaced with resultBlockId
- **MOLT type is declared** — not inferred from sources

---

## Determinism

**Statement:** If the same Sleeve JSON is compiled twice, the RuntimeSpec is byte-for-byte identical — **except for timestamps**.

**Justification:**
- Stable block sorting via `sortByPriorityGroupAndOrder()` → group rank → priority order → id alphabetical
- Stable stack ordering via `stackId.localeCompare()`
- Deterministic priority resolution with ID fallback tie-breaker
- Sequential trace event ordering via counter

**Non-deterministic element:** `meta.compiledAt` timestamp (normalized in test harnesses).

---

## Priority Resolution

**Priority does NOT affect MOLT order.**

- MOLT hierarchy (trigger → directive → instruction → subject → primary → philosophy → blueprint) is always respected
- Priority is used ONLY as a tie-breaker within the same moltType at collision points
- `resolveAuthority()` groups blocks by moltType first, then sorts within each lane

### Priority Hierarchy

1. **PriorityGroup** (categorical tier): Override > Explicit > Default > Fallback
2. **priorityOrder** (tie-breaker): lower number = higher priority (1 = highest)
3. **ID** (final fallback): alphabetical order

### Default Behavior

- Missing `priorityGroup` → treated as `"Default"`
- Missing `priorityOrder` → ambiguous if multiple blocks in same group (fails with `ERR_PRIORITY_AMBIGUOUS`)

---

## Validation Commands

```bash
# Run all v0 validation checks
npm run compiler:check

# Individual commands
cd compiler-v0 && npm test        # Run priority tests
cd compiler-v0 && npm run snapshot  # Generate snapshots
cd compiler-v0 && npm run contract  # Run contract checks
```

---

## Failure Conditions

| Condition | Error Code | File |
|-----------|------------|------|
| Missing sleeve.id/blocks[]/stacks[] | `ERR_INVALID_SLEEVE_SCHEMA` | compile.ts |
| Block missing id | `ERR_INVALID_BLOCK` | compile.ts |
| Duplicate block id | `ERR_DUPLICATE_BLOCK_ID` | compile.ts |
| Unknown moltType | `ERR_UNKNOWN_MOLT_TYPE` | compile.ts |
| Unknown role | `ERR_UNKNOWN_ROLE` | compile.ts |
| Stack references missing block | `ERR_INVALID_STACK_REF` | compile.ts |
| Required block forbidden | `ERR_GOVERNANCE_FORBIDDEN_BLOCK` | compile.ts |
| No primary in stack | `ERR_NO_PRIMARY_DEFINED` | selectPrimary.ts |
| Ambiguous priority | `ERR_PRIORITY_AMBIGUOUS` | priority.ts |

All failures produce trace events and are deterministic.

---

**Certified:** v0 compiler is stable, deterministic, and aligned with documented resolution flow.
