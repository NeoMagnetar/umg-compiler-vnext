export interface SnapSlot {
  id: string;
  lane: "left" | "center" | "right";
  x: number;
  y: number;
  label: string;
}

export function getSnapSlots(compact: boolean): SnapSlot[] {
  const leftX = compact ? 30 : 60;
  const centerX = compact ? 30 : 400;
  const rightX = compact ? 30 : 760;

  const yStart = 40;
  const yGap = compact ? 90 : 100;

  const slots: SnapSlot[] = [];

  for (let i = 0; i < 5; i++) {
    slots.push({
      id: `left-${i}`,
      lane: "left",
      x: leftX,
      y: compact ? yStart + 650 + i * yGap : yStart + i * yGap,
      label: `L${i + 1}`,
    });
  }

  for (let i = 0; i < 3; i++) {
    slots.push({
      id: `center-${i}`,
      lane: "center",
      x: centerX,
      y: compact ? yStart + i * yGap : yStart + 60 + i * 130,
      label: `C${i + 1}`,
    });
  }

  for (let i = 0; i < 2; i++) {
    slots.push({
      id: `right-${i}`,
      lane: "right",
      x: rightX,
      y: compact ? yStart + 1200 + i * 150 : yStart + 80 + i * 150,
      label: `R${i + 1}`,
    });
  }

  return slots;
}

export function getSlotById(slotId: string, compact: boolean): SnapSlot | undefined {
  return getSnapSlots(compact).find(s => s.id === slotId);
}
