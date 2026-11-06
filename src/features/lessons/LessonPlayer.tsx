import { useEffect, useRef } from "react";
import { paths } from "../../app/router";
import { lessons } from "../../content";
import type { Lesson } from "../../domain/schema";
import { t } from "../../i18n";
import { CourtScene } from "../court/CourtScene";
import { useOrientation } from "../court/media";
import styles from "./LessonPlayer.module.css";
import { RichText } from "./RichText";
import { SPEEDS, useStepPlayer } from "./useStepPlayer";

function formatSpeed(speed: number): string {
  return `${String(speed).replace(".", ",")}×`;
}

export function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const { scenario } = lesson;
  const orientation = useOrientation();
  const player = useStepPlayer(scenario.keyframes);
  const { step, lastStep, keyframe } = player;
  const finished = step === lastStep;
  const nextLesson = lessons.find((other) => other.order > lesson.order);

  // Het toetsenbord werkt op de hele pagina; de laatste versie van de speler staat in een ref.
  const playerRef = useRef(player);
  useEffect(() => {
    playerRef.current = player;
  });

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const onControl = (event.target as Element).closest("a, button");
      if (event.key === "ArrowRight") playerRef.current.next();
      else if (event.key === "ArrowLeft") playerRef.current.previous();
      else if (event.key === " " && !onControl) playerRef.current.togglePlay();
      else return;
      event.preventDefault();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className={styles.layout}>
      <div className={styles.field}>
        <CourtScene
          view={{ orientation, flipped: false }}
          players={scenario.players}
          frame={player.frame}
          arrows={keyframe?.arrows}
          zones={keyframe?.zones}
        />
      </div>

      <section className={styles.panel} aria-labelledby="lesson-title">
        <h1 className={styles.title} id="lesson-title">
          {scenario.title}
        </h1>

        <ol className={styles.timeline} aria-label={t("player.timeline")}>
          {scenario.keyframes.map((item, index) => (
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
          {finished ? (
            <p className={styles.done}>
              <strong>{t("player.done")}</strong>{" "}
              {nextLesson ? (
                <a href={paths.lesson(nextLesson.id)}>
                  {t("player.nextLesson", {
                    title: nextLesson.scenario.title,
                  })}
                </a>
              ) : (
                <a href={paths.lessons}>{t("player.backToLessons")}</a>
              )}
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
          <button
            type="button"
            className={styles.control}
            onClick={player.togglePlay}
          >
            {t(
              player.playing
                ? "player.pause"
                : finished
                  ? "player.replay"
                  : "player.play",
            )}
          </button>
          <button
            type="button"
            className={styles.primary}
            disabled={finished}
            onClick={player.next}
          >
            {t("player.next")}
          </button>
        </div>

        <div
          className={styles.speeds}
          role="group"
          aria-label={t("player.speed")}
        >
          <span className={styles.speedLabel} aria-hidden="true">
            {t("player.speed")}
          </span>
          {SPEEDS.map((speed) => (
            <button
              key={speed}
              type="button"
              className={styles.speed}
              aria-pressed={player.speed === speed}
              onClick={() => player.setSpeed(speed)}
            >
              {formatSpeed(speed)}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
