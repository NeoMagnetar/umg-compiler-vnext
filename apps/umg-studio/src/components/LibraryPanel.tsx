import React, { useState, useEffect } from "react";
import { getStacks, findBlockInSleeve, insertBlockIntoStackByMolt, getBlocksById } from "@/lib/sleeveEdit";
import { 
  listLibraryBlocks, 
  saveBlockTemplate, 
  deleteBlockTemplate, 
  mintBlockId,
  LibraryBlock 
} from "@/lib/library/store";
import { listNeoBlocks, NeoBlock, getTotalBlockCount } from "@/lib/library/neoblockStore";
import { listNeoStacks, saveNeoStack, deleteNeoStack, NeoStack } from "@/lib/library/neostackStore";
import { listSleeves, saveSleeveTemplate, loadSleeveTemplate, deleteSleeveTemplate, SleeveTemplate } from "@/lib/library/sleeveStore";
import NeoBlockPreview from "./NeoBlockPreview";

const MOLT_TYPES = [
  "trigger",
  "directive",
  "instruction",
  "subject",
  "primary",
  "philosophy",
  "blueprint"
] as const;

type TabType = "blocks" | "neoblocks" | "neostacks" | "sleeves";

interface LibraryPanelProps {
  sleeveJson: string;
  selectedBlockId: string | null;
  onChangeSleeveJson: (next: string) => void;
}

