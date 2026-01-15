#!/usr/bin/env node
/**
 * UMG Compiler v0 — CLI
 *
 * Usage:
 *   umg compile --in sleeve.json --out runtime.json
 *   umg compile --in sleeve.json
 *   cat sleeve.json | umg compile
 *
 * Notes:
 * - Keeps CLI “dumb”: it just reads JSON and calls compileSleeve().
 * - Works with ESM + NodeNext (your tsconfig).
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { compileSleeve } from "./compile.js";

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

Examples:
  umg compile --in samples/sleeve.json
  umg compile --in samples/sleeve.json --out out/runtime.json
  cat samples/sleeve.json | umg compile

Options:
  --in,  -i        Input JSON file (if omitted, reads stdin)
  --out, -o        Output file (if omitted, prints to stdout)
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

function readFile(p: string): string {
  const abs = path.resolve(process.cwd(), p);
  return fs.readFileSync(abs, "utf8");
}

function writeFile(p: string, content: string) {
  const abs = path.resolve(process.cwd(), p);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, "utf8");
}

async function main() {
  const { cmd, args } = parseArgs(process.argv);

  if (cmd === "help" || args.help || args.h) usage(0);
  if (cmd !== "compile") usage(1);

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
    input = JSON.parse(raw);
  } catch (e: any) {
    console.error("Input is not valid JSON.");
    console.error(e?.message ?? e);
    process.exit(1);
  }

  let result: any;
  try {
    // Your compiler API: compileSleeve(sleeve: SleeveInput, triggerState: TriggerState)
    // Support both shapes:
    //   A) { sleeve: ..., triggerState: ... }
    //   B) direct sleeve object (fallback)
    if (input && typeof input === "object" && ("sleeve" in input || "triggerState" in input)) {
      const sleeve = (input as any).sleeve ?? input;
      const triggerState = (input as any).triggerState ?? {};
      result = compileSleeve(sleeve as any, triggerState as any);
    } else {
      // If you pass only the sleeve JSON, we assume empty triggerState.
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

main().catch((e) => {
  console.error(e?.stack ?? e);
  process.exit(1);
});