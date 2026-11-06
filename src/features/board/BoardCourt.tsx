import { useRef, useState, type PointerEvent } from "react";
import { GRID_METERS, rectangle } from "../../domain/editing";
import {
  COURT,
  distance,
  facingAngle,
  formatMeters,
  metersToSvg,
  nearestWithin,
  UNITS_PER_METER,
  viewBoxSize,
  type CourtView,
} from "../../domain/geometry";
import type { Arrow, Player, Position } from "../../domain/schema";
import { BALL_ID } from "../../domain/types";
import { t } from "../../i18n";
import styles from "../court/Court.module.css";
import {
  BALL_RADIUS,
  BallShape,
  CourtSurface,
  OverlayDefs,
  Overlays,
  PLAYER_RADIUS,
  PlayerShape,
} from "../court/parts";
import {
  clientToMeters,
  HIT_RADIUS_METERS,
  useTokenDrag,
} from "../court/useTokenDrag";
import { selectKeyframe, useEditor } from "./editorStore";

const MIN_ARROW_METERS = 0.6;
const MIN_ZONE_METERS = 0.5;

type Sketch =
  | { kind: Arrow["kind"]; from: Position; to: Position }
  | { kind: "zone"; from: Position; to: Position };

function PlayerToken({
  player,
  position,
  ball,
  view,
  interactive,
}: {
  player: Player;
  position: Position;
  ball: Position;
  view: CourtView;
  interactive: boolean;
}) {
  const { sx, sy } = metersToSvg(position, view);
  return (
    <g
      className={styles.token}
      data-entity={player.id}
      data-testid={`token-${player.id}`}
      transform={`translate(${sx} ${sy})`}
      role="button"
      tabIndex={interactive ? 0 : -1}
      aria-label={t("court.player", {
        label: player.label,
        team: player.team,
        x: formatMeters(position.x),
        y: formatMeters(position.y),
      })}
    >
      <circle className={styles.hit} r={HIT_RADIUS_METERS * UNITS_PER_METER} />
      <circle className={styles.focus} r={PLAYER_RADIUS + 22} />
      <PlayerShape
        player={player}
        angle={facingAngle(position, ball, player.team, view)}
      />
    </g>
  );
}

function GridLines({ view }: { view: CourtView }) {
  const lines = [];
  for (let x = 0; x <= COURT.length; x += GRID_METERS * 2) {
    const a = metersToSvg({ x, y: 0 }, view);
    const b = metersToSvg({ x, y: COURT.width }, view);
    lines.push(<line key={`x${x}`} x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} />);
  }
  for (let y = 0; y <= COURT.width; y += GRID_METERS * 2) {
    const a = metersToSvg({ x: 0, y }, view);
    const b = metersToSvg({ x: COURT.length, y }, view);
    lines.push(<line key={`y${y}`} x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} />);
  }
  return (
    <g className={styles.grid} aria-hidden="true">
      {lines}
    </g>
  );
}

function SketchPreview({ sketch, view }: { sketch: Sketch; view: CourtView }) {
  if (sketch.kind === "zone") {
    return (
      <Overlays
        view={view}
        zones={[
          {
            id: "schets",
            kind: "blocked",
            polygon: rectangle(sketch.from, sketch.to),
          },
        ]}
      />
    );
  }
  return (
    <Overlays
      view={view}
      arrows={[
        { id: "schets", kind: sketch.kind, from: sketch.from, to: sketch.to },
      ]}
    />
  );
}

