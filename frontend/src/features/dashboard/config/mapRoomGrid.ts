export type RoomGridConfig = {
  startX: number;
  startY: number;
  cols: number;
  rows: number;
  gapX: number;
  gapY: number;
  boxWidth?: number;
  boxHeight?: number;
};

export const ROOM_GRID_CONFIG: Record<string, RoomGridConfig> = {
  W1:  { startX: 65.5, startY: 18.5, cols: 3, rows: 3, gapX: 12.5, gapY: 10.5, boxWidth: 34, boxHeight: 18 },
  W2:  { startX: 59.5, startY: 68.5, cols: 3, rows: 3, gapX: 10.5, gapY: 9.5, boxWidth: 34, boxHeight: 18 },
  W3:  { startX: 25.5, startY: 14.5, cols: 3, rows: 3, gapX: 5.0, gapY: 8.0, boxWidth: 30, boxHeight: 18 },
  W4:  { startX: 26.0, startY: 62.5, cols: 3, rows: 2, gapX: 4.5, gapY: 9.5, boxWidth: 30, boxHeight: 18 },
  W5:  { startX: 16.0, startY: 28.0, cols: 1, rows: 6, gapX: 0.0, gapY: 10.5, boxWidth: 26, boxHeight: 16 },
  G3:  { startX: 27.0, startY: 45.5, cols: 2, rows: 1, gapX: 6.5, gapY: 0.0, boxWidth: 28, boxHeight: 18 },
  CNC: { startX: 94.0, startY: 75.5, cols: 1, rows: 3, gapX: 0.0, gapY: 7.5, boxWidth: 24, boxHeight: 16 },
};

export type GridSlot = {
  x: number;
  y: number;
};

export function generateGridSlots(config: RoomGridConfig): GridSlot[] {
  const slots: GridSlot[] = [];

  for (let row = 0; row < config.rows; row++) {
    for (let col = 0; col < config.cols; col++) {
      slots.push({
        x: config.startX + col * config.gapX,
        y: config.startY + row * config.gapY,
      });
    }
  }

  return slots;
}