import { z } from "zod";
import club from "../config/vereniging.json";
import { lessonSchema, type Lesson } from "../domain/schema";
import rulesFile from "./nl/regels.json";

const clubSchema = z.object({
  bloksignalen: z.record(z.string(), z.string().min(1)),
});

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

const { bloksignalen } = clubSchema.parse(club);

/** Vervangt {signaal.lijn} en dergelijke door de afspraken van de vereniging. */
export function applyClubTerms(content: unknown): unknown {
  const text = JSON.stringify(content).replace(
    /\{signaal\.(\w+)\}/g,
    (_match, name: string) => {
      const signal = bloksignalen[name];
      if (!signal) throw new Error(`Onbekend bloksignaal: ${name}`);
      return signal;
    },
  );
  return JSON.parse(text);
}

const files = import.meta.glob<unknown>("./nl/lessen/*.json", {
  eager: true,
  import: "default",
});

export const lessons: Lesson[] = Object.values(files)
  .map((file) => lessonSchema.parse(applyClubTerms(file)))
  .sort((a, b) => a.order - b.order);

export function findLesson(id: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.id === id);
}

export const rules = rulesSchema.parse(rulesFile);
