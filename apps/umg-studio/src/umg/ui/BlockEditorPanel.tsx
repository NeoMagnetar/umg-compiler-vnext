import { useMemo, useState } from "react";
import { useUmgStore } from "../store";
import type { MoltRole, Block } from "../types";
import { validateBlock, validateWorkspace, type ValidationIssue } from "../validation";

const MAX_TAG_LENGTH = 32;
const MAX_TAGS = 10;

function roleFromNodeId(nodeId: string | null): MoltRole | null {
  if (!nodeId) return null;
  if (nodeId.startsWith("role-")) return nodeId.replace("role-", "") as MoltRole;
  return null;
}

function blockFromNodeId(nodeId: string | null, blocks: Block[]): Block | null {
  if (!nodeId) return null;
  if (nodeId.startsWith("role-")) {
    const role = nodeId.replace("role-", "") as MoltRole;
    return blocks.find(b => b.role === role) ?? null;
  }
  return blocks.find(b => b.id === nodeId) ?? null;
}

function sanitizeTag(tag: string): string {
  return tag.trim().toLowerCase().slice(0, MAX_TAG_LENGTH);
}

function dedupeAndLimit(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const t of tags) {
    const clean = sanitizeTag(t);
    if (clean && !seen.has(clean) && result.length < MAX_TAGS) {
      seen.add(clean);
      result.push(clean);
    }
  }
  return result;
}

