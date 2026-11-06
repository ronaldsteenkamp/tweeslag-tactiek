import { describe, expect, it } from "vitest";
import {
  lessonStatus,
  loadProgress,
  saveProgress,
  withQuizResult,
  withStep,
} from "./progress";

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  };
}

const brokenStorage = {
  getItem: () => {
    throw new Error("Geen toegang");
  },
  setItem: () => {
    throw new Error("Opslag vol");
  },
};

describe("opslag", () => {
  it("bewaart en leest de voortgang terug", () => {
    const storage = memoryStorage();
    saveProgress(storage, { pass: { maxStep: 3, score: 2, total: 3 } });
    expect(loadProgress(storage)).toEqual({
      pass: { maxStep: 3, score: 2, total: 3 },
    });
  });

  it("werkt zonder opslag", () => {
    expect(loadProgress(undefined)).toEqual({});
    expect(() => saveProgress(undefined, {})).not.toThrow();
  });

  it("overleeft een opslag die fouten geeft", () => {
    expect(loadProgress(brokenStorage)).toEqual({});
    expect(() => saveProgress(brokenStorage, {})).not.toThrow();
  });

  it("negeert beschadigde gegevens", () => {
    const storage = memoryStorage();
    storage.setItem("tweeslag-tactiek.voortgang.v1", "{kapot");
    expect(loadProgress(storage)).toEqual({});
    storage.setItem(
      "tweeslag-tactiek.voortgang.v1",
      JSON.stringify({ pass: { maxStep: "veel" } }),
    );
    expect(loadProgress(storage)).toEqual({});
  });
});

describe("withStep", () => {
  it("onthoudt de hoogste stap", () => {
    const first = withStep({}, "pass", 3);
    expect(withStep(first, "pass", 1)).toBe(first);
    expect(withStep(first, "pass", 4).pass?.maxStep).toBe(4);
  });
});

describe("withQuizResult", () => {
  it("bewaart de beste score", () => {
    const first = withQuizResult({}, "pass", 2, 3);
    expect(withQuizResult(first, "pass", 1, 3).pass?.score).toBe(2);
    expect(withQuizResult(first, "pass", 3, 3).pass?.score).toBe(3);
  });
});

describe("lessonStatus", () => {
  it("volgt de voortgang", () => {
    expect(lessonStatus(undefined)).toBe("new");
    expect(lessonStatus({ maxStep: 2 })).toBe("busy");
    expect(lessonStatus({ maxStep: 2, score: 0, total: 3 })).toBe("done");
  });
});
