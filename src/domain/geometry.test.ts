import { describe, expect, it } from "vitest";
import {
  clampToArea,
  COURT,
  metersToSvg,
  nearestWithin,
  svgToMeters,
  UNITS_PER_METER,
  viewBoxSize,
  type CourtView,
} from "./geometry";

const landscape: CourtView = { orientation: "landscape", flipped: false };
const portrait: CourtView = { orientation: "portrait", flipped: false };
const portraitFlipped: CourtView = { orientation: "portrait", flipped: true };
const views: CourtView[] = [
  landscape,
  { orientation: "landscape", flipped: true },
  portrait,
  portraitFlipped,
];

describe("viewBoxSize", () => {
  it("omvat het veld plus de vrije zone en draait mee", () => {
    expect(viewBoxSize("landscape")).toEqual({ width: 2200, height: 1400 });
    expect(viewBoxSize("portrait")).toEqual({ width: 1400, height: 2200 });
  });
});

describe("metersToSvg", () => {
  it("zet de oorsprong liggend na de vrije zone", () => {
    const offset = COURT.freeZone * UNITS_PER_METER;
    expect(metersToSvg({ x: 0, y: 0 }, landscape)).toEqual({
      sx: offset,
      sy: offset,
    });
  });

  it("zet team A staand onderaan en gedraaid bovenaan", () => {
    const teamA = { x: 4, y: 4 };
    const teamB = { x: 12, y: 4 };
    expect(metersToSvg(teamA, portrait).sy).toBeGreaterThan(
      metersToSvg(teamB, portrait).sy,
    );
    expect(metersToSvg(teamA, portraitFlipped).sy).toBeLessThan(
      metersToSvg(teamB, portraitFlipped).sy,
    );
  });

  it("houdt het midden van het net op zijn plek in elke weergave", () => {
    for (const view of views) {
      const { width, height } = viewBoxSize(view.orientation);
      expect(metersToSvg({ x: 8, y: 4 }, view)).toEqual({
        sx: width / 2,
        sy: height / 2,
      });
    }
  });
});

describe("svgToMeters", () => {
  it("is de omgekeerde van metersToSvg in elke weergave", () => {
    const positions = [
      { x: 0, y: 0 },
      { x: 16, y: 8 },
      { x: -3, y: 11 },
      { x: 5.25, y: 2.75 },
    ];
    for (const view of views) {
      for (const position of positions) {
        const back = svgToMeters(metersToSvg(position, view), view);
        expect(back.x).toBeCloseTo(position.x);
        expect(back.y).toBeCloseTo(position.y);
      }
    }
  });
});

describe("clampToArea", () => {
  it("laat posities in de vrije zone met rust", () => {
    expect(clampToArea({ x: -2.5, y: 10 })).toEqual({ x: -2.5, y: 10 });
  });

  it("begrenst posities buiten de vrije zone", () => {
    expect(clampToArea({ x: -9, y: 30 })).toEqual({ x: -3, y: 11 });
  });
});

describe("nearestWithin", () => {
  const items = { a: { x: 0, y: 0 }, b: { x: 1, y: 0 } };

  it("kiest het dichtstbijzijnde item", () => {
    expect(nearestWithin({ x: 0.8, y: 0 }, items, 2)).toBe("b");
  });

  it("geeft null als niets dichtbij genoeg ligt", () => {
    expect(nearestWithin({ x: 5, y: 5 }, items, 1)).toBeNull();
  });
});
