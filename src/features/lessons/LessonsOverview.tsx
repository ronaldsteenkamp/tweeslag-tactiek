import { paths } from "../../app/router";
import { lessons } from "../../content";
import { estimateMinutes } from "../../domain/interpolate";
import { t } from "../../i18n";
import {
  lessonStatus,
  useProgressStore,
  type LessonProgress,
} from "../progress/progress";
import styles from "./LessonsOverview.module.css";

function ProgressLabel({ progress }: { progress?: LessonProgress }) {
  const status = lessonStatus(progress);
  if (status === "new") return null;
  return (
    <span className={styles.status} data-status={status}>
      {status === "done"
        ? t("lessons.done", {
            score: progress?.score ?? 0,
            total: progress?.total ?? 0,
          })
        : t("lessons.busy")}
    </span>
  );
}

export function LessonsOverview() {
  const progress = useProgressStore((state) => state.lessons);
  const doneCount = lessons.filter(
    (lesson) => lessonStatus(progress[lesson.id]) === "done",
  ).length;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>{t("lessons.heading")}</h1>
      <p className={styles.intro}>{t("lessons.intro")}</p>
      <p className={styles.summary} data-testid="lessons-summary">
        {t("lessons.summary", { done: doneCount, total: lessons.length })}
      </p>
      <div className={styles.bar} aria-hidden="true">
        <div
          className={styles.barFill}
          style={{ width: `${(doneCount / lessons.length) * 100}%` }}
        />
      </div>
      <ol className={styles.list}>
        {lessons.map((lesson) => (
          <li key={lesson.id}>
            <a className={styles.card} href={paths.lesson(lesson.id)}>
              <span className={styles.number} aria-hidden="true">
                {String(lesson.order).padStart(2, "0")}
              </span>
              <span className={styles.body}>
                <span className={styles.title}>{lesson.scenario.title}</span>
                <span className={styles.description}>
                  {lesson.scenario.description}
                </span>
                <span className={styles.meta}>
                  {t(`level.${lesson.scenario.level}`)} ·{" "}
                  {t("lessons.minutes", {
                    minutes: estimateMinutes(lesson.scenario.keyframes),
                  })}
                  <ProgressLabel progress={progress[lesson.id]} />
                  {lesson.status === "concept" ? (
                    <span className={styles.badge}>{t("lessons.concept")}</span>
                  ) : null}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}
