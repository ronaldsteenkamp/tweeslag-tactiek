import { lazy, Suspense, useEffect, useRef, type MouseEvent } from "react";
import { branding } from "../config/branding";
import { findLesson } from "../content";
import { LessonPlayer } from "../features/lessons/LessonPlayer";
import { LessonsOverview } from "../features/lessons/LessonsOverview";
import { useBeachMode } from "../features/theme/beachMode";
import { t } from "../i18n";
import styles from "./App.module.css";
import { parseRoute, paths, useHash, type Route } from "./router";

// Alleen de lessen zitten in de eerste download; de rest laadt bij het eerste gebruik.
// De service worker bewaart alles, dus offline werkt het ook.
const BoardPage = lazy(() =>
  import("../features/board/BoardPage").then((module) => ({
    default: module.BoardPage,
  })),
);
const LessonQuiz = lazy(() =>
  import("../features/lessons/LessonQuiz").then((module) => ({
    default: module.LessonQuiz,
  })),
);
const RulesPage = lazy(() =>
  import("../features/rules/RulesPage").then((module) => ({
    default: module.RulesPage,
  })),
);
const SharedPage = lazy(() =>
  import("../features/share/SharedPage").then((module) => ({
    default: module.SharedPage,
  })),
);

function Page({ route }: { route: Route }) {
  if (route.name === "board") return <BoardPage />;
  if (route.name === "rules") return <RulesPage />;
  if (route.name === "shared") {
    return <SharedPage key={route.data} data={route.data} />;
  }
  if (route.name === "lesson" || route.name === "quiz") {
    const lesson = findLesson(route.id);
    if (lesson && route.name === "quiz") {
      return <LessonQuiz key={lesson.id} lesson={lesson} />;
    }
    if (lesson) return <LessonPlayer key={lesson.id} lesson={lesson} />;
  }
  return <LessonsOverview />;
}

function pageTitle(route: Route): string {
  if (route.name === "board") return t("nav.board");
  if (route.name === "rules") return t("rules.heading");
  if (route.name === "shared") return t("shared.pageTitle");
  if (route.name === "lesson" || route.name === "quiz") {
    const title = findLesson(route.id)?.scenario.title;
    if (title && route.name === "quiz") return t("quiz.heading", { title });
    if (title) return title;
  }
  return t("lessons.heading");
}

export function App() {
  const hash = useHash();
  const route = parseRoute(hash);
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  const beachMode = useBeachMode((state) => state.enabled);
  const toggleBeachMode = useBeachMode((state) => state.toggle);
  const title = pageTitle(route);

  useEffect(() => {
    document.title = `${title} · ${branding.appName}`;
  }, [title]);

  // Een schermlezer merkt een nieuwe pagina anders niet op.
  useEffect(() => {
    if (firstRender.current) firstRender.current = false;
    else mainRef.current?.focus({ preventScroll: true });
  }, [hash]);

  function skipToContent(event: MouseEvent) {
    event.preventDefault();
    mainRef.current?.focus();
  }

  const section =
    route.name === "board" || route.name === "rules" ? route.name : "lessons";

  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#inhoud" onClick={skipToContent}>
        {t("app.skip")}
      </a>
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
        <button
          type="button"
          className={styles.beach}
          aria-label={t("app.beachMode")}
          aria-pressed={beachMode}
          title={t("app.beachMode")}
          onClick={toggleBeachMode}
        >
          <span aria-hidden="true">☀</span>
        </button>
      </header>

      <main ref={mainRef} id="inhoud" className={styles.main} tabIndex={-1}>
        <Suspense fallback={null}>
          <Page route={route} />
        </Suspense>
      </main>
    </div>
  );
}
