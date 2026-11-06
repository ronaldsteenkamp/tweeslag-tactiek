import { useState } from "react";
import { paths } from "../../app/router";
import { lessons } from "../../content";
import type { Lesson } from "../../domain/schema";
import { t } from "../../i18n";
import { useProgressStore } from "../progress/progress";
import styles from "./LessonQuiz.module.css";
import { QuestionView } from "./QuizQuestions";

export function LessonQuiz({ lesson }: { lesson: Lesson }) {
  const { quiz, scenario } = lesson;
  const finishQuiz = useProgressStore((state) => state.finishQuiz);
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  /** Per vraag: was de eerste poging goed? */
  const [firstTries, setFirstTries] = useState<Record<string, boolean>>({});
  const question = quiz[index];
  const nextLesson = lessons.find((other) => other.order > lesson.order);
  const score = Object.values(firstTries).filter(Boolean).length;

  function answer(id: string, correct: boolean) {
    setFirstTries((current) =>
      id in current ? current : { ...current, [id]: correct },
    );
  }

  function next() {
    if (index + 1 === quiz.length) finishQuiz(lesson.id, score, quiz.length);
    setIndex(index + 1);
  }

  function restart() {
    setFirstTries({});
    setIndex(0);
    setRound(round + 1);
  }

  if (!question) {
    return (
      <div className={styles.result}>
        <h1 className={styles.heading}>{t("quiz.resultHeading")}</h1>
        <p data-testid="quiz-score">
          {t("quiz.score", { score, total: quiz.length })}
        </p>
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
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>
          {t("quiz.heading", { title: scenario.title })}
        </h1>
        <p className={styles.count} data-testid="quiz-count">
          {t("quiz.questionOf", { number: index + 1, total: quiz.length })}
        </p>
      </div>
      <QuestionView
        key={`${round}-${question.id}`}
        question={question}
        players={scenario.players}
        onAnswer={(correct) => answer(question.id, correct)}
        onNext={next}
        isLast={index + 1 === quiz.length}
        canRetry
      />
    </div>
  );
}
