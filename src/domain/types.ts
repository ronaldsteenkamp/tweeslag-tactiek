export type TeamId = "A" | "B";

/** Positie in meters. Oorsprong: hoek van het speelveld; x langs de lange zijde. */
export interface Position {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  team: TeamId;
  label: string;
}

export const BALL_ID = "ball";
