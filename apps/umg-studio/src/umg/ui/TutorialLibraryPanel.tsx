import { useState } from "react";
import { useUmgStore } from "../store";
import { useLibraryStore } from "../libraryStore";
import type { LibraryItem, Block, NeoBlock, NeoStack, Sleeve } from "../types";

type TabKey = "blocks" | "neoBlocks" | "neoStacks" | "sleeves";

const TAB_LABELS: Record<TabKey, string> = {
  blocks: "Blocks",
  neoBlocks: "NeoBlocks",
  neoStacks: "NeoStacks",
  sleeves: "Sleeves",
};

export function TutorialLibraryPanel() {
  const [activeTab, setActiveTab] = useState<TabKey>("blocks");
  const s = useUmgStore();
  const lib = useLibraryStore();

  const selectedBlock = s.blocks.find(b => b.id === s.selectedBlockId);
  const latestNeoBlock = s.neoBlocks[s.neoBlocks.length - 1] ?? null;
  const latestNeoStack = s.neoStacks[s.neoStacks.length - 1] ?? null;
  const currentSleeve = s.sleeve;

  const handleSaveBlock = () => {
    if (selectedBlock) {
      lib.saveBlock(selectedBlock);
    }
  };

  const handleSaveNeoBlock = () => {
    if (latestNeoBlock) {
      lib.saveNeoBlock(latestNeoBlock);
    }
  };

  const handleSaveNeoStack = () => {
    if (latestNeoStack) {
      lib.saveNeoStack(latestNeoStack);
    }
  };

  const handleSaveSleeve = () => {
    if (currentSleeve) {
      lib.saveSleeve(currentSleeve);
    }
  };

  const handleLoadBlock = (item: LibraryItem<Block>) => {
    s.loadBlockFromLibrary(item);
  };

  const handleLoadNeoBlock = (item: LibraryItem<NeoBlock>) => {
    s.loadNeoBlockFromLibrary(item);
  };

  const handleLoadNeoStack = (item: LibraryItem<NeoStack>) => {
    const neoBlockItems = lib.neoBlocks.filter(nb =>
      item.data.neoBlockIds.includes(nb.data.id)
    );
    s.loadNeoStackFromLibrary(item, neoBlockItems.map(nb => nb.data));
  };

  const handleLoadSleeve = (item: LibraryItem<Sleeve>) => {
    const stackItem = lib.neoStacks.find(ns => ns.data.id === item.data.neoStackId);
    if (!stackItem) return;
    const neoBlockItems = lib.neoBlocks.filter(nb =>
      stackItem.data.neoBlockIds.includes(nb.data.id)
    );
    s.loadSleeveFromLibrary(item, stackItem.data, neoBlockItems.map(nb => nb.data));
  };

  const renderItems = () => {
    switch (activeTab) {
      case "blocks":
        return lib.blocks.map(item => (
          <LibraryCard
            key={item.id}
            name={item.name}
            tags={item.tags}
            createdAt={item.createdAt}
            onLoad={() => handleLoadBlock(item)}
            onDelete={() => lib.deleteItem("blocks", item.id)}
          />
        ));
      case "neoBlocks":
        return lib.neoBlocks.map(item => (
          <LibraryCard
            key={item.id}
            name={item.name}
            tags={item.tags}
            createdAt={item.createdAt}
            onLoad={() => handleLoadNeoBlock(item)}
            onDelete={() => lib.deleteItem("neoBlocks", item.id)}
          />
        ));
      case "neoStacks":
        return lib.neoStacks.map(item => (
          <LibraryCard
            key={item.id}
            name={item.name}
            tags={item.tags}
            createdAt={item.createdAt}
            onLoad={() => handleLoadNeoStack(item)}
            onDelete={() => lib.deleteItem("neoStacks", item.id)}
          />
        ));
      case "sleeves":
        return lib.sleeves.map(item => (
          <LibraryCard
            key={item.id}
            name={item.name}
            tags={item.tags}
            createdAt={item.createdAt}
            onLoad={() => handleLoadSleeve(item)}
            onDelete={() => lib.deleteItem("sleeves", item.id)}
          />
        ));
    }
  };

  const currentItems = activeTab === "blocks" ? lib.blocks
    : activeTab === "neoBlocks" ? lib.neoBlocks
    : activeTab === "neoStacks" ? lib.neoStacks
    : lib.sleeves;

  return (
    <div style={panel}>
      <div style={{ fontWeight: 900, fontSize: 14, color: "#e0e0e0", marginBottom: 12 }}>
        Library
      </div>

      <div style={saveRow}>
        <button
          onClick={handleSaveBlock}
          disabled={!selectedBlock}
          style={saveBtn(!selectedBlock)}
          data-testid="button-save-block"
        >
          Save Block
        </button>
        <button
          onClick={handleSaveNeoBlock}
          disabled={!latestNeoBlock}
          style={saveBtn(!latestNeoBlock)}
          data-testid="button-save-neoblock"
        >
          Save NeoBlock
        </button>
        <button
          onClick={handleSaveNeoStack}
          disabled={!latestNeoStack}
          style={saveBtn(!latestNeoStack)}
          data-testid="button-save-neostack"
        >
          Save NeoStack
        </button>
        <button
          onClick={handleSaveSleeve}
          disabled={!currentSleeve}
          style={saveBtn(!currentSleeve)}
          data-testid="button-save-sleeve"
        >
          Save Sleeve
        </button>
      </div>

      <div style={tabRow}>
        {(Object.keys(TAB_LABELS) as TabKey[]).map(key => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={tabBtn(key === activeTab)}
            data-testid={`tab-${key}`}
          >
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>

      <div style={listContainer}>
        {currentItems.length === 0 ? (
          <div style={{ fontSize: 12, opacity: 0.5, color: "#e0e0e0", padding: 12, textAlign: "center" }}>
            No saved {TAB_LABELS[activeTab].toLowerCase()} yet
          </div>
        ) : (
          renderItems()
        )}
      </div>
    </div>
  );
}

function LibraryCard({
  name,
  tags,
  createdAt,
  onLoad,
  onDelete,
}: {
  name: string;
  tags: string[];
  createdAt: number;
  onLoad: () => void;
  onDelete: () => void;
}) {
  const dateStr = new Date(createdAt).toLocaleDateString();

  return (
    <div style={card}>
      <div style={{ fontWeight: 700, color: "#e0e0e0", fontSize: 13 }}>{name}</div>
      <div style={{ fontSize: 10, opacity: 0.5, color: "#9ca3af", marginTop: 2 }}>{dateStr}</div>
      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
          {tags.slice(0, 5).map(tag => (
            <span key={tag} style={tagChip}>{tag}</span>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={onLoad} style={actionBtn} data-testid="button-load">
          Load
        </button>
        <button onClick={onDelete} style={deleteBtn} data-testid="button-delete">
          Delete
        </button>
      </div>
    </div>
  );
}

const panel: React.CSSProperties = {
  width: 320,
  padding: 12,
  borderLeft: "1px solid rgba(255,255,255,0.1)",
  height: "100vh",
  overflow: "auto",
  background: "rgba(15,15,20,0.95)",
};

const saveRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  marginBottom: 12,
};

const saveBtn = (disabled: boolean): React.CSSProperties => ({
  padding: "6px 10px",
  fontSize: 11,
  fontWeight: 600,
  borderRadius: 6,
  border: "1px solid rgba(255,255,255,0.15)",
  background: disabled ? "rgba(255,255,255,0.05)" : "rgba(100,100,255,0.2)",
  color: disabled ? "#666" : "#e0e0e0",
  cursor: disabled ? "not-allowed" : "pointer",
});

const tabRow: React.CSSProperties = {
  display: "flex",
  gap: 4,
  marginBottom: 12,
  borderBottom: "1px solid rgba(255,255,255,0.1)",
  paddingBottom: 8,
};

const tabBtn = (active: boolean): React.CSSProperties => ({
  padding: "6px 10px",
  fontSize: 11,
  fontWeight: 600,
  borderRadius: 6,
  border: "none",
  background: active ? "rgba(255,255,255,0.15)" : "transparent",
  color: active ? "#fff" : "#9ca3af",
  cursor: "pointer",
});

const listContainer: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const card: React.CSSProperties = {
  padding: 10,
  borderRadius: 8,
  background: "rgba(0,0,0,0.3)",
  border: "1px solid rgba(255,255,255,0.1)",
};

const tagChip: React.CSSProperties = {
  fontSize: 9,
  padding: "2px 6px",
  borderRadius: 4,
  background: "rgba(100,100,255,0.2)",
  color: "#a5b4fc",
};

const actionBtn: React.CSSProperties = {
  padding: "4px 10px",
  fontSize: 10,
  fontWeight: 600,
  borderRadius: 4,
  border: "1px solid rgba(100,200,100,0.3)",
  background: "rgba(100,200,100,0.15)",
  color: "#4ade80",
  cursor: "pointer",
};

const deleteBtn: React.CSSProperties = {
  padding: "4px 10px",
  fontSize: 10,
  fontWeight: 600,
  borderRadius: 4,
  border: "1px solid rgba(255,100,100,0.3)",
  background: "rgba(255,100,100,0.1)",
  color: "#f87171",
  cursor: "pointer",
};
