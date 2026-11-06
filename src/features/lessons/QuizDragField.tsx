import {
  clampToArea,
  facingAngle,
  formatMeters,
  metersToSvg,
  UNITS_PER_METER,
  viewBoxSize,
  type CourtView,
} from "../../domain/geometry";
import type { DragQuestion, Player, Position } from "../../domain/schema";
import { t } from "../../i18n";
import styles from "../court/Court.module.css";
import {
  BallShape,
  CourtSurface,
  OverlayDefs,
  Overlays,
  PLAYER_RADIUS,
  PlayerShape,
} from "../court/parts";
import { HIT_RADIUS_METERS, useTokenDrag } from "../court/useTokenDrag";

interface QuizDragFieldProps {
  view: CourtView;
  players: Player[];
  question: DragQuestion;
  position: Position;
  onMove: (position: Position) => void;
  locked: boolean;
  showTarget: boolean;
}

export function QuizDragField({
  view,
  players,
  question,
  position,
  onMove,
  locked,
  showTarget,
}: QuizDragFieldProps) {
  const { width, height } = viewBoxSize(view.orientation);
  const { svgRef, handlers } = useTokenDrag({
    view,
    getPositions: () => (locked ? {} : { [question.playerId]: position }),
    onMove: (_id, next) => onMove(clampToArea(next)),
  });

  const ball = metersToSvg(question.setup.ball, view);
  const target = metersToSvg(position, view);
  const dragged = players.find((player) => player.id === question.playerId);
  const zones = [
    ...(question.zones ?? []),
    ...(showTarget
      ? [
          {
            id: "doel",
            kind: "target" as const,
            polygon: question.target,
            label: t("quiz.targetLabel"),
          },
        ]
      : []),
  ];

  return (
    <svg
      ref={svgRef}
      className={styles.svg}
      viewBox={`0 0 ${width} ${height}`}
      role="group"
      aria-label={t("court.title")}
      data-testid="quiz-court"
      {...handlers}
    >
      <OverlayDefs />
      <CourtSurface view={view} />
      <Overlays arrows={question.arrows} zones={zones} view={view} />
      {players
        .filter((player) => player.id !== question.playerId)
        .map((player) => {
          const place = question.setup.players[player.id];
          if (!place) return null;
          const { sx, sy } = metersToSvg(place, view);
          return (
            <g key={player.id} transform={`translate(${sx} ${sy})`}>
              <PlayerShape
                player={player}
                angle={facingAngle(
                  place,
                  question.setup.ball,
                  player.team,
                  view,
                )}
              />
            </g>
          );
        })}
      <g transform={`translate(${ball.sx} ${ball.sy})`}>
        <BallShape height={question.setup.ball.height} />
      </g>
      {dragged ? (
        <g
          className={styles.token}
          data-entity={dragged.id}
          data-testid={`token-${dragged.id}`}
          transform={`translate(${target.sx} ${target.sy})`}
          role="button"
          tabIndex={0}
          aria-label={t("court.player", {
            label: dragged.label,
            team: dragged.team,
            x: formatMeters(position.x),
            y: formatMeters(position.y),
          })}
        >
          <circle
            className={styles.hit}
            r={HIT_RADIUS_METERS * UNITS_PER_METER}
          />
          <circle className={styles.dragHalo} r={PLAYER_RADIUS + 22} />
          <circle className={styles.focus} r={PLAYER_RADIUS + 34} />
          <PlayerShape
            player={dragged}
            angle={facingAngle(
              position,
              question.setup.ball,
              dragged.team,
              view,
            )}
          />
        </g>
      ) : null}
    </svg>
  );
}
