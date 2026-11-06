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

export const choiceQuestionSchema = z
  .object({
    id: z.string().min(1),
    kind: z.literal("choice"),
    prompt: z.string().min(1).max(200),
    options: z.array(z.string().min(1)).min(2).max(5),
    correct: z.number().int().min(0),
    explanation: z.string().min(1).max(300),
  })
  .refine((question) => question.correct < question.options.length, {
    message: "correct moet naar een bestaande optie wijzen",
    path: ["correct"],
  });

export const dragQuestionSchema = z
  .object({
    id: z.string().min(1),
    kind: z.literal("drag"),
    prompt: z.string().min(1).max(200),
    /** De speler die verplaatst moet worden. */
    playerId: z.string().min(1),
    setup: z.object({
      players: z.record(z.string(), positionSchema),
      ball: ballSchema,
    }),
    arrows: z.array(arrowSchema).optional(),
    zones: z.array(zoneSchema).optional(),
    target: z.array(positionSchema).min(3).max(12),
    /** Hoeveel meter naast de doelzone nog goed rekent. */
    tolerance: z.number().min(0).max(2),
    explanation: z.string().min(1).max(300),
  })
  .refine((question) => question.playerId in question.setup.players, {
    message: "playerId moet in de beginopstelling staan",
    path: ["playerId"],
  });

export const quizQuestionSchema = z.union([
  choiceQuestionSchema,
  dragQuestionSchema,
]);

export const lessonSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  order: z.number().int().min(1),
  /** concept: nog niet inhoudelijk goedgekeurd door de vereniging. */
  status: z.enum(["concept", "definitief"]),
  scenario: scenarioSchema,
  quiz: z.array(quizQuestionSchema).min(1).max(10),
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
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
