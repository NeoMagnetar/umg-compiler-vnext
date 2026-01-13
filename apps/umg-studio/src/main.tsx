import { useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import CreatorMode from "./pages/CreatorMode";
import "./styles.css";

function Root() {
  const [mode, setMode] = useState<"studio" | "tutorial">("studio");

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{
        height: 48,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "0 12px",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        gap: 8,
        flexShrink: 0,
        background: "#0a0a0f",
        zIndex: 10,
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
          Creator Mode
        </button>
        <button
          onClick={() => setMode("tutorial")}
          data-testid="button-mode-tutorial"
          style={{
            padding: "6px 12px",
            fontSize: 11,
            fontWeight: 600,
            background: mode === "tutorial" ? "rgba(34, 197, 94, 0.3)" : "transparent",
            border: mode === "tutorial" ? "1px solid rgba(34, 197, 94, 0.5)" : "1px solid transparent",
            borderRadius: 6,
            color: mode === "tutorial" ? "#22c55e" : "rgba(255,255,255,0.6)",
            cursor: "pointer"
          }}
        >
          Block Tutorial
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {mode === "studio" ? <App /> : <CreatorMode />}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<Root />);
