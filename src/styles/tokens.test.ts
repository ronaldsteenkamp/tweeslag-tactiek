/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { branding } from "../config/branding";

const tokens = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

function readTokens(block: string): Record<string, string> {
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map(
      ([, name, value]) => [name, value],
    ),
  ) as Record<string, string>;
}

const [defaultBlock = "", beachBlock = ""] = tokens.split(
  ':root[data-theme="strand"]',
);
const normal = readTokens(defaultBlock);
const beach = { ...normal, ...readTokens(beachBlock) };

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const [red = 0, green = 0, blue = 0] = channels;
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

/** Tekst moet 4,5:1 halen. Lijnen en vormen 3:1 (WCAG 1.4.11). */
const TEXT = 4.5;
const GRAPHIC = 3;

const pairs: [string, string, number][] = [
  ["color-text", "color-bg", TEXT],
  ["color-text", "color-surface", TEXT],
  ["color-text", "color-sand", TEXT],
  ["color-text-muted", "color-bg", TEXT],
  ["color-text-muted", "color-surface", TEXT],
  ["color-on-team", "color-team-a", TEXT],
  ["color-on-team", "color-team-b", TEXT],
  ["color-text", "color-right-bg", TEXT],
  ["color-text", "color-wrong-bg", TEXT],
  ["color-right", "color-surface", TEXT],
  ["color-wrong", "color-surface", TEXT],
  ["color-court-line", "color-sand", GRAPHIC],
  ["color-net", "color-sand", GRAPHIC],
  ["color-team-a", "color-sand", GRAPHIC],
  ["color-team-b", "color-sand", GRAPHIC],
  ["color-arrow-run", "color-sand", GRAPHIC],
  ["color-arrow-ball", "color-sand", GRAPHIC],
  ["color-arrow-shot", "color-sand", GRAPHIC],
  ["color-ball-line", "color-ball", GRAPHIC],
  ["color-border", "color-surface", GRAPHIC],
];

describe.each([
  ["standaard", normal],
  ["strandmodus", beach],
])("contrast in %s", (_name, theme) => {
  it.each(pairs)("%s op %s", (foreground, background, minimum) => {
    const a = theme[foreground];
    const b = theme[background];
    expect(a, foreground).toBeDefined();
    expect(b, background).toBeDefined();
    expect(contrast(a as string, b as string)).toBeGreaterThanOrEqual(minimum);
  });
});

describe("huisstijl", () => {
  it("heeft leesbare tekst op de hoofdkleur", () => {
    expect(
      contrast(branding.onPrimaryColor, branding.primaryColor),
    ).toBeGreaterThanOrEqual(TEXT);
  });
});

describe("strandmodus", () => {
  it("heeft meer contrast dan de standaard", () => {
    const score = (theme: Record<string, string>, a: string, b: string) =>
      contrast(theme[a] as string, theme[b] as string);
    for (const [a, b] of [
      ["color-text-muted", "color-surface"],
      ["color-court-line", "color-sand"],
      ["color-team-b", "color-sand"],
    ] as const) {
      expect(score(beach, a, b)).toBeGreaterThan(score(normal, a, b));
    }
  });
});
