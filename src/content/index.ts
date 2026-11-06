import { lessonSchema, type Lesson } from "../domain/schema";

const files = import.meta.glob<unknown>("./nl/lessen/*.json", {
  eager: true,
  import: "default",
});

export const lessons: Lesson[] = Object.values(files)
  .map((file) => lessonSchema.parse(file))
  .sort((a, b) => a.order - b.order);

export function findLesson(id: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.id === id);
}
