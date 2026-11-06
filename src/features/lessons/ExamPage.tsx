import { useState } from "react";
import { paths } from "../../app/router";
import { lessons } from "../../content";
import {
  isExamOpen,
  pickExamQuestions,
  type ExamQuestion,
} from "../../domain/exam";
import type { Niveau } from "../../domain/schema";
import { t } from "../../i18n";
import { useProgressStore, useUnlockState } from "../progress/progress";
import styles from "./LessonQuiz.module.css";
import { RichText } from "./RichText";
import { QuizRunner, TimedIntro } from "./QuizRunner";

const keyOf = ({ lesson, question }: ExamQuestion) =>
  `${lesson.id}/${question.id}`;

function Exam({ niveau }: { niveau: Niveau }) {
  const finishExam = useProgressStore((state) => state.finishExam);
  const [picked, setPicked] = useState(() =>
    pickExamQuestions(lessons, niveau),
  );
  const [timed, setTimed] = useState<boolean | null>(null);
  const [started, setStarted] = useState(false);
  const name = t(`niveau.${niveau}`);
  const heading = t("exam.heading", { niveau: name });
  const intro = t("exam.intro", { total: picked.length });

  if (!started) {
    if (niveau === "expert") {
      return (
        <TimedIntro
          heading={heading}
          intro={intro}
          onStart={(value) => {
            setTimed(value);
            setStarted(true);
          }}
        />
      );
    }
    return (
      <div className={styles.result}>
        <h1 className={styles.heading}>{heading}</h1>
        <p>{intro}</p>
        <div className={styles.resultActions}>
          <button
            type="button"
            className={styles.primary}
            onClick={() => setStarted(true)}
          >
            {t("exam.start")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <QuizRunner
      heading={heading}
      items={picked.map((item) => ({
        key: keyOf(item),
        question: item.question,
        players: item.lesson.scenario.players,
      }))}
      canRetry={false}
      timed={timed === true}
      onFinish={({ score, total }) => finishExam(niveau, score, total)}
      renderResult={({ score, total, wrong }, restart) => (
        <div className={styles.result} data-testid="exam-result">
          <h1 className={styles.heading}>{t("exam.resultHeading")}</h1>
          <p data-testid="exam-score">{t("exam.score", { score, total })}</p>
          {wrong.length > 0 ? (
            <>
              <h2 className={styles.subheading}>{t("exam.review")}</h2>
              <ul className={styles.reviewList}>
                {picked
                  .filter((item) => wrong.includes(keyOf(item)))
                  .map((item) => (
                    <li key={keyOf(item)}>
                      <RichText source={item.question.prompt} />{" "}
                      <a href={paths.lesson(item.lesson.id)}>
                        {t("exam.toLesson", {
                          title: item.lesson.scenario.title,
                        })}
                      </a>
                    </li>
                  ))}
              </ul>
            </>
          ) : null}
          <div className={styles.resultActions}>
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                setPicked(pickExamQuestions(lessons, niveau));
                restart();
              }}
            >
              {t("exam.again")}
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

export function ExamPage({ niveau }: { niveau: Niveau }) {
  const unlock = useUnlockState();
  if (isExamOpen(niveau, lessons, unlock)) return <Exam niveau={niveau} />;

  return (
    <div className={styles.result} data-testid="exam-locked">
      <h1 className={styles.heading}>
        {t("exam.heading", { niveau: t(`niveau.${niveau}`) })}
      </h1>
      <p>{t("exam.locked")}</p>
      <a className={styles.button} href={paths.lessons}>
        {t("player.backToLessons")}
      </a>
    </div>
  );
}
