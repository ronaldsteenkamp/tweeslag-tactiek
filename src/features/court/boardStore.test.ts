import { beforeEach, describe, expect, it } from "vitest";
import { useBoardStore } from "./boardStore";

describe("boardStore", () => {
  beforeEach(() => useBoardStore.getState().reset());

  it("verplaatst een speler en begrenst tot de vrije zone", () => {
    useBoardStore.getState().moveTo("A1", { x: -10, y: 4 });
    expect(useBoardStore.getState().positions.A1).toEqual({ x: -3, y: 4 });
  });

  it("zet alles terug met reset", () => {
    const start = useBoardStore.getState().positions;
    useBoardStore.getState().moveTo("A2", { x: 1, y: 1 });
    useBoardStore.getState().reset();
    expect(useBoardStore.getState().positions).toEqual(start);
  });
});
