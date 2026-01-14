import { useEffect, useState } from "react";

type Props = {
  title: string;
  defaultOpen?: boolean;
  storageKey?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export function CollapsiblePanel({
  title,
  defaultOpen = true,
  storageKey,
  right,
  children,
  style,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (!storageKey) return;
    const raw = localStorage.getItem(storageKey);
    if (raw === "open") setOpen(true);
    if (raw === "closed") setOpen(false);
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, open ? "open" : "closed");
  }, [open, storageKey]);

  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", background: "#0d0d12", ...style }}>
      <div
        style={{
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 10px",
          userSelect: "none",
          cursor: "pointer",
        }}
        onClick={() => setOpen((v) => !v)}
        data-testid="collapsible-panel-header"
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontWeight: 800, fontSize: 12, color: "rgba(255,255,255,0.9)" }}>{title}</span>
          <span style={{ fontSize: 12, opacity: 0.7 }}>{open ? "▾" : "▸"}</span>
        </div>
        <div onClick={(e) => e.stopPropagation()}>{right}</div>
      </div>
      {open ? <div style={{ padding: 10 }}>{children}</div> : null}
    </div>
  );
}
