import { t } from "../../i18n";
import { useBoardStore } from "./boardStore";
import { Court } from "./Court";
import { useOrientation } from "./media";
import styles from "./BoardPage.module.css";

export function BoardPage() {
  const orientation = useOrientation();
  const flipped = useBoardStore((state) => state.flipped);
  const reset = useBoardStore((state) => state.reset);
  const toggleFlipped = useBoardStore((state) => state.toggleFlipped);

  return (
    <div className={styles.layout}>
      <div className={styles.field}>
        <Court view={{ orientation, flipped }} />
      </div>
      <div className={styles.panel}>
        <p className={styles.hint}>{t("court.hint")}</p>
        <ul className={styles.legend}>
          <li>
            <span className={styles.legendA} aria-hidden="true" />{" "}
            {t("court.teamA")}
          </li>
          <li>
            <span className={styles.legendB} aria-hidden="true" />{" "}
            {t("court.teamB")}
          </li>
        </ul>
        <div className={styles.actions}>
          <button className={styles.button} type="button" onClick={reset}>
            {t("court.reset")}
          </button>
          <button
            className={styles.button}
            type="button"
            onClick={toggleFlipped}
          >
            {t("court.flip")}
          </button>
        </div>
      </div>
    </div>
  );
}
