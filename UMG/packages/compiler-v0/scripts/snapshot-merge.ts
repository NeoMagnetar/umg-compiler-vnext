import fs from "node:fs";
import path from "node:path";
import { compileSleeve } from "../src/compile.js";

const samplePath = path.resolve(process.cwd(), "samples/merge_example.json");
const outDir = path.resolve(process.cwd(), "snapshots");
const outPath = path.join(outDir, "merge_example.out.json");

const raw = JSON.parse(fs.readFileSync(samplePath, "utf8"));
const result = compileSleeve(raw.sleeve, raw.triggerState);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n", "utf8");

console.log(`[snapshot] wrote ${outPath} (hasErrors=${result.hasErrors})`);
process.exit(result.hasErrors ? 1 : 0);
