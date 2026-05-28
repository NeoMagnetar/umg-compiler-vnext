# UMG Compiler 

**UMG Compiler** is the canonical reference compiler for  
**Universal Modular Generation (UMG)**.

It compiles a UMG **Sleeve bundle (JSON)** into a deterministic:

- **RuntimeSpec** — the final, ordered cognitive structure  
- **Trace** — a full explanation of how that structure was derived  

This repository is intentionally **headless**.  
No UI. No framework bindings. No opinionated runtime.

It is designed to be used as a **library, CLI, or embedded compiler**.

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
2. Resolves authority and precedence  
3. Applies priority and ordering rules  
4. Merges compatible structures  
5. Emits:
   - RuntimeSpec
   - Trace

The output is deterministic and reproducible.

The compiler does **not**:
- Call LLMs
- Generate text
- Execute prompts
- Perform inference

It only **structures cognition**.

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

    console.log(result.runtimeSpec);
    console.log(result.trace);

---

## Design Principles

- Deterministic output
- Explicit ordering and precedence
- Full traceability
- No hidden inference
- No runtime side effects
- Stable core semantics

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