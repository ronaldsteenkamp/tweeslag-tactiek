import { create } from "zustand";
import { browserStorage, readJson, writeJson } from "../storage";

const STORAGE_KEY = "tweeslag-tactiek.strandmodus.v1";
const storage = browserStorage();

function apply(enabled: boolean) {
  if (enabled) document.documentElement.dataset.theme = "strand";
  else delete document.documentElement.dataset.theme;
}

interface BeachModeState {
  enabled: boolean;
  toggle: () => void;
}

export const useBeachMode = create<BeachModeState>((set, get) => {
  const enabled = readJson(storage, STORAGE_KEY) === true;
  apply(enabled);

  return {
    enabled,
    toggle: () => {
      const next = !get().enabled;
      apply(next);
      writeJson(storage, STORAGE_KEY, next);
      set({ enabled: next });
    },
  };
});
