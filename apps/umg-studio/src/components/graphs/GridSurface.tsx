import React, { useRef, useCallback } from "react";

interface GridSurfaceProps {
  cellSize?: number;
  onPickCell?: (pos: { x: number; y: number }) => void;
  cursorPos?: { x: number; y: number } | null;
  children?: React.ReactNode;
}

export default function GridSurface({
  cellSize = 60,
  onPickCell,
  cursorPos,
  children
}: GridSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || !onPickCell) return;

    const rect = containerRef.current.getBoundingClientRect();
    const scrollLeft = containerRef.current.scrollLeft;
    const scrollTop = containerRef.current.scrollTop;

    const clientX = e.clientX - rect.left + scrollLeft;
    const clientY = e.clientY - rect.top + scrollTop;

    const x = Math.floor(clientX / cellSize);
    const y = Math.floor(clientY / cellSize);

    onPickCell({ x, y });
  }, [cellSize, onPickCell]);

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "auto",
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: `${cellSize}px ${cellSize}px`,
        backgroundColor: "rgba(0,0,0,0.2)"
      }}
      data-testid="grid-surface"
    >
      {cursorPos && (
        <div
          style={{
            position: "absolute",
            left: cursorPos.x * cellSize,
            top: cursorPos.y * cellSize,
            width: cellSize,
            height: cellSize,
            border: "2px dashed rgba(168, 85, 247, 0.6)",
            borderRadius: 4,
            pointerEvents: "none",
            background: "rgba(168, 85, 247, 0.1)"
          }}
          data-testid="grid-cursor"
        />
      )}
      {children}
    </div>
  );
}
