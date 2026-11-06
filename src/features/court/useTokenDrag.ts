import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  nearestWithin,
  svgToMeters,
  UNITS_PER_METER,
  type CourtView,
  type SvgPoint,
} from "../../domain/geometry";
import type { Position } from "../../domain/types";

/** Tikdoel in meters. Op een klein veld geldt de ondergrens in pixels hieronder. */
export const HIT_RADIUS_METERS = 0.9;
/** Helft van het minimale tikdoel van 44 px. */
const MIN_HIT_RADIUS_PX = 22;
const KEY_STEP_METERS = 0.5;
const FINE_KEY_STEP_METERS = 0.1;

interface Drag {
  id: string;
  pointerId: number;
  /** Afstand tussen aanraakpunt en middelpunt, zodat het item niet naar de vinger springt. */
  offset: Position;
  start: Position;
}

export function clientToMeters(
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

function hitRadiusMeters(svg: SVGSVGElement): number {
  const matrix = svg.getScreenCTM();
  if (!matrix) return HIT_RADIUS_METERS;
  const pixelsPerMeter = Math.hypot(matrix.a, matrix.b) * UNITS_PER_METER;
  return Math.max(HIT_RADIUS_METERS, MIN_HIT_RADIUS_PX / pixelsPerMeter);
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

interface TokenDragOptions {
  view: CourtView;
  /** De items die versleept mogen worden, met hun huidige positie. */
  getPositions: () => Record<string, Position>;
  onMove: (id: string, position: Position) => void;
  /** Een sleepbeweging of toetsaanslag is afgerond. */
  onEnd?: () => void;
}

/** Slepen met muis, vinger en pen, en verplaatsen met de pijltjestoetsen. */
export function useTokenDrag({
  view,
  getPositions,
  onMove,
  onEnd,
}: TokenDragOptions) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<Drag | null>(null);

  // Tikdoelen overlappen als spelers dicht bij elkaar staan: neem dan het dichtstbijzijnde item.
  function findToken(svg: SVGSVGElement, clientX: number, clientY: number) {
    const pointer = clientToMeters(svg, clientX, clientY, view);
    if (!pointer) return null;
    const positions = getPositions();
    const id = nearestWithin(pointer, positions, hitRadiusMeters(svg));
    const start = id ? positions[id] : undefined;
    return id && start ? { id, start, pointer } : null;
  }

  // De nieuwste versie, zodat de listener hieronder maar één keer aangemaakt hoeft te worden.
  const findTokenRef = useRef(findToken);
  useEffect(() => {
    findTokenRef.current = findToken;
  });

  // CSS touch-action werkt niet op onderdelen binnen een SVG: de browser zou het gebaar als
  // scrollen zien en de sleepbeweging afbreken. React-touchlisteners zijn passief, dus dit
  // moet met een eigen listener. Naast de tokens blijft scrollen gewoon werken.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const blockScrollOnToken = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch && findTokenRef.current(svg, touch.clientX, touch.clientY)) {
        event.preventDefault();
      }
    };
    svg.addEventListener("touchstart", blockScrollOnToken, { passive: false });
    return () => svg.removeEventListener("touchstart", blockScrollOnToken);
  }, []);

  /** Geeft true terug als er een item is opgepakt. */
  function onPointerDown(event: PointerEvent<SVGSVGElement>): boolean {
    if (dragRef.current || event.button !== 0) return false;
    const svg = event.currentTarget;
    const token = findToken(svg, event.clientX, event.clientY);
    if (!token) return false;
    const { id, start, pointer } = token;

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
    return true;
  }

  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const pointer = clientToMeters(
      event.currentTarget,
      event.clientX,
      event.clientY,
      view,
    );
    if (!pointer) return;
    onMove(drag.id, {
      x: pointer.x + drag.offset.x,
      y: pointer.y + drag.offset.y,
    });
  }

  function onPointerUp(event: PointerEvent<SVGSVGElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    onEnd?.();
  }

  function onPointerCancel(event: PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (drag?.pointerId !== event.pointerId) return;
    onMove(drag.id, drag.start);
    dragRef.current = null;
    onEnd?.();
  }

  function onKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    const id = (event.target as Element)
      .closest("[data-entity]")
      ?.getAttribute("data-entity");
    const direction = keyToDirection(event.key, view);
    const current = id ? getPositions()[id] : undefined;
    if (!id || !direction || !current) return;
    event.preventDefault();
    event.stopPropagation();
    const step = event.shiftKey ? FINE_KEY_STEP_METERS : KEY_STEP_METERS;
    onMove(id, {
      x: current.x + direction.dx * step,
      y: current.y + direction.dy * step,
    });
    onEnd?.();
  }

  return {
    svgRef,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onKeyDown,
    },
  };
}
