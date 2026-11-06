import { describe, expect, it } from "vitest";
import {
  addRoutePoint,
  gradeRoute,
  isInOrder,
  misplacedPlayers,
  moveItem,
  routeLength,
  shuffledOrder,
  spotAt,
} from "./quiz";
import { lessonSchema, quizQuestionSchema, type Spot } from "./schema";

const square = [
  { x: 1, y: 1 },
  { x: 3, y: 1 },
  { x: 3, y: 3 },
  { x: 1, y: 3 },
];

const setup = {
  players: { A1: { x: 6, y: 2 }, A2: { x: 6, y: 6 } },
  ball: { x: 9, y: 2 },
};

const frame = (id: string) => ({
  id,
  durationMs: 500,
  players: setup.players,
  ball: setup.ball,
});

const base = { prompt: "Vraag?", explanation: "Daarom." };

const valid = {
  placeBoth: {
    ...base,
    id: "p",
    kind: "placeBoth",
    setup,
    targets: [
      { playerId: "A1", target: square, tolerance: 0.2 },
      { playerId: "A2", target: square, tolerance: 0.2 },
    ],
  },
  freeze: {
    ...base,
    id: "f",
    kind: "freeze",
    scene: { alt: "Tekst", keyframes: [frame("a"), frame("b")] },
    options: ["Ja", "Nee"],
    correct: 1,
  },
  route: {
    ...base,
    id: "r",
    kind: "route",
    playerId: "A1",
    setup,
    target: square,
    tolerance: 0.2,
    maxDetour: 1.5,
  },
  spotError: {
    ...base,
    id: "s",
    kind: "spotError",
    scene: { alt: "Tekst", keyframes: [frame("a")] },
    spots: [
      { id: "a1", label: "A1", playerId: "A1" },
      { id: "zone", label: "Lijn", polygon: square },
    ],
    correct: "zone",
  },
  order: { ...base, id: "o", kind: "order", items: ["Een", "Twee", "Drie"] },
};

const parses = (question: unknown) =>
  quizQuestionSchema.safeParse(question).success;

describe("schema's van de nieuwe vraagtypes", () => {
  it.each(Object.entries(valid))("accepteert een geldige %s", (_kind, item) => {
    expect(parses(item)).toBe(true);
  });

  it("weigert een onbekend type", () => {
    expect(parses({ ...base, id: "x", kind: "raadsel" })).toBe(false);
  });

  it("weigert een plaatsvraag met één speler of een dubbele speler", () => {
    const [first] = valid.placeBoth.targets;
    expect(parses({ ...valid.placeBoth, targets: [first] })).toBe(false);
    expect(parses({ ...valid.placeBoth, targets: [first, first] })).toBe(false);
  });

  it("weigert een plaatsvraag voor een speler buiten de opstelling", () => {
    const targets = [
      valid.placeBoth.targets[0],
      { playerId: "B1", target: square, tolerance: 0 },
    ];
    expect(parses({ ...valid.placeBoth, targets })).toBe(false);
  });

  it("weigert een freeze frame met één beeld, zonder alt of met fout antwoord", () => {
    const { scene } = valid.freeze;
    expect(
      parses({
        ...valid.freeze,
        scene: { ...scene, keyframes: [frame("a")] },
      }),
    ).toBe(false);
    expect(parses({ ...valid.freeze, scene: { ...scene, alt: "" } })).toBe(
      false,
    );
    expect(parses({ ...valid.freeze, correct: 2 })).toBe(false);
  });

  it("weigert een route zonder geldige omweg of speler", () => {
    expect(parses({ ...valid.route, maxDetour: 0.9 })).toBe(false);
    expect(parses({ ...valid.route, playerId: "B1" })).toBe(false);
  });

  it("weigert een fout zoeken met een onbekend antwoord", () => {
    expect(parses({ ...valid.spotError, correct: "weg" })).toBe(false);
  });

  it("weigert een plek die speler én zone is, of geen van beide", () => {
    const spots = (spot: Spot) => [valid.spotError.spots[0], spot];
    expect(
      parses({
        ...valid.spotError,
        spots: spots({
          id: "zone",
          label: "Lijn",
          playerId: "A1",
          polygon: square,
        }),
      }),
    ).toBe(false);
    expect(
      parses({
        ...valid.spotError,
        spots: spots({ id: "zone", label: "Lijn" }),
      }),
    ).toBe(false);
  });

  it("weigert een volgorde met te weinig of dubbele stappen", () => {
    expect(parses({ ...valid.order, items: ["Een", "Twee"] })).toBe(false);
    expect(parses({ ...valid.order, items: ["Een", "Een", "Twee"] })).toBe(
      false,
    );
  });

  it("controleert scènes tegen de spelers van de les", () => {
    const lesson = {
      id: "les",
      order: 1,
      status: "concept",
      niveau: "basis",
      vereisten: [],
      duurMinuten: 2,
      leerdoelen: ["Een", "Twee"],
      scenario: {
        id: "s",
        title: "Les",
        description: "",
        tags: [],
        level: "beginner",
        players: [
          { id: "A1", team: "A", label: "A1" },
          { id: "A2", team: "A", label: "A2" },
        ],
        keyframes: [{ ...frame("a"), caption: "Uitleg" }],
      },
      quiz: [valid.spotError],
    };
    expect(lessonSchema.safeParse(lesson).success).toBe(true);

    const onlyA1 = { ...frame("a"), players: { A1: { x: 1, y: 1 } } };
    const scene = { alt: "Tekst", keyframes: [onlyA1] };
    expect(
      lessonSchema.safeParse({
        ...lesson,
        quiz: [{ ...valid.spotError, scene }],
      }).success,
    ).toBe(false);

    const spots = [
      { id: "a1", label: "A1", playerId: "B9" },
      { id: "zone", label: "Lijn", polygon: square },
    ];
    expect(
      lessonSchema.safeParse({
        ...lesson,
        quiz: [{ ...valid.spotError, spots }],
      }).success,
    ).toBe(false);
  });
});

