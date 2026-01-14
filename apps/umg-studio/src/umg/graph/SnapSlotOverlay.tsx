import { useUmgStore } from "../store";
import { getSnapSlots, type SnapSlot } from "./snapSlots";

const isMobile = typeof window !== "undefined" && window.innerWidth < 900;

export function SnapSlotOverlay() {
  const { movingNodeId, nodes, moveNodeToSlot, cancelMove, nodePositions } = useUmgStore(s => ({
    movingNodeId: s.movingNodeId,
    nodes: s.blocks.length > 0 || s.neoBlocks.length > 0,
    moveNodeToSlot: s.moveNodeToSlot,
    cancelMove: s.cancelMove,
    nodePositions: s.nodePositions,
  }));

  if (!movingNodeId) return null;

  const compact = isMobile;
  const slots = getSnapSlots(compact);

  const occupiedSlots = new Set<string>();
  for (const [_nodeId, pos] of Object.entries(nodePositions)) {
    for (const slot of slots) {
      if (Math.abs(slot.x - pos.x) < 20 && Math.abs(slot.y - pos.y) < 20) {
        occupiedSlots.add(slot.id);
      }
    }
  }

  const handleSlotClick = (slot: SnapSlot) => {
    if (occupiedSlots.has(slot.id)) return;
    moveNodeToSlot(movingNodeId, slot.id, slot.x, slot.y);
  };

  return (
    <div style={overlay} onClick={cancelMove} data-testid="snap-slot-overlay">
      <div style={header}>
        <span style={{ color: "#22c55e", fontWeight: 700 }}>Move Mode</span>
        <span style={{ opacity: 0.7, marginLeft: 8 }}>Tap a green slot to move, tap anywhere else to cancel</span>
      </div>
      {slots.map(slot => {
        const occupied = occupiedSlots.has(slot.id);
        return (
          <div
            key={slot.id}
            onClick={(e) => {
              e.stopPropagation();
              handleSlotClick(slot);
            }}
            style={{
              ...slotCircle,
              left: slot.x,
              top: slot.y,
              borderColor: occupied ? "#ef4444" : "#22c55e",
              background: occupied ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)",
              cursor: occupied ? "not-allowed" : "pointer",
              animation: occupied ? "none" : "pulse-green 1.5s infinite",
            }}
            data-testid={`slot-${slot.id}`}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: occupied ? "#ef4444" : "#22c55e" }}>
              {slot.label}
            </span>
          </div>
        );
      })}
      <style>{`
        @keyframes pulse-green {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
        }
        @keyframes pulse-selected {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5); }
          50% { box-shadow: 0 0 12px 4px rgba(34, 197, 94, 0.3); }
        }
      `}</style>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(0, 0, 0, 0.6)",
  zIndex: 100,
};

const header: React.CSSProperties = {
  position: "absolute",
  top: 12,
  left: 12,
  fontSize: 13,
  color: "#e0e0e0",
  background: "rgba(20, 20, 28, 0.95)",
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid rgba(34, 197, 94, 0.3)",
};

const slotCircle: React.CSSProperties = {
  position: "absolute",
  width: 48,
  height: 48,
  borderRadius: "50%",
  border: "3px solid",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transform: "translate(-50%, -50%)",
};
