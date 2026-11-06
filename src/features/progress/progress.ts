import { z } from "zod";
import { create } from "zustand";
import { browserStorage } from "../storage";

const STORAGE_KEY = "tweeslag-tactiek.voortgang.v1";

const lessonProgressSchema = z.object({
  /** Hoogste stap die iemand in de les heeft bereikt. */
  maxStep: z.number().int().min(0),
  /** Beste quizscore: vragen die in één keer goed waren. */
  score: z.number().int().min(0).optional(),
  total: z.number().int().min(1).optional(),
});

const progressSchema = z.record(z.string(), lessonProgressSchema);

export type LessonProgress = z.infer<typeof lessonProgressSchema>;
export type Progress = z.infer<typeof progressSchema>;
export type LessonStatus = "new" | "busy" | "done";

type ProgressStorage = Pick<Storage, "getItem" | "setItem">;

export function loadProgress(storage: ProgressStorage | undefined): Progress {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return {};
    const result = progressSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : {};
  } catch {
    // Opslag uitgeschakeld of beschadigd: de app werkt dan zonder voortgang.
    return {};
  }
}

export function saveProgress(
  storage: ProgressStorage | undefined,
  progress: Progress,
): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Opslag vol of geweigerd: de voortgang blijft bewaard tot de pagina sluit.
  }
}

export function withStep(
  progress: Progress,
  lessonId: string,
  step: number,
): Progress {
  const current = progress[lessonId];
  if (current && current.maxStep >= step) return progress;
  return { ...progress, [lessonId]: { ...current, maxStep: step } };
}

export function withQuizResult(
  progress: Progress,
  lessonId: string,
  score: number,
  total: number,
): Progress {
  const current = progress[lessonId] ?? { maxStep: 0 };
  const best = Math.max(score, current.score ?? 0);
  return { ...progress, [lessonId]: { ...current, score: best, total } };
}

export function lessonStatus(lesson: LessonProgress | undefined): LessonStatus {
  if (!lesson) return "new";
  return lesson.score === undefined ? "busy" : "done";
}

interface ProgressState {
  lessons: Progress;
  reachStep: (lessonId: string, step: number) => void;
  finishQuiz: (lessonId: string, score: number, total: number) => void;
}

export const useProgressStore = create<ProgressState>((set, get) => {
  const storage = browserStorage();
  const update = (lessons: Progress) => {
    if (lessons === get().lessons) return;
    set({ lessons });
    saveProgress(storage, lessons);
  };

  return {
    lessons: loadProgress(storage),
    reachStep: (lessonId, step) =>
      update(withStep(get().lessons, lessonId, step)),
    finishQuiz: (lessonId, score, total) =>
      update(withQuizResult(get().lessons, lessonId, score, total)),
  };
});
