import React, { useEffect } from "react";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  side: "left" | "right";
  title: string;
  children: React.ReactNode;
}

export default function MobileDrawer({ 
  isOpen, 
  onClose, 
  side, 
  title, 
  children 
}: MobileDrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        display: "flex"
      }}
      data-testid={`mobile-drawer-${side}`}
    >
      <div 
        onClick={onClose}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(2px)"
        }}
        data-testid="drawer-backdrop"
      />
      
      <div 
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          [side]: 0,
          width: "85%",
          maxWidth: side === "left" ? 320 : 420,
          background: "#0d0d0d",
          borderRight: side === "left" ? "1px solid rgba(255,255,255,0.1)" : "none",
          borderLeft: side === "right" ? "1px solid rgba(255,255,255,0.1)" : "none",
          display: "flex",
          flexDirection: "column",
          animation: `slideIn${side === "left" ? "Left" : "Right"} 0.2s ease-out`
        }}
      >
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          flexShrink: 0
        }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{title}</span>
          <button
            onClick={onClose}
            data-testid="drawer-close"
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              borderRadius: 6,
              color: "#fff",
              padding: "6px 12px",
              fontSize: 12,
              cursor: "pointer"
            }}
          >
            Close
          </button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
          {children}
        </div>
      </div>

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
