import { memo, type ReactNode } from "react";
import {
  COURT,
  distance,
  metersToSvg,
  NET_X,
  UNITS_PER_METER,
  viewBoxSize,
  type CourtView,
} from "../../domain/geometry";
import type { Arrow, Player, Position, Zone } from "../../domain/schema";
import styles from "./Court.module.css";

export const PLAYER_RADIUS = 0.5 * UNITS_PER_METER;
export const BALL_RADIUS = 0.3 * UNITS_PER_METER;

/** Hoe ver de bal per meter hoogte op het scherm omhoog schuift en groter wordt. */
const LIFT_PER_METER = 26;
const GROWTH_PER_METER = 0.07;
const RUN_ARROW_GAP = 0.6;

const SAND_TILE = 600;
/** Zand loopt door tot buiten het veld, zodat er op geen enkel scherm een rand zichtbaar is. */
const SAND_BLEED = 3000;

/** Altijd dezelfde reeks, zodat het zand niet verandert tussen twee keer tekenen. */
function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function createGrains() {
  const random = createRandom(7);
  return Array.from({ length: 420 }, () => ({
    x: Math.round(random() * SAND_TILE),
    y: Math.round(random() * SAND_TILE),
    r: Number((1.5 + random() * 3).toFixed(1)),
    dark: random() < 0.6,
  }));
}

/** Windribbels lopen aan beide randen op dezelfde hoogte, dus de tegels sluiten naadloos aan. */
const RIPPLES = [70, 190, 300, 420, 530].map((y, index) => {
  const swing = index % 2 === 0 ? 16 : -12;
  return `M 0 ${y} Q 150 ${y - swing} 300 ${y} T ${SAND_TILE} ${y}`;
});

const GRAINS = createGrains();

function SandPattern() {
  return (
    <pattern
      id="sand"
      width={SAND_TILE}
      height={SAND_TILE}
      patternUnits="userSpaceOnUse"
    >
      {RIPPLES.map((path) => (
        <path key={path} className={styles.ripple} d={path} />
      ))}
      {GRAINS.map((grain, index) => (
        <circle
          key={index}
          className={grain.dark ? styles.grainDark : styles.grainLight}
          cx={grain.x}
          cy={grain.y}
          r={grain.r}
        />
      ))}
    </pattern>
  );
}

export const CourtSurface = memo(function CourtSurface({
  view,
}: {
  view: CourtView;
}) {
  const { width, height } = viewBoxSize(view.orientation);
  const corner1 = metersToSvg({ x: 0, y: 0 }, view);
  const corner2 = metersToSvg({ x: COURT.length, y: COURT.width }, view);
  const net1 = metersToSvg({ x: NET_X, y: -0.5 }, view);
  const net2 = metersToSvg({ x: NET_X, y: COURT.width + 0.5 }, view);
  const court = {
    x: Math.min(corner1.sx, corner2.sx),
    y: Math.min(corner1.sy, corner2.sy),
    width: Math.abs(corner2.sx - corner1.sx),
    height: Math.abs(corner2.sy - corner1.sy),
  };
  const everything = {
    x: -SAND_BLEED,
    y: -SAND_BLEED,
    width: width + SAND_BLEED * 2,
    height: height + SAND_BLEED * 2,
  };

  return (
    <g aria-hidden="true">
      <defs>
        <SandPattern />
      </defs>
      <rect className={styles.sand} {...everything} />
      <rect className={styles.courtSand} {...court} />
      <rect className={styles.sandTexture} {...everything} />
      <rect className={styles.court} {...court} />
      <line
        className={styles.netShadow}
        x1={net1.sx + 8}
        y1={net1.sy + 12}
        x2={net2.sx + 8}
        y2={net2.sy + 12}
      />
      <line
        className={styles.net}
        x1={net1.sx}
        y1={net1.sy}
        x2={net2.sx}
        y2={net2.sy}
      />
      <line
        className={styles.netMesh}
        x1={net1.sx}
        y1={net1.sy}
        x2={net2.sx}
        y2={net2.sy}
      />
      <circle className={styles.post} cx={net1.sx} cy={net1.sy} r={13} />
      <circle className={styles.post} cx={net2.sx} cy={net2.sy} r={13} />
    </g>
  );
});

/** Beide armen vanaf de schouders recht naar voren, zoals een speler die klaarstaat. */
const ARMS = "M 6 -58 L 70 -40 M 6 58 L 70 40";

/**
 * Een speler van bovenaf, kijkend naar rechts: schouders, armen naar voren en een hoofd.
 * Alleen het lichaam draait mee; de naam blijft rechtop leesbaar. De letter van het team maakt
 * het verschil duidelijk zonder op kleur af te gaan.
 */
export function PlayerShape({
  player,
  angle,
}: {
  player: Player;
  angle: number;
}) {
  const shirt = player.team === "A" ? styles.teamA : styles.teamB;
  const rotation = `rotate(${angle.toFixed(1)})`;

  return (
    <>
      <g transform={`translate(10 14) ${rotation}`}>
        <rect
          className={styles.bodyShadow}
          x={-25}
          y={-72}
          width={50}
          height={144}
          rx={25}
        />
      </g>
      <g transform={rotation}>
        <path className={styles.armOutline} d={ARMS} />
        <path className={styles.arm} d={ARMS} />
        <rect
          className={shirt}
          x={-25}
          y={-72}
          width={50}
          height={144}
          rx={25}
        />
      </g>
      <circle className={shirt} r={34} />
      <text className={styles.tokenLabel} dy="0.36em" aria-hidden="true">
        {player.id}
      </text>
    </>
  );
}

