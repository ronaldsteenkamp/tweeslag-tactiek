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
    expect(parseRoute("#/regels")).toEqual({ name: "rules" });
  });

  it("herkent de quiz bij een les", () => {
    expect(parseRoute("#/les/pass/quiz")).toEqual({ name: "quiz", id: "pass" });
  });

  it("herkent een gedeelde link", () => {
    expect(parseRoute("#/s/abc+-$")).toEqual({
      name: "shared",
      data: "abc+-$",
    });
  });

  it("valt bij onbekende paden terug op het overzicht", () => {
    expect(parseRoute("#/onzin")).toEqual({ name: "lessons" });
    expect(parseRoute("#/les/")).toEqual({ name: "lessons" });
  });
});
