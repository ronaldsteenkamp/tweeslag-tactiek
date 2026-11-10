import { z } from "zod";
import { COURT } from "./geometry";

const MIN_X = -COURT.freeZone;
const MAX_X = COURT.length + COURT.freeZone;
const MIN_Y = -COURT.freeZone;
const MAX_Y = COURT.width + COURT.freeZone;

export const positionSchema = z.object({
  x: z.number().min(MIN_X).max(MAX_X),
  y: z.number().min(MIN_Y).max(MAX_Y),
});

export const playerSchema = z.object({
  id: z.string().min(1).max(4),
  team: z.enum(["A", "B"]),
  label: z.string().min(1).max(40),
  role: z
    .enum(["blocker", "defender", "server", "receiver", "setter", "attacker"])
    .optional(),
});

export const ballSchema = positionSchema.extend({
  /** Hoogte in meters aan het eind van de stap. */
  height: z.number().min(0).max(15).optional(),
  /** Hoeveel meter de boog tijdens de stap boven de rechte lijn uitkomt. */
  arc: z.number().min(0).max(15).optional(),
});

export const arrowSchema = z.object({
  id: z.string().min(1),
  from: positionSchema,
  to: positionSchema,
  kind: z.enum(["run", "ball", "shot"]),
});

export const zoneSchema = z.object({
  id: z.string().min(1),
  polygon: z.array(positionSchema).min(3).max(12),
  kind: z.enum(["cover", "target", "blocked"]),
  label: z.string().max(30).optional(),
});

export const keyframeSchema = z.object({
  id: z.string().min(1),
  /** Duur van de overgang naar dit frame. Bij het eerste frame niet gebruikt. */
  durationMs: z.number().int().min(0).max(20_000),
  players: z.record(z.string(), positionSchema),
  ball: ballSchema,
  arrows: z.array(arrowSchema).max(20).optional(),
  zones: z.array(zoneSchema).max(10).optional(),
  caption: z.string().max(600),
  /** Praktijktip, los van de regels. */
  tip: z.string().max(160).optional(),
});

const keyframesSchema = z.array(keyframeSchema).min(1).max(30);

export const variantSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(30),
  keyframes: keyframesSchema,
});

export const scenarioSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1).max(80),
    description: z.string().max(300),
    tags: z.array(z.string().max(30)).max(12),
    level: z.enum(["beginner", "gevorderd"]),
    players: z.array(playerSchema).min(1).max(4),
    keyframes: keyframesSchema,
    variants: z.array(variantSchema).max(6).optional(),
  })
  .superRefine((scenario, context) => {
    const expected = scenario.players.map((player) => player.id);
    const allKeyframes = [
      ...scenario.keyframes,
      ...(scenario.variants ?? []).flatMap((variant) => variant.keyframes),
    ];
    for (const keyframe of allKeyframes) {
      const actual = Object.keys(keyframe.players);
      const complete =
        actual.length === expected.length &&
        expected.every((id) => actual.includes(id));
      if (!complete) {
        context.addIssue({
          code: "custom",
          path: ["keyframes"],
          message: `Stap ${keyframe.id} moet precies deze spelers bevatten: ${expected.join(", ")}`,
        });
      }
    }
  });

const questionBase = {
  id: z.string().min(1),
  prompt: z.string().min(1).max(200),
  explanation: z.string().min(1).max(300),
};

const setupSchema = z.object({
  players: z.record(z.string(), positionSchema),
  ball: ballSchema,
});

const polygonSchema = z.array(positionSchema).min(3).max(12);
/** Hoeveel meter naast de doelzone nog goed rekent. */
const toleranceSchema = z.number().min(0).max(2);

/** Een stap in een vraag. De uitleg is niet verplicht: die staat bij de vraag. */
const sceneFrameSchema = keyframeSchema.extend({
  caption: z.string().max(600).default(""),
});

function sceneSchema(minFrames: number) {
  return z.object({
    keyframes: z.array(sceneFrameSchema).min(minFrames).max(6),
    /** Wat er gebeurt, in woorden, voor wie het veld niet kan zien. */
    alt: z.string().min(1).max(300),
  });
}

