import { z } from "zod";
import { create } from "zustand";
import { createId } from "../../domain/editing";
import { scenarioSchema, type Scenario } from "../../domain/schema";
import {
  browserStorage,
  readJson,
  writeJson,
  type SafeStorage,
} from "../storage";

const STORAGE_KEY = "tweeslag-tactiek.scenarios.v1";

const entrySchema = z.object({
  savedAt: z.string(),
  scenario: scenarioSchema,
});

export type LibraryEntry = z.infer<typeof entrySchema>;

/** Eén beschadigd scenario mag de rest niet meenemen. */
export function loadLibrary(storage: SafeStorage | undefined): LibraryEntry[] {
  const raw = readJson(storage, STORAGE_KEY);
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item: unknown) => {
    const result = entrySchema.safeParse(item);
    return result.success ? [result.data] : [];
  });
}

/** Opslaan onder hetzelfde id werkt de bestaande versie bij; de nieuwste staat bovenaan. */
export function withEntry(
  entries: LibraryEntry[],
  scenario: Scenario,
  savedAt: string,
): LibraryEntry[] {
  return [
    { savedAt, scenario },
    ...entries.filter((entry) => entry.scenario.id !== scenario.id),
  ];
}

export function withoutEntry(
  entries: LibraryEntry[],
  scenarioId: string,
): LibraryEntry[] {
  return entries.filter((entry) => entry.scenario.id !== scenarioId);
}

interface LibraryState {
  entries: LibraryEntry[];
  save: (scenario: Scenario) => void;
  /** Bewaart een kopie met een eigen id, bijvoorbeeld van een gedeeld scenario. */
  saveCopy: (scenario: Scenario) => void;
  remove: (scenarioId: string) => void;
}

export const useLibraryStore = create<LibraryState>((set, get) => {
  const storage = browserStorage();
  const update = (entries: LibraryEntry[]) => {
    set({ entries });
    writeJson(storage, STORAGE_KEY, entries);
  };
  const now = () => new Date().toISOString();

  return {
    entries: loadLibrary(storage),
    save: (scenario) => update(withEntry(get().entries, scenario, now())),
    saveCopy: (scenario) =>
      update(
        withEntry(
          get().entries,
          { ...scenario, id: createId("scenario") },
          now(),
        ),
      ),
    remove: (scenarioId) => update(withoutEntry(get().entries, scenarioId)),
  };
});
