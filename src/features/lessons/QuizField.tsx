import {
  clampToArea,
  facingAngle,
  formatMeters,
  metersToSvg,
  UNITS_PER_METER,
  viewBoxSize,
  type CourtView,
} from "../../domain/geometry";
import type { Arrow, Ball, Player, Position, Zone } from "../../domain/schema";
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

interface QuizFieldProps {
  view: CourtView;
  players: Player[];
  setup: { players: Record<string, Position>; ball: Ball };
  arrows?: Arrow[];
  zones?: Zone[];
  /** De spelers die verplaatst mogen worden, met hun huidige plek. */
  positions: Record<string, Position>;
  onMove: (id: string, position: Position) => void;
  locked: boolean;
  /** De getekende route. */
  trail?: Position[];
}

/** Het veld voor vragen waarin je spelers verplaatst, met muis, vinger of pijltjestoetsen. */
export function QuizField({
  view,
  players,
  setup,
  arrows,
  zones,
  positions,
  onMove,
  locked,
  trail,
}: QuizFieldProps) {
  const { width, height } = viewBoxSize(view.orientation);
  const { svgRef, handlers } = useTokenDrag({
    view,
    getPositions: () => (locked ? {} : positions),
    onMove: (id, next) => onMove(id, clampToArea(next)),
  });
  const ball = metersToSvg(setup.ball, view);
  const trailPoints = trail
    ?.map((point) => {
      const { sx, sy } = metersToSvg(point, view);
      return `${sx},${sy}`;
    })
    .join(" ");

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
      <Overlays arrows={arrows} zones={zones} view={view} />
      {trailPoints ? (
        <polyline
          className={styles.trail}
          points={trailPoints}
          data-testid="quiz-trail"
        />
      ) : null}
      {players
        .filter((player) => !(player.id in positions))
        .map((player) => {
          const place = setup.players[player.id];
          if (!place) return null;
          const { sx, sy } = metersToSvg(place, view);
          return (
            <g key={player.id} transform={`translate(${sx} ${sy})`}>
              <PlayerShape
                player={player}
                angle={facingAngle(place, setup.ball, player.team, view)}
              />
            </g>
          );
        })}
      <g transform={`translate(${ball.sx} ${ball.sy})`}>
        <BallShape height={setup.ball.height} />
      </g>
      {players.map((player) => {
        const position = positions[player.id];
        if (!position) return null;
        const { sx, sy } = metersToSvg(position, view);
        return (
          <g
            key={player.id}
            className={styles.token}
            data-entity={player.id}
            data-testid={`token-${player.id}`}
            transform={`translate(${sx} ${sy})`}
            role="button"
            tabIndex={0}
            aria-label={t("court.player", {
              label: player.label,
              team: player.team,
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
              player={player}
              angle={facingAngle(position, setup.ball, player.team, view)}
            />
          </g>
        );
      })}
    </svg>
  );
}
