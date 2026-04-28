#!/usr/bin/env node
/**
 * UMG Compiler v0 — CLI
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { compileSleeve } from "./compile.js";
import { compileIr } from "./compileIr.js";
import { finalizeDiagnostics, makeDiagnostics, pushError } from "./diagnostics.js";

type ArgMap = Record<string, string | boolean>;

function parseArgs(argv: string[]): { cmd: string; args: ArgMap } {
  const out: ArgMap = {};
  const rest = argv.slice(2);
  const cmd = rest[0] && !rest[0].startsWith("-") ? String(rest.shift()) : "help";

  for (let i = 0; i < rest.length; i++) {
    const tok = rest[i]!;
    if (tok.startsWith("--")) {
      const key = tok.slice(2);
      const next = rest[i + 1];
      if (!next || next.startsWith("-")) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    } else if (tok.startsWith("-")) {
      const key = tok.slice(1);
      const next = rest[i + 1];
      if (!next || next.startsWith("-")) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    }
  }

  return { cmd, args: out };
}

function usage(exitCode = 0) {
  const msg = `
UMG Compiler v0 — CLI

Commands:
  compile         Compile a sleeve bundle JSON into RuntimeSpec + Trace
  compile-ir      Compile canonical IR JSON into runtime-spec.json + trace.json + diagnostics.json

Examples:
  umg compile --in samples/sleeve.json
  umg compile --in samples/sleeve.json --out out/runtime.json
  cat samples/sleeve.json | umg compile
  umg compile-ir --in resolved.ir.json --out-dir out

Options:
  --in,  -i        Input JSON file
  --out, -o        Output file (compile only)
  --out-dir        Output directory (compile-ir only)
  --pretty         Pretty-print JSON (2 spaces)
  --help, -h       Show help

Exit codes:
  0 success
  1 error
`.trim();
  console.log(msg);
  process.exit(exitCode);
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

function resolvePath(p: string): string {
  return path.resolve(process.cwd(), p);
}

function readFile(p: string): string {
  return fs.readFileSync(resolvePath(p), "utf8");
}

function writeFile(p: string, content: string) {
  const abs = resolvePath(p);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, "utf8");
}

function writeJsonFile(p: string, value: unknown, pretty = true) {
  writeFile(p, `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`);
}

function parseJson(raw: string): any {
  const normalized = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  return JSON.parse(normalized);
}

async function runCompile(args: ArgMap) {
  const inPath = (args.in ?? args.i) as string | undefined;
  const outPath = (args.out ?? args.o) as string | undefined;
  const pretty = Boolean(args.pretty);

  const raw = inPath ? readFile(inPath) : await readStdin();
  if (!raw || !raw.trim()) {
    console.error("No input provided. Use --in <file> or pipe JSON via stdin.");
    process.exit(1);
  }

  let input: any;
  try {
    input = parseJson(raw);
  } catch (e: any) {
    console.error("Input is not valid JSON.");
    console.error(e?.message ?? e);
    process.exit(1);
  }

  let result: any;
  try {
    if (input && typeof input === "object" && ("sleeve" in input || "triggerState" in input)) {
      const sleeve = (input as any).sleeve ?? input;
      const triggerState = (input as any).triggerState ?? {};
      result = compileSleeve(sleeve as any, triggerState as any);
    } else {
      result = compileSleeve(input as any, {} as any);
    }
  } catch (e: any) {
    console.error("Compile failed.");
    console.error(e?.stack ?? e?.message ?? e);
    process.exit(1);
  }

  const outJson = pretty ? JSON.stringify(result, null, 2) : JSON.stringify(result);

  if (outPath) {
    writeFile(outPath, outJson + "\n");
    console.log(`Wrote ${outPath}`);
  } else {
    process.stdout.write(outJson + "\n");
  }
}

async function runCompileIr(args: ArgMap) {
  const inPath = (args.in ?? args.i) as string | undefined;
  const outDir = args["out-dir"] as string | undefined;

  if (!inPath) {
    console.error("compile-ir requires --in <path>");
    process.exit(1);
  }
  if (!outDir) {
    console.error("compile-ir requires --out-dir <path>");
    process.exit(1);
  }

  const diagnostics = makeDiagnostics();
  const inputAbs = resolvePath(inPath);
  const outDirAbs = resolvePath(outDir);

  if (!fs.existsSync(inputAbs)) {
    pushError(diagnostics, "INPUT_FILE_MISSING", `Input file does not exist: ${inputAbs}`, "$input");
    console.error(JSON.stringify(finalizeDiagnostics(diagnostics), null, 2));
    process.exit(1);
  }

  let raw = "";
  try {
    raw = fs.readFileSync(inputAbs, "utf8");
  } catch (e: any) {
    pushError(diagnostics, "INPUT_FILE_READ_FAILED", `Failed to read input file: ${inputAbs}`, "$input", e?.message ?? e);
    console.error(JSON.stringify(finalizeDiagnostics(diagnostics), null, 2));
    process.exit(1);
  }

  let input: any;
  try {
    input = parseJson(raw);
  } catch (e: any) {
    pushError(diagnostics, "INPUT_JSON_INVALID", "Input is not valid JSON.", "$", e?.message ?? e);
    console.error(JSON.stringify(finalizeDiagnostics(diagnostics), null, 2));
    process.exit(1);
  }

  let result;
  try {
    result = compileIr(input);
  } catch (e: any) {
    pushError(diagnostics, "COMPILE_IR_FAILED", "compile-ir failed.", "$", e?.stack ?? e?.message ?? e);
    const finalDiagnostics = finalizeDiagnostics(diagnostics);
    fs.mkdirSync(outDirAbs, { recursive: true });
    fs.writeFileSync(path.join(outDirAbs, "diagnostics.json"), `${JSON.stringify(finalDiagnostics, null, 2)}\n`, "utf8");
    console.error(JSON.stringify(finalDiagnostics, null, 2));
    process.exit(1);
  }

  fs.mkdirSync(outDirAbs, { recursive: true });
  writeJsonFile(path.join(outDirAbs, "runtime-spec.json"), result.runtimeSpec);
  writeJsonFile(path.join(outDirAbs, "trace.json"), result.trace);
  writeJsonFile(path.join(outDirAbs, "diagnostics.json"), result.diagnostics);

  if (!result.diagnostics.ok) {
    console.error(JSON.stringify(result.diagnostics, null, 2));
    process.exit(1);
  }

  console.log(`Wrote ${path.join(outDirAbs, "runtime-spec.json")}`);
  console.log(`Wrote ${path.join(outDirAbs, "trace.json")}`);
  console.log(`Wrote ${path.join(outDirAbs, "diagnostics.json")}`);
}

async function main() {
  const { cmd, args } = parseArgs(process.argv);

  if (cmd === "help" || args.help || args.h) usage(0);
  if (cmd === "compile") {
    await runCompile(args);
    return;
  }
  if (cmd === "compile-ir") {
    await runCompileIr(args);
    return;
  }

  usage(1);
}

main().catch((e) => {
  console.error(e?.stack ?? e);
  process.exit(1);
});
