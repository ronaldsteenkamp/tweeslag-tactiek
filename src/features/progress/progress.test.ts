import { describe, expect, it } from "vitest";
import {
  doneLessonIds,
  lessonStatus,
  loadProgress,
  migrateV1,
  saveProgress,
  withQuizResult,
  withStep,
  type ProgressFile,
} from "./progress";

const KEY_V1 = "tweeslag-tactiek.voortgang.v1";
const KEY_V2 = "tweeslag-tactiek.voortgang.v2";

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

const empty: ProgressFile = {
  version: 2,
  lessons: {},
  alleOntgrendeld: false,
  toetsen: {},
};

describe("opslag", () => {
  it("bewaart en leest de voortgang terug", () => {
    const storage = memoryStorage();
    const file: ProgressFile = {
      version: 2,
      lessons: { pass: { maxStep: 3, score: 2, total: 3 } },
      alleOntgrendeld: true,
      toetsen: { basis: { score: 9, total: 14 } },
    };
    saveProgress(storage, file);
    expect(loadProgress(storage)).toEqual(file);
  });

  it("werkt zonder opslag", () => {
    expect(loadProgress(undefined)).toEqual(empty);
    expect(() => saveProgress(undefined, empty)).not.toThrow();
  });

  it("overleeft een opslag die fouten geeft", () => {
    expect(loadProgress(brokenStorage)).toEqual(empty);
    expect(() => saveProgress(brokenStorage, empty)).not.toThrow();
  });

  it("negeert beschadigde gegevens", () => {
    const storage = memoryStorage();
    storage.setItem(KEY_V2, "{kapot");
    expect(loadProgress(storage)).toEqual(empty);
    storage.setItem(KEY_V2, JSON.stringify({ version: 2, lessons: "veel" }));
    expect(loadProgress(storage)).toEqual(empty);
  });
});

describe("migratie van versie 1", () => {
  const old = {
    pass: { maxStep: 3, score: 2, total: 3 },
    peel: { maxStep: 1 },
  };

  it("neemt de lessen over en zet de nieuwe velden op hun beginwaarde", () => {
    expect(migrateV1(old)).toEqual({ ...empty, lessons: old });
  });

  it("slaat alleen de beschadigde les over", () => {
    expect(
      migrateV1({ pass: old.pass, peel: { maxStep: "veel" } }).lessons,
    ).toEqual({ pass: old.pass });
  });

  it("geeft lege voortgang bij iets anders dan een lijst met lessen", () => {
    expect(migrateV1("kapot")).toEqual(empty);
    expect(migrateV1(null)).toEqual(empty);
  });

  it("migreert bij het laden, bewaart versie 2 en laat versie 1 staan", () => {
    const storage = memoryStorage();
    const raw = JSON.stringify(old);
    storage.setItem(KEY_V1, raw);

    expect(loadProgress(storage).lessons).toEqual(old);
    expect(storage.getItem(KEY_V1)).toBe(raw);
    expect(JSON.parse(storage.getItem(KEY_V2) ?? "")).toEqual({
      ...empty,
      lessons: old,
    });
  });

  it("gebruikt versie 2 als die er al is", () => {
    const storage = memoryStorage();
    storage.setItem(KEY_V1, JSON.stringify(old));
    saveProgress(storage, { ...empty, alleOntgrendeld: true });
    expect(loadProgress(storage)).toEqual({
      ...empty,
      alleOntgrendeld: true,
    });
  });

  it("valt terug op versie 1 als versie 2 beschadigd is", () => {
    const storage = memoryStorage();
    storage.setItem(KEY_V1, JSON.stringify(old));
    storage.setItem(KEY_V2, "{kapot");
    expect(loadProgress(storage).lessons).toEqual(old);
  });

  it("geeft lege voortgang als versie 1 ook beschadigd is", () => {
    const storage = memoryStorage();
    storage.setItem(KEY_V1, "{kapot");
    expect(loadProgress(storage)).toEqual(empty);
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

  it("houdt de score binnen het totaal als de quiz korter is geworden", () => {
    const first = withQuizResult({}, "pass", 3, 3);
    expect(withQuizResult(first, "pass", 1, 2).pass).toMatchObject({
      score: 2,
      total: 2,
    });
  });
});

describe("lessonStatus", () => {
  it("volgt de voortgang", () => {
    expect(lessonStatus(undefined)).toBe("new");
    expect(lessonStatus({ maxStep: 2 })).toBe("busy");
    expect(lessonStatus({ maxStep: 2, score: 0, total: 3 })).toBe("done");
  });
});

describe("doneLessonIds", () => {
  it("geeft alleen lessen met een afgeronde quiz", () => {
    const done = doneLessonIds({
      pass: { maxStep: 2, score: 0, total: 3 },
      peel: { maxStep: 4 },
    });
    expect([...done]).toEqual(["pass"]);
  });
});
