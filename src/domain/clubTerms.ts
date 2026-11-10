import type { ClubTerms } from "./schema";

/** Welk voorvoegsel in een lesbestand bij welk blok in vereniging.json hoort. */
export const TERM_GROUPS = {
  signaal: "bloksignalen",
  opslag: "opslagsignalen",
  roep: "roepwoorden",
} as const satisfies Record<string, keyof ClubTerms>;

export type TermGroup = keyof typeof TERM_GROUPS;

const PATTERN = new RegExp(
  `\\{(${Object.keys(TERM_GROUPS).join("|")})\\.(\\w+)\\}`,
  "g",
);

export interface TermRef {
  group: TermGroup;
  name: string;
}

/** Alle verwijzingen zoals {signaal.lijn} en {opslag.doel} in een tekst. */
export function termRefs(text: string): TermRef[] {
  return [...text.matchAll(PATTERN)].map(([, group, name]) => ({
    group: group as TermGroup,
    name: name ?? "",
  }));
}

/** De afspraak bij een verwijzing, of undefined als die niet bestaat. */
export function lookupTerm(
  terms: ClubTerms,
  { group, name }: TermRef,
): string | undefined {
  const block: Record<string, string> = terms[TERM_GROUPS[group]];
  return Object.hasOwn(block, name) ? block[name] : undefined;
}

/** Vervangt elke verwijzing door de afspraak; gooit bij een onbekende sleutel. */
export function fillTerms(text: string, terms: ClubTerms): string {
  return text.replace(PATTERN, (match, group: TermGroup, name: string) => {
    const term = lookupTerm(terms, { group, name });
    if (!term) throw new Error(`Onbekende term: ${match}`);
    return term;
  });
}
