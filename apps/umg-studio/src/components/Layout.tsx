import React, { useState, useEffect } from "react";
import MobileDrawer from "./MobileDrawer";

interface LayoutProps {
  top: React.ReactNode;
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
  isMobile: boolean;
  leftDrawerOpen: boolean;
  rightDrawerOpen: boolean;
  onCloseLeftDrawer: () => void;
  onCloseRightDrawer: () => void;
}

export function useIsMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState(() => 
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint]);

  return isMobile;
}

export default function Layout({ 
  top, 
  left, 
  center, 
  right, 
  isMobile,
  leftDrawerOpen,
  rightDrawerOpen,
  onCloseLeftDrawer,
  onCloseRightDrawer
}: LayoutProps) {
  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      height: "100vh", 
      background: "#0d0d0d", 
      color: "#fff",
      overflow: "hidden"
    }}>
      <header style={{ 
        height: 48, 
        borderBottom: "1px solid rgba(255,255,255,0.08)", 
        flexShrink: 0 
      }}>
        {top}
      </header>
      <div style={{ 
        display: "flex", 
        flex: 1, 
        minHeight: 0,
        overflow: "hidden" 
      }}>
        {!isMobile && (
          <aside style={{ 
            width: 260, 
            borderRight: "1px solid rgba(255,255,255,0.08)", 
            overflow: "auto", 
            padding: 12,
            flexShrink: 0
          }}>
            {left}
          </aside>
        )}
        <main style={{ 
          flex: 1, 
          minHeight: 0,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}>
          <div style={{
            flex: 1,
            minHeight: 0,
            height: "100%",
            width: "100%",
            overflow: "hidden"
          }}>
            {center}
          </div>
        </main>
        {!isMobile && (
          <aside style={{ 
            width: 400, 
            borderLeft: "1px solid rgba(255,255,255,0.08)", 
            overflow: "auto", 
            padding: 12,
            flexShrink: 0
          }}>
            {right}
          </aside>
        )}
      </div>

      {isMobile && (
        <>
          <MobileDrawer
            isOpen={leftDrawerOpen}
            onClose={onCloseLeftDrawer}
            side="left"
            title="Library"
          >
            {left}
          </MobileDrawer>
          <MobileDrawer
            isOpen={rightDrawerOpen}
            onClose={onCloseRightDrawer}
            side="right"
            title="Output"
          >
            {right}
          </MobileDrawer>
        </>
      )}
    </div>
  );
}
