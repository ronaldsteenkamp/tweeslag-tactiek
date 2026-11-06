import { memo } from "react";
import {
  metersToSvg,
  UNITS_PER_METER,
  viewBoxSize,
  type CourtView,
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
import { HIT_RADIUS_METERS, useTokenDrag } from "./useTokenDrag";

export function formatMeters(value: number): string {
  return value.toFixed(1).replace(".", ",");
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
  const { width, height } = viewBoxSize(view.orientation);
  const { svgRef, handlers } = useTokenDrag({
    view,
    getPositions: () => useBoardStore.getState().positions,
    onMove: (id, position) => useBoardStore.getState().moveTo(id, position),
  });

  return (
    <svg
      ref={svgRef}
      className={styles.svg}
      viewBox={`0 0 ${width} ${height}`}
      role="group"
      aria-label={t("court.title")}
      data-testid="court"
      data-orientation={view.orientation}
      {...handlers}
    >
      <CourtSurface view={view} />
      {PLAYERS.map((player) => (
        <PlayerToken key={player.id} player={player} view={view} />
      ))}
      <BallToken view={view} />
    </svg>
  );
}
