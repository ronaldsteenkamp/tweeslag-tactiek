import { useSyncExternalStore } from "react";
import { NIVEAUS, type Niveau } from "../domain/schema";

export type Route =
  | { name: "lessons" }
  | { name: "lesson"; id: string }
  | { name: "quiz"; id: string }
  | { name: "exam"; niveau: Niveau }
  | { name: "rules" }
  | { name: "shared"; data: string }
  | { name: "board" };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, "");
  const [section, id, part] = path.split("/");
  if (section === "bord") return { name: "board" };
  if (section === "regels") return { name: "rules" };
  if (section === "s") return { name: "shared", data: id ?? "" };
  const niveau = NIVEAUS.find((item) => item === id);
  if (section === "toets" && niveau) return { name: "exam", niveau };
  if (section === "les" && id) {
    return part === "quiz" ? { name: "quiz", id } : { name: "lesson", id };
  }
  return { name: "lessons" };
}

export const paths = {
  lessons: "#/",
  lesson: (id: string) => `#/les/${id}`,
  quiz: (id: string) => `#/les/${id}/quiz`,
  exam: (niveau: Niveau) => `#/toets/${niveau}`,
  rules: "#/regels",
  board: "#/bord",
} as const;

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

export function useHash(): string {
  return useSyncExternalStore(subscribe, () => window.location.hash);
}
