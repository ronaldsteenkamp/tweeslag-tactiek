import type { Lesson, Niveau, QuizQuestion } from "./schema";

/** Hoeveel vragen een toets per les trekt. */
const QUESTIONS_PER_LESSON = 2;

export interface ExamQuestion {
  lesson: Lesson;
  question: QuizQuestion;
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    const current = result[index] as T;
    result[index] = result[other] as T;
    result[other] = current;
  }
  return result;
}

/** Trekt uit elke les van het niveau een paar vragen, door elkaar gehusseld. */
export function pickExamQuestions(
  lessons: Lesson[],
  niveau: Niveau,
  random: () => number = Math.random,
): ExamQuestion[] {
  const picked = lessons
    .filter((lesson) => lesson.niveau === niveau)
    .flatMap((lesson) =>
      shuffled(lesson.quiz, random)
        .slice(0, QUESTIONS_PER_LESSON)
        .map((question) => ({ lesson, question })),
    );
  return shuffled(picked, random);
}

/** Een toets gaat open als alle lessen van het niveau zijn afgerond. */
export function isExamOpen(
  niveau: Niveau,
  lessons: Lesson[],
  state: { done: ReadonlySet<string>; allUnlocked: boolean },
): boolean {
  const items = lessons.filter((lesson) => lesson.niveau === niveau);
  if (items.length === 0) return false;
  return (
    state.allUnlocked || items.every((lesson) => state.done.has(lesson.id))
  );
}

const TIME_LIMITS: Record<QuizQuestion["kind"], number> = {
  choice: 20,
  freeze: 20,
  spotError: 20,
  drag: 25,
  route: 30,
  placeBoth: 35,
  order: 40,
};

/** Seconden per vraag in de stand met tijdslimiet. Slepen en ordenen kost meer tijd. */
export function timeLimitSeconds(question: QuizQuestion): number {
  return TIME_LIMITS[question.kind];
}
