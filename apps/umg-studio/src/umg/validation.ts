import type { Block, NeoBlock } from "./types";
import { MOLT_ORDER, getSpineBlocks } from "./molt";

export type ValidationSeverity = "error" | "warning" | "info";

export type ValidationIssue = {
  severity: ValidationSeverity;
  code: string;
  message: string;
  blockId?: string;
};

export type ValidationResult = {
  issues: ValidationIssue[];
  hasErrors: boolean;
  hasWarnings: boolean;
  isValid: boolean;
};

export function validateBlock(block: Block): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!block.title.trim()) {
    issues.push({
      severity: "warning",
      code: "WARN_EMPTY_TITLE",
      message: "Block title is empty",
      blockId: block.id,
    });
  }

  if (!block.content.trim()) {
    issues.push({
      severity: "warning",
      code: "WARN_EMPTY_CONTENT",
      message: "Block content is empty",
      blockId: block.id,
    });
  }

  if (block.priorityOrder < 0 || block.priorityOrder > 100) {
    issues.push({
      severity: "error",
      code: "ERR_INVALID_PRIORITY",
      message: `Priority order must be 0-100 (got ${block.priorityOrder})`,
      blockId: block.id,
    });
  }

  const uniqueTags = new Set(block.tags);
  if (uniqueTags.size !== block.tags.length) {
    issues.push({
      severity: "warning",
      code: "WARN_DUPLICATE_TAGS",
      message: "Block has duplicate tags",
      blockId: block.id,
    });
  }

  for (const tag of block.tags) {
    if (tag.length > 32) {
      issues.push({
        severity: "warning",
        code: "WARN_TAG_TOO_LONG",
        message: `Tag "${tag.slice(0, 20)}..." exceeds 32 characters`,
        blockId: block.id,
      });
    }
  }

  return issues;
}

export function validateWorkspace(blocks: Block[], neoBlocks: NeoBlock[]): ValidationResult {
  const issues: ValidationIssue[] = [];

  for (const block of blocks) {
    issues.push(...validateBlock(block));
  }

  const spine = getSpineBlocks(blocks);
  const spineRoles = new Set(spine.map(b => b.role));

  if (blocks.length > 0 && spine.length < 7) {
    const missing = MOLT_ORDER.filter(r => !spineRoles.has(r));
    issues.push({
      severity: "info",
      code: "INFO_INCOMPLETE_SPINE",
      message: `Spine missing: ${missing.join(", ")}`,
    });
  }

  if (spine.length === 7 && neoBlocks.length === 0) {
    issues.push({
      severity: "info",
      code: "INFO_READY_TO_COMPRESS",
      message: "Spine complete - ready to compress into NeoBlock",
    });
  }

  if (neoBlocks.length >= 2) {
    issues.push({
      severity: "info",
      code: "INFO_READY_TO_COMPOSE",
      message: `${neoBlocks.length} NeoBlocks available for composition`,
    });
  }

  const hasErrors = issues.some(i => i.severity === "error");
  const hasWarnings = issues.some(i => i.severity === "warning");

  return {
    issues,
    hasErrors,
    hasWarnings,
    isValid: !hasErrors,
  };
}
