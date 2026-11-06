import { branding } from "../config/branding";
import { findLesson } from "../content";
import { BoardPage } from "../features/court/BoardPage";
import { LessonPlayer } from "../features/lessons/LessonPlayer";
import { LessonQuiz } from "../features/lessons/LessonQuiz";
import { LessonsOverview } from "../features/lessons/LessonsOverview";
import { RulesPage } from "../features/rules/RulesPage";
import { t } from "../i18n";
import styles from "./App.module.css";
import { parseRoute, paths, useHash, type Route } from "./router";

function Page({ route }: { route: Route }) {
  if (route.name === "board") return <BoardPage />;
  if (route.name === "rules") return <RulesPage />;
  if (route.name === "lesson" || route.name === "quiz") {
    const lesson = findLesson(route.id);
    if (lesson && route.name === "quiz") {
      return <LessonQuiz key={lesson.id} lesson={lesson} />;
    }
    if (lesson) return <LessonPlayer key={lesson.id} lesson={lesson} />;
  }
  return <LessonsOverview />;
}

export function App() {
  const route = parseRoute(useHash());
  const section =
    route.name === "board" || route.name === "rules" ? route.name : "lessons";

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
            aria-current={section === "lessons" ? "page" : undefined}
          >
            {t("nav.lessons")}
          </a>
          <a
            className={styles.navLink}
            href={paths.rules}
            aria-current={section === "rules" ? "page" : undefined}
          >
            {t("nav.rules")}
          </a>
          <a
            className={styles.navLink}
            href={paths.board}
            aria-current={section === "board" ? "page" : undefined}
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