/** De schaduw blijft op de grond; hoe hoger de bal, hoe verder die ervan los komt. */
export function BallShape({ height = 0 }: { height?: number }) {
  const lift = height * LIFT_PER_METER;
  const scale = 1 + height * GROWTH_PER_METER;

  return (
    <>
      <ellipse
        className={styles.ballShadow}
        cx={8}
        cy={14}
        rx={BALL_RADIUS}
        ry={BALL_RADIUS * 0.8}
      />
      <g transform={`translate(0 ${-lift}) scale(${scale})`}>
        <circle className={styles.ball} r={BALL_RADIUS} />
        <path
          className={styles.ballSeam}
          d={`M ${-BALL_RADIUS} 0 Q 0 ${-BALL_RADIUS * 0.7} ${BALL_RADIUS} 0 M 0 ${-BALL_RADIUS} Q ${
            BALL_RADIUS * 0.7
          } 0 0 ${BALL_RADIUS}`}
        />
      </g>
    </>
  );
}

const ARROW_STYLE: Record<Arrow["kind"], string | undefined> = {
  run: styles.arrowRun,
  ball: styles.arrowBall,
  shot: styles.arrowShot,
};

const ZONE_STYLE: Record<Zone["kind"], string | undefined> = {
  cover: styles.zoneCover,
  target: styles.zoneTarget,
  blocked: styles.zoneBlocked,
};

function Marker({ id, className }: { id: string; className?: string }) {
  return (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX="8"
      refY="5"
      markerWidth="42"
      markerHeight="42"
      markerUnits="userSpaceOnUse"
      orient="auto-start-reverse"
    >
      <path className={className} d="M 0 0 L 10 5 L 0 10 z" />
    </marker>
  );
}

export function OverlayDefs(): ReactNode {
  return (
    <defs>
      <Marker id="arrow-run" className={styles.markerRun} />
      <Marker id="arrow-ball" className={styles.markerBall} />
      <Marker id="arrow-shot" className={styles.markerShot} />
      <pattern
        id="hatch"
        width="36"
        height="36"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <rect className={styles.hatchLine} width="10" height="36" />
      </pattern>
    </defs>
  );
}

function zoneCenter(zone: Zone, view: CourtView) {
  const points = zone.polygon.map((point) => metersToSvg(point, view));
  const sum = points.reduce(
    (total, point) => ({
      sx: total.sx + point.sx,
      sy: total.sy + point.sy,
    }),
    { sx: 0, sy: 0 },
  );
  return { sx: sum.sx / points.length, sy: sum.sy / points.length };
}

/** Een looplijn eindigt bij een speler: stop ervoor, anders valt de pijlpunt eronder. */
function arrowEnd(arrow: Arrow): Position {
  const length = distance(arrow.from, arrow.to);
  if (arrow.kind !== "run" || length <= RUN_ARROW_GAP * 2) return arrow.to;
  const keep = (length - RUN_ARROW_GAP) / length;
  return {
    x: arrow.from.x + (arrow.to.x - arrow.from.x) * keep,
    y: arrow.from.y + (arrow.to.y - arrow.from.y) * keep,
  };
}

export const Overlays = memo(function Overlays({
  arrows = [],
  zones = [],
  view,
  selectedId,
  interactive = false,
}: {
  arrows?: Arrow[];
  zones?: Zone[];
  view: CourtView;
  selectedId?: string | null;
  /** Op het tactiekbord zijn lijnen en zones te selecteren. */
  interactive?: boolean;
}) {
  return (
    <g aria-hidden="true" data-testid="overlays">
      {zones.map((zone) => {
        const center = zoneCenter(zone, view);
        const points = zone.polygon
          .map((point) => metersToSvg(point, view))
          .map((point) => `${point.sx},${point.sy}`)
          .join(" ");
        return (
          <g
            key={zone.id}
            data-overlay={interactive ? zone.id : undefined}
            data-selected={zone.id === selectedId || undefined}
          >
            <polygon className={ZONE_STYLE[zone.kind]} points={points} />
            {zone.label ? (
              <text
                className={styles.zoneLabel}
                x={center.sx}
                y={center.sy}
                dy="0.36em"
              >
                {zone.label}
              </text>
            ) : null}
          </g>
        );
      })}
      {arrows.map((arrow) => {
        const from = metersToSvg(arrow.from, view);
        const to = metersToSvg(arrowEnd(arrow), view);
        return (
          <g
            key={arrow.id}
            data-overlay={interactive ? arrow.id : undefined}
            data-selected={arrow.id === selectedId || undefined}
          >
            {interactive ? (
              <line
                className={styles.arrowHit}
                x1={from.sx}
                y1={from.sy}
                x2={to.sx}
                y2={to.sy}
              />
            ) : null}
            <line
              className={ARROW_STYLE[arrow.kind]}
              x1={from.sx}
              y1={from.sy}
              x2={to.sx}
              y2={to.sy}
              markerEnd={`url(#arrow-${arrow.kind})`}
            />
          </g>
        );
      })}
    </g>
  );
});
