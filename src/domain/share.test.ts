import jsQR from "jsqr";
import { compressToEncodedURIComponent } from "lz-string";
import QRCode from "qrcode";
import { describe, expect, it } from "vitest";
import { lessons } from "../content";
import { addStep, addVariant, BASE_VARIANT, newScenario } from "./editing";
import type { Keyframe, Scenario } from "./schema";
import {
  buildShareLink,
  decodeScenario,
  encodeScenario,
  MAX_QR_CHARS,
  MAX_SHARE_CHARS,
} from "./share";

const BASE_URL = "https://ronaldsteenkamp.github.io/tweeslag-tactiek/";

function stripIds(scenario: Scenario) {
  const frame = (keyframe: Keyframe) => ({
    ...keyframe,
    id: "",
    ball: { ...keyframe.ball, height: keyframe.ball.height || undefined },
    arrows: keyframe.arrows?.map((arrow) => ({ ...arrow, id: "" })) ?? [],
    zones: keyframe.zones?.map((zone) => ({ ...zone, id: "" })) ?? [],
  });
  return {
    title: scenario.title,
    description: scenario.description,
    level: scenario.level,
    players: scenario.players.map(({ id, team, label }) => ({
      id,
      team,
      label,
    })),
    keyframes: scenario.keyframes.map(frame),
    variants: (scenario.variants ?? []).map((variant) => ({
      label: variant.label,
      keyframes: variant.keyframes.map(frame),
    })),
  };
}

/** Wat een trainer in twee minuten maakt: drie stappen met uitleg en lijnen. */
function trainerScenario(): Scenario {
  const base = newScenario("Blok lijn tegen hoge set");
  const frames = addStep(addStep(base.keyframes, 0), 1).map(
    (frame, index): Keyframe => ({
      ...frame,
      caption: `Stap ${index + 1}: blokker sluit de lijn af, verdediger in de diagonaal.`,
      players: { ...frame.players, A1: { x: 7.5, y: 1 + index } },
      arrows: [
        {
          id: `p${index}`,
          kind: "run",
          from: { x: 3, y: 4 },
          to: { x: 3, y: 5.5 },
        },
        {
          id: `b${index}`,
          kind: "shot",
          from: { x: 9, y: 1.2 },
          to: { x: 3.4, y: 5.4 },
        },
      ],
      zones: [
        {
          id: `z${index}`,
          kind: "blocked",
          label: "Blok",
          polygon: [
            { x: 7.5, y: 0.2 },
            { x: 7.5, y: 2 },
            { x: 0, y: 2.8 },
            { x: 0, y: 0 },
          ],
        },
      ],
    }),
  );
  return { ...base, keyframes: frames };
}

describe("round-trip", () => {
  it("behoudt een scenario met lijnen en zones", () => {
    const scenario = trainerScenario();
    const result = decodeScenario(encodeScenario(scenario));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(stripIds(result.scenario)).toEqual(stripIds(scenario));
    }
  });

  it("behoudt varianten", () => {
    const { scenario } = addVariant(trainerScenario(), BASE_VARIANT, "Hoek");
    const result = decodeScenario(encodeScenario(scenario));
    expect(result.ok && result.scenario.variants?.[0]?.label).toBe("Hoek");
    if (result.ok) {
      expect(stripIds(result.scenario)).toEqual(stripIds(scenario));
    }
  });

  it.each(lessons.map((lesson) => [lesson.id, lesson.scenario] as const))(
    "werkt voor les %s",
    (_id, scenario) => {
      const result = decodeScenario(encodeScenario(scenario));
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(stripIds(result.scenario)).toEqual(stripIds(scenario));
      }
    },
  );
});

