import { useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import CreatorMode from "./pages/CreatorMode";
import "./styles.css";

function Root() {
  const [mode, setMode] = useState<"studio" | "creator">("studio");

  return (
    <>
      <div style={{
        position: "fixed",
        top: 10,
        right: 10,
        zIndex: 9999,
        display: "flex",
        gap: 4,
        background: "rgba(20,20,30,0.95)",
        padding: "4px 6px",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.15)"
      }}>
        <button
          onClick={() => setMode("studio")}
          data-testid="button-mode-studio"
          style={{
            padding: "6px 12px",
            fontSize: 11,
            fontWeight: 600,
            background: mode === "studio" ? "rgba(96, 165, 250, 0.3)" : "transparent",
            border: mode === "studio" ? "1px solid rgba(96, 165, 250, 0.5)" : "1px solid transparent",
            borderRadius: 6,
            color: mode === "studio" ? "#60a5fa" : "rgba(255,255,255,0.6)",
            cursor: "pointer"
          }}
        >
          STUDIO
        </button>
        <button
          onClick={() => setMode("creator")}
          data-testid="button-mode-creator"
          style={{
            padding: "6px 12px",
            fontSize: 11,
            fontWeight: 600,
            background: mode === "creator" ? "rgba(34, 197, 94, 0.3)" : "transparent",
            border: mode === "creator" ? "1px solid rgba(34, 197, 94, 0.5)" : "1px solid transparent",
            borderRadius: 6,
            color: mode === "creator" ? "#22c55e" : "rgba(255,255,255,0.6)",
            cursor: "pointer"
          }}
        >
          v0 CREATOR
        </button>
      </div>
      {mode === "studio" ? <App /> : <CreatorMode />}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<Root />);