export const choiceQuestionSchema = z
  .object({
    ...questionBase,
    kind: z.literal("choice"),
    options: z.array(z.string().min(1)).min(2).max(5),
    correct: z.number().int().min(0),
  })
  .refine((question) => question.correct < question.options.length, {
    message: "correct moet naar een bestaande optie wijzen",
    path: ["correct"],
  });

export const dragQuestionSchema = z
  .object({
    ...questionBase,
    kind: z.literal("drag"),
    /** De speler die verplaatst moet worden. */
    playerId: z.string().min(1),
    setup: setupSchema,
    arrows: z.array(arrowSchema).optional(),
    zones: z.array(zoneSchema).optional(),
    target: polygonSchema,
    tolerance: toleranceSchema,
  })
  .refine((question) => question.playerId in question.setup.players, {
    message: "playerId moet in de beginopstelling staan",
    path: ["playerId"],
  });

const placementSchema = z.object({
  playerId: z.string().min(1),
  target: polygonSchema,
  tolerance: toleranceSchema,
});

/** Meerdere spelers tegelijk plaatsen, elk met een eigen doelzone. */
export const placeBothQuestionSchema = z
  .object({
    ...questionBase,
    kind: z.literal("placeBoth"),
    setup: setupSchema,
    arrows: z.array(arrowSchema).optional(),
    zones: z.array(zoneSchema).optional(),
    targets: z.array(placementSchema).min(2).max(4),
  })
  .superRefine((question, context) => {
    const ids = question.targets.map((target) => target.playerId);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        path: ["targets"],
        message: "Elke speler mag maar één doelzone hebben",
      });
    }
    for (const id of ids) {
      if (!(id in question.setup.players)) {
        context.addIssue({
          code: "custom",
          path: ["targets"],
          message: `${id} moet in de beginopstelling staan`,
        });
      }
    }
  });

/** De animatie stopt op een beslissend moment; daarna kies je wat er moet gebeuren. */
export const freezeQuestionSchema = z
  .object({
    ...questionBase,
    kind: z.literal("freeze"),
    scene: sceneSchema(2),
    options: z.array(z.string().min(1)).min(2).max(4),
    correct: z.number().int().min(0),
  })
  .refine((question) => question.correct < question.options.length, {
    message: "correct moet naar een bestaande optie wijzen",
    path: ["correct"],
  });

/** Teken de looproute van een speler. */
export const routeQuestionSchema = z
  .object({
    ...questionBase,
    kind: z.literal("route"),
    playerId: z.string().min(1),
    setup: setupSchema,
    arrows: z.array(arrowSchema).optional(),
    zones: z.array(zoneSchema).optional(),
    target: polygonSchema,
    tolerance: toleranceSchema,
    /** Hoeveel keer de rechte lijn de route mag zijn. */
    maxDetour: z.number().min(1).max(3),
  })
  .refine((question) => question.playerId in question.setup.players, {
    message: "playerId moet in de beginopstelling staan",
    path: ["playerId"],
  });

/** Iets om aan te tikken: een speler of een zone op het veld. */
export const spotSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1).max(40),
    playerId: z.string().min(1).optional(),
    polygon: polygonSchema.optional(),
  })
  .refine((spot) => (spot.playerId === undefined) !== !spot.polygon, {
    message: "Een plek is een speler of een zone, niet allebei",
  });

/** Een situatie met een tactische fout; je tikt aan waar het misgaat. */
export const spotErrorQuestionSchema = z
  .object({
    ...questionBase,
    kind: z.literal("spotError"),
    scene: sceneSchema(1),
    spots: z.array(spotSchema).min(2).max(5),
    /** Het id van de plek waar het misgaat. */
    correct: z.string().min(1),
  })
  .refine(
    (question) => question.spots.some((spot) => spot.id === question.correct),
    {
      message: "correct moet naar een bestaande plek wijzen",
      path: ["correct"],
    },
  );

/** Zet de stappen op volgorde. In het bestand staan ze in de goede volgorde. */
export const orderQuestionSchema = z
  .object({
    ...questionBase,
    kind: z.literal("order"),
    items: z.array(z.string().min(1).max(100)).min(3).max(6),
  })
  .refine(
    (question) => new Set(question.items).size === question.items.length,
    {
      message: "Elke stap moet anders zijn",
      path: ["items"],
    },
  );

