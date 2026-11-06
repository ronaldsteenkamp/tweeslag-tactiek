import { COURT } from "./geometry";
import type { Placement, Position, RouteQuestion, Spot } from "./schema";

export function isInsidePolygon(point: Position, polygon: Position[]): boolean {
  let inside = false;
  let previous = polygon[polygon.length - 1];
  for (const current of polygon) {
    if (
      previous &&
      current.y > point.y !== previous.y > point.y &&
      point.x <
        ((previous.x - current.x) * (point.y - current.y)) /
          (previous.y - current.y) +
          current.x
    ) {
      inside = !inside;
    }
    previous = current;
  }
  return inside;
}

function distanceToSegment(point: Position, a: Position, b: Position): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared;
  const clamped = Math.min(1, Math.max(0, t));
  return Math.hypot(
    point.x - (a.x + clamped * dx),
    point.y - (a.y + clamped * dy),
  );
}

/** Goed als de positie in de zone ligt, of er niet verder dan `tolerance` meter naast. */
export function isInTarget(
  point: Position,
  polygon: Position[],
  tolerance: number,
): boolean {
  if (isInsidePolygon(point, polygon)) return true;
  return polygon.some((corner, index) => {
    const next = polygon[(index + 1) % polygon.length] ?? corner;
    return distanceToSegment(point, corner, next) <= tolerance;
  });
}

/** De spelers die nog niet in hun doelzone staan. */
export function misplacedPlayers(
  positions: Record<string, Position>,
  placements: Placement[],
): string[] {
  return placements
    .filter(({ playerId, target, tolerance }) => {
      const position = positions[playerId];
      return !position || !isInTarget(position, target, tolerance);
    })
    .map(({ playerId }) => playerId);
}

/** Kleinere stapjes zijn trillingen van de hand, geen route. */
const MIN_ROUTE_STEP_METERS = 0.2;
/** Marge op de omweg, zodat een korte route met een bibberige hand ook kan. */
const DETOUR_SLACK_METERS = 0.5;

export function addRoutePoint(route: Position[], point: Position): Position[] {
  const last = route[route.length - 1];
  if (last && distance(last, point) < MIN_ROUTE_STEP_METERS) return route;
  return [...route, point];
}

function distance(a: Position, b: Position): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function routeLength(route: Position[]): number {
  return route.reduce((sum, point, index) => {
    const previous = route[index - 1];
    return previous ? sum + distance(previous, point) : sum;
  }, 0);
}

export type RouteVerdict = "ok" | "net" | "end" | "detour";

export function gradeRoute(
  route: Position[],
  question: Pick<RouteQuestion, "target" | "tolerance" | "maxDetour">,
): RouteVerdict {
  const start = route[0];
  const end = route[route.length - 1];
  if (!start || !end) return "end";

  const netX = COURT.length / 2;
  const startSide = Math.sign(start.x - netX);
  if (route.some((point) => Math.sign(point.x - netX) === -startSide)) {
    return "net";
  }
  if (!isInTarget(end, question.target, question.tolerance)) return "end";
  const allowed = distance(start, end) * question.maxDetour;
  return routeLength(route) > allowed + DETOUR_SLACK_METERS ? "detour" : "ok";
}

/** Het id van de plek op dit punt. Spelers gaan voor op zones. */
export function spotAt(
  point: Position,
  spots: Spot[],
  players: Record<string, Position>,
  hitRadius: number,
): string | null {
  let nearest: { id: string; gap: number } | null = null;
  for (const spot of spots) {
    const position = spot.playerId ? players[spot.playerId] : undefined;
    if (!position) continue;
    const gap = distance(point, position);
    if (gap <= hitRadius && (!nearest || gap < nearest.gap)) {
      nearest = { id: spot.id, gap };
    }
  }
  if (nearest) return nearest.id;
  const zone = spots.find(
    (spot) => spot.polygon && isInsidePolygon(point, spot.polygon),
  );
  return zone?.id ?? null;
}

function hash(text: string): number {
  let value = 2166136261;
  for (const character of text) {
    value = Math.imul(value ^ (character.codePointAt(0) ?? 0), 16777619);
  }
  return value >>> 0;
}

/**
 * Een vaste, door elkaar gehusselde volgorde van de indexen 0 tot count.
 * Vast per vraag, zodat een uitleg of test ernaar kan verwijzen, en nooit al goed.
 */
export function shuffledOrder(count: number, seed: string): number[] {
  const order = Array.from({ length: count }, (_, index) => index);
  let state = hash(seed);
  for (let index = count - 1; index > 0; index--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const other = state % (index + 1);
    const current = order[index] as number;
    order[index] = order[other] as number;
    order[other] = current;
  }
  if (isInOrder(order)) order.push(order.shift() as number);
  return order;
}

export function isInOrder(order: number[]): boolean {
  return order.every((value, index) => value === index);
}

/** Verplaatst een item een plek omhoog (-1) of omlaag (1). */
export function moveItem(
  order: number[],
  index: number,
  delta: -1 | 1,
): number[] {
  const target = index + delta;
  const moved = order[index];
  const other = order[target];
  if (moved === undefined || other === undefined) return order;
  const next = [...order];
  next[index] = other;
  next[target] = moved;
  return next;
}