export default function LibraryPanel({ sleeveJson, selectedBlockId, onChangeSleeveJson }: LibraryPanelProps) {
  const [tab, setTab] = useState<TabType>("blocks");
  const [libraryBlocks, setLibraryBlocks] = useState<LibraryBlock[]>([]);
  const [neoBlocks, setNeoBlocks] = useState<NeoBlock[]>([]);
  const [neoStacks, setNeoStacks] = useState<NeoStack[]>([]);
  const [sleeves, setSleeves] = useState<SleeveTemplate[]>([]);
  const [insertStackId, setInsertStackId] = useState<string>("");
  const [moltFilter, setMoltFilter] = useState<string>("all");
  const [message, setMessage] = useState<string | null>(null);
  const [expandedNeoBlockId, setExpandedNeoBlockId] = useState<string | null>(null);
  const [expandedNeoStackId, setExpandedNeoStackId] = useState<string | null>(null);
  const [showNewStackForm, setShowNewStackForm] = useState(false);
  const [newStackName, setNewStackName] = useState("");
  const [selectedNeoBlockIds, setSelectedNeoBlockIds] = useState<string[]>([]);
  const [showSaveSleeveForm, setShowSaveSleeveForm] = useState(false);
  const [newSleeveName, setNewSleeveName] = useState("");
  const [confirmLoadSleeveId, setConfirmLoadSleeveId] = useState<string | null>(null);

  const stacks = getStacks(sleeveJson);
  const blocksById = getBlocksById(sleeveJson);

  useEffect(() => {
    setLibraryBlocks(listLibraryBlocks());
    setNeoBlocks(listNeoBlocks());
    setNeoStacks(listNeoStacks());
    setSleeves(listSleeves());
  }, []);

  const selectedBlock = selectedBlockId 
    ? findBlockInSleeve(sleeveJson, selectedBlockId).block 
    : null;

  const filteredLibraryBlocks = moltFilter === "all" 
    ? libraryBlocks 
    : libraryBlocks.filter(b => b.moltType === moltFilter);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2000);
  };

  const handleSaveToLibrary = () => {
    if (!selectedBlock) return;
    
    saveBlockTemplate({
      title: selectedBlock.title ?? "Untitled",
      moltType: selectedBlock.moltType ?? "instruction",
      content: selectedBlock.content ?? "",
      tags: selectedBlock.tags ?? [],
      priorityOrder: selectedBlock.priorityOrder ?? 10
    });
    
    setLibraryBlocks(listLibraryBlocks());
    showMessage("Saved to library!");
  };

  const handleInsertFromLibrary = (libBlock: LibraryBlock) => {
    if (!insertStackId) {
      showMessage("Select a stack first");
      return;
    }

    const newId = mintBlockId(libBlock.moltType, libBlock.title);
    
    const result = insertBlockIntoStackByMolt(sleeveJson, insertStackId, {
      id: newId,
      title: libBlock.title,
      moltType: libBlock.moltType,
      content: libBlock.content,
      tags: [...libBlock.tags],
      priorityOrder: libBlock.priorityOrder
    });

    if (result.error) {
      showMessage(`Error: ${result.error}`);
    } else if (result.nextJson) {
      onChangeSleeveJson(result.nextJson);
      showMessage("Inserted into sleeve!");
    }
  };

  const handleDeleteFromLibrary = (id: string) => {
    deleteBlockTemplate(id);
    setLibraryBlocks(listLibraryBlocks());
    showMessage("Removed from library");
  };

  const handleCreateNeoStack = () => {
    if (!newStackName.trim() || selectedNeoBlockIds.length === 0) return;
    
    saveNeoStack({
      name: newStackName.trim(),
      neoBlockIds: selectedNeoBlockIds,
      summary: `${selectedNeoBlockIds.length} NeoBlocks`
    });
    
    setNeoStacks(listNeoStacks());
    setShowNewStackForm(false);
    setNewStackName("");
    setSelectedNeoBlockIds([]);
    showMessage("NeoStack created!");
  };

  const handleDeleteNeoStack = (id: string) => {
    deleteNeoStack(id);
    setNeoStacks(listNeoStacks());
    showMessage("NeoStack deleted");
  };

  const handleSaveSleeve = () => {
    if (!newSleeveName.trim()) return;
    
    saveSleeveTemplate({
      name: newSleeveName.trim(),
      sleeveJson: sleeveJson
    });
    
    setSleeves(listSleeves());
    setShowSaveSleeveForm(false);
    setNewSleeveName("");
    showMessage("Sleeve saved to library!");
  };

  const handleLoadSleeve = (id: string) => {
    const template = loadSleeveTemplate(id);
    if (template) {
      onChangeSleeveJson(template.sleeveJson);
      showMessage("Sleeve loaded!");
    }
    setConfirmLoadSleeveId(null);
  };

  const handleDeleteSleeve = (id: string) => {
    deleteSleeveTemplate(id);
    setSleeves(listSleeves());
    showMessage("Sleeve deleted");
  };

  const toggleNeoBlockSelect = (id: string) => {
    setSelectedNeoBlockIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const formatDate = (ts: number) => {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleDateString();
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: "blocks", label: "Blocks" },
    { key: "neoblocks", label: "NeoBlocks" },
    { key: "neostacks", label: "NeoStacks" },
    { key: "sleeves", label: "Sleeves" }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ 
        display: "flex", 
        gap: 4, 
        flexWrap: "wrap",
        position: "sticky",
        top: 0,
        background: "var(--bg, #0a0a0a)",
        paddingBottom: 8,
        zIndex: 10
      }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            data-testid={`tab-${t.key}`}
            style={{
              flex: 1,
              minWidth: 70,
              padding: "8px 10px",
              background: tab === t.key ? "rgba(168, 85, 247, 0.2)" : "rgba(255,255,255,0.05)",
              border: tab === t.key ? "1px solid rgba(168, 85, 247, 0.4)" : "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6,
              color: tab === t.key ? "#a855f7" : "inherit",
              fontSize: 11,
              fontWeight: tab === t.key ? 600 : 400,
              cursor: "pointer"
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {message && (
        <div style={{
          padding: 8,
          background: message.startsWith("Error") 
            ? "rgba(239, 68, 68, 0.15)" 
            : "rgba(34, 197, 94, 0.15)",
          borderRadius: 4,
          fontSize: 11,
          color: message.startsWith("Error") ? "#ef4444" : "#22c55e"
        }}>
          {message}
        </div>
      )}

      {tab === "blocks" && (
        <>
          {selectedBlock && (
            <div style={{ 
              padding: 10, 
              background: "rgba(255,105,180,0.1)", 
              borderRadius: 6,
              borderLeft: "3px solid #ff69b4"
            }}>
              <div className="small" style={{ marginBottom: 6, opacity: 0.7 }}>Selected Block</div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{selectedBlock.title}</div>
              <button
                className="btn"
                onClick={handleSaveToLibrary}
                data-testid="button-save-block-to-library"
                style={{ marginTop: 8, fontSize: 11, width: "100%" }}
              >
                Save selected block to Library
              </button>
            </div>
          )}

          <div>
            <div className="small" style={{ opacity: 0.6, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Insert Target Stack
            </div>
            <select
              value={insertStackId}
              onChange={(e) => setInsertStackId(e.target.value)}
              data-testid="select-insert-stack"
              style={{
                width: "100%",
                padding: "5px 6px",
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 4,
                color: "inherit",
                fontSize: 11
              }}
            >
              <option value="">Select stack...</option>
              {stacks.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
              ))}
            </select>
          </div>

          <div>
            <div className="small" style={{ opacity: 0.6, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Filter by MOLT
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              <button
                onClick={() => setMoltFilter("all")}
                style={{
                  padding: "3px 6px",
                  background: moltFilter === "all" ? "rgba(255,255,255,0.15)" : "transparent",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 4,
                  color: "inherit",
                  fontSize: 10,
                  cursor: "pointer"
                }}
              >
                All
              </button>
              {MOLT_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setMoltFilter(t)}
                  style={{
                    padding: "3px 6px",
                    background: moltFilter === t ? "rgba(255,255,255,0.15)" : "transparent",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 4,
                    color: "inherit",
                    fontSize: 10,
                    cursor: "pointer",
                    textTransform: "capitalize"
                  }}
                >
                  {t.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="small" style={{ opacity: 0.6, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Library Templates ({filteredLibraryBlocks.length})
            </div>
            {filteredLibraryBlocks.length === 0 ? (
              <div className="small" style={{ opacity: 0.4, fontStyle: "italic" }}>
                {moltFilter === "all" ? "No saved blocks" : `No ${moltFilter} blocks`}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {filteredLibraryBlocks.map(b => (
                  <div 
                    key={b.id}
                    style={{
                      padding: "8px 10px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: 4,
                      fontSize: 12
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{b.title}</div>
                        <div className="mono" style={{ fontSize: 10, opacity: 0.5 }}>{b.moltType}</div>
                      </div>
                      <button
                        onClick={() => handleDeleteFromLibrary(b.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          fontSize: 14,
                          padding: 2,
                          opacity: 0.6
                        }}
                        title="Remove from library"
                      >
                        ×
                      </button>
                    </div>
                    <button
                      onClick={() => handleInsertFromLibrary(b)}
                      disabled={!insertStackId}
                      data-testid={`button-insert-block-${b.id}`}
                      style={{
                        marginTop: 6,
                        padding: "4px 8px",
                        background: insertStackId ? "rgba(59, 130, 246, 0.2)" : "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                        borderRadius: 4,
                        color: "inherit",
                        fontSize: 10,
                        cursor: insertStackId ? "pointer" : "not-allowed",
                        opacity: insertStackId ? 1 : 0.5
                      }}
                    >
                      Insert into Stack
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === "neoblocks" && (
        <div>
          <div className="small" style={{ opacity: 0.6, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            NeoBlocks ({neoBlocks.length})
          </div>
          {neoBlocks.length === 0 ? (
            <div className="small" style={{ opacity: 0.4, fontStyle: "italic" }}>
              No NeoBlocks saved. Use Compress in Structure panel to create one.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {neoBlocks.map(nb => (
                <div 
                  key={nb.id}
                  style={{
                    padding: 10,
                    background: "rgba(168, 85, 247, 0.05)",
                    borderRadius: 6,
                    border: "1px solid rgba(168, 85, 247, 0.15)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 12 }}>{nb.name}</div>
                      <div className="mono" style={{ fontSize: 10, opacity: 0.5 }}>
                        {getTotalBlockCount(nb)} blocks | {formatDate(nb.createdAt)}
                      </div>
                      <div className="mono" style={{ fontSize: 10, opacity: 0.4, marginTop: 2 }}>
                        Source: {nb.sourceStackId}
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedNeoBlockId(expandedNeoBlockId === nb.id ? null : nb.id)}
                      style={{
                        padding: "3px 8px",
                        background: expandedNeoBlockId === nb.id ? "rgba(168, 85, 247, 0.2)" : "transparent",
                        border: "1px solid rgba(168, 85, 247, 0.3)",
                        borderRadius: 4,
                        color: "#a855f7",
                        fontSize: 10,
                        cursor: "pointer"
                      }}
                    >
                      {expandedNeoBlockId === nb.id ? "Hide" : "Preview"}
                    </button>
                  </div>
                  
                  {expandedNeoBlockId === nb.id && (
                    <div style={{ marginTop: 10 }}>
                      <NeoBlockPreview 
                        title=""
                        lanes={nb.lanes}
                        blocksById={blocksById}
                        compact={true}
                      />
                    </div>
                  )}
                  
                  <button
                    disabled
                    data-testid={`button-insert-neoblock-${nb.id}`}
                    style={{
                      marginTop: 8,
                      width: "100%",
                      padding: "5px 8px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 4,
                      color: "inherit",
                      fontSize: 10,
                      cursor: "not-allowed",
                      opacity: 0.4
                    }}
                  >
                    Insert NeoBlock (coming soon)
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "neostacks" && (
        <div>
          <button
            onClick={() => setShowNewStackForm(!showNewStackForm)}
            data-testid="button-create-neostack"
            style={{
              width: "100%",
              padding: "8px 10px",
              background: showNewStackForm ? "rgba(168, 85, 247, 0.2)" : "rgba(59, 130, 246, 0.2)",
              border: showNewStackForm ? "1px solid rgba(168, 85, 247, 0.3)" : "1px solid rgba(59, 130, 246, 0.3)",
              borderRadius: 6,
              color: showNewStackForm ? "#a855f7" : "#3b82f6",
              fontSize: 11,
              cursor: "pointer",
              fontWeight: 500,
              marginBottom: 10
            }}
          >
            {showNewStackForm ? "Cancel" : "+ Create NeoStack"}
          </button>

          {showNewStackForm && (
            <div style={{
              padding: 10,
              background: "rgba(168, 85, 247, 0.08)",
              borderRadius: 6,
              marginBottom: 12
            }}>
              <input
                type="text"
                placeholder="NeoStack name..."
                value={newStackName}
                onChange={(e) => setNewStackName(e.target.value)}
                data-testid="input-neostack-name"
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 4,
                  color: "inherit",
                  fontSize: 11,
                  marginBottom: 8
                }}
              />
              
              <div className="small" style={{ opacity: 0.6, marginBottom: 6 }}>
                Select NeoBlocks to include:
              </div>
              
              {neoBlocks.length === 0 ? (
                <div className="small" style={{ opacity: 0.4, fontStyle: "italic" }}>
                  No NeoBlocks available
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 150, overflow: "auto" }}>
                  {neoBlocks.map(nb => (
                    <label 
                      key={nb.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "4px 6px",
                        background: selectedNeoBlockIds.includes(nb.id) ? "rgba(168, 85, 247, 0.15)" : "transparent",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: 11
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedNeoBlockIds.includes(nb.id)}
                        onChange={() => toggleNeoBlockSelect(nb.id)}
                      />
                      {nb.name} ({getTotalBlockCount(nb)} blocks)
                    </label>
                  ))}
                </div>
              )}
              
              <button
                onClick={handleCreateNeoStack}
                disabled={!newStackName.trim() || selectedNeoBlockIds.length === 0}
                data-testid="button-save-neostack"
                style={{
                  marginTop: 10,
                  width: "100%",
                  padding: "6px 10px",
                  background: newStackName.trim() && selectedNeoBlockIds.length > 0 
                    ? "rgba(34, 197, 94, 0.2)" 
                    : "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                  borderRadius: 4,
                  color: "#22c55e",
                  fontSize: 11,
                  cursor: newStackName.trim() && selectedNeoBlockIds.length > 0 ? "pointer" : "not-allowed",
                  opacity: newStackName.trim() && selectedNeoBlockIds.length > 0 ? 1 : 0.5
                }}
              >
                Save NeoStack
              </button>
            </div>
          )}

          <div className="small" style={{ opacity: 0.6, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            NeoStacks ({neoStacks.length})
          </div>
          
          {neoStacks.length === 0 ? (
            <div className="small" style={{ opacity: 0.4, fontStyle: "italic" }}>
              No NeoStacks created yet
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {neoStacks.map(ns => (
                <div 
                  key={ns.id}
                  style={{
                    padding: 10,
                    background: "rgba(59, 130, 246, 0.05)",
                    borderRadius: 6,
                    border: "1px solid rgba(59, 130, 246, 0.15)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 12 }}>{ns.name}</div>
                      <div className="mono" style={{ fontSize: 10, opacity: 0.5 }}>
                        {ns.neoBlockIds.length} NeoBlocks | {formatDate(ns.createdAt)}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        onClick={() => setExpandedNeoStackId(expandedNeoStackId === ns.id ? null : ns.id)}
                        style={{
                          padding: "3px 8px",
                          background: expandedNeoStackId === ns.id ? "rgba(59, 130, 246, 0.2)" : "transparent",
                          border: "1px solid rgba(59, 130, 246, 0.3)",
                          borderRadius: 4,
                          color: "#3b82f6",
                          fontSize: 10,
                          cursor: "pointer"
                        }}
                      >
                        {expandedNeoStackId === ns.id ? "Hide" : "Details"}
                      </button>
                      <button
                        onClick={() => handleDeleteNeoStack(ns.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          fontSize: 14,
                          padding: 2,
                          opacity: 0.6
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  
                  {expandedNeoStackId === ns.id && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                      {ns.neoBlockIds.map(nbId => {
                        const nb = neoBlocks.find(n => n.id === nbId);
                        if (!nb) return (
                          <div key={nbId} className="small" style={{ opacity: 0.4 }}>
                            Missing: {nbId}
                          </div>
                        );
                        return (
                          <NeoBlockPreview 
                            key={nb.id}
                            title={nb.name}
                            lanes={nb.lanes}
                            blocksById={blocksById}
                            compact={true}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "sleeves" && (
        <div>
          <button
            onClick={() => setShowSaveSleeveForm(!showSaveSleeveForm)}
            data-testid="button-save-sleeve"
            style={{
              width: "100%",
              padding: "8px 10px",
              background: showSaveSleeveForm ? "rgba(168, 85, 247, 0.2)" : "rgba(34, 197, 94, 0.2)",
              border: showSaveSleeveForm ? "1px solid rgba(168, 85, 247, 0.3)" : "1px solid rgba(34, 197, 94, 0.3)",
              borderRadius: 6,
              color: showSaveSleeveForm ? "#a855f7" : "#22c55e",
              fontSize: 11,
              cursor: "pointer",
              fontWeight: 500,
              marginBottom: 10
            }}
          >
            {showSaveSleeveForm ? "Cancel" : "Save current sleeve to Library"}
          </button>

          {showSaveSleeveForm && (
            <div style={{
              padding: 10,
              background: "rgba(34, 197, 94, 0.08)",
              borderRadius: 6,
              marginBottom: 12
            }}>
              <input
                type="text"
                placeholder="Sleeve name..."
                value={newSleeveName}
                onChange={(e) => setNewSleeveName(e.target.value)}
                data-testid="input-sleeve-name"
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 4,
                  color: "inherit",
                  fontSize: 11,
                  marginBottom: 8
                }}
              />
              
              <button
                onClick={handleSaveSleeve}
                disabled={!newSleeveName.trim()}
                data-testid="button-confirm-save-sleeve"
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  background: newSleeveName.trim() ? "rgba(34, 197, 94, 0.2)" : "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                  borderRadius: 4,
                  color: "#22c55e",
                  fontSize: 11,
                  cursor: newSleeveName.trim() ? "pointer" : "not-allowed",
                  opacity: newSleeveName.trim() ? 1 : 0.5
                }}
              >
                Save Sleeve
              </button>
            </div>
          )}

          <div className="small" style={{ opacity: 0.6, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Saved Sleeves ({sleeves.length})
          </div>
          
          {sleeves.length === 0 ? (
            <div className="small" style={{ opacity: 0.4, fontStyle: "italic" }}>
              No sleeves saved yet
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sleeves.map(sl => (
                <div 
                  key={sl.id}
                  style={{
                    padding: 10,
                    background: "rgba(34, 197, 94, 0.05)",
                    borderRadius: 6,
                    border: "1px solid rgba(34, 197, 94, 0.15)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 12 }}>{sl.name}</div>
                      <div className="mono" style={{ fontSize: 10, opacity: 0.5 }}>
                        {formatDate(sl.createdAt)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteSleeve(sl.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        fontSize: 14,
                        padding: 2,
                        opacity: 0.6
                      }}
                    >
                      ×
                    </button>
                  </div>
                  
                  {confirmLoadSleeveId === sl.id ? (
                    <div style={{ marginTop: 8, padding: 8, background: "rgba(234, 179, 8, 0.1)", borderRadius: 4 }}>
                      <div className="small" style={{ color: "#eab308", marginBottom: 6 }}>
                        Replace current sleeve?
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => handleLoadSleeve(sl.id)}
                          data-testid={`button-confirm-load-${sl.id}`}
                          style={{
                            flex: 1,
                            padding: "4px 8px",
                            background: "rgba(34, 197, 94, 0.2)",
                            border: "1px solid rgba(34, 197, 94, 0.3)",
                            borderRadius: 4,
                            color: "#22c55e",
                            fontSize: 10,
                            cursor: "pointer"
                          }}
                        >
                          Yes, Load
                        </button>
                        <button
                          onClick={() => setConfirmLoadSleeveId(null)}
                          style={{
                            flex: 1,
                            padding: "4px 8px",
                            background: "transparent",
                            border: "1px solid rgba(255,255,255,0.15)",
                            borderRadius: 4,
                            color: "inherit",
                            fontSize: 10,
                            cursor: "pointer"
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmLoadSleeveId(sl.id)}
                      data-testid={`button-load-sleeve-${sl.id}`}
                      style={{
                        marginTop: 8,
                        width: "100%",
                        padding: "5px 8px",
                        background: "rgba(59, 130, 246, 0.2)",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                        borderRadius: 4,
                        color: "#3b82f6",
                        fontSize: 10,
                        cursor: "pointer"
                      }}
                    >
                      Load Sleeve
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
