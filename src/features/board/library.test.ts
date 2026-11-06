import { describe, expect, it } from "vitest";
import { newScenario } from "../../domain/editing";
import { loadLibrary, withEntry, withoutEntry } from "./library";

const key = "tweeslag-tactiek.scenarios.v1";

function storageWith(value: string | null) {
  return { getItem: () => value, setItem: () => undefined };
}

describe("bibliotheek", () => {
  const scenario = newScenario("Eerste");

  it("zet de nieuwste bovenaan en vervangt hetzelfde id", () => {
    const other = newScenario("Tweede");
    const one = withEntry([], scenario, "2026-01-01");
    const two = withEntry(one, other, "2026-01-02");
    const three = withEntry(
      two,
      { ...scenario, title: "Aangepast" },
      "2026-01-03",
    );
    expect(three.map((entry) => entry.scenario.title)).toEqual([
      "Aangepast",
      "Tweede",
    ]);
  });

  it("verwijdert op id", () => {
    const entries = withEntry([], scenario, "2026-01-01");
    expect(withoutEntry(entries, scenario.id)).toEqual([]);
  });

  it("leest opgeslagen scenario's terug en slaat kapotte over", () => {
    const raw = JSON.stringify([
      { savedAt: "2026-01-01", scenario },
      { savedAt: "2026-01-02", scenario: { title: "kapot" } },
    ]);
    expect(loadLibrary(storageWith(raw))).toHaveLength(1);
  });

  it("werkt zonder of met beschadigde opslag", () => {
    expect(loadLibrary(undefined)).toEqual([]);
    expect(loadLibrary(storageWith("{kapot"))).toEqual([]);
    expect(key).toContain("scenarios");
  });
});
