import { describe, expect, it } from "vitest";
import { lessonSchema, scenarioSchema } from "./schema";

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
  const lesson = { id: "les-1", order: 1, status: "concept", scenario };

  it("accepteert een geldige les", () => {
    expect(lessonSchema.safeParse(lesson).success).toBe(true);
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
