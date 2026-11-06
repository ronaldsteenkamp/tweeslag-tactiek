import { NIVEAUS, type Lesson, type Niveau } from "./schema";

/** Alles wat telt voor het ontgrendelen. */
export interface UnlockState {
  done: ReadonlySet<string>;
  allUnlocked: boolean;
}

export type LessonAccess =
  | { open: true }
  /** missing: de lessen die eerst afgerond moeten zijn. */
  | { open: false; reason: "niveau" | "vereisten"; missing: Lesson[] };

function rank(niveau: Niveau): number {
  return NIVEAUS.indexOf(niveau);
}

/** De nog niet afgeronde lessen van alle niveaus onder dit niveau. */
function missingForNiveau(
  niveau: Niveau,
  lessons: Lesson[],
  done: ReadonlySet<string>,
): Lesson[] {
  return lessons.filter(
    (lesson) => rank(lesson.niveau) < rank(niveau) && !done.has(lesson.id),
  );
}

export function isNiveauOpen(
  niveau: Niveau,
  lessons: Lesson[],
  { done, allUnlocked }: UnlockState,
): boolean {
  return allUnlocked || missingForNiveau(niveau, lessons, done).length === 0;
}

export function lessonAccess(
  lesson: Lesson,
  lessons: Lesson[],
  { done, allUnlocked }: UnlockState,
): LessonAccess {
  if (allUnlocked) return { open: true };

  const forNiveau = missingForNiveau(lesson.niveau, lessons, done);
  if (forNiveau.length > 0) {
    return { open: false, reason: "niveau", missing: forNiveau };
  }

  const required = lessons.filter(
    (other) => lesson.vereisten.includes(other.id) && !done.has(other.id),
  );
  return required.length > 0
    ? { open: false, reason: "vereisten", missing: required }
    : { open: true };
}

/**
 * Controleert de samenhang tussen lessen, wat een schema per les niet kan zien:
 * bestaande vereisten, geen cirkels en geen vereiste van een hoger niveau.
 * Geeft per probleem een leesbare melding terug.
 */
export function lessonGraphProblems(lessons: Lesson[]): string[] {
  const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const problems: string[] = [];

  for (const lesson of lessons) {
    for (const id of lesson.vereisten) {
      const required = byId.get(id);
      if (!required) {
        problems.push(`${lesson.id}: vereiste ${id} bestaat niet`);
      } else if (rank(required.niveau) > rank(lesson.niveau)) {
        problems.push(`${lesson.id}: vereiste ${id} is van een hoger niveau`);
      }
    }
  }

  const finished = new Set<string>();
  function findCycle(id: string, path: string[]): string[] | null {
    if (path.includes(id)) return [...path.slice(path.indexOf(id)), id];
    if (finished.has(id)) return null;
    for (const next of byId.get(id)?.vereisten ?? []) {
      const cycle = findCycle(next, [...path, id]);
      if (cycle) return cycle;
    }
    finished.add(id);
    return null;
  }
  for (const lesson of lessons) {
    const cycle = findCycle(lesson.id, []);
    if (cycle) {
      problems.push(`Cirkelverwijzing: ${cycle.join(" → ")}`);
      break;
    }
  }

  return problems;
}