export function BoardCourt({ view }: { view: CourtView }) {
  const players = useEditor((state) => state.history.present.players);
  const keyframe = useEditor(selectKeyframe);
  const tool = useEditor((state) => state.tool);
  const selectedId = useEditor((state) => state.selectedId);
  const snap = useEditor((state) => state.snap);
  const { width, height } = viewBoxSize(view.orientation);
  const [sketch, setSketch] = useState<Sketch | null>(null);
  /** Laatste plek bij het verschuiven van een lijn of zone. */
  const overlayDragRef = useRef<{ pointerId: number; last: Position } | null>(
    null,
  );

  const positions: Record<string, Position> = {
    ...keyframe.players,
    [BALL_ID]: keyframe.ball,
  };
  const { svgRef, handlers } = useTokenDrag({
    view,
    getPositions: () => {
      if (useEditor.getState().tool !== "select") return {};
      const current = selectKeyframe(useEditor.getState());
      return { ...current.players, [BALL_ID]: current.ball };
    },
    onMove: (id, position) => useEditor.getState().moveToken(id, position),
    onEnd: () => useEditor.getState().endGesture(),
  });

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    const editor = useEditor.getState();
    if (editor.tool === "select") {
      if (handlers.onPointerDown(event)) {
        editor.select(null);
        return;
      }
      const overlay = (event.target as Element)
        .closest("[data-overlay]")
        ?.getAttribute("data-overlay");
      editor.select(overlay ?? null);
      const pointer = clientToMeters(
        event.currentTarget,
        event.clientX,
        event.clientY,
        view,
      );
      if (overlay && pointer) {
        event.currentTarget.setPointerCapture(event.pointerId);
        overlayDragRef.current = { pointerId: event.pointerId, last: pointer };
      }
      return;
    }

    const pointer = clientToMeters(
      event.currentTarget,
      event.clientX,
      event.clientY,
      view,
    );
    if (!pointer || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    // Een lijn die bij een speler of de bal begint, begint precies daar.
    const nearest = nearestWithin(pointer, positions, HIT_RADIUS_METERS);
    const start =
      editor.tool !== "zone" && nearest ? positions[nearest] : undefined;
    const from = start ? { x: start.x, y: start.y } : pointer;
    setSketch({ kind: editor.tool, from, to: pointer });
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const pointer = clientToMeters(
      event.currentTarget,
      event.clientX,
      event.clientY,
      view,
    );
    const overlayDrag = overlayDragRef.current;
    if (overlayDrag?.pointerId === event.pointerId && pointer) {
      const dx = Number((pointer.x - overlayDrag.last.x).toFixed(1));
      const dy = Number((pointer.y - overlayDrag.last.y).toFixed(1));
      if (dx !== 0 || dy !== 0) {
        useEditor.getState().moveSelected(dx, dy);
        overlayDragRef.current = {
          pointerId: event.pointerId,
          last: { x: overlayDrag.last.x + dx, y: overlayDrag.last.y + dy },
        };
      }
      return;
    }
    if (sketch && pointer) {
      setSketch({ ...sketch, to: pointer });
      return;
    }
    handlers.onPointerMove(event);
  }

  function finishSketch() {
    if (!sketch) return;
    const editor = useEditor.getState();
    if (sketch.kind === "zone") {
      const wide = Math.abs(sketch.to.x - sketch.from.x) >= MIN_ZONE_METERS;
      const tall = Math.abs(sketch.to.y - sketch.from.y) >= MIN_ZONE_METERS;
      if (wide && tall) editor.drawZone(sketch.from, sketch.to);
    } else if (distance(sketch.from, sketch.to) >= MIN_ARROW_METERS) {
      editor.drawArrow(sketch.kind, sketch.from, sketch.to);
    }
    setSketch(null);
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    if (overlayDragRef.current?.pointerId === event.pointerId) {
      overlayDragRef.current = null;
      useEditor.getState().endGesture();
      return;
    }
    finishSketch();
    handlers.onPointerUp(event);
  }

  function handlePointerCancel(event: PointerEvent<SVGSVGElement>) {
    setSketch(null);
    overlayDragRef.current = null;
    useEditor.getState().endGesture();
    handlers.onPointerCancel(event);
  }

  const ball = metersToSvg(keyframe.ball, view);

  return (
    <svg
      ref={svgRef}
      className={`${styles.svg} ${styles.boardSvg}`}
      viewBox={`0 0 ${width} ${height}`}
      role="group"
      aria-label={t("court.title")}
      data-testid="court"
      data-orientation={view.orientation}
      data-tool={tool}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onKeyDown={handlers.onKeyDown}
    >
      <OverlayDefs />
      <CourtSurface view={view} />
      {snap ? <GridLines view={view} /> : null}
      <Overlays
        view={view}
        arrows={keyframe.arrows}
        zones={keyframe.zones}
        selectedId={selectedId}
        interactive
      />
      {sketch ? <SketchPreview sketch={sketch} view={view} /> : null}
      {players.map((player) => {
        const position = keyframe.players[player.id];
        return position ? (
          <PlayerToken
            key={player.id}
            player={player}
            position={position}
            ball={keyframe.ball}
            view={view}
            interactive={tool === "select"}
          />
        ) : null;
      })}
      <g
        className={styles.token}
        data-entity={BALL_ID}
        data-testid="token-ball"
        transform={`translate(${ball.sx} ${ball.sy})`}
        role="button"
        tabIndex={tool === "select" ? 0 : -1}
        aria-label={t("court.ball", {
          x: formatMeters(keyframe.ball.x),
          y: formatMeters(keyframe.ball.y),
        })}
      >
        <circle
          className={styles.hit}
          r={HIT_RADIUS_METERS * UNITS_PER_METER}
        />
        <circle className={styles.focus} r={BALL_RADIUS + 22} />
        <BallShape height={keyframe.ball.height} />
      </g>
    </svg>
  );
}