describe("misplacedPlayers", () => {
  const placements = valid.placeBoth.targets;

  it("is leeg als iedereen goed staat", () => {
    const inside = { x: 2, y: 2 };
    expect(misplacedPlayers({ A1: inside, A2: inside }, placements)).toEqual(
      [],
    );
  });

  it("noemt alleen de speler die verkeerd staat", () => {
    expect(
      misplacedPlayers({ A1: { x: 2, y: 2 }, A2: { x: 6, y: 6 } }, placements),
    ).toEqual(["A2"]);
  });

  it("rekent de tolerantie per speler mee", () => {
    const near = { x: 3.1, y: 2 };
    expect(misplacedPlayers({ A1: near, A2: near }, placements)).toEqual([]);
  });

  it("telt een ontbrekende speler als fout", () => {
    expect(misplacedPlayers({ A1: { x: 2, y: 2 } }, placements)).toEqual([
      "A2",
    ]);
  });
});

describe("gradeRoute", () => {
  const question = { target: square, tolerance: 0.2, maxDetour: 1.3 };
  const start = { x: 6, y: 2 };
  const end = { x: 2, y: 2 };

  it("keurt een rechte route goed", () => {
    expect(gradeRoute([start, end], question)).toBe("ok");
  });

  it("keurt een eindpunt buiten de doelzone af", () => {
    expect(gradeRoute([start, { x: 4, y: 2 }], question)).toBe("end");
  });

  it("keurt een route met een omweg af", () => {
    const detour = [start, { x: 4, y: 7 }, end];
    expect(gradeRoute(detour, question)).toBe("detour");
  });

  it("laat een kleine afwijking toe", () => {
    expect(gradeRoute([start, { x: 4, y: 2.4 }, end], question)).toBe("ok");
  });

  it("keurt een route over het net af, ook als het eindpunt klopt", () => {
    expect(gradeRoute([start, { x: 9, y: 2 }, end], question)).toBe("net");
  });

  it("keurt een lege route af", () => {
    expect(gradeRoute([], question)).toBe("end");
  });
});

describe("addRoutePoint", () => {
  it("negeert trillingen en bewaart echte stappen", () => {
    const route = [{ x: 1, y: 1 }];
    expect(addRoutePoint(route, { x: 1.1, y: 1 })).toBe(route);
    expect(addRoutePoint(route, { x: 2, y: 1 })).toHaveLength(2);
  });
});

describe("routeLength", () => {
  it("telt de stukken op", () => {
    expect(
      routeLength([
        { x: 0, y: 0 },
        { x: 3, y: 4 },
        { x: 3, y: 6 },
      ]),
    ).toBe(7);
  });
});

describe("spotAt", () => {
  const spots = valid.spotError.spots;
  const players = { A1: { x: 2, y: 2 } };

  it("vindt een speler binnen het tikbereik, ook boven een zone", () => {
    expect(spotAt({ x: 2.5, y: 2 }, spots, players, 0.9)).toBe("a1");
  });

  it("vindt een zone buiten het bereik van een speler", () => {
    expect(spotAt({ x: 1.1, y: 1.1 }, spots, players, 0.5)).toBe("zone");
  });

  it("geeft niets naast alle plekken", () => {
    expect(spotAt({ x: 10, y: 7 }, spots, players, 0.9)).toBeNull();
  });
});

describe("volgorde", () => {
  it("husselt altijd, ook bij een korte lijst", () => {
    for (const seed of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
      expect(isInOrder(shuffledOrder(3, seed))).toBe(false);
    }
  });

  it("geeft dezelfde volgorde bij dezelfde vraag, met elk item één keer", () => {
    const order = shuffledOrder(5, "vraag");
    expect(shuffledOrder(5, "vraag")).toEqual(order);
    expect([...order].sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it("herkent de goede volgorde", () => {
    expect(isInOrder([0, 1, 2])).toBe(true);
    expect(isInOrder([1, 0, 2])).toBe(false);
  });

  it("verplaatst een item en stopt bij de randen", () => {
    expect(moveItem([0, 1, 2], 1, -1)).toEqual([1, 0, 2]);
    expect(moveItem([0, 1, 2], 1, 1)).toEqual([0, 2, 1]);
    const order = [0, 1, 2];
    expect(moveItem(order, 0, -1)).toBe(order);
    expect(moveItem(order, 2, 1)).toBe(order);
  });
});
