import { describe, expect, it } from "vitest";
import type { Lesson, Niveau } from "./schema";
import { isNiveauOpen, lessonAccess, lessonGraphProblems } from "./unlock";

function lesson(id: string, niveau: Niveau, vereisten: string[] = []): Lesson {
  return { id, niveau, vereisten } as Lesson;
}

const basis1 = lesson("b1", "basis");
const basis2 = lesson("b2", "basis");
const gevorderd1 = lesson("g1", "gevorderd", ["b1"]);
const gevorderd2 = lesson("g2", "gevorderd", ["g1"]);
const expert1 = lesson("e1", "expert", ["g2"]);
const lessons = [basis1, basis2, gevorderd1, gevorderd2, expert1];

const state = (done: string[], allUnlocked = false) => ({
  done: new Set(done),
  allUnlocked,
});

describe("isNiveauOpen", () => {
  it("houdt basis altijd open", () => {
    expect(isNiveauOpen("basis", lessons, state([]))).toBe(true);
  });

  it("opent een niveau pas als alle lagere lessen zijn afgerond", () => {
    expect(isNiveauOpen("gevorderd", lessons, state(["b1"]))).toBe(false);
    expect(isNiveauOpen("gevorderd", lessons, state(["b1", "b2"]))).toBe(true);
    expect(isNiveauOpen("expert", lessons, state(["b1", "b2", "g1"]))).toBe(
      false,
    );
  });

  it("opent alles met de knop", () => {
    expect(isNiveauOpen("expert", lessons, state([], true))).toBe(true);
  });
});

describe("lessonAccess", () => {
  it("laat lessen zonder vereisten op basisniveau altijd toe", () => {
    expect(lessonAccess(basis2, lessons, state([]))).toEqual({ open: true });
  });

  it("noemt de ontbrekende lessen als het niveau dicht is", () => {
    expect(lessonAccess(gevorderd1, lessons, state(["b1"]))).toEqual({
      open: false,
      reason: "niveau",
      missing: [basis2],
    });
  });

  it("houdt een les dicht tot de vereisten klaar zijn", () => {
    expect(lessonAccess(gevorderd2, lessons, state(["b1", "b2"]))).toEqual({
      open: false,
      reason: "vereisten",
      missing: [gevorderd1],
    });
    expect(
      lessonAccess(gevorderd2, lessons, state(["b1", "b2", "g1"])),
    ).toEqual({ open: true });
  });

  it("negeert alle sloten met de knop", () => {
    expect(lessonAccess(expert1, lessons, state([], true))).toEqual({
      open: true,
    });
  });
});

describe("lessonGraphProblems", () => {
  it("vindt niets in een kloppende volgorde", () => {
    expect(lessonGraphProblems(lessons)).toEqual([]);
  });

  it("meldt een vereiste die niet bestaat", () => {
    expect(lessonGraphProblems([lesson("a", "basis", ["weg"])])).toEqual([
      "a: vereiste weg bestaat niet",
    ]);
  });

  it("meldt een vereiste van een hoger niveau", () => {
    const problems = lessonGraphProblems([
      lesson("a", "basis", ["b"]),
      lesson("b", "expert"),
    ]);
    expect(problems).toEqual(["a: vereiste b is van een hoger niveau"]);
  });

  it("meldt een cirkelverwijzing", () => {
    const problems = lessonGraphProblems([
      lesson("a", "basis", ["c"]),
      lesson("b", "basis", ["a"]),
      lesson("c", "basis", ["b"]),
    ]);
    expect(problems).toEqual(["Cirkelverwijzing: a → c → b → a"]);
  });

  it("meldt een les die naar zichzelf wijst", () => {
    expect(lessonGraphProblems([lesson("a", "basis", ["a"])])).toEqual([
      "Cirkelverwijzing: a → a",
    ]);
  });
});
