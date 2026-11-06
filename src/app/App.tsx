import { branding } from "../config/branding";
import { findLesson } from "../content";
import { BoardPage } from "../features/court/BoardPage";
import { LessonPlayer } from "../features/lessons/LessonPlayer";
import { LessonsOverview } from "../features/lessons/LessonsOverview";
import { t } from "../i18n";
import styles from "./App.module.css";
import { parseRoute, paths, useHash, type Route } from "./router";

function Page({ route }: { route: Route }) {
  if (route.name === "board") return <BoardPage />;
  if (route.name === "lesson") {
    const lesson = findLesson(route.id);
    if (lesson) return <LessonPlayer key={lesson.id} lesson={lesson} />;
  }
  return <LessonsOverview />;
}

export function App() {
  const route = parseRoute(useHash());
  const onBoard = route.name === "board";

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
        <div className={styles.brand}>
          <p className={styles.title}>{branding.appName}</p>
          <p className={styles.tagline}>{t("app.tagline")}</p>
        </div>
        <nav className={styles.nav} aria-label={t("nav.label")}>
          <a
            className={styles.navLink}
            href={paths.lessons}
            aria-current={onBoard ? undefined : "page"}
          >
            {t("nav.lessons")}
          </a>
          <a
            className={styles.navLink}
            href={paths.board}
            aria-current={onBoard ? "page" : undefined}
          >
            {t("nav.board")}
          </a>
        </nav>
      </header>

      <main className={styles.main}>
        <Page route={route} />
      </main>
    </div>
  );
}
