import { useSyncExternalStore } from "react";

export type Route =
  { name: "lessons" } | { name: "lesson"; id: string } | { name: "board" };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, "");
  const [section, id] = path.split("/");
  if (section === "bord") return { name: "board" };
  if (section === "les" && id) return { name: "lesson", id };
  return { name: "lessons" };
}

export const paths = {
  lessons: "#/",
  lesson: (id: string) => `#/les/${id}`,
  board: "#/bord",
} as const;

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

export function useHash(): string {
  return useSyncExternalStore(subscribe, () => window.location.hash);
}
