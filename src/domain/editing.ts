import { clampToArea, COURT } from "./geometry";
import type {
  Arrow,
  Keyframe,
  Player,
  Position,
  Scenario,
  Zone,
} from "./schema";
import { BALL_ID } from "./types";

/** De hoofdvolgorde van een scenario; varianten hebben een eigen id. */
export const BASE_VARIANT = "basis";
export const DEFAULT_DURATION_MS = 1500;
export const GRID_METERS = 0.5;
const PRECISION_METERS = 0.1;

export function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function roundTo(value: number, step: number): number {
  return Number((Math.round(value / step) * step).toFixed(1));
}

/** Begrenst tot het veld en rondt af. Deellinks bewaren ook maar 0,1 meter nauwkeurig. */
export function normalizePosition(position: Position, snap: boolean): Position {
  const step = snap ? GRID_METERS : PRECISION_METERS;
  const clamped = clampToArea(position);
  return { x: roundTo(clamped.x, step), y: roundTo(clamped.y, step) };
}

const PLAYERS: Player[] = [
  { id: "A1", team: "A", label: "A1" },
  { id: "A2", team: "A", label: "A2" },
  { id: "B1", team: "B", label: "B1" },
  { id: "B2", team: "B", label: "B2" },
];

export function newScenario(title: string): Scenario {
  return {
    id: createId("scenario"),
    title,
    description: "",
    tags: [],
    level: "gevorderd",
    players: PLAYERS,
    keyframes: [
      {
        id: createId("stap"),
        durationMs: DEFAULT_DURATION_MS,
        players: {
          A1: { x: -1, y: 2 },
          A2: { x: 6, y: 5 },
          B1: { x: 12, y: 2 },
          B2: { x: 12, y: 6 },
        },
        ball: { x: -0.4, y: 2.8 },
        caption: "",
      },
    ],
  };
}

/** Een leeg naamveld mag tijdens het typen, maar niet in een opgeslagen of gedeeld scenario. */
export function withNames(
  scenario: Scenario,
  titleFallback: string,
  variantFallback: string,
): Scenario {
  const emptyVariant = scenario.variants?.some(
    (variant) => !variant.label.trim(),
  );
  if (scenario.title.trim() && !emptyVariant) return scenario;
  return {
    ...scenario,
    title: scenario.title.trim() || titleFallback,
    variants: scenario.variants?.map((variant) => ({
      ...variant,
      label: variant.label.trim() || variantFallback,
    })),
  };
}

export function keyframesOf(scenario: Scenario, variantId: string): Keyframe[] {
  if (variantId === BASE_VARIANT) return scenario.keyframes;
  const variant = scenario.variants?.find((item) => item.id === variantId);
  return variant?.keyframes ?? scenario.keyframes;
}

export function withKeyframes(
  scenario: Scenario,
  variantId: string,
  keyframes: Keyframe[],
): Scenario {
  if (variantId === BASE_VARIANT) return { ...scenario, keyframes };
  return {
    ...scenario,
    variants: scenario.variants?.map((variant) =>
      variant.id === variantId ? { ...variant, keyframes } : variant,
    ),
  };
}

function copyKeyframe(keyframe: Keyframe): Keyframe {
  return {
    ...keyframe,
    id: createId("stap"),
    arrows: keyframe.arrows?.map((arrow) => ({
      ...arrow,
      id: createId("pijl"),
    })),
    zones: keyframe.zones?.map((zone) => ({ ...zone, id: createId("zone") })),
  };
}

function insertAfter<T>(list: T[], index: number, item: T): T[] {
  return [...list.slice(0, index + 1), item, ...list.slice(index + 1)];
}

/** Een nieuwe stap begint waar de vorige eindigt, zonder lijnen of uitleg. */
export function addStep(keyframes: Keyframe[], index: number): Keyframe[] {
  const source = keyframes[index];
  if (!source) return keyframes;
  return insertAfter(keyframes, index, {
    id: createId("stap"),
    durationMs: DEFAULT_DURATION_MS,
    players: source.players,
    ball: { x: source.ball.x, y: source.ball.y, height: source.ball.height },
    caption: "",
  });
}

export function duplicateStep(
  keyframes: Keyframe[],
  index: number,
): Keyframe[] {
  const source = keyframes[index];
  if (!source) return keyframes;
  return insertAfter(keyframes, index, copyKeyframe(source));
}

