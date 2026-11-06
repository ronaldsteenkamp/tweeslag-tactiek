import { describe, expect, it } from "vitest";
import { estimateMinutes } from "../domain/interpolate";
import { isInTarget } from "../domain/quiz";
import { lessonGraphProblems } from "../domain/unlock";
import { NIVEAUS } from "../domain/schema";
import { applyClubTerms, lessons, rules } from "./index";

describe("lessen", () => {
  it("laden allemaal zonder validatiefouten", () => {
    expect(lessons.length).toBeGreaterThanOrEqual(7);
  });

  it("hebben unieke volgnummers", () => {
    const orders = lessons.map((lesson) => lesson.order);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it("hebben unieke id's", () => {
    expect(new Set(lessons.map((lesson) => lesson.id)).size).toBe(
      lessons.length,
    );
  });

  it("hebben kloppende vereisten zonder cirkels", () => {
    expect(lessonGraphProblems(lessons)).toEqual([]);
  });

  it("staan op volgorde van niveau", () => {
    const niveaus = lessons.map((lesson) => NIVEAUS.indexOf(lesson.niveau));
    expect(niveaus).toEqual([...niveaus].sort((a, b) => a - b));
  });

  it.each(lessons.map((lesson) => [lesson.id, lesson] as const))(
    "%s duurt minstens zo lang als het lezen en kijken",
    (_id, lesson) => {
      expect(lesson.duurMinuten).toBeGreaterThanOrEqual(
        estimateMinutes(lesson.scenario.keyframes),
      );
    },
  );

  it("bevatten geen niet-ingevulde bloksignalen", () => {
    expect(JSON.stringify(lessons)).not.toContain("{signaal");
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

  it.each(lessons.map((lesson) => [lesson.id, lesson] as const))(
    "%s heeft een quiz met minstens twee vragen",
    (_id, lesson) => {
      expect(lesson.quiz.length).toBeGreaterThanOrEqual(2);
      const ids = lesson.quiz.map((question) => question.id);
      expect(new Set(ids).size).toBe(ids.length);
    },
  );

  it("beginnen sleepvragen buiten de doelzone", () => {
    for (const lesson of lessons) {
      for (const question of lesson.quiz) {
        if (question.kind !== "drag") continue;
        const start = question.setup.players[question.playerId];
        expect(start, question.id).toBeDefined();
        if (start) {
          expect(
            isInTarget(start, question.target, question.tolerance),
            question.id,
          ).toBe(false);
        }
      }
    }
  });
});

describe("applyClubTerms", () => {
  it("vult een bekend signaal in", () => {
    expect(applyClubTerms({ caption: "{signaal.lijn}" })).toEqual({
      caption: "één vinger",
    });
  });

  it("weigert een onbekend signaal", () => {
    expect(() => applyClubTerms("{signaal.onzin}")).toThrow();
  });
});

describe("regels", () => {
  it("hebben een bron en inhoud", () => {
    expect(rules.sourceUrl).toContain("fivb.com");
    expect(rules.sections.length).toBeGreaterThan(3);
  });
});
