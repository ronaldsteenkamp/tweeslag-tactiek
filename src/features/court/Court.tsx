import {
  memo,
  useEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  metersToSvg,
  nearestWithin,
  svgToMeters,
  UNITS_PER_METER,
  viewBoxSize,
  type CourtView,
  type SvgPoint,
} from "../../domain/geometry";
import { BALL_ID, type Player, type Position } from "../../domain/types";
import { t } from "../../i18n";
import { PLAYERS, useBoardStore } from "./boardStore";
import styles from "./Court.module.css";
import {
  BALL_RADIUS,
  BallShape,
  CourtSurface,
  PLAYER_RADIUS,
  PlayerShape,
} from "./parts";

/** Tikdoel in meters: op een telefoon van 360 px breed is dit ruim 44 px doorsnede. */
const HIT_RADIUS_METERS = 0.9;
const KEY_STEP_METERS = 0.5;
const FINE_KEY_STEP_METERS = 0.1;

interface Drag {
  id: string;
  pointerId: number;
  /** Afstand tussen aanraakpunt en middelpunt, zodat het item niet naar de vinger springt. */
  offset: Position;
  start: Position;
}

function formatMeters(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

function clientToMeters(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
  view: CourtView,
) {
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;
  const point = new DOMPoint(clientX, clientY).matrixTransform(
    matrix.inverse(),
  );
  return svgToMeters({ sx: point.x, sy: point.y }, view);
}

function keyToDirection(
  key: string,
  view: CourtView,
): { dx: number; dy: number } | null {
  const screen: Record<string, SvgPoint> = {
    ArrowLeft: { sx: -1, sy: 0 },
    ArrowRight: { sx: 1, sy: 0 },
    ArrowUp: { sx: 0, sy: -1 },
    ArrowDown: { sx: 0, sy: 1 },
  };
  const step = screen[key];
  if (!step) return null;
  // Het verschil tussen twee punten geeft de richting in meters, ongeacht de weergave.
  const origin = svgToMeters({ sx: 0, sy: 0 }, view);
  const target = svgToMeters(
    { sx: step.sx * UNITS_PER_METER, sy: step.sy * UNITS_PER_METER },
    view,
  );
  return { dx: target.x - origin.x, dy: target.y - origin.y };
}

function useTokenPosition(id: string): Position {
  const position = useBoardStore((state) => state.positions[id]);
  if (!position) throw new Error(`Onbekend item op het veld: ${id}`);
  return position;
}

const PlayerToken = memo(function PlayerToken({
  player,
  view,
}: {
  player: Player;
  view: CourtView;
}) {
  const position = useTokenPosition(player.id);
  const { sx, sy } = metersToSvg(position, view);
  const label = t("court.player", {
    label: player.label,
    team: player.team,
    x: formatMeters(position.x),
    y: formatMeters(position.y),
  });

  return (
    <g
      className={styles.token}
      data-entity={player.id}
      data-testid={`token-${player.id}`}
      transform={`translate(${sx} ${sy})`}
      role="button"
      tabIndex={0}
      aria-label={label}
    >
      <circle className={styles.hit} r={HIT_RADIUS_METERS * UNITS_PER_METER} />
      <circle className={styles.focus} r={PLAYER_RADIUS + 22} />
      <PlayerShape player={player} />
    </g>
  );
});

const BallToken = memo(function BallToken({ view }: { view: CourtView }) {
  const position = useTokenPosition(BALL_ID);
  const { sx, sy } = metersToSvg(position, view);
  const label = t("court.ball", {
    x: formatMeters(position.x),
    y: formatMeters(position.y),
  });

  return (
    <g
      className={styles.token}
      data-entity={BALL_ID}
      data-testid="token-ball"
      transform={`translate(${sx} ${sy})`}
      role="button"
      tabIndex={0}
      aria-label={label}
    >
      <circle className={styles.hit} r={HIT_RADIUS_METERS * UNITS_PER_METER} />
      <circle className={styles.focus} r={BALL_RADIUS + 22} />
      <BallShape />
    </g>
  );
});

export function Court({ view }: { view: CourtView }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const { width, height } = viewBoxSize(view.orientation);

  // CSS touch-action werkt niet op onderdelen binnen een SVG: de browser zou het gebaar als
  // scrollen zien en de sleepbeweging afbreken. React-touchlisteners zijn passief, dus dit
  // moet met een eigen listener. Naast de tokens blijft scrollen gewoon werken.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const blockScrollOnToken = (event: TouchEvent) => {
      if ((event.target as Element).closest("[data-entity]")) {
        event.preventDefault();
      }
    };
    svg.addEventListener("touchstart", blockScrollOnToken, { passive: false });
    return () => svg.removeEventListener("touchstart", blockScrollOnToken);
  }, []);

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    if (dragRef.current || event.button !== 0) return;
    const svg = event.currentTarget;
    const hit = (event.target as Element).closest("[data-entity]");
    const pointer = clientToMeters(svg, event.clientX, event.clientY, view);
    if (!hit || !pointer) return;

    // Tikdoelen overlappen als spelers dicht bij elkaar staan: neem dan het dichtstbijzijnde item.
    const { positions } = useBoardStore.getState();
    const id = nearestWithin(pointer, positions, HIT_RADIUS_METERS);
    const start = id ? positions[id] : undefined;
    if (!id || !start) return;

    event.preventDefault();
    svg.setPointerCapture(event.pointerId);
    (svg.querySelector(`[data-entity="${id}"]`) as SVGElement | null)?.focus({
      preventScroll: true,
    });
    dragRef.current = {
      id,
      pointerId: event.pointerId,
      offset: { x: start.x - pointer.x, y: start.y - pointer.y },
      start,
    };
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const pointer = clientToMeters(
      event.currentTarget,
      event.clientX,
      event.clientY,
      view,
    );
    if (!pointer) return;
    useBoardStore.getState().moveTo(drag.id, {
      x: pointer.x + drag.offset.x,
      y: pointer.y + drag.offset.y,
    });
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  function handlePointerCancel(event: PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (drag?.pointerId !== event.pointerId) return;
    useBoardStore.getState().moveTo(drag.id, drag.start);
    dragRef.current = null;
  }

  function handleKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    const id = (event.target as Element)
      .closest("[data-entity]")
      ?.getAttribute("data-entity");
    const direction = keyToDirection(event.key, view);
    if (!id || !direction) return;
    event.preventDefault();
    const step = event.shiftKey ? FINE_KEY_STEP_METERS : KEY_STEP_METERS;
    useBoardStore
      .getState()
      .moveBy(id, direction.dx * step, direction.dy * step);
  }

  return (
    <svg
      ref={svgRef}
      className={styles.svg}
      viewBox={`0 0 ${width} ${height}`}
      role="group"
      aria-label={t("court.title")}
      data-testid="court"
      data-orientation={view.orientation}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onKeyDown={handleKeyDown}
    >
      <CourtSurface view={view} />
      {PLAYERS.map((player) => (
        <PlayerToken key={player.id} player={player} view={view} />
      ))}
      <BallToken view={view} />
    </svg>
  );
}
