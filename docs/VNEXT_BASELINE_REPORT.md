# VNEXT Baseline Report

Date captured: August 16, 2026
Evidence level: command_verified
Status: baseline_green

## Repository baseline before vNext install

- Baseline branch: `main`
- Baseline HEAD: `38eb2dd0ce392dbc51d8b1081c32f8cef18ac156`
- Working tree before branch cut: clean
- Remote: `origin https://github.com/NeoMagnetar/umg-compiler.git`
- Experimental branch created from baseline: `experiment/compiler-vnext-recursive-geometry`

## Package manager and runtime

- Root package manager: `npm`
- Root lockfile: `package-lock.json`
- Existing package lockfile: `compiler-v0/package-lock.json`
- Node: `v24.14.0`
- npm: `11.9.0`

## Root repository shape

- Root package: [package.json](/C:/.openclaw/workspace/umg-compiler/package.json)
- Root README: [README.md](/C:/.openclaw/workspace/umg-compiler/README.md)
- Protected current compiler package: [compiler-v0/package.json](/C:/.openclaw/workspace/umg-compiler/compiler-v0/package.json)
- Root scripts proxy into `compiler-v0` only:
  - `npm run build` -> `npm --prefix compiler-v0 run build`
  - `npm run snapshot` -> `npm --prefix compiler-v0 run snapshot`
  - `npm run contract` -> `npm --prefix compiler-v0 run contract`
  - `npm test` -> `npm --prefix compiler-v0 run test`
- Root repo does not use npm workspaces.

## compiler-v0 package surface

- Package name: `umg-compiler`
- Version: `0.1.0`
- Module type: `module`
- Source entrypoint: [compiler-v0/src/index.ts](/C:/.openclaw/workspace/umg-compiler/compiler-v0/src/index.ts)
- Main source implementation: [compiler-v0/src/compile.ts](/C:/.openclaw/workspace/umg-compiler/compiler-v0/src/compile.ts)
- Types source: [compiler-v0/src/types.ts](/C:/.openclaw/workspace/umg-compiler/compiler-v0/src/types.ts)
- CLI source: [compiler-v0/src/cli.ts](/C:/.openclaw/workspace/umg-compiler/compiler-v0/src/cli.ts)
- Dist entrypoint exists: `compiler-v0/dist/index.js`
- Dist CLI exists: `compiler-v0/dist/cli.js`
- Published bin: `umg` -> `./dist/cli.js`

## Public API observed

`compiler-v0/src/index.ts` exports:

- `./types.js`
- `./compile.js`
- `./priority.js`
- `./irTypes.js`
- `./diagnostics.js`
- `./schemaValidation.js`
- `./compileIr.js`

Observed compile surface:

- `compileSleeve(sleeve, triggerState): CompileResult`
- `compileIr(input)` exported separately

Observed result boundary from [compiler-v0/src/types.ts](/C:/.openclaw/workspace/umg-compiler/compiler-v0/src/types.ts):

- `CompileResult.runtime?: RuntimeSpec`
- `CompileResult.trace: Trace`
- `CompileResult.hasErrors: boolean`
- `RuntimeSpec.meta.artifactKind: "runtime_spec"`
- `RuntimeSpec.meta.nonExecuting: true`
- `RuntimeSpec.meta.boundaryNote` explicitly states the artifact does not grant permission or perform execution

## Current v0 data model snapshot

Observed authored model:

- `Sleeve`
- `Block`
- `Stack`
- optional `Trigger[]`
- optional `GovernanceBinding[]`

Observed core MOLT set:

- `trigger`
- `directive`
- `instruction`
- `subject`
- `primary`
- `philosophy`
- `blueprint`

Observed v0 runtime surfaces:

- `RuntimeSpec`
- `Trace`
- `RuntimeNeoBlock`
- `RuntimeNeoStack`
- `RuntimePromptSpec`
- `RuntimeIndexes`

## Tests and samples present at baseline

Observed test files:

- `compiler-v0/tests/priority.test.ts`
- `compiler-v0/tests/moltRegistry.test.ts`
- `compiler-v0/tests/offState.test.ts`
- `compiler-v0/tests/mergeAction.test.ts`
- `compiler-v0/tests/governanceTrigger.test.ts`
- `compiler-v0/tests/runtimeSpecTrace.test.ts`

Observed sample files:

- `compiler-v0/samples/alternates_instruction_bundle_example.json`
- `compiler-v0/samples/basic_minimal.json`
- `compiler-v0/samples/blueprint_example.json`
- `compiler-v0/samples/directive_example.json`
- `compiler-v0/samples/governance_example.json`
- `compiler-v0/samples/instruction_example.json`
- `compiler-v0/samples/merge_example.json`
- `compiler-v0/samples/mixed_bundled_unbundled_instruction.json`
- `compiler-v0/samples/neoblocks_example.json`
- `compiler-v0/samples/primary_example.json`
- `compiler-v0/samples/promptspec_example.json`
- `compiler-v0/samples/promptspec_ordering_example.json`
- `compiler-v0/samples/ranked_instruction_bundle_example.json`
- `compiler-v0/samples/subject_example.json`
- `compiler-v0/samples/tags_indexes_example.json`
- `compiler-v0/samples/tags_titles_gov_stacks_example.json`
- `compiler-v0/samples/torture_ordering.json`

## Baseline verification commands

Commands run before vNext integration work:

- `git status --short`
- `git branch --show-current`
- `git rev-parse HEAD`
- `git remote -v`
- `node --version`
- `npm --version`
- `npm test` in `compiler-v0`

Observed result:

- `compiler-v0` test suite passed on August 16, 2026
- no pre-existing working tree modifications were present

## Integration posture for this branch

- `compiler-v0` is protected and must remain unchanged
- root scripts remain pointed at `compiler-v0`
- no consumer bridge, root bin, or default package export is repointed in this branch
- `compiler-vnext` remains a side-by-side experimental package
- `compiler-vnext/package-lock.json` is retained because this repository already tracks npm lockfiles at both root and package level
