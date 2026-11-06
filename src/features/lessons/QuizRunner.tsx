import { useEffect, useState, type ReactNode } from "react";
import { timeLimitSeconds } from "../../domain/exam";
import type { Player, QuizQuestion } from "../../domain/schema";
import { t } from "../../i18n";
import styles from "./LessonQuiz.module.css";
import { Feedback, QuestionView } from "./QuizQuestions";

export interface RunnerItem {
  /** Uniek binnen deze quiz. */
  key: string;
  question: QuizQuestion;
  players: Player[];
}

export interface RunnerResult {
  score: number;
  total: number;
  /** De sleutels van vragen die niet in één keer goed waren. */
  wrong: string[];
}

function Countdown({
  seconds,
  onExpire,
}: {
  seconds: number;
  onExpire: () => void;
}) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    if (left === 0) {
      onExpire();
      return;
    }
    const timer = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(timer);
  }, [left, onExpire]);

  return (
    <p className={styles.timer} role="timer" data-testid="timer">
      {t("quiz.secondsLeft", { seconds: left })}
    </p>
  );
}

/** Loopt door een reeks vragen en geeft aan het eind de score door. */
export function QuizRunner({
  heading,
  items,
  canRetry,
  timed,
  onFinish,
  renderResult,
}: {
  heading: string;
  items: RunnerItem[];
  canRetry: boolean;
  timed: boolean;
  onFinish: (result: RunnerResult) => void;
  renderResult: (result: RunnerResult, restart: () => void) => ReactNode;
}) {
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  /** Per vraag: was de eerste poging goed? */
  const [firstTries, setFirstTries] = useState<Record<string, boolean>>({});
  const [expired, setExpired] = useState(false);
  const item = items[index];
  const result: RunnerResult = {
    score: Object.values(firstTries).filter(Boolean).length,
    total: items.length,
    wrong: items
      .filter(({ key }) => firstTries[key] !== true)
      .map(({ key }) => key),
  };

  function answer(key: string, correct: boolean) {
    setFirstTries((current) =>
      key in current ? current : { ...current, [key]: correct },
    );
  }

  function next() {
    if (index + 1 === items.length) onFinish(result);
    setExpired(false);
    setIndex(index + 1);
  }

  function restart() {
    setFirstTries({});
    setExpired(false);
    setIndex(0);
    setRound(round + 1);
  }

  if (!item) return renderResult(result, restart);

  const isLast = index + 1 === items.length;
  const answered = item.key in firstTries;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>{heading}</h1>
        <div className={styles.status}>
          <p className={styles.count} data-testid="quiz-count">
            {t("quiz.questionOf", { number: index + 1, total: items.length })}
          </p>
          {timed && !answered ? (
            <Countdown
              key={`${round}-${item.key}`}
              seconds={timeLimitSeconds(item.question)}
              onExpire={() => {
                answer(item.key, false);
                setExpired(true);
              }}
            />
          ) : null}
        </div>
      </div>
      {expired ? (
        <div className={styles.choice}>
          <Feedback
            correct={false}
            note={t("quiz.timeUp")}
            explanation={item.question.explanation}
            isLast={isLast}
            canRetry={false}
            onRetry={next}
            onNext={next}
          />
        </div>
      ) : (
        <QuestionView
          key={`${round}-${item.key}`}
          question={item.question}
          players={item.players}
          onAnswer={(correct) => answer(item.key, correct)}
          onNext={next}
          isLast={isLast}
          canRetry={canRetry && !timed}
        />
      )}
    </div>
  );
}

/** De aankondiging vooraf. Zonder tijdslimiet is de eerste, standaard keuze. */
export function TimedIntro({
  heading,
  intro,
  onStart,
}: {
  heading: string;
  intro?: string;
  onStart: (timed: boolean) => void;
}) {
  return (
    <div className={styles.result}>
      <h1 className={styles.heading}>{heading}</h1>
      {intro ? <p>{intro}</p> : null}
      <p>{t("quiz.timedIntro")}</p>
      <div className={styles.resultActions}>
        <button
          type="button"
          className={styles.primary}
          onClick={() => onStart(false)}
        >
          {t("quiz.startUntimed")}
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={() => onStart(true)}
        >
          {t("quiz.startTimed")}
        </button>
      </div>
    </div>
  );
}
