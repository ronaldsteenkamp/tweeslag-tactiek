import { useCallback, useState } from "react";
import { paths } from "../../app/router";
import type { Lesson } from "../../domain/schema";
import { t } from "../../i18n";
import { useProgressStore } from "../progress/progress";
import { ShareDialog } from "../share/ShareDialog";
import { Modal } from "../ui/Modal";
import { ScenarioPlayer } from "./ScenarioPlayer";
import styles from "./ScenarioPlayer.module.css";

const BASE_VARIANT = "basis";

export function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const { scenario } = lesson;
  const reachStep = useProgressStore((state) => state.reachStep);
  const [sharing, setSharing] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [variantId, setVariantId] = useState(BASE_VARIANT);
  const variants = scenario.variants ?? [];
  const variant = variants.find((item) => item.id === variantId);
  const handleStep = useCallback(
    (step: number) => reachStep(lesson.id, step),
    [lesson.id, reachStep],
  );

  return (
    <>
      <ScenarioPlayer
        key={variantId}
        title={scenario.title}
        players={scenario.players}
        keyframes={variant?.keyframes ?? scenario.keyframes}
        onStep={variant ? undefined : handleStep}
        fieldAction={
          variants.length > 0 ? (
            <div
              className={styles.variants}
              role="group"
              aria-label={t("player.variants")}
            >
              {[
                { id: BASE_VARIANT, label: t("player.baseVariant") },
                ...variants,
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={styles.variant}
                  aria-pressed={item.id === variantId}
                  onClick={() => setVariantId(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : undefined
        }
        finishAction={
          <a className={styles.primary} href={paths.quiz(lesson.id)}>
            {t("player.startQuiz")}
          </a>
        }
        headerAction={
          <>
            <button
              type="button"
              className={styles.headerButton}
              onClick={() => setShowGoals(true)}
            >
              {t("player.goals")}
            </button>
            <button
              type="button"
              className={styles.headerButton}
              onClick={() => setSharing(true)}
            >
              {t("board.share")}
            </button>
          </>
        }
      />
      {showGoals ? (
        <Modal
          title={t("player.goalsTitle")}
          onClose={() => setShowGoals(false)}
        >
          <ul className={styles.goals}>
            {lesson.leerdoelen.map((goal) => (
              <li key={goal}>{goal}</li>
            ))}
          </ul>
          <p className={styles.goalsDuration}>
            {t("player.duration", { minutes: lesson.duurMinuten })}
          </p>
        </Modal>
      ) : null}
      {sharing ? (
        <ShareDialog scenario={scenario} onClose={() => setSharing(false)} />
      ) : null}
    </>
  );
}
