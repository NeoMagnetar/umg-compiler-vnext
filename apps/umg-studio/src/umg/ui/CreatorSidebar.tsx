import { useMemo, useState } from "react";
import { useUmgStore } from "../store";
import { stepLabel } from "../tutorial";
import { MOLT_ORDER, getSpineBlocks, nextAllowedRole } from "../molt";
import { SlidersPanel } from "./SlidersPanel";
import type { MoltRole } from "../types";

export function CreatorSidebar() {
  const s = useUmgStore();
  const [domainName, setDomainName] = useState("Decision Control");
  const [sleeveName, setSleeveName] = useState("sleeve_v0");
  const [extraRole, setExtraRole] = useState<MoltRole>("INSTRUCTION");

  const spine = useMemo(() => getSpineBlocks(s.blocks), [s.blocks]);
  const nextRole = nextAllowedRole(s.blocks);
  const canCompress = spine.length === 7;
  const canAddExtra = s.neoBlocks.length >= 1;
  const canDuplicate = s.neoBlocks.length >= 1;
  const canCompose = s.selectedNeoBlockIds.length === 2;
  const canNameStack = s.selectedNeoBlockIds.length >= 1;
  const canSleeve = s.neoStacks.length >= 1;
  const canCompile = !!s.sleeve?.neoStackId;

  return (
    <div style={{ 
      width: 340, 
      padding: 12, 
      borderRight: "1px solid rgba(255,255,255,0.1)", 
      height: "100%", 
      overflow: "auto",
      background: "rgba(15,15,20,0.95)",
      color: "#e0e0e0"
    }}>
      <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Block Tutorial (v0)</div>
      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10, color: "#60a5fa" }}>
        Step: {stepLabel(s.tutorialStep)}
      </div>

      <Section title="Build 7-Role MOLT Stack">
        <button 
          onClick={() => s.createBlock()} 
          style={btn} 
          disabled={nextRole === null}
          data-testid="button-add-molt-block"
        >
          {nextRole ? `+ Add ${nextRole} Block` : "Spine Complete"}
        </button>
        <div style={hint}>
          Order: Trigger → Directive → Instruction → Subject → Primary → Philosophy → Blueprint
        </div>
        <div style={{ fontSize: 11, marginTop: 6, opacity: 0.7 }}>
          Spine: {spine.length}/7 {canCompress ? "(Ready to compress)" : ""}
        </div>
      </Section>

      <Section title="Compress → NeoBlock" locked={!canCompress} lockMsg="Create all 7 MOLT roles first.">
        <button onClick={s.compressToNeoBlock} style={btn} disabled={!canCompress} data-testid="button-compress-molt">
          Compress MOLT Stack
        </button>
        <div style={hint}>Creates an immutable NeoBlock artifact from your 7-role spine.</div>
      </Section>

      <Section title="Extra Blocks" locked={!canAddExtra} lockMsg="Create first NeoBlock to unlock extras.">
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <select
            value={extraRole}
            onChange={e => setExtraRole(e.target.value as MoltRole)}
            style={select}
            data-testid="select-extra-role"
          >
            {MOLT_ORDER.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button
            onClick={() => s.addExtraBlock(extraRole)}
            style={{ ...btn, flex: 1 }}
            disabled={!canAddExtra}
            data-testid="button-add-extra-block"
          >
            + Add Extra
          </button>
        </div>
        <div style={hint}>Extra blocks add depth without replacing the spine.</div>
      </Section>

      <Section title="Duplicate" locked={!canDuplicate} lockMsg="Create at least 1 NeoBlock first.">
        <button
          onClick={() => {
            const last = s.neoBlocks[s.neoBlocks.length - 1];
            if (last) s.duplicateNeoBlock(last.id);
          }}
          style={btn}
          disabled={!canDuplicate}
          data-testid="button-duplicate-neoblock"
        >
          Duplicate Latest NeoBlock
        </button>
        <div style={hint}>Select 2 NeoBlocks to enable Merge/Bundle.</div>
      </Section>

      <Section title="Merge / Bundle" locked={!canCompose} lockMsg="Select exactly 2 NeoBlocks.">
        <SlidersPanel />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => s.commitCompose("MERGE")} style={btn} disabled={!canCompose} data-testid="button-merge">
            Merge
          </button>
          <button onClick={() => s.commitCompose("BUNDLE")} style={btn} disabled={!canCompose} data-testid="button-bundle">
            Bundle
          </button>
        </div>
        <div style={hint}>Merge = combine snapshots. Bundle = group for runtime selection.</div>
      </Section>

      <Section title="Domain (NeoStack)" locked={!canNameStack} lockMsg="Select a NeoBlock to name a domain stack.">
        <input 
          value={domainName} 
          onChange={e => setDomainName(e.target.value)} 
          style={input} 
          data-testid="input-domain-name"
        />
        <button onClick={() => s.nameNeoStack(domainName)} style={btn} disabled={!canNameStack} data-testid="button-create-neostack">
          Create NeoStack
        </button>
      </Section>

      <Section title="Sleeve" locked={!canSleeve} lockMsg="Create a NeoStack first.">
        <input 
          value={sleeveName} 
          onChange={e => setSleeveName(e.target.value)} 
          style={input} 
          data-testid="input-sleeve-name"
        />
        <button onClick={() => s.createSleeve(sleeveName)} style={btn} disabled={!canSleeve} data-testid="button-create-sleeve">
          Create Sleeve
        </button>
      </Section>

      <Section title="Compile" locked={!canCompile} lockMsg="Create a Sleeve with a NeoStack inserted.">
        <button onClick={s.compile} style={btn} disabled={!canCompile} data-testid="button-compile-v0">
          Compile (Structural)
        </button>
        <div style={hint}>v0 compile validates structure + records trace (no LLM required).</div>
      </Section>

      <Section title="NeoBlocks (select 2)">
        {s.neoBlocks.length === 0 ? (
          <div style={{ fontSize: 12, opacity: 0.5, fontStyle: "italic" }}>No NeoBlocks yet</div>
        ) : (
          s.neoBlocks.map(nb => {
            const selected = s.selectedNeoBlockIds.includes(nb.id);
            return (
              <div key={nb.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <button
                  onClick={() => s.toggleSelectNeoBlock(nb.id)}
                  style={{ ...miniBtn, borderColor: selected ? "#60a5fa" : "rgba(255,255,255,0.2)" }}
                  data-testid={`button-select-neoblock-${nb.id}`}
                >
                  {selected ? "✓" : "+"}
                </button>
                <div style={{ fontSize: 12, flex: 1, opacity: selected ? 1 : 0.7 }}>{nb.label}</div>
              </div>
            );
          })
        )}
      </Section>

      <div style={{ marginTop: 20, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <button 
          onClick={s.resetAll} 
          style={{ ...btn, background: "rgba(239, 68, 68, 0.15)", borderColor: "rgba(239, 68, 68, 0.3)" }}
          data-testid="button-reset-state"
        >
          Reset Tutorial
        </button>
        <div style={{ fontSize: 10, opacity: 0.5, marginTop: 6, textAlign: "center" }}>
          State auto-saves to localStorage
        </div>
      </div>
    </div>
  );
}

function Section(props: { title: string; children: React.ReactNode; locked?: boolean; lockMsg?: string }) {
  return (
    <div style={{ 
      marginBottom: 14, 
      padding: 10, 
      border: "1px solid rgba(255,255,255,0.1)", 
      borderRadius: 12,
      background: "rgba(30,30,40,0.5)"
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>{props.title}</div>
      {props.locked ? (
        <div style={{ fontSize: 12, opacity: 0.5, fontStyle: "italic" }}>{props.lockMsg}</div>
      ) : (
        props.children
      )}
    </div>
  );
}

const btn: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(60,60,80,0.5)",
  cursor: "pointer",
  color: "#e0e0e0",
  fontSize: 12,
  fontWeight: 600
};

const miniBtn: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(60,60,80,0.5)",
  cursor: "pointer",
  color: "#e0e0e0",
  fontSize: 12
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.15)",
  marginBottom: 8,
  background: "rgba(0,0,0,0.3)",
  color: "#e0e0e0",
  fontSize: 12
};

const select: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(0,0,0,0.3)",
  color: "#e0e0e0",
  fontSize: 12,
  flex: 1
};

const hint: React.CSSProperties = {
  fontSize: 11,
  opacity: 0.6,
  marginTop: 6,
  fontStyle: "italic"
};
