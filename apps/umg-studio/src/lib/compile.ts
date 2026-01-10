import { compileSleeve } from "@compiler-v0";
import type { Sleeve, TriggerState, CompileResult } from "@compiler-v0";

export function safeParseSleeve(json: string): { sleeve?: Sleeve; error?: string } {
  try {
    const parsed = JSON.parse(json);
    return { sleeve: parsed as Sleeve };
  } catch (e: any) {
    return { error: e?.message ?? "Invalid JSON" };
  }
}

export function compileFromJson(sleeveJson: string): { result?: CompileResult; error?: string } {
  const parsed = safeParseSleeve(sleeveJson);
  if (!parsed.sleeve) return { error: parsed.error ?? "Invalid sleeve" };

  const triggerState: TriggerState = { activeTriggerIds: [] };
  const result = compileSleeve(parsed.sleeve, triggerState);
  return { result };
}
