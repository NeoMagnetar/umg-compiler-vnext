import React from "react";

interface LayoutProps {
  top: React.ReactNode;
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
}

export default function Layout({ top, left, center, right }: LayoutProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0d0d0d", color: "#fff" }}>
      <header style={{ height: 48, borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
        {top}
      </header>
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <aside style={{ width: 260, borderRight: "1px solid rgba(255,255,255,0.08)", overflow: "auto", padding: 12 }}>
          {left}
        </aside>
        <main style={{ flex: 1, overflow: "auto", padding: 12 }}>
          {center}
        </main>
        <aside style={{ width: 400, borderLeft: "1px solid rgba(255,255,255,0.08)", overflow: "auto", padding: 12 }}>
          {right}
        </aside>
      </div>
    </div>
  );
}
