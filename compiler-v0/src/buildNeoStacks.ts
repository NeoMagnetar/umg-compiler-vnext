import type { RuntimeNeoStack, Stack } from "./types.js";

export interface BuildNeoStacksInput {
  stacks: Stack[];
  neoBlockIdByStackId: Record<string, string>;
}

export function buildNeoStacks(input: BuildNeoStacksInput): RuntimeNeoStack[] {
  const { stacks, neoBlockIdByStackId } = input;

  const groupByDomain = new Map<string, { domainKey: string; neoBlockIds: string[] }>();
  const standaloneDomain: Array<{ stackId: string; neoBlockId: string }> = [];

  for (const st of stacks) {
    const neoBlockId = neoBlockIdByStackId[st.id];
    if (!neoBlockId) continue;

    if (st.domainKey) {
      const existing = groupByDomain.get(st.domainKey);
      if (existing) {
        existing.neoBlockIds.push(neoBlockId);
      } else {
        groupByDomain.set(st.domainKey, {
          domainKey: st.domainKey,
          neoBlockIds: [neoBlockId],
        });
      }
    } else {
      standaloneDomain.push({ stackId: st.id, neoBlockId });
    }
  }

  const neoStacks: RuntimeNeoStack[] = [];

  for (const [domainKey, group] of groupByDomain) {
    group.neoBlockIds.sort((a, b) => a.localeCompare(b));
    neoStacks.push({
      id: `ns_${domainKey}`,
      domainKey,
      neoBlockIds: group.neoBlockIds,
    });
  }

  for (const { stackId, neoBlockId } of standaloneDomain) {
    neoStacks.push({
      id: `ns_${stackId}`,
      neoBlockIds: [neoBlockId],
    });
  }

  neoStacks.sort((a, b) => a.id.localeCompare(b.id));

  return neoStacks;
}
