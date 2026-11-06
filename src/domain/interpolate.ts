import type { Keyframe, Position } from "./schema";

export interface FrameState {
  players: Record<string, Position>;
  ball: Position & { height: number };
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** Rustig optrekken en afremmen, zodat spelers niet schokkerig starten. */
export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * De stand tijdens de overgang van het vorige frame naar `step`.
 * De bal beweegt lineair: alleen zo ziet de boog er natuurlijk uit.
 */
export function frameAt(
  keyframes: Keyframe[],
  step: number,
  progress: number,
): FrameState {
  const to = keyframes[step];
  if (!to) throw new Error(`Stap ${step} bestaat niet`);
  const from = keyframes[step - 1] ?? to;
  const t = clamp01(progress);
  const eased = easeInOut(t);

  const players: Record<string, Position> = {};
  for (const [id, end] of Object.entries(to.players)) {
    const start = from.players[id] ?? end;
    players[id] = {
      x: lerp(start.x, end.x, eased),
      y: lerp(start.y, end.y, eased),
    };
  }

  const startHeight = from.ball.height ?? 0;
  const endHeight = to.ball.height ?? 0;
  const arc = to.ball.arc ?? 0;

  return {
    players,
    ball: {
      x: lerp(from.ball.x, to.ball.x, t),
      y: lerp(from.ball.y, to.ball.y, t),
      height: lerp(startHeight, endHeight, t) + 4 * arc * t * (1 - t),
    },
  };
}

const MIN_HOLD_MS = 2000;
const HOLD_MS_PER_CHARACTER = 45;

/** Leestijd bij automatisch afspelen. */
export function holdMs(caption: string): number {
  return Math.max(MIN_HOLD_MS, caption.length * HOLD_MS_PER_CHARACTER);
}

/** Geschatte duur op normaal tempo, in hele minuten. */
export function estimateMinutes(keyframes: Keyframe[]): number {
  const totalMs = keyframes.reduce(
    (sum, keyframe, index) =>
      sum + (index === 0 ? 0 : keyframe.durationMs) + holdMs(keyframe.caption),
    0,
  );
  return Math.max(1, Math.ceil(totalMs / 60_000));
}
