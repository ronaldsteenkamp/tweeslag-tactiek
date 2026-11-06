import { paths } from "../../app/router";
import { lessons } from "../../content";
import { estimateMinutes } from "../../domain/interpolate";
import { t } from "../../i18n";
import styles from "./LessonsOverview.module.css";

export function LessonsOverview() {
  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>{t("lessons.heading")}</h1>
      <p className={styles.intro}>{t("lessons.intro")}</p>
      <ol className={styles.list}>
        {lessons.map((lesson) => (
          <li key={lesson.id}>
            <a className={styles.card} href={paths.lesson(lesson.id)}>
              <span className={styles.number} aria-hidden="true">
                {lesson.order}
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
