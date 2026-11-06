import { describe, expect, it } from "vitest";
import { t } from "./index";

describe("t", () => {
  it("vult parameters in", () => {
    expect(t("app.logoAlt", { club: "Tweeslag" })).toBe("Logo van Tweeslag");
  });

  it("laat ontbrekende parameters zichtbaar staan", () => {
    expect(t("app.logoAlt")).toBe("Logo van {club}");
  });
});
