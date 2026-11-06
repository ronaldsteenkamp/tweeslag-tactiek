import { useSyncExternalStore } from "react";
import type { Orientation } from "../../domain/geometry";

function useMediaQuery(query: string): boolean {
  const list = window.matchMedia(query);
  return useSyncExternalStore(
    (onChange) => {
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => list.matches,
  );
}

export function useOrientation(): Orientation {
  return useMediaQuery("(orientation: portrait)") ? "portrait" : "landscape";
}

export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
