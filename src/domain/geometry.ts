import type { Position } from "./types";

/** Afmetingen in meters (FIVB-regels 2025-2028, regel 1.1). */
export const COURT = {
  length: 16,
  width: 8,
  /** Minimale vrije zone rondom het veld. */
  freeZone: 3,
} as const;

export const NET_X = COURT.length / 2;

/** SVG-eenheden per meter. Alleen rekenprecisie: de SVG schaalt zelf mee. */
export const UNITS_PER_METER = 100;

export type Orientation = "landscape" | "portrait";

export interface CourtView {
  /** landscape: net verticaal, team A links. portrait: net horizontaal, team A onder. */
  orientation: Orientation;
  /** Draait het veld 180°, zodat team B links of onder staat. */
  flipped: boolean;
}

export interface SvgPoint {
  sx: number;
  sy: number;
}

const TOTAL_LENGTH = COURT.length + 2 * COURT.freeZone;
const TOTAL_WIDTH = COURT.width + 2 * COURT.freeZone;

export function viewBoxSize(orientation: Orientation): {
  width: number;
  height: number;
} {
  const long = TOTAL_LENGTH * UNITS_PER_METER;
  const short = TOTAL_WIDTH * UNITS_PER_METER;
  return orientation === "landscape"
    ? { width: long, height: short }
    : { width: short, height: long };
}

export function metersToSvg(position: Position, view: CourtView): SvgPoint {
  const fromStart = position.x + COURT.freeZone;
  const fromSide = position.y + COURT.freeZone;
  const along = view.flipped ? TOTAL_LENGTH - fromStart : fromStart;
  const across = view.flipped ? TOTAL_WIDTH - fromSide : fromSide;

  return view.orientation === "landscape"
    ? { sx: along * UNITS_PER_METER, sy: across * UNITS_PER_METER }
    : {
        sx: across * UNITS_PER_METER,
        sy: (TOTAL_LENGTH - along) * UNITS_PER_METER,
      };
}

export function svgToMeters(point: SvgPoint, view: CourtView): Position {
  const a = point.sx / UNITS_PER_METER;
  const b = point.sy / UNITS_PER_METER;
  const along = view.orientation === "landscape" ? a : TOTAL_LENGTH - b;
  const across = view.orientation === "landscape" ? b : a;
  const fromStart = view.flipped ? TOTAL_LENGTH - along : along;
  const fromSide = view.flipped ? TOTAL_WIDTH - across : across;

  return { x: fromStart - COURT.freeZone, y: fromSide - COURT.freeZone };
}

/** Houdt een positie binnen het speelveld plus de vrije zone. */
export function clampToArea(position: Position): Position {
  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));
  return {
    x: clamp(position.x, -COURT.freeZone, COURT.length + COURT.freeZone),
    y: clamp(position.y, -COURT.freeZone, COURT.width + COURT.freeZone),
  };
}

/** Dichterbij dan dit draait een speler niet naar de bal: de richting zou dan alle kanten op schieten. */
const MIN_FACING_DISTANCE = 0.7;

/**
 * De hoek in graden op het scherm waarin een speler kijkt: naar de bal, of naar het net als de bal
 * vlak bij de speler is. 0 is naar rechts, 90 naar beneden.
 */
export function facingAngle(
  position: Position,
  ball: Position,
  team: "A" | "B",
  view: CourtView,
): number {
  const nearBall = distance(position, ball) < MIN_FACING_DISTANCE;
  const target = nearBall
    ? { x: position.x + (team === "A" ? 1 : -1), y: position.y }
    : ball;
  const from = metersToSvg(position, view);
  const to = metersToSvg(target, view);
  return (Math.atan2(to.sy - from.sy, to.sx - from.sx) * 180) / Math.PI;
}

export function formatMeters(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

export function distance(a: Position, b: Position): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Geeft het id van het dichtstbijzijnde item, of null als niets binnen maxDistance ligt. */
export function nearestWithin(
  point: Position,
  items: Record<string, Position>,
  maxDistance: number,
): string | null {
  let bestId: string | null = null;
  let bestDistance = maxDistance;
  for (const [id, position] of Object.entries(items)) {
    const d = distance(point, position);
    if (d <= bestDistance) {
      bestId = id;
      bestDistance = d;
    }
  }
  return bestId;
}
