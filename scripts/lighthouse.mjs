// Lighthouse-audit op de productiebuild, met de mobiele standaardinstellingen van Lighthouse.
// Lighthouse kent sinds versie 12 geen PWA-categorie meer; de PWA-eisen staan daarom als e2e-test
// in e2e/pwa.spec.ts. Lighthouse praat met de Chromium van Playwright, die toch al is geïnstalleerd.
import { chromium } from "@playwright/test";
import lighthouse from "lighthouse";
import { preview } from "vite";

const PORT = 4174;
const DEBUG_PORT = 9333;
/** Zet LIVE_URL om de online versie te meten. */
const LIVE_URL = process.env.LIVE_URL;
const BASE = LIVE_URL ?? `http://localhost:${PORT}/tweeslag-tactiek/`;
const MINIMUM = 90;
const CATEGORIES = ["performance", "accessibility", "best-practices"];
const PAGES = ["", "#/les/opbouw", "#/les/opbouw/quiz", "#/regels", "#/bord"];

const server = LIVE_URL
  ? null
  : await preview({ preview: { port: PORT, strictPort: true } });
const browser = await chromium.launch({
  args: [`--remote-debugging-port=${DEBUG_PORT}`],
});
let failed = false;

try {
  console.log(`${"pagina".padEnd(20)} perf  a11y  best`);
  for (const page of PAGES) {
    const { lhr } = await lighthouse(`${BASE}${page}`, {
      port: DEBUG_PORT,
      logLevel: "error",
      onlyCategories: CATEGORIES,
    });
    const scores = CATEGORIES.map((id) =>
      Math.round(lhr.categories[id].score * 100),
    );
    console.log(
      `${(page || "#/").padEnd(20)} ${scores.map((score) => String(score).padEnd(5)).join(" ")}`,
    );

    for (const id of CATEGORIES) {
      for (const { id: auditId, weight } of lhr.categories[id].auditRefs) {
        const audit = lhr.audits[auditId];
        if (weight > 0 && audit.score !== null && audit.score < 0.9) {
          console.log(`  ${id}: ${auditId} ${audit.displayValue ?? ""}`);
        }
      }
    }
    if (scores.some((score) => score < MINIMUM)) failed = true;
  }
} finally {
  await browser.close();
  await server?.close();
}

process.exit(failed ? 1 : 0);
