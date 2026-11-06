import { paths } from "../../app/router";
import { lessons } from "../../content";
import { isExamOpen } from "../../domain/exam";
import { NIVEAUS, type Lesson, type Niveau } from "../../domain/schema";
import { isNiveauOpen, lessonAccess } from "../../domain/unlock";
import { t } from "../../i18n";
import { InstallBanner } from "../install/InstallBanner";
import {
  lessonStatus,
  useProgressStore,
  useUnlockState,
  type LessonProgress,
} from "../progress/progress";
import styles from "./LessonsOverview.module.css";

function ProgressLabel({ progress }: { progress?: LessonProgress }) {
  const status = lessonStatus(progress);
  return (
    <span className={styles.status} data-status={status}>
      {status === "done"
        ? t("lessons.done", {
            score: progress?.score ?? 0,
            total: progress?.total ?? 0,
          })
        : t(status === "busy" ? "lessons.busy" : "lessons.new")}
    </span>
  );
}

function LessonCard({ lesson, locked }: { lesson: Lesson; locked: boolean }) {
  const progress = useProgressStore((state) => state.lessons[lesson.id]);
  return (
    <a
      className={styles.card}
      href={paths.lesson(lesson.id)}
      data-locked={locked || undefined}
    >
      <span className={styles.number} aria-hidden="true">
        {String(lesson.order).padStart(2, "0")}
      </span>
      <span className={styles.body}>
        <span className={styles.title}>{lesson.scenario.title}</span>
        <span className={styles.description}>
          {lesson.scenario.description}
        </span>
        <span className={styles.meta}>
          {t("lessons.minutes", { minutes: lesson.duurMinuten })}
          {locked ? (
            <span className={styles.status}>{t("lessons.locked")}</span>
          ) : (
            <ProgressLabel progress={progress} />
          )}
          {lesson.status === "concept" ? (
            <span className={styles.badge}>{t("lessons.concept")}</span>
          ) : null}
        </span>
      </span>
    </a>
  );
}

function ExamCard({ niveau, open }: { niveau: Niveau; open: boolean }) {
  const best = useProgressStore((state) => state.toetsen[niveau]);
  const detail = best
    ? t("exam.cardBest", { score: best.score, total: best.total })
    : t(open ? "exam.cardOpen" : "exam.cardLocked");
  const content = (
    <span className={styles.body}>
      <span className={styles.title}>
        {t("exam.heading", { niveau: t(`niveau.${niveau}`) })}
      </span>
      <span className={styles.description}>{detail}</span>
    </span>
  );
  return open ? (
    <a
      className={styles.card}
      href={paths.exam(niveau)}
      data-testid={`exam-${niveau}`}
    >
      <span className={styles.number} aria-hidden="true" />
      {content}
    </a>
  ) : (
    <div className={styles.card} data-locked data-testid={`exam-${niveau}`}>
      <span className={styles.number} aria-hidden="true" />
      {content}
    </div>
  );
}

function NiveauSection({ niveau }: { niveau: Niveau }) {
  const unlock = useUnlockState();
  const items = lessons.filter((lesson) => lesson.niveau === niveau);
  const done = items.filter((lesson) => unlock.done.has(lesson.id)).length;
  const open = isNiveauOpen(niveau, lessons, unlock);
  const previous = NIVEAUS[NIVEAUS.indexOf(niveau) - 1];

  return (
    <section
      className={styles.niveau}
      aria-labelledby={`niveau-${niveau}`}
      data-testid={`niveau-${niveau}`}
    >
      <div className={styles.niveauHeader}>
        <h2 className={styles.niveauTitle} id={`niveau-${niveau}`}>
          {t(`niveau.${niveau}`)}
        </h2>
        {items.length > 0 ? (
          <p className={styles.niveauCount}>
            {t("lessons.niveauCount", { done, total: items.length })}
          </p>
        ) : null}
      </div>
      {!open && previous ? (
        <p className={styles.niveauNote}>
          {t("lessons.niveauLocked", {
            previous: t(`niveau.${previous}`).toLowerCase(),
          })}
        </p>
      ) : null}
      {items.length === 0 ? (
        <p className={styles.niveauNote}>{t("lessons.niveauEmpty")}</p>
      ) : (
        <ol className={styles.list}>
          {items.map((lesson) => (
            <li key={lesson.id}>
              <LessonCard
                lesson={lesson}
                locked={!lessonAccess(lesson, lessons, unlock).open}
              />
            </li>
          ))}
          <li>
            <ExamCard
              niveau={niveau}
              open={isExamOpen(niveau, lessons, unlock)}
            />
          </li>
        </ol>
      )}
    </section>
  );
}

export function LessonsOverview() {
  const { done } = useUnlockState();
  const allUnlocked = useProgressStore((state) => state.alleOntgrendeld);
  const setAllUnlocked = useProgressStore((state) => state.setAlleOntgrendeld);
  const doneCount = lessons.filter((lesson) => done.has(lesson.id)).length;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>{t("lessons.heading")}</h1>
      <p className={styles.intro}>{t("lessons.intro")}</p>
      <InstallBanner />
      <p className={styles.summary} data-testid="lessons-summary">
        {t("lessons.summary", { done: doneCount, total: lessons.length })}
      </p>
      <div className={styles.bar} aria-hidden="true">
        <div
          className={styles.barFill}
          style={{ width: `${(doneCount / lessons.length) * 100}%` }}
        />
      </div>
      <label className={styles.unlock}>
        <input
          type="checkbox"
          checked={allUnlocked}
          onChange={(event) => setAllUnlocked(event.target.checked)}
        />
        <span>
          {t("lessons.unlockAll")}
          <span className={styles.unlockHint}>{t("lessons.unlockHint")}</span>
        </span>
      </label>
      {NIVEAUS.map((niveau) => (
        <NiveauSection key={niveau} niveau={niveau} />
      ))}
    </div>
  );
}