export function deleteStep(keyframes: Keyframe[], index: number): Keyframe[] {
  if (keyframes.length <= 1) return keyframes;
  return keyframes.filter((_keyframe, position) => position !== index);
}

export function moveStep(
  keyframes: Keyframe[],
  index: number,
  delta: number,
): Keyframe[] {
  const item = keyframes[index];
  const target = index + delta;
  if (!item || target < 0 || target >= keyframes.length) return keyframes;
  const rest = keyframes.filter((_keyframe, position) => position !== index);
  return [...rest.slice(0, target), item, ...rest.slice(target)];
}

export function moveEntity(
  keyframe: Keyframe,
  id: string,
  position: Position,
): Keyframe {
  if (id === BALL_ID) {
    return { ...keyframe, ball: { ...keyframe.ball, ...position } };
  }
  return { ...keyframe, players: { ...keyframe.players, [id]: position } };
}

export function addArrow(keyframe: Keyframe, arrow: Arrow): Keyframe {
  return { ...keyframe, arrows: [...(keyframe.arrows ?? []), arrow] };
}

export function addZone(keyframe: Keyframe, zone: Zone): Keyframe {
  return { ...keyframe, zones: [...(keyframe.zones ?? []), zone] };
}

export function removeOverlay(keyframe: Keyframe, id: string): Keyframe {
  return {
    ...keyframe,
    arrows: keyframe.arrows?.filter((arrow) => arrow.id !== id),
    zones: keyframe.zones?.filter((zone) => zone.id !== id),
  };
}

export function updateZone(
  keyframe: Keyframe,
  id: string,
  patch: Partial<Pick<Zone, "kind" | "label">>,
): Keyframe {
  return {
    ...keyframe,
    zones: keyframe.zones?.map((zone) =>
      zone.id === id ? { ...zone, ...patch } : zone,
    ),
  };
}

function isInArea({ x, y }: Position): boolean {
  const { freeZone, length, width } = COURT;
  return (
    x >= -freeZone &&
    x <= length + freeZone &&
    y >= -freeZone &&
    y <= width + freeZone
  );
}

function shift(position: Position, dx: number, dy: number): Position {
  return {
    x: Number((position.x + dx).toFixed(1)),
    y: Number((position.y + dy).toFixed(1)),
  };
}

/** Verschuift een pijl of zone in zijn geheel; over de rand van het veld kan niet. */
export function translateOverlay(
  keyframe: Keyframe,
  id: string,
  dx: number,
  dy: number,
): Keyframe {
  const arrows = keyframe.arrows?.map((arrow) => {
    if (arrow.id !== id) return arrow;
    const moved = {
      ...arrow,
      from: shift(arrow.from, dx, dy),
      to: shift(arrow.to, dx, dy),
    };
    return isInArea(moved.from) && isInArea(moved.to) ? moved : arrow;
  });
  const zones = keyframe.zones?.map((zone) => {
    if (zone.id !== id) return zone;
    const polygon = zone.polygon.map((point) => shift(point, dx, dy));
    return polygon.every(isInArea) ? { ...zone, polygon } : zone;
  });
  return { ...keyframe, arrows, zones };
}

export function rectangle(a: Position, b: Position): Position[] {
  return [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }];
}

export function addVariant(
  scenario: Scenario,
  sourceVariantId: string,
  label: string,
): { scenario: Scenario; variantId: string } {
  const variantId = createId("variant");
  const keyframes = keyframesOf(scenario, sourceVariantId).map(copyKeyframe);
  return {
    variantId,
    scenario: {
      ...scenario,
      variants: [
        ...(scenario.variants ?? []),
        { id: variantId, label, keyframes },
      ],
    },
  };
}

export function renameVariant(
  scenario: Scenario,
  variantId: string,
  label: string,
): Scenario {
  return {
    ...scenario,
    variants: scenario.variants?.map((variant) =>
      variant.id === variantId ? { ...variant, label } : variant,
    ),
  };
}

export function removeVariant(scenario: Scenario, variantId: string): Scenario {
  return {
    ...scenario,
    variants: scenario.variants?.filter((variant) => variant.id !== variantId),
  };
}