export const quizQuestionSchema = z.discriminatedUnion("kind", [
  choiceQuestionSchema,
  dragQuestionSchema,
  placeBothQuestionSchema,
  freezeQuestionSchema,
  routeQuestionSchema,
  spotErrorQuestionSchema,
  orderQuestionSchema,
]);

export const NIVEAUS = ["basis", "gevorderd", "expert"] as const;

const lessonIdSchema = z.string().regex(/^[a-z0-9-]+$/);

export const lessonSchema = z
  .object({
    id: lessonIdSchema,
    order: z.number().int().min(1),
    /** concept: nog niet inhoudelijk goedgekeurd door de vereniging. */
    status: z.enum(["concept", "definitief"]),
    niveau: z.enum(NIVEAUS),
    /** Id's van lessen die eerst afgerond moeten zijn. */
    vereisten: z.array(lessonIdSchema).max(6),
    /** Geschatte duur van de les met quiz. */
    duurMinuten: z.number().int().min(1).max(60),
    /** Wat je na de les kunt, in korte zinnen. */
    leerdoelen: z.array(z.string().min(1).max(120)).min(2).max(3),
    /** Punten die de vereniging nog moet nakijken. JSON kent geen commentaar. */
    teVerifieren: z.array(z.string().min(1).max(300)).max(20).optional(),
    scenario: scenarioSchema,
    quiz: z.array(quizQuestionSchema).min(1).max(10),
  })
  .superRefine((lesson, context) => {
    const expected = lesson.scenario.players.map((player) => player.id);
    lesson.quiz.forEach((question, index) => {
      if (question.kind !== "freeze" && question.kind !== "spotError") return;
      const path = ["quiz", index];
      for (const frame of question.scene.keyframes) {
        if (!expected.every((id) => id in frame.players)) {
          context.addIssue({
            code: "custom",
            path,
            message: `Stap ${frame.id} van ${question.id} mist een speler`,
          });
        }
      }
      if (question.kind !== "spotError") return;
      for (const { playerId } of question.spots) {
        if (playerId && !expected.includes(playerId)) {
          context.addIssue({
            code: "custom",
            path,
            message: `${question.id}: speler ${playerId} bestaat niet`,
          });
        }
      }
    });
  });

const termSchema = z.string().min(1);

/**
 * De afspraken van de vereniging in src/config/vereniging.json. De vaste
 * sleutels zijn verplicht, omdat de lessen ze gebruiken. Extra sleutels mogen.
 */
export const clubSchema = z.object({
  roepwoorden: z
    .object({
      lijn: termSchema,
      hoek: termSchema,
      niemand: termSchema,
      cut: termSchema,
    })
    .catchall(termSchema),
  bloksignalen: z
    .object({
      lijn: termSchema,
      hoek: termSchema,
      ball: termSchema,
      geenBlok: termSchema,
      schijnLijn: termSchema,
      schijnHoek: termSchema,
      spreid: termSchema,
    })
    .catchall(termSchema),
  opslagsignalen: z.object({ doel: termSchema }).catchall(termSchema),
});

export type Position = z.infer<typeof positionSchema>;
export type Player = z.infer<typeof playerSchema>;
export type TeamId = Player["team"];
export type Ball = z.infer<typeof ballSchema>;
export type Arrow = z.infer<typeof arrowSchema>;
export type Zone = z.infer<typeof zoneSchema>;
export type Keyframe = z.infer<typeof keyframeSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
export type ChoiceQuestion = z.infer<typeof choiceQuestionSchema>;
export type DragQuestion = z.infer<typeof dragQuestionSchema>;
export type PlaceBothQuestion = z.infer<typeof placeBothQuestionSchema>;
export type FreezeQuestion = z.infer<typeof freezeQuestionSchema>;
export type RouteQuestion = z.infer<typeof routeQuestionSchema>;
export type SpotErrorQuestion = z.infer<typeof spotErrorQuestionSchema>;
export type OrderQuestion = z.infer<typeof orderQuestionSchema>;
export type Spot = z.infer<typeof spotSchema>;
export type Placement = z.infer<typeof placementSchema>;
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type Niveau = Lesson["niveau"];
export type ClubTerms = z.infer<typeof clubSchema>;
