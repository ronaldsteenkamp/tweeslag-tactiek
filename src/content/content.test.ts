import { describe, expect, it } from "vitest";
import { estimateMinutes } from "../domain/interpolate";
import { isInTarget, misplacedPlayers } from "../domain/quiz";
import { lessonGraphProblems } from "../domain/unlock";
import { lookupTerm, termRefs } from "../domain/clubTerms";
import { NIVEAUS } from "../domain/schema";
import {
  applyClubTerms,
  clubTerms,
  lessonFiles,
  lessons,
  rules,
} from "./index";

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
    expect(JSON.stringify(lessons)).not.toContain("{opslag");
    expect(JSON.stringify(lessons)).not.toContain("{roep");
  });

  it.each(lessons.map((lesson) => [lesson.id, lesson] as const))(
    "%s heeft genoeg stappen met uitleg",
    (_id, lesson) => {
      const { keyframes, variants } = lesson.scenario;
      const basis = lesson.niveau === "basis";
      expect(keyframes.length).toBeGreaterThanOrEqual(basis ? 4 : 5);
      expect(keyframes.length).toBeLessThanOrEqual(basis ? 7 : 10);
      for (const variant of variants ?? []) {
        expect(variant.keyframes.length).toBeLessThanOrEqual(10);
      }
      for (const keyframe of keyframes) {
        expect(keyframe.caption.length).toBeGreaterThan(0);
      }
    },
  );

  // Er is geen minimum: liever één goede vraag dan een makkelijke erbij.
  it.each(lessons.map((lesson) => [lesson.id, lesson] as const))(
    "%s heeft een quiz met unieke vraag-id's",
    (_id, lesson) => {
      expect(lesson.quiz.length).toBeGreaterThanOrEqual(1);
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

describe("quizvragen", () => {
  const questions = lessons.flatMap((lesson) => lesson.quiz);
  const rawQuizzes = Object.entries(lessonFiles).map(([path, file]) => {
    const quiz = (file as { quiz: unknown }).quiz;
    return [path, quiz] as const;
  });

  it("zetten het goede antwoord niet steeds op dezelfde plek", () => {
    const positions = questions.flatMap((question) =>
      question.kind === "choice" || question.kind === "freeze"
        ? [question.correct]
        : [],
    );
    const counts = new Map<number, number>();
    for (const position of positions) {
      counts.set(position, (counts.get(position) ?? 0) + 1);
    }
    for (const [position, count] of counts) {
      expect(count / positions.length, `plek ${position}`).toBeLessThan(0.35);
    }
  });

  it("gebruiken samen minstens vijf vraagtypes", () => {
    expect(
      new Set(questions.map((question) => question.kind)).size,
    ).toBeGreaterThanOrEqual(5);
  });

  it.each(rawQuizzes)(
    "%s gebruikt {signaal.*} en geen letterlijke signalen",
    (_path, quiz) => {
      const text = JSON.stringify(quiz);
      const literal = [
        ...Object.values(clubTerms.bloksignalen),
        ...Object.values(clubTerms.opslagsignalen),
      ].filter((term) => text.includes(term));
      expect(literal).toEqual([]);
    },
  );

  it.each(rawQuizzes)(
    "%s zet een signaal of roepwoord niet vooraan in een zin",
    (_path, quiz) => {
      const strings: string[] = [];
      JSON.stringify(quiz, (_key, value: unknown) => {
        if (typeof value === "string") strings.push(value);
        return value;
      });
      const atStart = /(^|[.!?:]\s+)[*“"]*\{(signaal|opslag|roep)\./;
      expect(strings.filter((text) => atStart.test(text))).toEqual([]);
    },
  );

  it("beginnen plaatsvragen niet al goed", () => {
    for (const question of questions) {
      if (question.kind !== "placeBoth") continue;
      expect(
        misplacedPlayers(question.setup.players, question.targets).length,
        question.id,
      ).toBeGreaterThan(0);
    }
  });

  it("beginnen routevragen buiten de doelzone", () => {
    for (const question of questions) {
      if (question.kind !== "route") continue;
      const start = question.setup.players[question.playerId];
      expect(start, question.id).toBeDefined();
      if (start) {
        expect(
          isInTarget(start, question.target, question.tolerance),
          question.id,
        ).toBe(false);
      }
    }
  });

  it("hebben spots die niet op elkaar liggen", () => {
    for (const question of questions) {
      if (question.kind !== "spotError") continue;
      const labels = question.spots.map((spot) => spot.label);
      expect(new Set(labels).size, question.id).toBe(labels.length);
    }
  });
});

describe("applyClubTerms", () => {
  it("vult een bekend signaal in", () => {
    expect(applyClubTerms({ caption: "{signaal.lijn}" })).toEqual({
      caption: "één vinger",
    });
  });

  it("vult een bekend roepwoord in", () => {
    expect(applyClubTerms({ caption: "{roep.lijn}" })).toEqual({
      caption: "lijn",
    });
  });

  it("weigert een onbekend roepwoord", () => {
    expect(() => applyClubTerms("{roep.onzin}")).toThrow();
  });

  it("weigert een onbekend signaal", () => {
    expect(() => applyClubTerms("{signaal.onzin}")).toThrow();
  });

  it("vult de nieuwe bloksignalen in", () => {
    expect(
      applyClubTerms(
        "{signaal.schijnLijn}/{signaal.schijnHoek}/{signaal.spreid}",
      ),
    ).toBe("drie vingers/vier vingers/duim en pink");
  });

  it("vult een opslagsignaal in en weigert een onbekend", () => {
    expect(applyClubTerms({ caption: "{opslag.doel}" })).toEqual({
      caption: "wiebelen met de hand",
    });
    expect(() => applyClubTerms("{opslag.onzin}")).toThrow();
  });
});

describe("verwijzingen naar vereniging.json", () => {
  const files = Object.entries(lessonFiles).map(
    ([path, file]) => [path, termRefs(JSON.stringify(file))] as const,
  );

  it.each(files)(
    "%s verwijst alleen naar bestaande sleutels",
    (_path, refs) => {
      const missing = refs
        .filter((ref) => lookupTerm(clubTerms, ref) === undefined)
        .map(({ group, name }) => `{${group}.${name}}`);
      expect(missing).toEqual([]);
    },
  );

  it("gebruikt elk blok- en opslagsignaal in minstens één les", () => {
    const used = new Set(
      files.flatMap(([, refs]) =>
        refs.map((ref) => `${ref.group}.${ref.name}`),
      ),
    );
    const expected = [
      ...Object.keys(clubTerms.bloksignalen).map((name) => `signaal.${name}`),
      ...Object.keys(clubTerms.opslagsignalen).map((name) => `opslag.${name}`),
    ];
    expect(expected.filter((key) => !used.has(key))).toEqual([]);
  });
});

describe("regels", () => {
  it("hebben een bron en inhoud", () => {
    expect(rules.sourceUrl).toContain("fivb.com");
    expect(rules.sections.length).toBeGreaterThan(3);
  });
});
