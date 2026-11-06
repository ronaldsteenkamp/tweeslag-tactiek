import { useState } from "react";
import { paths } from "../../app/router";
import { lessons } from "../../content";
import type { Lesson } from "../../domain/schema";
import { t } from "../../i18n";
import { useProgressStore } from "../progress/progress";
import styles from "./LessonQuiz.module.css";
import { QuizRunner, TimedIntro } from "./QuizRunner";

export function LessonQuiz({ lesson }: { lesson: Lesson }) {
  const { quiz, scenario } = lesson;
  const finishQuiz = useProgressStore((state) => state.finishQuiz);
  const nextLesson = lessons.find((other) => other.order > lesson.order);
  const heading = t("quiz.heading", { title: scenario.title });
  /** Op expertniveau kies je vooraf of er een tijdslimiet is. */
  const [timed, setTimed] = useState<boolean | null>(
    lesson.niveau === "expert" ? null : false,
  );

  if (timed === null)
    return <TimedIntro heading={heading} onStart={setTimed} />;

  return (
    <QuizRunner
      heading={heading}
      items={quiz.map((question) => ({
        key: question.id,
        question,
        players: scenario.players,
      }))}
      canRetry
      timed={timed}
      onFinish={({ score, total }) => finishQuiz(lesson.id, score, total)}
      renderResult={({ score, total }, restart) => (
        <div className={styles.result}>
          <h1 className={styles.heading}>{t("quiz.resultHeading")}</h1>
          <p data-testid="quiz-score">{t("quiz.score", { score, total })}</p>
          <div className={styles.resultActions}>
            {nextLesson ? (
              <a className={styles.primary} href={paths.lesson(nextLesson.id)}>
                {t("player.nextLesson", { title: nextLesson.scenario.title })}
              </a>
            ) : null}
            <button type="button" className={styles.button} onClick={restart}>
              {t("quiz.again")}
            </button>
            <a className={styles.button} href={paths.lessons}>
              {t("player.backToLessons")}
            </a>
          </div>
        </div>
      )}
    />
  );
}
