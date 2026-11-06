import { describe, expect, it } from "vitest";
import { parseRoute } from "./router";

describe("parseRoute", () => {
  it("toont standaard het lessenoverzicht", () => {
    expect(parseRoute("")).toEqual({ name: "lessons" });
    expect(parseRoute("#/")).toEqual({ name: "lessons" });
  });

  it("herkent een les en het tactiekbord", () => {
    expect(parseRoute("#/les/pass")).toEqual({ name: "lesson", id: "pass" });
    expect(parseRoute("#/bord")).toEqual({ name: "board" });
  });

  it("valt bij onbekende paden terug op het overzicht", () => {
    expect(parseRoute("#/onzin")).toEqual({ name: "lessons" });
    expect(parseRoute("#/les/")).toEqual({ name: "lessons" });
  });
});
