import { describe, expect, it } from "vitest";
import { fillTerms, lookupTerm, termRefs } from "./clubTerms";
import type { ClubTerms } from "./schema";

const terms: ClubTerms = {
  roepwoorden: { lijn: "lijn", hoek: "hoek", niemand: "niemand", cut: "cut" },
  bloksignalen: {
    lijn: "één vinger",
    hoek: "twee vingers",
    ball: "een open hand",
    geenBlok: "een vuist",
    schijnLijn: "drie vingers",
    schijnHoek: "vier vingers",
    spreid: "duim en pink",
  },
  opslagsignalen: { doel: "wiebelen met de hand" },
};

describe("termRefs", () => {
  it("vindt signalen, opslagsignalen en roepwoorden", () => {
    expect(
      termRefs(
        "{signaal.schijnLijn} en {opslag.doel}, {roep.cut} {iets.anders}",
      ),
    ).toEqual([
      { group: "signaal", name: "schijnLijn" },
      { group: "opslag", name: "doel" },
      { group: "roep", name: "cut" },
    ]);
  });
});

describe("lookupTerm", () => {
  it("zoekt in het juiste blok", () => {
    expect(lookupTerm(terms, { group: "opslag", name: "doel" })).toBe(
      "wiebelen met de hand",
    );
    expect(
      lookupTerm(terms, { group: "signaal", name: "doel" }),
    ).toBeUndefined();
  });

  it("negeert sleutels van het object zelf", () => {
    expect(
      lookupTerm(terms, { group: "signaal", name: "toString" }),
    ).toBeUndefined();
  });
});

describe("fillTerms", () => {
  it("vult alles in", () => {
    expect(fillTerms("Bij {signaal.spreid}: {opslag.doel}", terms)).toBe(
      "Bij duim en pink: wiebelen met de hand",
    );
  });

  it("gooit bij een onbekende sleutel", () => {
    expect(() => fillTerms("{opslag.lijn}", terms)).toThrow(/opslag\.lijn/);
  });
});