describe("foute links", () => {
  it("meldt onzin als beschadigd", () => {
    expect(decodeScenario("dit-is-geen-link")).toEqual({
      ok: false,
      error: "corrupt",
    });
    expect(decodeScenario("")).toEqual({ ok: false, error: "corrupt" });
  });

  it("meldt een afgekapte link als beschadigd", () => {
    const data = encodeScenario(trainerScenario());
    expect(decodeScenario(data.slice(0, data.length / 2)).ok).toBe(false);
  });

  it("meldt geldige JSON met een fout scenario als beschadigd", () => {
    const data = compressToEncodedURIComponent(
      JSON.stringify([1, "x", "", 0, [], [], []]),
    );
    expect(decodeScenario(data)).toEqual({ ok: false, error: "corrupt" });
  });

  it("weigert coördinaten buiten het veld", () => {
    const scenario = trainerScenario();
    const frame = scenario.keyframes[0] as Keyframe;
    const data = encodeScenario({
      ...scenario,
      keyframes: [{ ...frame, ball: { x: 99, y: 0 } }],
    });
    expect(decodeScenario(data).ok).toBe(false);
  });

  it("meldt een onbekende versie", () => {
    const data = compressToEncodedURIComponent(JSON.stringify([99]));
    expect(decodeScenario(data)).toEqual({ ok: false, error: "version" });
  });

  it("weigert een te lange link", () => {
    expect(decodeScenario("a".repeat(MAX_SHARE_CHARS + 1))).toEqual({
      ok: false,
      error: "too-large",
    });
  });

  it("weigert een link die enorm uitpakt", () => {
    const data = compressToEncodedURIComponent(
      JSON.stringify([1, "x".repeat(300_000)]),
    );
    expect(data.length).toBeLessThan(MAX_SHARE_CHARS);
    expect(decodeScenario(data)).toEqual({ ok: false, error: "too-large" });
  });
});

describe("QR-code", () => {
  /** Tekent de QR-code zoals op een scherm en leest hem weer uit. */
  function readQr(text: string): string | undefined {
    const qr = QRCode.create(text, { errorCorrectionLevel: "L" });
    const scale = 4;
    const quiet = 4;
    const count = qr.modules.size;
    const size = (count + 2 * quiet) * scale;
    const pixels = new Uint8ClampedArray(size * size * 4).fill(255);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const column = Math.floor(x / scale) - quiet;
        const row = Math.floor(y / scale) - quiet;
        const inside = column >= 0 && row >= 0 && column < count && row < count;
        if (inside && qr.modules.get(row, column)) {
          const offset = (y * size + x) * 4;
          pixels.fill(0, offset, offset + 3);
        }
      }
    }
    return jsQR(pixels, size, size)?.data;
  }

  it("past een scenario van drie stappen in een QR-code", () => {
    const link = buildShareLink(trainerScenario(), BASE_URL);
    expect(link.fitsQr).toBe(true);
    console.info(`Deellink van 3 stappen: ${link.url.length} tekens`);
  });

  it("levert een leesbare QR-code met de hele link op", () => {
    const { url } = buildShareLink(trainerScenario(), BASE_URL);
    expect(readQr(url)).toBe(url);
  });

  it("is ook op de maximale lengte nog leesbaar", () => {
    const text = BASE_URL + "x".repeat(MAX_QR_CHARS - BASE_URL.length);
    expect(readQr(text)).toBe(text);
  });
});

describe("buildShareLink", () => {
  it("zet het scenario in de hash", () => {
    const { url } = buildShareLink(trainerScenario(), BASE_URL);
    expect(url.startsWith(`${BASE_URL}#/s/`)).toBe(true);
  });

  it("meldt een scenario dat te groot is", () => {
    const base = trainerScenario();
    const frame = base.keyframes[0] as Keyframe;
    const keyframes = Array.from({ length: 30 }, (_item, index) => ({
      ...frame,
      caption: Array.from({ length: 90 }, (_word, word) =>
        ((index + 1) * 7919 * (word + 1)).toString(36),
      )
        .join(" ")
        .slice(0, 600),
    }));
    const link = buildShareLink({ ...base, keyframes }, BASE_URL);
    expect(link.tooLarge).toBe(true);
    expect(link.fitsQr).toBe(false);
  });
});
