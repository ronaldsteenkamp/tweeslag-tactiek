import { describe, expect, it } from "vitest";
import club from "../config/vereniging.json";
import { clubSchema, lessonSchema, scenarioSchema } from "./schema";

describe("clubSchema", () => {
  it("accepteert vereniging.json", () => {
    expect(clubSchema.safeParse(club).success).toBe(true);
  });

  it("eist de nieuwe bloksignalen", () => {
    for (const key of ["schijnLijn", "schijnHoek", "spreid"]) {
      const bloksignalen = Object.fromEntries(
        Object.entries(club.bloksignalen).filter(([name]) => name !== key),
      );
      expect(clubSchema.safeParse({ ...club, bloksignalen }).success, key).toBe(
        false,
      );
    }
  });

  it("eist opslagsignalen met een doel", () => {
    const zonder = { ...club, opslagsignalen: undefined };
    expect(clubSchema.safeParse(zonder).success).toBe(false);
    expect(
      clubSchema.safeParse({ ...club, opslagsignalen: { doel: "" } }).success,
    ).toBe(false);
  });

  it("staat extra sleutels toe, maar geen lege tekst", () => {
    const extra = {
      ...club,
      bloksignalen: { ...club.bloksignalen, nieuw: "x" },
    };
    expect(clubSchema.safeParse(extra).success).toBe(true);
    const leeg = { ...club, bloksignalen: { ...club.bloksignalen, nieuw: "" } };
    expect(clubSchema.safeParse(leeg).success).toBe(false);
  });
});

const keyframe = {
  id: "k1",
  durationMs: 0,
  players: { A1: { x: 1, y: 1 } },
  ball: { x: 2, y: 2 },
  caption: "Hallo",
};

const scenario = {
  id: "test",
  title: "Test",
  description: "",
  tags: [],
  level: "beginner",
  players: [{ id: "A1", team: "A", label: "Speler" }],
  keyframes: [keyframe],
};

describe("scenarioSchema", () => {
  it("accepteert een geldig scenario", () => {
    expect(scenarioSchema.safeParse(scenario).success).toBe(true);
  });

  it("accepteert posities in de vrije zone en weigert daarbuiten", () => {
    const place = (x: number) => ({
      ...scenario,
      keyframes: [{ ...keyframe, players: { A1: { x, y: 1 } } }],
    });
    expect(scenarioSchema.safeParse(place(-3)).success).toBe(true);
    expect(scenarioSchema.safeParse(place(-3.1)).success).toBe(false);
    expect(scenarioSchema.safeParse(place(19.1)).success).toBe(false);
  });

  it("weigert een stap met een ontbrekende speler", () => {
    const result = scenarioSchema.safeParse({
      ...scenario,
      keyframes: [{ ...keyframe, players: {} }],
    });
    expect(result.success).toBe(false);
  });

  it("controleert ook de stappen van varianten", () => {
    const result = scenarioSchema.safeParse({
      ...scenario,
      variants: [
        {
          id: "v1",
          label: "Hoek",
          keyframes: [{ ...keyframe, players: { B9: { x: 1, y: 1 } } }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("weigert een scenario zonder stappen", () => {
    const result = scenarioSchema.safeParse({ ...scenario, keyframes: [] });
    expect(result.success).toBe(false);
  });
});

describe("lessonSchema", () => {
  const choice = {
    id: "v1",
    kind: "choice",
    prompt: "Hoeveel?",
    options: ["Een", "Twee"],
    correct: 1,
    explanation: "Twee dus.",
  };
  const dragQuestion = {
    id: "v2",
    kind: "drag",
    prompt: "Sleep A1",
    playerId: "A1",
    setup: { players: { A1: { x: 1, y: 1 } }, ball: { x: 2, y: 2 } },
    target: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ],
    tolerance: 0.5,
    explanation: "Daar hoort A1.",
  };
  const lesson = {
    id: "les-1",
    order: 1,
    status: "concept",
    niveau: "basis",
    vereisten: [],
    duurMinuten: 3,
    leerdoelen: ["Na deze les ken je A.", "Na deze les ken je B."],
    scenario,
    quiz: [choice, dragQuestion],
  };

  it("accepteert een geldige les", () => {
    expect(lessonSchema.safeParse(lesson).success).toBe(true);
  });

  it("weigert een antwoord dat niet bestaat", () => {
    const quiz = [{ ...choice, correct: 2 }];
    expect(lessonSchema.safeParse({ ...lesson, quiz }).success).toBe(false);
  });

  it("weigert een sleepvraag voor een onbekende speler", () => {
    const quiz = [{ ...dragQuestion, playerId: "B1" }];
    expect(lessonSchema.safeParse({ ...lesson, quiz }).success).toBe(false);
  });

  it("eist minstens één quizvraag", () => {
    expect(lessonSchema.safeParse({ ...lesson, quiz: [] }).success).toBe(false);
  });

  it("eist een bekend niveau", () => {
    expect(lessonSchema.safeParse({ ...lesson, niveau: "pro" }).success).toBe(
      false,
    );
    expect(
      lessonSchema.safeParse({ ...lesson, niveau: undefined }).success,
    ).toBe(false);
  });

  it("eist geldige les-id's in vereisten", () => {
    expect(
      lessonSchema.safeParse({ ...lesson, vereisten: ["peel", "shots"] })
        .success,
    ).toBe(true);
    expect(
      lessonSchema.safeParse({ ...lesson, vereisten: ["Les 1"] }).success,
    ).toBe(false);
  });

  it("eist twee of drie leerdoelen", () => {
    const goals = (count: number) => ({
      ...lesson,
      leerdoelen: Array.from({ length: count }, (_, index) => `Doel ${index}`),
    });
    expect(lessonSchema.safeParse(goals(1)).success).toBe(false);
    expect(lessonSchema.safeParse(goals(3)).success).toBe(true);
    expect(lessonSchema.safeParse(goals(4)).success).toBe(false);
  });

  it("eist een duur in hele minuten", () => {
    expect(
      lessonSchema.safeParse({ ...lesson, duurMinuten: 2.5 }).success,
    ).toBe(false);
    expect(lessonSchema.safeParse({ ...lesson, duurMinuten: 0 }).success).toBe(
      false,
    );
  });

  it("staat verificatiepunten toe, maar niet leeg", () => {
    expect(
      lessonSchema.safeParse({ ...lesson, teVerifieren: ["Klopt dit?"] })
        .success,
    ).toBe(true);
    expect(
      lessonSchema.safeParse({ ...lesson, teVerifieren: [""] }).success,
    ).toBe(false);
  });

  it("eist een geldig id en een bekende status", () => {
    expect(lessonSchema.safeParse({ ...lesson, id: "Les 1" }).success).toBe(
      false,
    );
    expect(lessonSchema.safeParse({ ...lesson, status: "klaar" }).success).toBe(
      false,
    );
  });
});
