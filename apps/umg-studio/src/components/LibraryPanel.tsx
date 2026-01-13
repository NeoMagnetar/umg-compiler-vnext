import React, { useState, useEffect } from "react";
import { getStacks, findBlockInSleeve, insertBlockIntoStackByMolt, getBlocksById, addStack, parseSleeve, addBlockToStack, addBundleOp, addMergeOp, deleteOp, getOps, validateMultiSelectForOp } from "@/lib/sleeveEdit";
import { 
  listLibraryBlocks, 
  saveBlockTemplate, 
  deleteBlockTemplate, 
  mintBlockId,
  LibraryBlock 
} from "@/lib/library/store";
import { listNeoBlocks, loadNeoBlock, NeoBlock, getTotalBlockCount } from "@/lib/library/neoblockStore";
import { listNeoStacks, saveNeoStack, deleteNeoStack, loadNeoStack, NeoStack } from "@/lib/library/neostackStore";
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

type SectionType = "vault" | "neobase" | "station" | "facility" | "tools" | null;

interface LibraryPanelProps {
  sleeveJson: string;
  selectedBlockId: string | null;
  selectedBlockIds?: string[];
  onChangeSleeveJson: (next: string) => void;
  onClearMultiSelect?: () => void;
}

export default function LibraryPanel({ sleeveJson, selectedBlockId, selectedBlockIds = [], onChangeSleeveJson, onClearMultiSelect }: LibraryPanelProps) {
  const [openSection, setOpenSection] = useState<SectionType>(null);
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
  const [selectedMoltType, setSelectedMoltType] = useState<string>("instruction");

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

  const ops = getOps(sleeveJson);
  const multiSelectValidation = validateMultiSelectForOp(sleeveJson, selectedBlockIds);

  const getStackNameById = (stackId: string): string => {
    const stack = stacks.find(s => s.id === stackId);
    return stack?.name ?? stackId;
  };

  const handleBundle = () => {
    if (!multiSelectValidation.valid || !multiSelectValidation.stackId || !multiSelectValidation.lane) {
      showMessage(multiSelectValidation.error ?? "Invalid selection");
      return;
    }

    const result = addBundleOp(sleeveJson, {
      stackId: multiSelectValidation.stackId,
      lane: multiSelectValidation.lane,
      blockIds: selectedBlockIds
    });

    if (result.error) {
      showMessage(result.error);
    } else if (result.nextJson) {
      onChangeSleeveJson(result.nextJson);
      onClearMultiSelect?.();
      showMessage("Bundle created!");
    }
  };

  const handleMerge = () => {
    if (!multiSelectValidation.valid || !multiSelectValidation.stackId || !multiSelectValidation.lane) {
      showMessage(multiSelectValidation.error ?? "Invalid selection");
      return;
    }

    const result = addMergeOp(sleeveJson, {
      stackId: multiSelectValidation.stackId,
      lane: multiSelectValidation.lane,
      blockIds: selectedBlockIds
    });

    if (result.error) {
      showMessage(result.error);
    } else if (result.nextJson) {
      onChangeSleeveJson(result.nextJson);
      onClearMultiSelect?.();
      showMessage("Merge created!");
    }
  };

  const handleDeleteOp = (opId: string) => {
    const result = deleteOp(sleeveJson, opId);
    if (result.error) {
      showMessage(result.error);
    } else if (result.nextJson) {
      onChangeSleeveJson(result.nextJson);
    }
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

  const handleAddBlock = () => {
    if (!insertStackId) {
      showMessage("Select a stack first");
      return;
    }
    const result = addBlockToStack(sleeveJson, insertStackId, {
      moltType: selectedMoltType
    });
    if (result.error) {
      showMessage(`Error: ${result.error}`);
    } else if (result.nextJson) {
      onChangeSleeveJson(result.nextJson);
      showMessage("Block added!");
    }
  };

  const handleAddStack = () => {
    const result = addStack(sleeveJson, {});
    if (result.error) {
      showMessage(`Error: ${result.error}`);
    } else if (result.nextJson) {
      onChangeSleeveJson(result.nextJson);
      showMessage("Stack created!");
    }
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

  const handleInsertNeoBlock = (neoBlock: NeoBlock) => {
    if (!insertStackId) {
      showMessage("Select a target stack first");
      return;
    }

    let currentJson = sleeveJson;
    let insertedCount = 0;
    const laneOrder: (keyof NeoBlock["lanes"])[] = [
      "trigger", "directive", "instruction", "subject", "primary", "philosophy", "blueprint"
    ];

    for (const lane of laneOrder) {
      const blockIds = neoBlock.lanes[lane];
      if (!blockIds || blockIds.length === 0) continue;

      for (const sourceBlockId of blockIds) {
        const sourceBlock = blocksById[sourceBlockId];
        const newId = mintBlockId(lane, sourceBlock?.title ?? "template");
        
        const blockData = sourceBlock ?? {
          title: "(missing template)",
          moltType: lane,
          content: "",
          tags: ["placeholder"],
          priorityOrder: 10
        };

        const result = insertBlockIntoStackByMolt(currentJson, insertStackId, {
          id: newId,
          title: blockData.title,
          moltType: lane,
          content: blockData.content || "",
          tags: [...(blockData.tags || [])],
          priorityOrder: blockData.priorityOrder ?? 10
        });

        if (result.nextJson) {
          currentJson = result.nextJson;
          insertedCount++;
        }
      }
    }

    if (insertedCount > 0) {
      onChangeSleeveJson(currentJson);
      showMessage(`Inserted ${insertedCount} blocks from NeoBlock`);
    } else {
      showMessage("Error: No blocks inserted");
    }
  };

  const handleInsertNeoStack = (neoStackId: string) => {
    const neoStack = loadNeoStack(neoStackId);
    if (!neoStack) {
      showMessage("Error: NeoStack not found");
      return;
    }

    let currentJson = sleeveJson;
    let stacksCreated = 0;
    let blocksInserted = 0;
    const laneOrder: (keyof NeoBlock["lanes"])[] = [
      "trigger", "directive", "instruction", "subject", "primary", "philosophy", "blueprint"
    ];

    for (const neoBlockId of neoStack.neoBlockIds) {
      const neoBlock = loadNeoBlock(neoBlockId);
      if (!neoBlock) continue;

      const newStackResult = addStack(currentJson, {
        name: `Stack: ${neoBlock.name}`
      });

      if (!newStackResult.nextJson) continue;
      currentJson = newStackResult.nextJson;

      const { sleeve } = parseSleeve(currentJson);
      const newStackId = sleeve?.stacks?.[sleeve.stacks.length - 1]?.id;
      if (!newStackId) continue;

      stacksCreated++;

      for (const lane of laneOrder) {
        const blockIds = neoBlock.lanes[lane];
        if (!blockIds || blockIds.length === 0) continue;

        for (const sourceBlockId of blockIds) {
          const sourceBlock = blocksById[sourceBlockId];
          const newId = mintBlockId(lane, sourceBlock?.title ?? "template");
          
          const blockData = sourceBlock ?? {
            title: "(missing template)",
            moltType: lane,
            content: "",
            tags: ["placeholder"],
            priorityOrder: 10
          };

          const result = insertBlockIntoStackByMolt(currentJson, newStackId, {
            id: newId,
            title: blockData.title,
            moltType: lane,
            content: blockData.content || "",
            tags: [...(blockData.tags || [])],
            priorityOrder: blockData.priorityOrder ?? 10
          });

          if (result.nextJson) {
            currentJson = result.nextJson;
            blocksInserted++;
          }
        }
      }
    }

    if (stacksCreated > 0) {
      onChangeSleeveJson(currentJson);
      showMessage(`Created ${stacksCreated} stacks with ${blocksInserted} blocks`);
    } else {
      showMessage("Error: No stacks created");
    }
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

  const toggleSection = (section: SectionType) => {
    setOpenSection(prev => prev === section ? null : section);
  };

  const getStackMetadata = (stackId: string) => {
    const stack = stacks.find(s => s.id === stackId);
    if (!stack) return { blockCount: 0, bundleCount: 0, mergeCount: 0, tagCount: 0 };
    
    const stackBlocks = (stack as any).blockIds ?? [];
    const bundleCount = ops.bundles.filter((b: any) => b.stackId === stackId).length;
    const mergeCount = ops.merges.filter((m: any) => m.stackId === stackId).length;
    
    let tagCount = 0;
    for (const blockId of stackBlocks) {
      const block = blocksById[blockId];
      if (block?.tags) tagCount += block.tags.length;
    }
    
    return { 
      blockCount: stackBlocks.length, 
      bundleCount, 
      mergeCount, 
      tagCount 
    };
  };

  const goldGlowStyle = (isOpen: boolean) => ({
    boxShadow: isOpen ? "0 0 12px rgba(255, 215, 0, 0.4), inset 0 0 8px rgba(255, 215, 0, 0.1)" : "none",
    border: isOpen ? "1px solid rgba(255, 215, 0, 0.5)" : "1px solid rgba(255,255,255,0.1)",
    transition: "all 0.3s ease"
  });

  const sectionHeaderStyle = (isOpen: boolean) => ({
    width: "100%",
    padding: "10px 12px",
    background: isOpen ? "rgba(255, 215, 0, 0.08)" : "rgba(255,255,255,0.03)",
    borderRadius: 6,
    color: isOpen ? "#ffd700" : "inherit",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "left" as const,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    ...goldGlowStyle(isOpen)
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button
        className="btn"
        onClick={handleAddStack}
        data-testid="button-add-stack"
        style={{ 
          width: "100%", 
          fontSize: 12,
          padding: "10px 12px",
          background: "rgba(0, 255, 0, 0.15)",
          border: "1px solid rgba(0, 255, 0, 0.3)",
          color: "#00ff00",
          fontWeight: 600
        }}
      >
        + New MOLT Stack
      </button>

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

      <div style={{ 
        padding: "8px 0", 
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        marginBottom: 4
      }}>
        <div style={{ 
          fontSize: 13, 
          fontWeight: 700, 
          color: "#ffd700",
          textTransform: "uppercase",
          letterSpacing: "1px",
          marginBottom: 8
        }}>
          Block Bank
        </div>
        
        <div style={{ marginBottom: 8 }}>
          <div className="small" style={{ opacity: 0.5, marginBottom: 6, fontSize: 10 }}>
            Active Stacks
          </div>
          {stacks.map(s => {
            const meta = getStackMetadata(s.id);
            return (
              <div 
                key={s.id}
                style={{
                  padding: "6px 8px",
                  marginBottom: 4,
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 4,
                  fontSize: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div style={{ fontWeight: 500, fontSize: 11 }}>{s.name}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span title="Blocks" style={{ 
                    padding: "2px 5px", 
                    background: "rgba(0, 255, 0, 0.15)", 
                    borderRadius: 3,
                    color: "#00ff00",
                    fontSize: 9
                  }}>
                    {meta.blockCount}
                  </span>
                  {(meta.bundleCount > 0 || meta.mergeCount > 0) && (
                    <span title="Bundles/Merges" style={{ 
                      padding: "2px 5px", 
                      background: "rgba(168, 85, 247, 0.15)", 
                      borderRadius: 3,
                      color: "#a855f7",
                      fontSize: 9
                    }}>
                      {meta.bundleCount}B/{meta.mergeCount}M
                    </span>
                  )}
                  {meta.tagCount > 0 && (
                    <span title="Tags" style={{ 
                      padding: "2px 5px", 
                      background: "rgba(59, 130, 246, 0.15)", 
                      borderRadius: 3,
                      color: "#3b82f6",
                      fontSize: 9
                    }}>
                      {meta.tagCount}T
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <button
          onClick={() => toggleSection("vault")}
          data-testid="section-block-vault"
          style={sectionHeaderStyle(openSection === "vault")}
        >
          <span>Block Vault</span>
          <span style={{ fontSize: 10, opacity: 0.6 }}>({libraryBlocks.length})</span>
        </button>
        {openSection === "vault" && (
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
              Add Block to Lane
            </div>
            <div style={{ marginBottom: 8 }}>
              <label className="small" style={{ display: "block", marginBottom: 4, opacity: 0.5 }}>MOLT Type</label>
              <select
                value={selectedMoltType}
                onChange={(e) => setSelectedMoltType(e.target.value)}
                data-testid="select-molt-type"
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 4,
                  color: "inherit",
                  fontSize: 12
                }}
              >
                {MOLT_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <button
              className="btn"
              onClick={handleAddBlock}
              disabled={!insertStackId}
              data-testid="button-add-block-to-lane"
              style={{ 
                width: "100%", 
                fontSize: 12,
                opacity: insertStackId ? 1 : 0.5,
                cursor: insertStackId ? "pointer" : "not-allowed"
              }}
            >
              + Add Block
            </button>
          </div>

          </>
        )}
      </div>

      <div>
        <button
          onClick={() => toggleSection("neobase")}
          data-testid="section-neoblock-base"
          style={sectionHeaderStyle(openSection === "neobase")}
        >
          <span>NeoBlock Base</span>
          <span style={{ fontSize: 10, opacity: 0.6 }}>({neoBlocks.length})</span>
        </button>
        {openSection === "neobase" && (
          <div style={{ padding: "10px 0" }}>
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
                  
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                    <select
                      value={insertStackId}
                      onChange={(e) => setInsertStackId(e.target.value)}
                      data-testid={`select-neoblock-target-${nb.id}`}
                      style={{
                        width: "100%",
                        padding: "4px 6px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 4,
                        color: "inherit",
                        fontSize: 10
                      }}
                    >
                      <option value="">Select target stack...</option>
                      {stacks.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleInsertNeoBlock(nb)}
                      disabled={!insertStackId}
                      data-testid={`button-insert-neoblock-${nb.id}`}
                      style={{
                        width: "100%",
                        padding: "5px 8px",
                        background: insertStackId ? "rgba(34, 197, 94, 0.2)" : "rgba(255,255,255,0.03)",
                        border: insertStackId ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 4,
                        color: insertStackId ? "#22c55e" : "inherit",
                        fontSize: 10,
                        cursor: insertStackId ? "pointer" : "not-allowed",
                        opacity: insertStackId ? 1 : 0.4
                      }}
                    >
                      Insert NeoBlock into Stack
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        )}
      </div>

      <div>
        <button
          onClick={() => toggleSection("station")}
          data-testid="section-neostack-station"
          style={sectionHeaderStyle(openSection === "station")}
        >
          <span>NeoStack Station</span>
          <span style={{ fontSize: 10, opacity: 0.6 }}>({neoStacks.length})</span>
        </button>
        {openSection === "station" && (
          <div style={{ padding: "10px 0" }}>
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
                  
                  <button
                    onClick={() => handleInsertNeoStack(ns.id)}
                    data-testid={`button-insert-neostack-${ns.id}`}
                    style={{
                      marginTop: 8,
                      width: "100%",
                      padding: "5px 8px",
                      background: "rgba(34, 197, 94, 0.2)",
                      border: "1px solid rgba(34, 197, 94, 0.3)",
                      borderRadius: 4,
                      color: "#22c55e",
                      fontSize: 10,
                      cursor: "pointer"
                    }}
                  >
                    Insert NeoStack into Sleeve
                  </button>
                </div>
              ))}
            </div>
          )}
          </div>
        )}
      </div>

      <div>
        <button
          onClick={() => toggleSection("facility")}
          data-testid="section-resleeving-facility"
          style={sectionHeaderStyle(openSection === "facility")}
        >
          <span>Resleeving Facility</span>
          <span style={{ fontSize: 10, opacity: 0.6 }}>({sleeves.length})</span>
        </button>
        {openSection === "facility" && (
          <div style={{ padding: "10px 0" }}>
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

      <div style={{ 
        padding: "8px 0", 
        borderTop: "1px solid rgba(255,255,255,0.08)",
        marginTop: 8
      }}>
        <div style={{ 
          fontSize: 13, 
          fontWeight: 700, 
          color: "#ffd700",
          textTransform: "uppercase",
          letterSpacing: "1px",
          marginBottom: 8
        }}>
          Universal Tools
        </div>
      </div>

      <div>
        <button
          onClick={() => toggleSection("tools")}
          data-testid="section-universal-tools"
          style={sectionHeaderStyle(openSection === "tools")}
        >
          <span>Ops (Bundle/Merge)</span>
          <span style={{ fontSize: 10, opacity: 0.6 }}>
            ({ops.bundles.length + ops.merges.length})
          </span>
        </button>
        {openSection === "tools" && (
          <div style={{ padding: "10px 0" }}>
            {selectedBlockIds.length >= 2 && (
              <div style={{ marginBottom: 8 }}>
                {multiSelectValidation.valid ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={handleBundle}
                      style={{
                        flex: 1,
                        padding: "6px 8px",
                        background: "rgba(59, 130, 246, 0.2)",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                        borderRadius: 4,
                        color: "#3b82f6",
                        fontSize: 11,
                        cursor: "pointer"
                      }}
                    >
                      Bundle ({selectedBlockIds.length})
                    </button>
                    <button
                      onClick={handleMerge}
                      style={{
                        flex: 1,
                        padding: "6px 8px",
                        background: "rgba(34, 197, 94, 0.2)",
                        border: "1px solid rgba(34, 197, 94, 0.3)",
                        borderRadius: 4,
                        color: "#22c55e",
                        fontSize: 11,
                        cursor: "pointer"
                      }}
                    >
                      Merge ({selectedBlockIds.length})
                    </button>
                  </div>
                ) : (
                  <div style={{
                    padding: 8,
                    background: "rgba(234, 179, 8, 0.1)",
                    borderRadius: 4,
                    fontSize: 11,
                    color: "#eab308"
                  }}>
                    {multiSelectValidation.error}
                  </div>
                )}
              </div>
            )}

            {selectedBlockIds.length > 0 && selectedBlockIds.length < 2 && (
              <div style={{
                padding: 8,
                background: "rgba(255,255,255,0.03)",
                borderRadius: 4,
                fontSize: 11,
                opacity: 0.5
              }}>
                Select 2+ blocks (Shift+Click) to Bundle/Merge
              </div>
            )}

            {selectedBlockIds.length === 0 && (
              <div style={{
                padding: 8,
                background: "rgba(255,255,255,0.03)",
                borderRadius: 4,
                fontSize: 11,
                opacity: 0.5
              }}>
                Use Shift+Click or Select Mode to multi-select blocks
              </div>
            )}

            {(ops.bundles.length > 0 || ops.merges.length > 0) && (
              <div style={{ marginTop: 8 }}>
                {ops.bundles.map((op: any) => (
                  <div 
                    key={op.id}
                    style={{
                      padding: 8,
                      marginBottom: 4,
                      background: "rgba(59, 130, 246, 0.1)",
                      borderRadius: 4,
                      fontSize: 11,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <span style={{ color: "#3b82f6", fontWeight: 500 }}>Bundle</span>
                      <span style={{ opacity: 0.6, marginLeft: 6 }}>
                        {getStackNameById(op.stackId)} / {op.lane} ({op.blockIds.length})
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteOp(op.id)}
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
                      x
                    </button>
                  </div>
                ))}
                {ops.merges.map((op: any) => (
                  <div 
                    key={op.id}
                    style={{
                      padding: 8,
                      marginBottom: 4,
                      background: "rgba(34, 197, 94, 0.1)",
                      borderRadius: 4,
                      fontSize: 11,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <span style={{ color: "#22c55e", fontWeight: 500 }}>Merge</span>
                      <span style={{ opacity: 0.6, marginLeft: 6 }}>
                        {getStackNameById(op.stackId)} / {op.lane} ({op.blockIds.length})
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteOp(op.id)}
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
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
