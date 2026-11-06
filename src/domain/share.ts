import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";
import {
  scenarioSchema,
  type Arrow,
  type Keyframe,
  type Position,
  type Scenario,
  type Zone,
} from "./schema";

/**
 * Deellinks bevatten het hele scenario. Om ze kort genoeg voor een QR-code te houden, staat alles
 * in compacte lijsten zonder veldnamen en id's, met coördinaten als hele decimeters en de duur
 * in tienden van een seconde. Formaat wijzigen? Verhoog dan FORMAT_VERSION en lees oude links.
 */
const FORMAT_VERSION = 1;

/** Boven deze lengte weigeren browsers en berichtenapps links soms. */
export const MAX_SHARE_CHARS = 8000;
/** Grens voor het uitpakken, tegen links die opzettelijk enorm uitpakken. */
const MAX_UNPACKED_CHARS = 200_000;
/** Hoger wordt een QR-code van een telefoonscherm slecht scanbaar (zie docs). */
export const MAX_QR_CHARS = 1200;

const LEVELS = ["beginner", "gevorderd"] as const;
const TEAMS = ["A", "B"] as const;
const ARROW_KINDS = ["run", "ball", "shot"] as const;
const ZONE_KINDS = ["cover", "target", "blocked"] as const;

export type DecodeError = "corrupt" | "too-large" | "version";
export type DecodeResult =
  { ok: true; scenario: Scenario } | { ok: false; error: DecodeError };

const toDm = (meters: number) => Math.round(meters * 10);
const fromDm = (value: unknown) => (value as number) / 10;

function packFrame(frame: Keyframe, playerIds: string[]): unknown[] {
  return [
    Math.round(frame.durationMs / 100),
    playerIds.flatMap((id) => {
      const position = frame.players[id] as Position;
      return [toDm(position.x), toDm(position.y)];
    }),
    [
      toDm(frame.ball.x),
      toDm(frame.ball.y),
      toDm(frame.ball.height ?? 0),
      toDm(frame.ball.arc ?? 0),
    ],
    (frame.arrows ?? []).map((arrow) => [
      ARROW_KINDS.indexOf(arrow.kind),
      toDm(arrow.from.x),
      toDm(arrow.from.y),
      toDm(arrow.to.x),
      toDm(arrow.to.y),
    ]),
    (frame.zones ?? []).map((zone) => [
      ZONE_KINDS.indexOf(zone.kind),
      zone.label ?? "",
      zone.polygon.flatMap((point) => [toDm(point.x), toDm(point.y)]),
    ]),
    frame.caption,
  ];
}

function pack(scenario: Scenario): unknown[] {
  const playerIds = scenario.players.map((player) => player.id);
  return [
    FORMAT_VERSION,
    scenario.title,
    scenario.description,
    LEVELS.indexOf(scenario.level),
    scenario.players.map((player) => [
      player.id,
      TEAMS.indexOf(player.team),
      player.label,
    ]),
    scenario.keyframes.map((frame) => packFrame(frame, playerIds)),
    (scenario.variants ?? []).map((variant) => [
      variant.label,
      variant.keyframes.map((frame) => packFrame(frame, playerIds)),
    ]),
  ];
}

function unpackPoints(flat: number[]): Position[] {
  const points: Position[] = [];
  for (let index = 0; index + 1 < flat.length; index += 2) {
    points.push({ x: fromDm(flat[index]), y: fromDm(flat[index + 1]) });
  }
  return points;
}

function unpackFrame(
  packed: unknown[],
  index: number,
  prefix: string,
  playerIds: string[],
): Keyframe {
  const [duration, players, ball, arrows, zones, caption] = packed as [
    number,
    number[],
    number[],
    number[][],
    [number, string, number[]][],
    string,
  ];
  const points = unpackPoints(players);
  const [ballX, ballY, height, arc] = ball;
  const id = `${prefix}${index + 1}`;

  const unpackedArrows: Arrow[] = arrows.map(
    ([kind, x1, y1, x2, y2], position) => ({
      id: `${id}-pijl${position + 1}`,
      kind: ARROW_KINDS[kind as number] as Arrow["kind"],
      from: { x: fromDm(x1), y: fromDm(y1) },
      to: { x: fromDm(x2), y: fromDm(y2) },
    }),
  );
  const unpackedZones: Zone[] = zones.map(
    ([kind, label, polygon], position) => ({
      id: `${id}-zone${position + 1}`,
      kind: ZONE_KINDS[kind] as Zone["kind"],
      polygon: unpackPoints(polygon),
      ...(label ? { label } : {}),
    }),
  );

  return {
    id,
    durationMs: duration * 100,
    players: Object.fromEntries(
      playerIds.map((playerId, position) => [playerId, points[position]]),
    ) as Record<string, Position>,
    ball: {
      x: fromDm(ballX),
      y: fromDm(ballY),
      ...(height ? { height: fromDm(height) } : {}),
      ...(arc ? { arc: fromDm(arc) } : {}),
    },
    ...(unpackedArrows.length ? { arrows: unpackedArrows } : {}),
    ...(unpackedZones.length ? { zones: unpackedZones } : {}),
    caption,
  };
}

function unpack(packed: unknown[]): unknown {
  const [, title, description, level, players, frames, variants] = packed as [
    number,
    string,
    string,
    number,
    [string, number, string][],
    unknown[][],
    [string, unknown[][]][],
  ];
  const playerIds = players.map(([id]) => id);
  return {
    id: "gedeeld",
    title,
    description,
    tags: [],
    level: LEVELS[level],
    players: players.map(([id, team, label]) => ({
      id,
      team: TEAMS[team],
      label,
    })),
    keyframes: frames.map((frame, index) =>
      unpackFrame(frame, index, "stap", playerIds),
    ),
    ...(variants.length
      ? {
          variants: variants.map(([label, variantFrames], position) => ({
            id: `variant${position + 1}`,
            label,
            keyframes: variantFrames.map((frame, index) =>
              unpackFrame(frame, index, `v${position + 1}-stap`, playerIds),
            ),
          })),
        }
      : {}),
  };
}

export function encodeScenario(scenario: Scenario): string {
  return compressToEncodedURIComponent(JSON.stringify(pack(scenario)));
}

/** Een link is onbetrouwbare invoer: alles gaat door dezelfde validatie als ingebouwde lessen. */
export function decodeScenario(data: string): DecodeResult {
  if (data.length > MAX_SHARE_CHARS) return { ok: false, error: "too-large" };

  try {
    const text = decompressFromEncodedURIComponent(data);
    if (!text) return { ok: false, error: "corrupt" };
    if (text.length > MAX_UNPACKED_CHARS) {
      return { ok: false, error: "too-large" };
    }
    const packed: unknown = JSON.parse(text);
    if (!Array.isArray(packed)) return { ok: false, error: "corrupt" };
    if (packed[0] !== FORMAT_VERSION) return { ok: false, error: "version" };
    const result = scenarioSchema.safeParse(unpack(packed));
    return result.success
      ? { ok: true, scenario: result.data }
      : { ok: false, error: "corrupt" };
  } catch {
    return { ok: false, error: "corrupt" };
  }
}

export interface ShareLink {
  url: string;
  tooLarge: boolean;
  fitsQr: boolean;
}

export function buildShareLink(scenario: Scenario, baseUrl: string): ShareLink {
  const data = encodeScenario(scenario);
  const url = `${baseUrl}#/s/${data}`;
  return {
    url,
    tooLarge: data.length > MAX_SHARE_CHARS,
    fitsQr: url.length <= MAX_QR_CHARS,
  };
}
