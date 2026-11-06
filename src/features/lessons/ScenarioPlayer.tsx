import { useEffect, useRef, type ReactNode } from "react";
import type { Keyframe, Player } from "../../domain/schema";
import { t } from "../../i18n";
import { CourtScene } from "../court/CourtScene";
import { useOrientation } from "../court/media";
import { RichText } from "./RichText";
import styles from "./ScenarioPlayer.module.css";
import { useStepPlayer } from "./useStepPlayer";

interface ScenarioPlayerProps {
  title: string;
  players: Player[];
  keyframes: Keyframe[];
  onStep?: (step: number) => void;
  /** Vervangt de knop Volgende op de laatste stap. */
  finishAction?: ReactNode;
  /** Knop naast de titel. */
  headerAction?: ReactNode;
  /** Melding boven het veld. */
  banner?: ReactNode;
  /** Knoppen over het veld, zoals varianten. Kost zo geen hoogte op een lage telefoon. */
  fieldAction?: ReactNode;
}

export function ScenarioPlayer({
  title,
  players,
  keyframes,
  onStep,
  finishAction,
  headerAction,
  banner,
  fieldAction,
}: ScenarioPlayerProps) {
  const orientation = useOrientation();
  const player = useStepPlayer(keyframes);
  const { step, lastStep, keyframe } = player;
  const finished = step === lastStep;

  useEffect(() => {
    onStep?.(step);
  }, [onStep, step]);

  // Bij veel stappen scrollt de balk: houd de huidige stap in beeld.
  const timelineRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    timelineRef.current
      ?.querySelector('[aria-current="step"]')
      ?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [step]);

  // Het toetsenbord werkt op de hele pagina; de laatste versie van de speler staat in een ref.
  const playerRef = useRef(player);
  useEffect(() => {
    playerRef.current = player;
  });

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (document.querySelector("dialog[open]")) return;
      if (event.key === "ArrowRight") playerRef.current.next();
      else if (event.key === "ArrowLeft") playerRef.current.previous();
      else return;
      event.preventDefault();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className={styles.page}>
      {banner}
      <div className={styles.layout}>
        <div className={styles.field}>
          {fieldAction ? (
            <div className={styles.fieldAction}>{fieldAction}</div>
          ) : null}
          <CourtScene
            view={{ orientation, flipped: false }}
            players={players}
            frame={player.frame}
            arrows={keyframe?.arrows}
            zones={keyframe?.zones}
          />
        </div>

        <section className={styles.panel} aria-labelledby="lesson-title">
          <div className={styles.titleRow}>
            <h1 className={styles.title} id="lesson-title">
              {title}
            </h1>
            {headerAction}
          </div>

          <ol
            ref={timelineRef}
            className={styles.timeline}
            aria-label={t("player.timeline")}
          >
            {keyframes.map((item, index) => (
              <li key={item.id} className={styles.timelineItem}>
                <button
                  type="button"
                  className={styles.stepButton}
                  data-done={index < step || undefined}
                  aria-current={index === step ? "step" : undefined}
                  aria-label={t("player.goToStep", { step: index + 1 })}
                  onClick={() => player.goTo(index)}
                >
                  {index + 1}
                </button>
              </li>
            ))}
          </ol>

          <div className={styles.caption}>
            <p
              className={styles.stepLabel}
              aria-live="polite"
              data-testid="step-label"
            >
              {t("player.stepOf", { step: step + 1, total: lastStep + 1 })}
            </p>
            <p
              className={styles.captionText}
              aria-live="polite"
              data-testid="caption"
            >
              <RichText source={keyframe?.caption ?? ""} />
            </p>
            {keyframe?.tip ? (
              <p className={styles.tip} data-testid="tip">
                <span className={styles.tipLabel}>{t("player.tip")}</span>
                <RichText source={keyframe.tip} />
              </p>
            ) : null}
          </div>

          <div className={styles.controls}>
            <button
              type="button"
              className={styles.control}
              disabled={step === 0}
              onClick={player.previous}
            >
              {t("player.previous")}
            </button>
            {finished && finishAction ? (
              finishAction
            ) : (
              <button
                type="button"
                className={styles.primary}
                disabled={finished}
                onClick={player.next}
              >
                {t("player.next")}
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
