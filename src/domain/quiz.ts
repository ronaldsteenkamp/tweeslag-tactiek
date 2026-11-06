import type { Position } from "./schema";

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
