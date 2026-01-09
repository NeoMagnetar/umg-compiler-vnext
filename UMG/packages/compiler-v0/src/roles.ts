import type { BlockRole } from "./types.js";

export const ROLE_SET = new Set<BlockRole>([
  "primary_shell",
  "merge_contributor",
  "annotation",
  "off",
]);
