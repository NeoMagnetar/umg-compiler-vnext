export interface ParsedNeoBlock {
  type: "neoblock";
  id: string;
  title: string;
  desc?: string;
  tags: string[];
  molt?: string[];
}

export interface ParsedNeoStack {
  type: "neostack";
  id: string;
  title: string;
  desc?: string;
  tags: string[];
  contains: string[];
}

export type ParsedItem = ParsedNeoBlock | ParsedNeoStack;

export interface ParseResult {
  success: boolean;
  item?: ParsedItem;
  error?: string;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 30);
}

function generateId(type: "neoblock" | "neostack", title: string): string {
  const prefix = type === "neoblock" ? "nb" : "ns";
  const slug = generateSlug(title);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${prefix}_${slug}_${rand}`;
}

function parseCommaSeparated(value: string): string[] {
  return value
    .split(",")
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function parseContains(lines: string[]): string[] {
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("-")) {
      let content = trimmed.slice(1).trim();
      const match = content.match(/^neoblock:\s*(.+)$/i);
      if (match) {
        result.push(match[1].trim());
      } else {
        result.push(content);
      }
    }
  }
  return result;
}

export function parseStructuredText(input: string): ParseResult {
  const lines = input.split("\n");
  const fields: Record<string, string> = {};
  const containsLines: string[] = [];
  let inContains = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("-") && inContains) {
      containsLines.push(trimmed);
      continue;
    }

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > 0) {
      const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
      const value = trimmed.slice(colonIdx + 1).trim();

      if (key === "contains") {
        inContains = true;
        continue;
      }

      inContains = false;
      fields[key] = value;
    }
  }

  if (!fields.type) {
    return { success: false, error: "Missing required field: TYPE" };
  }

  if (!fields.title) {
    return { success: false, error: "Missing required field: TITLE" };
  }

  const itemType = fields.type.toLowerCase();
  if (itemType !== "neoblock" && itemType !== "neostack") {
    return { success: false, error: `TYPE must be "neoblock" or "neostack", got "${fields.type}"` };
  }

  const id = fields.id || generateId(itemType as "neoblock" | "neostack", fields.title);
  const title = fields.title;
  const desc = fields.desc || fields.description;
  const tags = fields.tags ? parseCommaSeparated(fields.tags) : [];

  if (itemType === "neoblock") {
    const molt = fields.molt ? parseCommaSeparated(fields.molt) : [];
    const item: ParsedNeoBlock = { type: "neoblock", id, title, desc, tags, molt };
    return { success: true, item };
  } else {
    const contains = parseContains(containsLines);
    const item: ParsedNeoStack = { type: "neostack", id, title, desc, tags, contains };
    return { success: true, item };
  }
}

export function parseJsonInput(input: string): ParseResult {
  try {
    const obj = JSON.parse(input);

    if (!obj.type) {
      return { success: false, error: "JSON missing required field: type" };
    }

    if (!obj.title) {
      return { success: false, error: "JSON missing required field: title" };
    }

    const itemType = String(obj.type).toLowerCase();
    if (itemType !== "neoblock" && itemType !== "neostack") {
      return { success: false, error: `type must be "neoblock" or "neostack"` };
    }

    const id = obj.id || generateId(itemType as "neoblock" | "neostack", obj.title);
    const title = String(obj.title);
    const desc = obj.desc || obj.description;
    const tags = Array.isArray(obj.tags) ? obj.tags.map(String) : [];

    if (itemType === "neoblock") {
      const molt = Array.isArray(obj.molt) ? obj.molt.map(String) : [];
      const item: ParsedNeoBlock = { type: "neoblock", id, title, desc, tags, molt };
      return { success: true, item };
    } else {
      const contains = Array.isArray(obj.contains) ? obj.contains.map(String) : [];
      const item: ParsedNeoStack = { type: "neostack", id, title, desc, tags, contains };
      return { success: true, item };
    }
  } catch (e) {
    return { success: false, error: `Invalid JSON: ${(e as Error).message}` };
  }
}

export function parsePromptInput(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { success: false, error: "Input is empty" };
  }

  if (trimmed.startsWith("{")) {
    return parseJsonInput(trimmed);
  }

  return parseStructuredText(trimmed);
}

export const EXAMPLE_NEOBLOCK = `TYPE: neoblock
TITLE: Arizona Dispensary Audit Orchestrator
DESC: Coordinates an audit workflow for AZ dispensary ops.
TAGS: audit, arizona, dispensary, compliance
MOLT: primary, instruction, directive`;

export const EXAMPLE_NEOSTACK = `TYPE: neostack
TITLE: Ops Stack
DESC: Operational neostack for daily workflows.
TAGS: ops, workflows
CONTAINS:
- NeoBlock: Arizona Dispensary Audit Orchestrator
- NeoBlock: Weekly Inventory Reconciliation`;