export function BlockEditorPanel() {
  const s = useUmgStore();
  const [tagInput, setTagInput] = useState("");
  const [copied, setCopied] = useState(false);

  const block = useMemo(() => blockFromNodeId(s.selectedNodeId, s.blocks), [s.selectedNodeId, s.blocks]);
  const role = block?.role ?? roleFromNodeId(s.selectedNodeId);

  const blockValidation = useMemo(() => block ? validateBlock(block) : [], [block]);
  const workspaceValidation = useMemo(() => validateWorkspace(s.blocks, s.neoBlocks), [s.blocks, s.neoBlocks]);

  const handleCopyId = () => {
    if (block) {
      navigator.clipboard.writeText(block.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleAddTag = () => {
    if (!block) return;
    const clean = sanitizeTag(tagInput);
    if (!clean) return;
    const newTags = dedupeAndLimit([...block.tags, clean]);
    s.updateBlockTags(block.id, newTags);
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    if (!block) return;
    s.updateBlockTags(block.id, block.tags.filter(t => t !== tag));
  };

  const handlePriorityChange = (val: string) => {
    if (!block) return;
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    const clamped = Math.max(0, Math.min(100, num));
    s.updateBlockPriorityOrder(block.id, clamped);
  };

  if (!s.selectedNodeId) {
    return (
      <div style={panel}>
        <div style={{ fontWeight: 800, color: "#e0e0e0" }}>Inspector</div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 8, color: "#e0e0e0" }}>
          Select a block on the graph to inspect and edit.
        </div>
      </div>
    );
  }

  if (!block) {
    return (
      <div style={panel}>
        <div style={{ fontWeight: 800, color: "#e0e0e0" }}>Inspector{role ? `: ${role}` : ""}</div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 8, color: "#e0e0e0" }}>
          No block exists for this role yet. Use the Build panel to create one.
        </div>
      </div>
    );
  }

  return (
    <div style={panel}>
      <div style={{ fontWeight: 900, fontSize: 14, color: "#e0e0e0" }}>Inspector: {block.role}</div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
        <div style={{ fontSize: 11, opacity: 0.5, color: "#e0e0e0", fontFamily: "monospace" }}>
          {block.id}
        </div>
        <button
          onClick={handleCopyId}
          style={copyBtn}
          data-testid="button-copy-block-id"
        >
          {copied ? "Copied!" : "Copy ID"}
        </button>
      </div>

      <MoveNodeButton nodeId={s.selectedNodeId} />

      <div style={{ marginTop: 14, fontSize: 12, fontWeight: 700, color: "#e0e0e0" }}>Title</div>
      <input
        value={block.title}
        onChange={(e) => s.updateBlockTitle(block.role, e.target.value)}
        style={input}
        data-testid="input-block-title"
      />

      <div style={{ marginTop: 14, fontSize: 12, fontWeight: 700, color: "#e0e0e0" }}>Content</div>
      <textarea
        value={block.content}
        onChange={(e) => s.updateBlockContent(block.role, e.target.value)}
        style={textarea}
        placeholder={`Write ${block.role.toLowerCase()} content...`}
        data-testid="textarea-block-content"
      />

      <div style={{ marginTop: 14, fontSize: 12, fontWeight: 700, color: "#e0e0e0" }}>
        Priority Order
        <span style={{ fontWeight: 400, opacity: 0.5, marginLeft: 6 }}>(0-100, lower = higher priority)</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
        <button
          onClick={() => handlePriorityChange(String(block.priorityOrder - 1))}
          style={stepperBtn}
          disabled={block.priorityOrder <= 0}
          data-testid="button-priority-decrement"
        >
          -
        </button>
        <input
          type="number"
          min={0}
          max={100}
          value={block.priorityOrder}
          onChange={(e) => handlePriorityChange(e.target.value)}
          style={{ ...input, width: 60, textAlign: "center", margin: 0 }}
          data-testid="input-priority-order"
        />
        <button
          onClick={() => handlePriorityChange(String(block.priorityOrder + 1))}
          style={stepperBtn}
          disabled={block.priorityOrder >= 100}
          data-testid="button-priority-increment"
        >
          +
        </button>
      </div>

      <div style={{ marginTop: 14, fontSize: 12, fontWeight: 700, color: "#e0e0e0" }}>
        Tags
        <span style={{ fontWeight: 400, opacity: 0.5, marginLeft: 6 }}>({block.tags.length}/{MAX_TAGS})</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
        {block.tags.map(tag => (
          <span key={tag} style={tagChip}>
            {tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              style={tagRemoveBtn}
              data-testid={`button-remove-tag-${tag}`}
            >
              x
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
          placeholder="Add tag..."
          style={{ ...input, flex: 1, margin: 0 }}
          maxLength={MAX_TAG_LENGTH}
          data-testid="input-add-tag"
        />
        <button
          onClick={handleAddTag}
          style={addTagBtn}
          disabled={!tagInput.trim() || block.tags.length >= MAX_TAGS}
          data-testid="button-add-tag"
        >
          Add
        </button>
      </div>

      <ValidationBox
        blockIssues={blockValidation}
        workspaceResult={workspaceValidation}
      />
    </div>
  );
}

function ValidationBox({
  blockIssues,
  workspaceResult,
}: {
  blockIssues: ValidationIssue[];
  workspaceResult: { issues: ValidationIssue[]; hasErrors: boolean; hasWarnings: boolean };
}) {
  const errors = blockIssues.filter(i => i.severity === "error");
  const warnings = blockIssues.filter(i => i.severity === "warning");
  const infos = workspaceResult.issues.filter(i => i.severity === "info");

  const borderColor = errors.length > 0
    ? "rgba(239, 68, 68, 0.4)"
    : warnings.length > 0
    ? "rgba(251, 191, 36, 0.4)"
    : "rgba(74, 222, 128, 0.3)";

  const statusColor = errors.length > 0
    ? "#f87171"
    : warnings.length > 0
    ? "#fbbf24"
    : "#4ade80";

  const statusText = errors.length > 0
    ? `${errors.length} error(s)`
    : warnings.length > 0
    ? `${warnings.length} warning(s)`
    : "Valid";

  return (
    <div
      style={{
        marginTop: 16,
        padding: 10,
        borderRadius: 8,
        background: "rgba(0,0,0,0.3)",
        border: `1px solid ${borderColor}`,
      }}
      data-testid="validation-box"
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#e0e0e0" }}>Validation</div>
        <div style={{ fontSize: 10, color: statusColor, fontWeight: 600 }}>{statusText}</div>
      </div>

      {errors.map((issue, i) => (
        <div key={i} style={{ fontSize: 10, color: "#f87171", marginTop: 4 }}>
          {issue.message}
        </div>
      ))}

      {warnings.map((issue, i) => (
        <div key={i} style={{ fontSize: 10, color: "#fbbf24", marginTop: 4 }}>
          {issue.message}
        </div>
      ))}

      {errors.length === 0 && warnings.length === 0 && infos.length > 0 && (
        <div style={{ marginTop: 6, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 6 }}>
          {infos.slice(0, 2).map((issue, i) => (
            <div key={i} style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>
              {issue.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const panel: React.CSSProperties = {
  width: 320,
  padding: 12,
  borderLeft: "1px solid rgba(255,255,255,0.1)",
  height: "100vh",
  overflow: "auto",
  background: "rgba(15,15,20,0.95)"
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.15)",
  marginTop: 6,
  background: "rgba(0,0,0,0.3)",
  color: "#e0e0e0",
  fontSize: 12
};

const textarea: React.CSSProperties = {
  width: "100%",
  height: 140,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.15)",
  marginTop: 6,
  resize: "vertical",
  background: "rgba(0,0,0,0.3)",
  color: "#e0e0e0",
  fontSize: 12
};

const copyBtn: React.CSSProperties = {
  fontSize: 10,
  padding: "2px 8px",
  borderRadius: 4,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.05)",
  color: "#9ca3af",
  cursor: "pointer",
};

const stepperBtn: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.05)",
  color: "#e0e0e0",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const tagChip: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 11,
  padding: "3px 8px",
  borderRadius: 999,
  background: "rgba(96,165,250,0.15)",
  border: "1px solid rgba(96,165,250,0.3)",
  color: "#93c5fd",
};

const tagRemoveBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#9ca3af",
  fontSize: 10,
  cursor: "pointer",
  padding: 0,
  marginLeft: 2,
};

const addTagBtn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid rgba(96,165,250,0.3)",
  background: "rgba(96,165,250,0.1)",
  color: "#60a5fa",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

function MoveNodeButton({ nodeId }: { nodeId: string | null }) {
  const { movingNodeId, beginMove, cancelMove } = useUmgStore();

  if (!nodeId) return null;

  const isMoving = movingNodeId === nodeId;

  return (
    <div style={{ marginTop: 12 }}>
      <button
        onClick={() => isMoving ? cancelMove() : beginMove(nodeId)}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 8,
          border: isMoving ? "1px solid rgba(34, 197, 94, 0.5)" : "1px solid rgba(255,255,255,0.2)",
          background: isMoving ? "rgba(34, 197, 94, 0.2)" : "rgba(60,60,80,0.5)",
          color: isMoving ? "#22c55e" : "#e0e0e0",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
        }}
        data-testid="button-move-node"
      >
        {isMoving ? "Cancel Move" : "Move Node"}
      </button>
      {isMoving && (
        <div style={{ fontSize: 10, opacity: 0.6, color: "#22c55e", marginTop: 6 }}>
          Tap a green slot on the graph to move this node
        </div>
      )}
    </div>
  );
}
