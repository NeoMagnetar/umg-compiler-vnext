import fs from "node:fs";
import path from "node:path";
import { compileSleeve } from "../src/compile.js";

const samplesDir = path.resolve(process.cwd(), "samples");
const outDir = path.resolve(process.cwd(), "snapshots");

fs.mkdirSync(outDir, { recursive: true });

const sampleFiles = fs.readdirSync(samplesDir).filter(f => f.endsWith(".json"));

let hasAnyErrors = false;

for (const file of sampleFiles.sort()) {
  const samplePath = path.join(samplesDir, file);
  const baseName = file.replace(/\.json$/, "");
  const outPath = path.join(outDir, `${baseName}.out.json`);

  const raw = JSON.parse(fs.readFileSync(samplePath, "utf8"));
  const result = compileSleeve(raw.sleeve, raw.triggerState);

  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n", "utf8");

  console.log(`[snapshot] wrote ${outPath} (hasErrors=${result.hasErrors})`);

  if (result.hasErrors) {
    hasAnyErrors = true;
  }
}

process.exit(hasAnyErrors ? 1 : 0);
