import { describe, expect, it } from "vitest";
import { lessons } from "./index";

describe("lessen", () => {
  it("laden allemaal zonder validatiefouten", () => {
    expect(lessons.length).toBeGreaterThanOrEqual(3);
  });

  it("hebben unieke id's en volgnummers", () => {
    expect(new Set(lessons.map((lesson) => lesson.id)).size).toBe(
      lessons.length,
    );
    expect(new Set(lessons.map((lesson) => lesson.order)).size).toBe(
      lessons.length,
    );
  });

  it.each(lessons.map((lesson) => [lesson.id, lesson] as const))(
    "%s heeft 4 tot 7 stappen met uitleg",
    (_id, lesson) => {
      const { keyframes } = lesson.scenario;
      expect(keyframes.length).toBeGreaterThanOrEqual(4);
      // Meer past niet als tikdoelen van 44 px op een smalle telefoon.
      expect(keyframes.length).toBeLessThanOrEqual(7);
      for (const keyframe of keyframes) {
        expect(keyframe.caption.length).toBeGreaterThan(0);
      }
    },
  );
});
