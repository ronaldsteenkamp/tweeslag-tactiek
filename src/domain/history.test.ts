import { describe, expect, it } from "vitest";
import { pushHistory, redo, startHistory, undo } from "./history";

describe("geschiedenis", () => {
  it("gaat terug en weer vooruit", () => {
    const one = pushHistory(startHistory("a"), "a", "b");
    const two = pushHistory(one, "b", "c");
    expect(undo(two).present).toBe("b");
    expect(undo(undo(two)).present).toBe("a");
    expect(redo(undo(two)).present).toBe("c");
  });

  it("doet niets aan het begin of eind", () => {
    const start = startHistory("a");
    expect(undo(start)).toBe(start);
    expect(redo(start)).toBe(start);
  });

  it("wist de toekomst bij een nieuwe wijziging", () => {
    const back = undo(pushHistory(startHistory("a"), "a", "b"));
    expect(pushHistory(back, "a", "c").future).toEqual([]);
  });

  it("onthoudt maximaal honderd stappen", () => {
    let history = startHistory(0);
    for (let value = 1; value <= 150; value += 1) {
      history = pushHistory(history, value - 1, value);
    }
    expect(history.past).toHaveLength(100);
  });
});
