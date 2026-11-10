import { z } from "zod";
import club from "../config/vereniging.json";
import { fillTerms } from "../domain/clubTerms";
import { clubSchema, lessonSchema, type Lesson } from "../domain/schema";
import rulesFile from "./nl/regels.json";

const rulesSchema = z.object({
  sourceName: z.string(),
  sourceUrl: z.url(),
  sections: z.array(
    z.object({
      title: z.string(),
      items: z.array(
        z.object({ text: z.string(), rule: z.string().optional() }),
      ),
    }),
  ),
});

export const clubTerms = clubSchema.parse(club);

/**
 * Vervangt {signaal.lijn}, {opslag.doel} en {roep.lijn} door de afspraken
 * van de vereniging.
 */
export function applyClubTerms(content: unknown): unknown {
  return JSON.parse(fillTerms(JSON.stringify(content), clubTerms));
}

/** De lesbestanden zoals ze op schijf staan, dus nog met {signaal.…}. */
export const lessonFiles = import.meta.glob<unknown>("./nl/lessen/*.json", {
  eager: true,
  import: "default",
});

export const lessons: Lesson[] = Object.values(lessonFiles)
  .map((file) => lessonSchema.parse(applyClubTerms(file)))
  .sort((a, b) => a.order - b.order);

export function findLesson(id: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.id === id);
}

export const rules = rulesSchema.parse(rulesFile);
