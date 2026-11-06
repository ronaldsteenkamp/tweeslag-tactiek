import type { MouseEvent } from "react";
import {
  facingAngle,
  metersToSvg,
  viewBoxSize,
  type CourtView,
} from "../../domain/geometry";
import type { FrameState } from "../../domain/interpolate";
import type { Arrow, Player, Position, Zone } from "../../domain/schema";
import { t } from "../../i18n";
import styles from "./Court.module.css";
import {
  BallShape,
  CourtSurface,
  OverlayDefs,
  Overlays,
  PlayerShape,
} from "./parts";
import { clientToMeters, hitRadiusMeters } from "./useTokenDrag";

interface CourtSceneProps {
  view: CourtView;
  players: Player[];
  frame: FrameState;
  arrows?: Arrow[];
  zones?: Zone[];
  /**
   * Tikken op het veld, met de plek in meters en het tikbereik. Alleen als extra: wie de muis
   * niet gebruikt, kiest met de knoppen naast het veld.
   */
  onTap?: (point: Position, hitRadius: number) => void;
}

/** Het veld als afbeelding. De uitleg staat in de tekst ernaast. */
export function CourtScene({
  view,
  players,
  frame,
  arrows,
  zones,
  onTap,
}: CourtSceneProps) {
  const { width, height } = viewBoxSize(view.orientation);
  const ball = metersToSvg(frame.ball, view);

  function handleClick(event: MouseEvent<SVGSVGElement>) {
    const svg = event.currentTarget;
    const point = clientToMeters(svg, event.clientX, event.clientY, view);
    if (point) onTap?.(point, hitRadiusMeters(svg));
  }

  return (
    <svg
      className={styles.svg}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={t("court.title")}
      data-testid="scene"
      {...(onTap ? { onClick: handleClick } : {})}
    >
      <OverlayDefs />
      <CourtSurface view={view} />
      <Overlays arrows={arrows} zones={zones} view={view} />
      {players.map((player) => {
        const position = frame.players[player.id];
        if (!position) return null;
        const { sx, sy } = metersToSvg(position, view);
        return (
          <g
            key={player.id}
            transform={`translate(${sx} ${sy})`}
            data-testid={`scene-${player.id}`}
          >
            <PlayerShape
              player={player}
              angle={facingAngle(position, frame.ball, player.team, view)}
            />
          </g>
        );
      })}
      <g
        transform={`translate(${ball.sx} ${ball.sy})`}
        data-testid="scene-ball"
      >
        <BallShape height={frame.ball.height} />
      </g>
    </svg>
  );
}
