import { useState } from "react";
import { useUmgStore } from "../store";

const btnStyle: React.CSSProperties = {
  padding: "6px 12px",
  fontSize: 12,
  background: "#1e293b",
  border: "1px solid #334155",
  color: "#e2e8f0",
  borderRadius: 4,
  cursor: "pointer",
};

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};

const modalBox: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 8,
  padding: 20,
  width: "90%",
  maxWidth: 500,
  maxHeight: "80vh",
  overflow: "auto",
};

export function ImportExportControls() {
  const exportStateToJson = useUmgStore(s => s.exportStateToJson);
  const importStateFromJson = useUmgStore(s => s.importStateFromJson);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleExport = async () => {
    const json = exportStateToJson();
    try {
      await navigator.clipboard.writeText(json);
      showToast("Copied to clipboard");
    } catch {
      showToast("Copy failed - check browser permissions");
    }
  };

  const handleImport = () => {
    setImportError(null);
    const result = importStateFromJson(importText);
    if (result.ok) {
      setShowImportModal(false);
      setImportText("");
      showToast("Imported successfully");
    } else {
      setImportError(result.error);
    }
  };

  const openImportModal = () => {
    setImportText("");
    setImportError(null);
    setShowImportModal(true);
  };

  return (
    <>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={btnStyle} onClick={handleExport} data-testid="button-export">
          Export
        </button>
        <button style={btnStyle} onClick={openImportModal} data-testid="button-import">
          Import
        </button>
      </div>

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#22c55e",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: 4,
            fontSize: 13,
            zIndex: 10000,
          }}
        >
          {toast}
        </div>
      )}

      {showImportModal && (
        <div style={modalOverlay} onClick={() => setShowImportModal(false)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 12px", fontSize: 16, color: "#e2e8f0" }}>
              Import UMG Bundle
            </h3>
            <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
              Paste a previously exported JSON bundle below.
            </p>
            <textarea
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder='{"schema":"umg-studio-export","version":1,...}'
              style={{
                width: "100%",
                minHeight: 150,
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: 4,
                color: "#e2e8f0",
                fontFamily: "monospace",
                fontSize: 11,
                padding: 10,
                resize: "vertical",
              }}
              data-testid="textarea-import"
            />
            {importError && (
              <div
                style={{
                  marginTop: 10,
                  padding: 10,
                  background: "#7f1d1d",
                  border: "1px solid #dc2626",
                  borderRadius: 4,
                  color: "#fca5a5",
                  fontSize: 12,
                }}
                data-testid="text-import-error"
              >
                {importError}
              </div>
            )}
            <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                style={{ ...btnStyle, background: "#334155" }}
                onClick={() => setShowImportModal(false)}
                data-testid="button-import-cancel"
              >
                Cancel
              </button>
              <button
                style={{ ...btnStyle, background: "#2563eb" }}
                onClick={handleImport}
                data-testid="button-import-confirm"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
