import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { skipQuestions, startUntimed, unlockAll } from "./helpers";

const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });

/** Opent een vraag in een les die nog op slot zit. */
async function openLocked(
  page: Page,
  lesson: string,
  skip: number,
  expert = false,
) {
  await unlockAll(page);
  await page.goto(`./#/les/${lesson}/quiz`);
  if (expert) await startUntimed(page);
  await skipQuestions(page, skip);
}

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const summary = violations.map(
    (item) =>
      `${item.id}: ${item.nodes.map((node) => node.target.join(" ")).join(", ")}`,
  );
  expect(summary).toEqual([]);
}

const screens: [string, string, ((page: Page) => Promise<void>)?][] = [
  ["lessenoverzicht", "./"],
  ["les", "./#/les/verdedigen-met-blok"],
  ["leerdoelen", "./#/les/shots", (page) => button(page, "Doelen").click()],
  [
    "les op de laatste stap",
    "./#/les/shots",
    (page) => button(page, "Ga naar stap 5").click(),
  ],
  ["sleepvraag", "./#/les/bloksignalen/quiz"],
  [
    "feedback op een sleepvraag",
    "./#/les/bloksignalen/quiz",
    (page) => button(page, "Controleer").click(),
  ],
  [
    "feedback op een meerkeuzevraag",
    "./#/les/pass-ontvangst/quiz",
    (page) => button(page, "A1, want die staat het dichtst bij").click(),
  ],
  ["beide spelers plaatsen", "./#/les/verdedigen-met-blok/quiz"],
  ["fout zoeken", "./", (page) => openLocked(page, "blokvarianten", 3, true)],
  [
    "feedback op fout zoeken",
    "./",
    async (page) => {
      await openLocked(page, "blokvarianten", 3, true);
      await button(page, "A1").click();
    },
  ],
  ["volgorde", "./#/les/veld-en-basis/quiz"],
  [
    "feedback op volgorde",
    "./#/les/veld-en-basis/quiz",
    (page) => button(page, "Controleer").click(),
  ],
  ["freeze frame", "./#/les/peel/quiz"],
  ["looplijn", "./", (page) => openLocked(page, "transitie", 1)],
  ["gesloten niveautoets", "./#/toets/gevorderd"],
  [
    "lessenoverzicht met alles open",
    "./",
    (page) => page.getByRole("checkbox").check(),
  ],
  ["vergrendelde les", "./#/les/opslagtactiek"],
  ["regels", "./#/regels"],
  ["tactiekbord", "./#/bord"],
  ["menu", "./#/bord", (page) => button(page, "Menu").click()],
  ["delen", "./#/bord", (page) => button(page, "Delen").click()],
  ["stapopties", "./#/bord", (page) => button(page, "Stap…").click()],
  ["foute link", "./#/s/kapot"],
];

for (const [name, path, prepare] of screens) {
  test(`${name} voldoet aan WCAG 2.1 AA`, async ({ page }) => {
    await page.goto(path);
    await prepare?.(page);
    await expectNoViolations(page);
  });

  test(`${name} voldoet ook in strandmodus`, async ({ page }) => {
    await page.goto("./");
    await button(page, "Strandmodus").click();
    await page.goto(path);
    await prepare?.(page);
    await expectNoViolations(page);
  });
}

test("elke pagina heeft één h1 en een eigen titel", async ({ page }) => {
  const pages: [string, string][] = [
    ["./", "Lessen"],
    ["./#/les/opbouw", "De opbouw: pass, set, aanval"],
    ["./#/les/opbouw/quiz", "Quiz"],
    ["./#/regels", "Spelregels"],
    ["./#/bord", "Tactiekbord"],
  ];
  for (const [path, title] of pages) {
    await page.goto(path);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page).toHaveTitle(new RegExp(title));
  }
});

test("de focus gaat naar de inhoud bij een nieuwe pagina", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("link", { name: "Regels", exact: true }).click();
  await expect(page.locator("main")).toBeFocused();
});

test("met tab kom je via de skiplink bij de inhoud", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === "mobiel", "Alleen desktop");
  await page.goto("./");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Naar de inhoud" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});

test("een dialoog houdt de focus vast en geeft hem terug", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === "mobiel", "Alleen desktop");
  await page.goto("./#/bord");
  const menu = button(page, "Menu");
  await menu.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(menu).toBeFocused();
});

test("de strandmodus blijft bewaard na herladen", async ({ page }) => {
  await page.goto("./");
  const toggle = button(page, "Strandmodus");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "strand");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "strand");
});

test("alle knoppen zijn minstens 44 px hoog", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobiel", "Alleen mobiel");
  for (const path of ["./", "./#/les/opbouw", "./#/bord"]) {
    await page.goto(path);
    const heights = await page
      .locator("main button, main a, header a, header button")
      .evaluateAll((items) =>
        items.map((item) => {
          const { height, width } = item.getBoundingClientRect();
          return { text: item.textContent, height, width };
        }),
      );
    const tooSmall = heights.filter(
      ({ height, width }) => height > 0 && (height < 43.5 || width < 43.5),
    );
    expect(tooSmall, path).toEqual([]);
  }
});
