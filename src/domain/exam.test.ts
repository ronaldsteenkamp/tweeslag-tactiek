import { describe, expect, it } from "vitest";
import { isExamOpen, pickExamQuestions, timeLimitSeconds } from "./exam";
import type { Lesson, Niveau, QuizQuestion } from "./schema";

function question(id: string): QuizQuestion {
  return {
    id,
    kind: "choice",
    prompt: "Vraag?",
    options: ["Ja", "Nee"],
    correct: 0,
    explanation: "Daarom.",
  };
}

function lesson(id: string, niveau: Niveau, count = 3): Lesson {
  return {
    id,
    niveau,
    quiz: Array.from({ length: count }, (_, index) =>
      question(`${id}-${index}`),
    ),
  } as Lesson;
}

const lessons = [
  lesson("g1", "gevorderd"),
  lesson("g2", "gevorderd", 1),
  lesson("e1", "expert"),
];

describe("pickExamQuestions", () => {
  it("trekt twee vragen per les, alleen van dit niveau", () => {
    const picked = pickExamQuestions(lessons, "gevorderd");
    expect(picked).toHaveLength(3);
    expect(picked.filter((item) => item.lesson.id === "g1")).toHaveLength(2);
    expect(picked.every((item) => item.lesson.niveau === "gevorderd")).toBe(
      true,
    );
  });

  it("trekt geen vraag dubbel", () => {
    const ids = pickExamQuestions(lessons, "gevorderd").map(
      (item) => item.question.id,
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("volgt de meegegeven toeval", () => {
    const first = pickExamQuestions(lessons, "gevorderd", () => 0);
    const second = pickExamQuestions(lessons, "gevorderd", () => 0.99);
    expect(first.map((item) => item.question.id)).not.toEqual(
      second.map((item) => item.question.id),
    );
  });
});

describe("isExamOpen", () => {
  const state = (done: string[], allUnlocked = false) => ({
    done: new Set(done),
    allUnlocked,
  });

  it("gaat open als alle lessen van het niveau af zijn", () => {
    expect(isExamOpen("gevorderd", lessons, state(["g1"]))).toBe(false);
    expect(isExamOpen("gevorderd", lessons, state(["g1", "g2"]))).toBe(true);
  });

  it("gaat open met Alles ontgrendelen", () => {
    expect(isExamOpen("expert", lessons, state([], true))).toBe(true);
  });

  it("blijft dicht op een niveau zonder lessen", () => {
    expect(isExamOpen("basis", lessons, state([], true))).toBe(false);
  });
});

describe("timeLimitSeconds", () => {
  it("geeft ordenen meer tijd dan meerkeuze", () => {
    const order: QuizQuestion = {
      ...question("o"),
      kind: "order",
      items: ["a", "b", "c"],
    } as QuizQuestion;
    expect(timeLimitSeconds(order)).toBeGreaterThan(
      timeLimitSeconds(question("c")),
    );
  });
});
