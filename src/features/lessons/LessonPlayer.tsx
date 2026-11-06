import { useCallback, useState } from "react";
import { paths } from "../../app/router";
import type { Lesson } from "../../domain/schema";
import { t } from "../../i18n";
import { useProgressStore } from "../progress/progress";
import { ShareDialog } from "../share/ShareDialog";
import { ScenarioPlayer } from "./ScenarioPlayer";
import styles from "./ScenarioPlayer.module.css";

export function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const { scenario } = lesson;
  const reachStep = useProgressStore((state) => state.reachStep);
  const [sharing, setSharing] = useState(false);
  const handleStep = useCallback(
    (step: number) => reachStep(lesson.id, step),
    [lesson.id, reachStep],
  );

  return (
    <>
      <ScenarioPlayer
        title={scenario.title}
        players={scenario.players}
        keyframes={scenario.keyframes}
        onStep={handleStep}
        finishAction={
          <a className={styles.primary} href={paths.quiz(lesson.id)}>
            {t("player.startQuiz")}
          </a>
        }
        headerAction={
          <button
            type="button"
            className={styles.headerButton}
            onClick={() => setSharing(true)}
          >
            {t("board.share")}
          </button>
        }
      />
      {sharing ? (
        <ShareDialog scenario={scenario} onClose={() => setSharing(false)} />
      ) : null}
    </>
  );
}
