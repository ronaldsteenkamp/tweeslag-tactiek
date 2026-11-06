import { create } from "zustand";
import { clampToArea } from "../../domain/geometry";
import { BALL_ID, type Player, type Position } from "../../domain/types";

export const PLAYERS: Player[] = [
  { id: "A1", team: "A", label: "A1" },
  { id: "A2", team: "A", label: "A2" },
  { id: "B1", team: "B", label: "B1" },
  { id: "B2", team: "B", label: "B2" },
];

/** Opslag door A1 achter de eindlijn, ontvangst door team B. */
const START_POSITIONS: Record<string, Position> = {
  A1: { x: -1, y: 2 },
  A2: { x: 6, y: 5 },
  B1: { x: 12, y: 2 },
  B2: { x: 12, y: 6 },
  [BALL_ID]: { x: -0.4, y: 2.8 },
};

interface BoardState {
  positions: Record<string, Position>;
  flipped: boolean;
  moveTo: (id: string, position: Position) => void;
  toggleFlipped: () => void;
  reset: () => void;
}

export const useBoardStore = create<BoardState>((set) => ({
  positions: START_POSITIONS,
  flipped: false,
  moveTo: (id, position) =>
    set((state) => ({
      positions: { ...state.positions, [id]: clampToArea(position) },
    })),
  toggleFlipped: () => set((state) => ({ flipped: !state.flipped })),
  reset: () => set({ positions: START_POSITIONS }),
}));
