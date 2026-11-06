import { paths } from "../../app/router";
import type { Lesson } from "../../domain/schema";
import type { LessonAccess } from "../../domain/unlock";
import { t } from "../../i18n";
import { useProgressStore } from "../progress/progress";
import styles from "./LessonLocked.module.css";

/** Voor wie via een directe link bij een les komt die nog op slot zit. */
export function LessonLocked({
  lesson,
  access,
}: {
  lesson: Lesson;
  access: Extract<LessonAccess, { open: false }>;
}) {
  const setAllUnlocked = useProgressStore((state) => state.setAlleOntgrendeld);

  return (
    <div className={styles.page} data-testid="lesson-locked">
      <h1 className={styles.heading}>{lesson.scenario.title}</h1>
      <p>
        {t(access.reason === "niveau" ? "locked.niveau" : "locked.vereisten", {
          niveau: t(`niveau.${lesson.niveau}`).toLowerCase(),
        })}
      </p>
      <ul className={styles.list}>
        {access.missing.map((missing) => (
          <li key={missing.id}>
            <a href={paths.lesson(missing.id)}>{missing.scenario.title}</a>
          </li>
        ))}
      </ul>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          onClick={() => setAllUnlocked(true)}
        >
          {t("lessons.unlockAll")}
        </button>
        <a className={styles.button} href={paths.lessons}>
          {t("player.backToLessons")}
        </a>
      </div>
    </div>
  );
}
