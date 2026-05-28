# UMG Compiler 

**UMG Compiler** is the canonical reference compiler for  
**Universal Modular Generation (UMG)**.

It is a deterministic resolver and artifact generator for UMG sleeves and canonical IR.

It compiles a UMG **Sleeve bundle (JSON)** into deterministic compiler artifacts:

- **RuntimeSpec** — a downstream-facing specification artifact, not execution  
- **Trace** — an audit/provenance artifact showing how that specification was derived, not permission  

This repository is intentionally **headless**.  
No UI. No framework bindings. No opinionated runtime.

It is designed to be used as a **library, CLI, or embedded compiler**.

The compiler does **not**:
- execute tools
- mutate runtime state
- publish packages
- act as an agent
- grant permission
- perform hidden reasoning

---

## What Is UMG?

**Universal Modular Generation (UMG)** is a modular cognitive architecture built from composable **Blocks**.

Blocks are:
- Atomic units of meaning
- Explicitly typed by role
- Preserved through composition

Blocks can be composed into:
- **NeoBlocks**
- **NeoStacks**
- **Sleeves**

The compiler is responsible for turning those structures into a single,
coherent, auditable downstream-facing specification artifact.

---

## What This Compiler Does

Given a valid **Sleeve JSON** input, the compiler:

1. Normalizes blocks and roles  
2. Applies governance and eligibility constraints  
3. Resolves authority and precedence  
4. Applies priority and ordering rules at conflict sites  
5. Merges compatible structures where allowed  
6. Emits:
   - RuntimeSpec
   - Trace

The output is deterministic and reproducible at the semantic level.

The compiler does **not**:
- Call LLMs
- Generate text
- Execute prompts
- Perform inference
- Perform tool execution
- Publish packages or mutate external runtimes

It only **structures cognition into compiler artifacts**.

---

## Validation Commands

Current repo validation commands:

    npm run build
    npm run contract
    npm run snapshot
    npm test

---

## Installation (Local / Development)

Clone the repository and build:

    git clone <repo-url>
    cd compiler-v0
    npm install
    npm run build

Enable the CLI locally:

    npm link

Verify installation:

    umg --help

---

## CLI Usage

Compile a Sleeve JSON:

    umg compile --in samples/sleeve.json

Write output to a file:

    umg compile --in samples/sleeve.json --out out/runtime.json

Pretty-print output:

    umg compile --in samples/sleeve.json --pretty

Read from stdin:

    cat samples/sleeve.json | umg compile

---

## Programmatic Usage

    import { compileSleeve } from "umg-compiler-v0";

    const result = compileSleeve(sleeveInput, triggerState);

    console.log(result.runtime);
    console.log(result.trace);

Note:
- current sleeve-path compatibility output uses `result.runtime`
- canonical IR path uses `result.runtimeSpec`
- both surfaces should be treated as non-executing compiler artifacts

---

## Design Principles

- Deterministic output
- Explicit ordering and precedence
- Full traceability
- No hidden inference
- No runtime side effects
- Stable core semantics
- RuntimeSpec as non-executing specification artifact
- Trace as audit/provenance artifact

Future extensions layer on top **without breaking meaning**.

---

## Attribution

**Universal Modular Generation (UMG)**  
Invented by **Christopher L. Haynes**

---

## License

This project is licensed under the **Apache License, Version 2.0**.  
See the LICENSE file for details.

---

## Warranty Disclaimer

This software is provided **“AS IS”**, without warranty of any kind,
express or implied.  
Use at your own risk.
