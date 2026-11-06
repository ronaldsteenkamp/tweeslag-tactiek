import { z } from "zod";
import { create } from "zustand";
import { browserStorage } from "../storage";

const STORAGE_KEY = "tweeslag-tactiek.voortgang.v2";
/** Blijft staan na de migratie, als reserve voor het geval er iets misgaat. */
const STORAGE_KEY_V1 = "tweeslag-tactiek.voortgang.v1";

const lessonProgressSchema = z.object({
  /** Hoogste stap die iemand in de les heeft bereikt. */
  maxStep: z.number().int().min(0),
  /** Beste quizscore: vragen die in één keer goed waren. */
  score: z.number().int().min(0).optional(),
  total: z.number().int().min(1).optional(),
});

const lessonsSchema = z.record(z.string(), lessonProgressSchema);

const examResultSchema = z.object({
  score: z.number().int().min(0),
  total: z.number().int().min(1),
});

const progressFileSchema = z.object({
  version: z.literal(2),
  lessons: lessonsSchema,
  /** Voor trainers en ervaren spelers: alle niveaus en lessen zijn open. */
  alleOntgrendeld: z.boolean(),
  /** Beste score per niveautoets. */
  toetsen: z.record(z.string(), examResultSchema),
});

export type LessonProgress = z.infer<typeof lessonProgressSchema>;
export type Progress = z.infer<typeof lessonsSchema>;
export type ProgressFile = z.infer<typeof progressFileSchema>;
export type LessonStatus = "new" | "busy" | "done";

type ProgressStorage = Pick<Storage, "getItem" | "setItem">;

function emptyFile(): ProgressFile {
  return { version: 2, lessons: {}, alleOntgrendeld: false, toetsen: {} };
}

/** Versie 1 was alleen de lijst met lessen. Eén beschadigde les kost niet de hele voortgang. */
export function migrateV1(raw: unknown): ProgressFile {
  const file = emptyFile();
  if (typeof raw !== "object" || raw === null) return file;
  for (const [lessonId, value] of Object.entries(raw)) {
    const lesson = lessonProgressSchema.safeParse(value);
    if (lesson.success) file.lessons[lessonId] = lesson.data;
  }
  return file;
}

function readRaw(storage: ProgressStorage | undefined, key: string): unknown {
  const raw = storage?.getItem(key);
  return raw ? JSON.parse(raw) : undefined;
}

export function saveProgress(
  storage: ProgressStorage | undefined,
  file: ProgressFile,
): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(file));
  } catch {
    // Opslag vol of geweigerd: de voortgang blijft bewaard tot de pagina sluit.
  }
}

export function loadProgress(
  storage: ProgressStorage | undefined,
): ProgressFile {
  try {
    const current = progressFileSchema.safeParse(readRaw(storage, STORAGE_KEY));
    if (current.success) return current.data;
  } catch {
    // Beschadigd: probeer hieronder de oude versie.
  }
  try {
    const old = readRaw(storage, STORAGE_KEY_V1);
    if (old === undefined) return emptyFile();
    const migrated = migrateV1(old);
    saveProgress(storage, migrated);
    return migrated;
  } catch {
    // Opslag uitgeschakeld of beschadigd: de app werkt dan zonder voortgang.
    return emptyFile();
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
  // De quiz kan korter zijn geworden sinds de vorige poging.
  const best = Math.min(total, Math.max(score, current.score ?? 0));
  return { ...progress, [lessonId]: { ...current, score: best, total } };
}

export function withExamResult(
  exams: ProgressFile["toetsen"],
  niveau: string,
  score: number,
  total: number,
): ProgressFile["toetsen"] {
  const best = Math.min(total, Math.max(score, exams[niveau]?.score ?? 0));
  return { ...exams, [niveau]: { score: best, total } };
}

export function lessonStatus(lesson: LessonProgress | undefined): LessonStatus {
  if (!lesson) return "new";
  return lesson.score === undefined ? "busy" : "done";
}

export function doneLessonIds(progress: Progress): Set<string> {
  return new Set(
    Object.keys(progress).filter((id) => lessonStatus(progress[id]) === "done"),
  );
}

interface ProgressState extends Omit<ProgressFile, "version"> {
  reachStep: (lessonId: string, step: number) => void;
  finishQuiz: (lessonId: string, score: number, total: number) => void;
  finishExam: (niveau: string, score: number, total: number) => void;
  setAlleOntgrendeld: (value: boolean) => void;
}

export const useProgressStore = create<ProgressState>((set, get) => {
  const storage = browserStorage();
  const persist = () => {
    const { lessons, alleOntgrendeld, toetsen } = get();
    saveProgress(storage, { version: 2, lessons, alleOntgrendeld, toetsen });
  };
  const update = (lessons: Progress) => {
    if (lessons === get().lessons) return;
    set({ lessons });
    persist();
  };
  const { lessons, alleOntgrendeld, toetsen } = loadProgress(storage);

  return {
    lessons,
    alleOntgrendeld,
    toetsen,
    reachStep: (lessonId, step) =>
      update(withStep(get().lessons, lessonId, step)),
    finishQuiz: (lessonId, score, total) =>
      update(withQuizResult(get().lessons, lessonId, score, total)),
    finishExam: (niveau, score, total) => {
      set({ toetsen: withExamResult(get().toetsen, niveau, score, total) });
      persist();
    },
    setAlleOntgrendeld: (value) => {
      set({ alleOntgrendeld: value });
      persist();
    },
  };
});

/** De stand voor de ontgrendellogica. Gebruik in een component, want de waarden veranderen. */
export function useUnlockState() {
  const lessons = useProgressStore((state) => state.lessons);
  const allUnlocked = useProgressStore((state) => state.alleOntgrendeld);
  return { done: doneLessonIds(lessons), allUnlocked };
}
