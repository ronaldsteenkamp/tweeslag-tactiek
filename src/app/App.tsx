import { useSyncExternalStore } from "react";
import { branding } from "../config/branding";
import type { Orientation } from "../domain/geometry";
import { useBoardStore } from "../features/court/boardStore";
import { Court } from "../features/court/Court";
import { t } from "../i18n";
import styles from "./App.module.css";

const portraitQuery = window.matchMedia("(orientation: portrait)");

function subscribeToOrientation(onChange: () => void) {
  portraitQuery.addEventListener("change", onChange);
  return () => portraitQuery.removeEventListener("change", onChange);
}

function useOrientation(): Orientation {
  const isPortrait = useSyncExternalStore(
    subscribeToOrientation,
    () => portraitQuery.matches,
  );
  return isPortrait ? "portrait" : "landscape";
}

export function App() {
  const orientation = useOrientation();
  const flipped = useBoardStore((state) => state.flipped);
  const reset = useBoardStore((state) => state.reset);
  const toggleFlipped = useBoardStore((state) => state.toggleFlipped);

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <img
          className={styles.logo}
          src={`${import.meta.env.BASE_URL}${branding.logo}`}
          alt={t("app.logoAlt", { club: branding.clubName })}
          width={36}
          height={36}
        />
        <div>
          <h1 className={styles.title}>{branding.appName}</h1>
          <p className={styles.tagline}>{t("app.tagline")}</p>
        </div>
      </header>

      <main className={styles.main}>
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
      </main>
    </div>
  );
}
