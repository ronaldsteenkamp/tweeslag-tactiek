import { useState } from "react";
import { paths } from "../../app/router";
import { lessons } from "../../content";
import { isInTarget } from "../../domain/quiz";
import type {
  ChoiceQuestion,
  DragQuestion,
  Lesson,
  Player,
  QuizQuestion,
} from "../../domain/schema";
import { t } from "../../i18n";
import { useOrientation } from "../court/media";
import { useProgressStore } from "../progress/progress";
import styles from "./LessonQuiz.module.css";
import { QuizDragField } from "./QuizDragField";
import { RichText } from "./RichText";

interface QuestionProps {
  /** Wordt bij elke poging aangeroepen. */
  onAnswer: (correct: boolean) => void;
  onNext: () => void;
  isLast: boolean;
}

function Feedback({
  correct,
  explanation,
  isLast,
  onRetry,
  onNext,
}: {
  correct: boolean;
  explanation: string;
  isLast: boolean;
  onRetry: () => void;
  onNext: () => void;
}) {
  return (
    <div
      className={correct ? styles.right : styles.wrong}
      role="status"
      data-testid="feedback"
    >
      <p className={styles.verdict}>
        <span aria-hidden="true">{correct ? "✓" : "✗"}</span>{" "}
        {t(correct ? "quiz.correct" : "quiz.wrong")}
      </p>
      <p className={styles.explanation}>
        <RichText source={explanation} />
      </p>
      <div className={styles.actions}>
        {correct ? null : (
          <button type="button" className={styles.button} onClick={onRetry}>
            {t("quiz.retry")}
          </button>
        )}
        <button type="button" className={styles.primary} onClick={onNext}>
          {t(isLast ? "quiz.finish" : "quiz.next")}
        </button>
      </div>
    </div>
  );
}

function ChoiceView({
  question,
  onAnswer,
  onNext,
  isLast,
}: QuestionProps & { question: ChoiceQuestion }) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;

  function pick(index: number) {
    setPicked(index);
    onAnswer(index === question.correct);
  }

  return (
    <div className={styles.choice}>
      <p className={styles.prompt}>
        <RichText source={question.prompt} />
      </p>
      <div className={styles.options}>
        {question.options.map((option, index) => (
          <button
            key={option}
            type="button"
            className={styles.option}
            disabled={answered}
            data-state={
              !answered
                ? undefined
                : index === question.correct
                  ? "right"
                  : index === picked
                    ? "wrong"
                    : undefined
            }
            onClick={() => pick(index)}
          >
            {option}
          </button>
        ))}
      </div>
      {answered ? (
        <Feedback
          correct={picked === question.correct}
          explanation={question.explanation}
          isLast={isLast}
          onRetry={() => setPicked(null)}
          onNext={onNext}
        />
      ) : null}
    </div>
  );
}

function DragView({
  question,
  players,
  onAnswer,
  onNext,
  isLast,
}: QuestionProps & { question: DragQuestion; players: Player[] }) {
  const orientation = useOrientation();
  const start = question.setup.players[question.playerId] ?? { x: 0, y: 0 };
  const [position, setPosition] = useState(start);
  const [result, setResult] = useState<boolean | null>(null);
  const checked = result !== null;

  function check() {
    const correct = isInTarget(position, question.target, question.tolerance);
    setResult(correct);
    onAnswer(correct);
  }

  function retry() {
    setPosition(start);
    setResult(null);
  }

  return (
    <div className={styles.drag}>
      <div className={styles.field}>
        <QuizDragField
          view={{ orientation, flipped: false }}
          players={players}
          question={question}
          position={position}
          onMove={setPosition}
          locked={checked}
          showTarget={checked}
        />
      </div>
      <div className={styles.dragPanel}>
        <p className={styles.prompt}>
          <RichText source={question.prompt} />
        </p>
        {checked ? (
          <Feedback
            correct={result}
            explanation={question.explanation}
            isLast={isLast}
            onRetry={retry}
            onNext={onNext}
          />
        ) : (
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={check}>
              {t("quiz.check")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionView({
  question,
  players,
  ...props
}: QuestionProps & { question: QuizQuestion; players: Player[] }) {
  return question.kind === "drag" ? (
    <DragView question={question} players={players} {...props} />
  ) : (
    <ChoiceView question={question} {...props} />
  );
}

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
      />
    </div>
  );
}
