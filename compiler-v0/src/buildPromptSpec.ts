import type { RuntimeNeoBlock, Block, RuntimePromptSpec, PromptSection, PromptSectionType } from "./types.js";

const SECTION_ORDER: PromptSectionType[] = [
  "trigger",
  "directive",
  "instruction",
  "subject",
  "primary",
  "philosophy",
  "blueprint",
];

export function buildPromptSpec(args: {
  sleeveId: string;
  neoBlocks: RuntimeNeoBlock[];
  blocksById: Map<string, Block>;
}): RuntimePromptSpec {
  const { sleeveId, neoBlocks, blocksById } = args;

  const neoBlockPrompts: RuntimePromptSpec["neoBlockPrompts"] = [];

  for (const nb of neoBlocks) {
    const sections: PromptSection[] = [];

    for (const sectionType of SECTION_ORDER) {
      let blockIds: string[];

      switch (sectionType) {
        case "trigger":
          blockIds = nb.active.triggerIds;
          break;
        case "directive":
          blockIds = nb.active.directiveIds;
          break;
        case "instruction":
          blockIds = nb.active.instructionIds;
          break;
        case "subject":
          blockIds = nb.active.subjectIds;
          break;
        case "primary":
          blockIds = nb.active.primaryId ? [nb.active.primaryId] : [];
          break;
        case "philosophy":
          blockIds = nb.active.philosophyIds;
          break;
        case "blueprint":
          blockIds = nb.active.blueprintIds;
          break;
        default:
          blockIds = [];
      }

      const texts: string[] = [];
      for (const blockId of blockIds) {
        const block = blocksById.get(blockId);
        if (block) {
          texts.push(block.content);
        }
      }

      sections.push({
        type: sectionType,
        blockIds,
        text: texts.join("\n\n"),
      });
    }

    const nonEmptySectionTexts = sections
      .filter(s => s.text.length > 0)
      .map(s => s.text);

    const fullText = nonEmptySectionTexts.join("\n\n---\n\n");

    neoBlockPrompts.push({
      neoBlockId: nb.id,
      stackId: nb.stackId,
      sections,
      fullText,
    });
  }

  neoBlockPrompts.sort((a, b) => a.neoBlockId.localeCompare(b.neoBlockId));

  return { sleeveId, neoBlockPrompts };
}
