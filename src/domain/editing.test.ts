import { describe, expect, it } from "vitest";
import {
  addArrow,
  addStep,
  addVariant,
  addZone,
  BASE_VARIANT,
  deleteStep,
  duplicateStep,
  keyframesOf,
  moveEntity,
  moveStep,
  newScenario,
  normalizePosition,
  rectangle,
  removeOverlay,
  removeVariant,
  renameVariant,
  translateOverlay,
  updateZone,
  withKeyframes,
  withNames,
} from "./editing";
import { scenarioSchema, type Arrow, type Keyframe, type Zone } from "./schema";

const scenario = newScenario("Test");
const first = scenario.keyframes[0] as Keyframe;
const arrow: Arrow = {
  id: "p1",
  kind: "run",
  from: { x: 1, y: 1 },
  to: { x: 3, y: 1 },
};
const zone: Zone = {
  id: "z1",
  kind: "cover",
  polygon: rectangle({ x: 1, y: 1 }, { x: 3, y: 3 }),
};

describe("normalizePosition", () => {
  it("rondt af op 0,1 meter", () => {
    expect(normalizePosition({ x: 1.234, y: 5.678 }, false)).toEqual({
      x: 1.2,
      y: 5.7,
    });
  });

  it("volgt het raster van een halve meter", () => {
    expect(normalizePosition({ x: 1.3, y: 5.8 }, true)).toEqual({
      x: 1.5,
      y: 6,
    });
  });

  it("blijft binnen de vrije zone", () => {
    expect(normalizePosition({ x: -9, y: 40 }, false)).toEqual({
      x: -3,
      y: 11,
    });
  });
});

describe("newScenario", () => {
  it("is een geldig scenario", () => {
    expect(scenarioSchema.safeParse(scenario).success).toBe(true);
  });
});

describe("withNames", () => {
  it("vult lege namen aan en laat goede namen met rust", () => {
    expect(withNames(scenario, "Naam", "Variant")).toBe(scenario);
    const { scenario: next, variantId } = addVariant(
      { ...scenario, title: " " },
      BASE_VARIANT,
      "Hoek",
    );
    const named = withNames(
      renameVariant(next, variantId, ""),
      "Naam",
      "Variant",
    );
    expect(named.title).toBe("Naam");
    expect(named.variants?.[0]?.label).toBe("Variant");
    expect(scenarioSchema.safeParse(named).success).toBe(true);
  });
});

describe("stappen", () => {
  const withLines = addArrow({ ...first, caption: "Uitleg" }, arrow);

  it("een nieuwe stap neemt de stand over, maar geen lijnen of uitleg", () => {
    const [, added] = addStep([withLines], 0);
    expect(added?.players).toEqual(first.players);
    expect(added?.arrows).toBeUndefined();
    expect(added?.caption).toBe("");
  });

  it("dupliceren neemt alles over met nieuwe id's", () => {
    const [, copy] = duplicateStep([withLines], 0);
    expect(copy?.caption).toBe("Uitleg");
    expect(copy?.id).not.toBe(withLines.id);
    expect(copy?.arrows?.[0]?.id).not.toBe("p1");
  });

  it("de laatste stap blijft bestaan", () => {
    const list = [first];
    expect(deleteStep(list, 0)).toBe(list);
    expect(deleteStep(addStep(list, 0), 0)).toHaveLength(1);
  });

  it("stappen zijn te herordenen", () => {
    const list = addStep(addStep([first], 0), 1);
    const moved = moveStep(list, 0, 1);
    expect(moved[1]?.id).toBe(first.id);
    expect(moveStep(list, 0, -1)).toBe(list);
    expect(moveStep(list, 2, 1)).toBe(list);
  });
});

describe("items op het veld", () => {
  it("verplaatst een speler of de bal", () => {
    const place = { x: 2, y: 2 };
    expect(moveEntity(first, "A1", place).players.A1).toEqual(place);
    expect(moveEntity(first, "ball", place).ball).toMatchObject(place);
  });

  it("voegt lijnen en zones toe en verwijdert ze", () => {
    const filled = addZone(addArrow(first, arrow), zone);
    expect(filled.arrows).toHaveLength(1);
    const cleared = removeOverlay(removeOverlay(filled, "p1"), "z1");
    expect(cleared.arrows).toEqual([]);
    expect(cleared.zones).toEqual([]);
  });

  it("verschuift een lijn in zijn geheel", () => {
    const moved = translateOverlay(addArrow(first, arrow), "p1", 1, 2);
    expect(moved.arrows?.[0]?.from).toEqual({ x: 2, y: 3 });
    expect(moved.arrows?.[0]?.to).toEqual({ x: 4, y: 3 });
  });

  it("schuift een zone niet over de rand", () => {
    const filled = addZone(first, zone);
    const moved = translateOverlay(filled, "z1", -20, 0);
    expect(moved.zones?.[0]?.polygon).toEqual(zone.polygon);
  });

  it("past soort en label van een zone aan", () => {
    const updated = updateZone(addZone(first, zone), "z1", {
      kind: "blocked",
      label: "Blok",
    });
    expect(updated.zones?.[0]).toMatchObject({
      kind: "blocked",
      label: "Blok",
    });
  });
});

describe("varianten", () => {
  it("kopieert de stappen en bewerkt ze apart", () => {
    const { scenario: next, variantId } = addVariant(
      scenario,
      BASE_VARIANT,
      "Hoek",
    );
    const copy = keyframesOf(next, variantId);
    expect(copy[0]?.id).not.toBe(first.id);

    const edited = withKeyframes(next, variantId, addStep(copy, 0));
    expect(keyframesOf(edited, variantId)).toHaveLength(2);
    expect(keyframesOf(edited, BASE_VARIANT)).toHaveLength(1);
    expect(scenarioSchema.safeParse(edited).success).toBe(true);
  });

  it("hernoemt en verwijdert", () => {
    const { scenario: next, variantId } = addVariant(
      scenario,
      BASE_VARIANT,
      "Hoek",
    );
    expect(renameVariant(next, variantId, "Peel").variants?.[0]?.label).toBe(
      "Peel",
    );
    expect(removeVariant(next, variantId).variants).toEqual([]);
  });

  it("valt bij een onbekende variant terug op de basis", () => {
    expect(keyframesOf(scenario, "weg")).toBe(scenario.keyframes);
  });
});
