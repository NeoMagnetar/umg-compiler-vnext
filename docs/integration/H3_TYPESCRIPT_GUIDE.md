# TypeScript Guide

## Public types

**Normative:** Use public root-package values and types only.

```ts
import {
  compileSleeve,
  computeRuntimeHash,
  type CompileResult,
  type CompileSelection,
  type CompilerDiagnostic,
  type RuntimeSpec,
  type Sleeve,
  type Trace,
} from 'umg-compiler-vnext';
```

The package emits declarations to `dist/` during `npm run build`; external consumers resolve them through the root package `exports` map.

## NodeNext configuration

The runnable example uses:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true
  }
}
```

Compile and run the example with:

```bash
npm ci
npm run build
node examples/typescript/basic-compile/run.mjs
```

The runner compiles `index.ts` to an isolated temporary directory inside the package boundary, executes it, and removes the generated output. The TypeScript source narrows `CompileResult` before treating `RuntimeSpec` and `Trace` as non-null.

**Non-normative:** Applications may wrap the same narrowing in a local assertion or result adapter, but should retain the exact public compiler objects at system boundaries.
