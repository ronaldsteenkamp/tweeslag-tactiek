import { describe, expect, it } from "vitest";
import { isInsidePolygon, isInTarget } from "./quiz";

const square = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 4 },
  { x: 0, y: 4 },
];

const triangle = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 0, y: 4 },
];

describe("isInsidePolygon", () => {
  it("herkent punten binnen en buiten een vierkant", () => {
    expect(isInsidePolygon({ x: 2, y: 2 }, square)).toBe(true);
    expect(isInsidePolygon({ x: 5, y: 2 }, square)).toBe(false);
  });

  it("werkt ook voor een schuine rand", () => {
    expect(isInsidePolygon({ x: 1, y: 1 }, triangle)).toBe(true);
    expect(isInsidePolygon({ x: 3, y: 3 }, triangle)).toBe(false);
  });
});

describe("isInTarget", () => {
  it("rekent een punt in de zone goed", () => {
    expect(isInTarget({ x: 2, y: 2 }, square, 0)).toBe(true);
  });

  it("past de tolerantie toe rond de rand", () => {
    expect(isInTarget({ x: 4.4, y: 2 }, square, 0.5)).toBe(true);
    expect(isInTarget({ x: 4.6, y: 2 }, square, 0.5)).toBe(false);
  });

  it("past de tolerantie ook toe bij een hoek", () => {
    expect(isInTarget({ x: 4.3, y: 4.3 }, square, 0.5)).toBe(true);
    expect(isInTarget({ x: 4.4, y: 4.4 }, square, 0.5)).toBe(false);
  });
});
