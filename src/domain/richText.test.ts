import { describe, expect, it } from "vitest";
import { parseInline } from "./richText";

describe("parseInline", () => {
  it("laat gewone tekst met rust", () => {
    expect(parseInline("Roep mijn")).toEqual([
      { text: "Roep mijn", style: "plain" },
    ]);
  });

  it("herkent vet en cursief", () => {
    expect(parseInline("Roep **mijn!** en *beweeg*.")).toEqual([
      { text: "Roep ", style: "plain" },
      { text: "mijn!", style: "strong" },
      { text: " en ", style: "plain" },
      { text: "beweeg", style: "em" },
      { text: ".", style: "plain" },
    ]);
  });

  it("behandelt HTML als gewone tekst", () => {
    expect(parseInline("<img src=x>")).toEqual([
      { text: "<img src=x>", style: "plain" },
    ]);
  });

  it("laat losse sterren staan", () => {
    expect(parseInline("3 * 4 * 5")).toEqual([
      { text: "3 * 4 * 5", style: "plain" },
    ]);
  });
});
