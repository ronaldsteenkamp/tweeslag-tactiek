import { describe, expect, it } from "vitest";
import { easeInOut, estimateMinutes, frameAt, holdMs } from "./interpolate";
import type { Keyframe } from "./schema";

const keyframes: Keyframe[] = [
  {
    id: "k1",
    durationMs: 0,
    players: { A1: { x: 0, y: 0 } },
    ball: { x: 0, y: 0 },
    caption: "Start",
  },
  {
    id: "k2",
    durationMs: 1000,
    players: { A1: { x: 4, y: 8 } },
    ball: { x: 10, y: 2, height: 2, arc: 3 },
    caption: "Eind",
  },
];

describe("easeInOut", () => {
  it("begint op 0, eindigt op 1 en gaat door het midden", () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(0.5)).toBe(0.5);
    expect(easeInOut(1)).toBe(1);
  });
});

describe("frameAt", () => {
  it("geeft de begin- en eindstand exact terug", () => {
    expect(frameAt(keyframes, 1, 0).players.A1).toEqual({ x: 0, y: 0 });
    expect(frameAt(keyframes, 1, 1).players.A1).toEqual({ x: 4, y: 8 });
    expect(frameAt(keyframes, 1, 1).ball).toEqual({ x: 10, y: 2, height: 2 });
  });

  it("laat spelers versnellen en de bal gelijkmatig bewegen", () => {
    const frame = frameAt(keyframes, 1, 0.25);
    expect(frame.players.A1?.x).toBeCloseTo(4 * easeInOut(0.25));
    expect(frame.ball.x).toBeCloseTo(2.5);
  });

  it("legt de top van de boog halverwege", () => {
    expect(frameAt(keyframes, 1, 0.5).ball.height).toBeCloseTo(1 + 3);
  });

  it("toont de eerste stap zonder overgang", () => {
    expect(frameAt(keyframes, 0, 0.5).players.A1).toEqual({ x: 0, y: 0 });
  });

  it("begrenst de voortgang", () => {
    expect(frameAt(keyframes, 1, 3).players.A1).toEqual({ x: 4, y: 8 });
  });

  it("weigert een onbekende stap", () => {
    expect(() => frameAt(keyframes, 5, 0)).toThrow();
  });
});

describe("leestijd", () => {
  it("heeft een minimum en groeit met de tekst", () => {
    expect(holdMs("Kort")).toBe(2000);
    expect(holdMs("x".repeat(200))).toBe(9000);
  });

  it("schat minstens één minuut", () => {
    expect(estimateMinutes(keyframes)).toBe(1);
  });
});
