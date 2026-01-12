import React, { useState } from "react";
import { exportLibrary, importLibrary, downloadAsFile } from "@/lib/libraryExport";

interface TopBarProps {
  onCompile: () => void;
  onCompileWithOps?: () => void;
  onReset: () => void;
  sleeveJson?: string;
  onImportSleeve?: (json: string) => void;
  selectedBlockId?: string | null;
  isDirty?: boolean;
  blockFoundInSleeve?: boolean;
  selectMode?: boolean;
  onToggleSelectMode?: () => void;
  multiSelectCount?: number;
  onClearMultiSelect?: () => void;
  hasOps?: boolean;
  compileMode?: "raw" | "withOps";
  opsReport?: { bundlesApplied: number; mergesApplied: number; blocksCreated: number } | null;
}

export default function TopBar({ 
  onCompile, 
  onCompileWithOps,
  onReset, 
  sleeveJson,
  onImportSleeve,
  selectedBlockId, 
  isDirty, 
  blockFoundInSleeve,
  selectMode,
  onToggleSelectMode,
  multiSelectCount,
  onClearMultiSelect,
  hasOps,
  compileMode,
  opsReport
}: TopBarProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportModal, setShowImportModal] = useState<"library" | "sleeve" | null>(null);
  const [importText, setImportText] = useState("");
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const handleExportLibrary = () => {
    const json = exportLibrary();
    downloadAsFile(json, `umg-library-${Date.now()}.json`);
    setShowExportMenu(false);
  };

  const handleExportSleeve = () => {
    if (sleeveJson) {
      downloadAsFile(sleeveJson, `sleeve-${Date.now()}.json`);
    }
    setShowExportMenu(false);
  };

  const handleImportLibrary = () => {
    const result = importLibrary(importText);
    if (result.success) {
      const c = result.counts!;
      setImportMessage(`Imported: ${c.blocks} blocks, ${c.neoBlocks} NeoBlocks, ${c.neoStacks} NeoStacks, ${c.sleeves} sleeves`);
      setTimeout(() => {
        setShowImportModal(null);
        setImportText("");
        setImportMessage(null);
      }, 1500);
    } else {
      setImportMessage(`Error: ${result.error}`);
    }
  };

  const handleImportSleeve = () => {
    if (onImportSleeve) {
      try {
        JSON.parse(importText);
        onImportSleeve(importText);
        setShowImportModal(null);
        setImportText("");
      } catch {
        setImportMessage("Error: Invalid JSON");
      }
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", height: "100%", padding: "0 16px", gap: 12 }}>
      <span style={{ fontWeight: 600, fontSize: 15 }}>UMG Studio</span>
      {isDirty && (
        <span style={{ 
          fontSize: 10, 
          padding: "2px 8px", 
          background: "rgba(234, 179, 8, 0.2)",
          color: "#eab308",
          borderRadius: 10,
          fontWeight: 500
        }}>
          unsaved
        </span>
      )}
      {selectedBlockId && (
        <div className="small mono" style={{ opacity: 0.75, display: "flex", alignItems: "center", gap: 6 }}>
          <span>Selected: <span className="hotpink">{selectedBlockId}</span></span>
          <span style={{ 
            fontSize: 9,
            padding: "1px 5px",
            borderRadius: 4,
            background: blockFoundInSleeve 
              ? "rgba(34, 197, 94, 0.2)" 
              : "rgba(239, 68, 68, 0.2)",
            color: blockFoundInSleeve ? "#22c55e" : "#ef4444"
          }}>
            {blockFoundInSleeve ? "found" : "not found"}
          </span>
        </div>
      )}
      
      {(multiSelectCount ?? 0) > 0 && (
        <div className="small" style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: 6,
          padding: "2px 8px",
          background: "rgba(168, 85, 247, 0.2)",
          borderRadius: 10
        }}>
          <span style={{ color: "#a855f7" }}>{multiSelectCount} selected</span>
          <button
            onClick={onClearMultiSelect}
            style={{
              background: "transparent",
              border: "none",
              color: "#a855f7",
              cursor: "pointer",
              fontSize: 12,
              padding: 0
            }}
          >
            ×
          </button>
        </div>
      )}

      <span style={{ flex: 1 }} />

      {compileMode && opsReport && (
        <div className="small" style={{ 
          padding: "3px 8px",
          background: compileMode === "withOps" ? "rgba(168, 85, 247, 0.15)" : "rgba(255,255,255,0.05)",
          borderRadius: 10,
          fontSize: 10,
          display: "flex",
          gap: 8
        }}>
          <span style={{ color: compileMode === "withOps" ? "#a855f7" : "inherit" }}>
            {compileMode === "withOps" ? "With Ops" : "Raw"}
          </span>
          {compileMode === "withOps" && (
            <>
              <span>B:{opsReport.bundlesApplied}</span>
              <span>M:{opsReport.mergesApplied}</span>
            </>
          )}
        </div>
      )}
      
      <button
        className="btn"
        onClick={onToggleSelectMode}
        data-testid="button-toggle-select-mode"
        style={{
          fontSize: 11,
          padding: "4px 10px",
          background: selectMode ? "rgba(168, 85, 247, 0.2)" : "transparent",
          borderColor: selectMode ? "#a855f7" : "rgba(255,255,255,0.2)",
          color: selectMode ? "#a855f7" : "inherit"
        }}
      >
        Select: {selectMode ? "ON" : "OFF"}
      </button>

      <div style={{ position: "relative" }}>
        <button 
          className="btn" 
          onClick={() => setShowExportMenu(!showExportMenu)}
          data-testid="button-export-import-menu"
          style={{ fontSize: 11, padding: "4px 10px" }}
        >
          Export/Import
        </button>
        {showExportMenu && (
          <div style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 4,
            background: "#1a1a1a",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 6,
            padding: 4,
            zIndex: 100,
            minWidth: 150
          }}>
            <button
              onClick={handleExportLibrary}
              data-testid="button-export-library"
              style={{
                width: "100%",
                padding: "6px 10px",
                background: "transparent",
                border: "none",
                color: "inherit",
                fontSize: 11,
                textAlign: "left",
                cursor: "pointer"
              }}
            >
              Export Library JSON
            </button>
            <button
              onClick={handleExportSleeve}
              data-testid="button-export-sleeve"
              style={{
                width: "100%",
                padding: "6px 10px",
                background: "transparent",
                border: "none",
                color: "inherit",
                fontSize: 11,
                textAlign: "left",
                cursor: "pointer"
              }}
            >
              Export Sleeve JSON
            </button>
            <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "4px 0" }} />
            <button
              onClick={() => { setShowImportModal("library"); setShowExportMenu(false); }}
              data-testid="button-import-library"
              style={{
                width: "100%",
                padding: "6px 10px",
                background: "transparent",
                border: "none",
                color: "inherit",
                fontSize: 11,
                textAlign: "left",
                cursor: "pointer"
              }}
            >
              Import Library JSON
            </button>
            <button
              onClick={() => { setShowImportModal("sleeve"); setShowExportMenu(false); }}
              data-testid="button-import-sleeve"
              style={{
                width: "100%",
                padding: "6px 10px",
                background: "transparent",
                border: "none",
                color: "inherit",
                fontSize: 11,
                textAlign: "left",
                cursor: "pointer"
              }}
            >
              Import Sleeve JSON
            </button>
          </div>
        )}
      </div>
      
      <button className="btn" onClick={onCompile} data-testid="button-compile-raw" style={{ position: "relative" }}>
        Compile
        {isDirty && (
          <span style={{
            position: "absolute",
            top: -2,
            right: -2,
            width: 8,
            height: 8,
            background: "#eab308",
            borderRadius: "50%"
          }} />
        )}
      </button>
      {hasOps && onCompileWithOps && (
        <button 
          className="btn" 
          onClick={onCompileWithOps}
          data-testid="button-compile-with-ops"
          style={{ 
            background: "rgba(168, 85, 247, 0.2)",
            borderColor: "#a855f7",
            color: "#a855f7"
          }}
        >
          Compile+Ops
        </button>
      )}
      <button className="btn" onClick={onReset} data-testid="button-reset">Reset</button>

      {showImportModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "#1a1a1a",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 8,
            padding: 20,
            width: "90%",
            maxWidth: 500
          }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>
              Import {showImportModal === "library" ? "Library" : "Sleeve"} JSON
            </div>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste JSON here..."
              data-testid="textarea-import-json"
              style={{
                width: "100%",
                height: 200,
                padding: 10,
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 4,
                color: "inherit",
                fontSize: 11,
                fontFamily: "monospace",
                resize: "vertical"
              }}
            />
            {importMessage && (
              <div style={{
                marginTop: 8,
                padding: 8,
                background: importMessage.startsWith("Error") ? "rgba(239, 68, 68, 0.15)" : "rgba(34, 197, 94, 0.15)",
                borderRadius: 4,
                fontSize: 11,
                color: importMessage.startsWith("Error") ? "#ef4444" : "#22c55e"
              }}>
                {importMessage}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                onClick={showImportModal === "library" ? handleImportLibrary : handleImportSleeve}
                disabled={!importText.trim()}
                data-testid="button-confirm-import"
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  background: importText.trim() ? "rgba(34, 197, 94, 0.2)" : "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                  borderRadius: 4,
                  color: "#22c55e",
                  fontSize: 12,
                  cursor: importText.trim() ? "pointer" : "not-allowed"
                }}
              >
                Import
              </button>
              <button
                onClick={() => { setShowImportModal(null); setImportText(""); setImportMessage(null); }}
                data-testid="button-cancel-import"
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 4,
                  color: "inherit",
                  fontSize: 12,
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
