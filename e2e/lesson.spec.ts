import { expect, test, type Page } from "@playwright/test";

const stepLabel = (page: Page) => page.getByTestId("step-label");
const caption = (page: Page) => page.getByTestId("caption");

async function openFirstLesson(page: Page) {
  await page.goto("./");
  await page.getByRole("link", { name: /Het veld en de basis/ }).click();
  await expect(stepLabel(page)).toHaveText("Stap 1 van 7");
}

test("het overzicht toont de lessen met niveau en duur", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "Lessen" })).toBeVisible();
  await expect(page.getByRole("listitem")).toHaveCount(7);
  await expect(page.getByText(/Beginner · \d+ min/).first()).toBeVisible();
});

test("een les is met Volgende tot het eind te doorlopen", async ({ page }) => {
  await openFirstLesson(page);
  const next = page.getByRole("button", { name: "Volgende" });
  const first = await caption(page).textContent();

  await next.click();
  await expect(stepLabel(page)).toHaveText("Stap 2 van 7");
  expect(await caption(page).textContent()).not.toBe(first);

  for (let step = 3; step <= 7; step += 1) {
    await next.click();
    await expect(stepLabel(page)).toHaveText(`Stap ${step} van 7`);
  }
  await expect(next).toBeHidden();
  await page.getByRole("link", { name: "Start de quiz" }).click();
  await expect(page.getByTestId("quiz-count")).toHaveText("Vraag 1 van 3");
});

test("spelers bewegen tijdens een overgang", async ({ page }) => {
  await openFirstLesson(page);
  await page.getByRole("button", { name: "Ga naar stap 2" }).click();
  const token = page.getByTestId("scene-A1");
  const start = await token.getAttribute("transform");

  await page.getByRole("button", { name: "Volgende" }).click();
  await expect.poll(() => token.getAttribute("transform")).not.toBe(start);
  const during = await token.getAttribute("transform");
  await expect.poll(() => token.getAttribute("transform")).not.toBe(during);
});

test("afspelen loopt zelf door en pauze stopt het", async ({ page }) => {
  await openFirstLesson(page);
  await page.getByRole("button", { name: "1,5×" }).click();
  await page.getByRole("button", { name: "Afspelen" }).click();
  await expect(stepLabel(page)).toHaveText("Stap 2 van 7");
  await expect(stepLabel(page)).toHaveText("Stap 3 van 7", { timeout: 10_000 });

  await page.getByRole("button", { name: "Pauze" }).click();
  await expect(page.getByRole("button", { name: "Afspelen" })).toBeVisible();
  await page.waitForTimeout(3000);
  await expect(stepLabel(page)).toHaveText("Stap 3 van 7");
});

test("vorige en de tijdlijn springen direct", async ({ page }) => {
  await openFirstLesson(page);
  await expect(page.getByRole("button", { name: "Vorige" })).toBeDisabled();
  await page.getByRole("button", { name: "Ga naar stap 5" }).click();
  await expect(stepLabel(page)).toHaveText("Stap 5 van 7");
  await page.getByRole("button", { name: "Vorige" }).click();
  await expect(stepLabel(page)).toHaveText("Stap 4 van 7");
});

test("de les is met het toetsenbord te bedienen", async ({ page }) => {
  await openFirstLesson(page);
  await page.keyboard.press("ArrowRight");
  await expect(stepLabel(page)).toHaveText("Stap 2 van 7");
  await page.keyboard.press("ArrowLeft");
  await expect(stepLabel(page)).toHaveText("Stap 1 van 7");
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "Pauze" })).toBeVisible();
});

test("zonder beweging springt de animatie direct naar de stap", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openFirstLesson(page);
  await page.getByRole("button", { name: "Ga naar stap 2" }).click();
  await page.getByRole("button", { name: "Volgende" }).click();
  await expect(page.getByTestId("scene-A1")).toHaveAttribute(
    "transform",
    /translate/,
  );
  await expect(stepLabel(page)).toHaveText("Stap 3 van 7");
});

const viewports: [number, number][] = [
  [360, 640],
  [800, 360],
  [1280, 720],
];

for (const [width, height] of viewports) {
  test(`de lesspeler past op ${width} x ${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openFirstLesson(page);
    await page.getByRole("button", { name: "Ga naar stap 7" }).click();

    await expect(page.getByTestId("scene")).toBeInViewport();
    await expect(
      page.getByRole("link", { name: "Start de quiz" }),
    ).toBeInViewport();
    const box = await page.getByTestId("scene").boundingBox();
    expect(box?.height).toBeGreaterThan(150);
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    );
    expect(fits).toBe(true);
  });
}

test("elke uitleg past zonder scrollen op een kleine telefoon", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("./");
  const hrefs = await page
    .getByRole("listitem")
    .getByRole("link")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));

  for (const href of hrefs) {
    await page.goto(`./${href}`);
    const steps = await page
      .getByRole("button", { name: /Ga naar stap/ })
      .count();
    for (let step = 1; step <= steps; step += 1) {
      await page.getByRole("button", { name: `Ga naar stap ${step}` }).click();
      const overflow = await page.getByTestId("caption").evaluate((element) => {
        const box = element.parentElement as HTMLElement;
        return box.scrollHeight - box.clientHeight;
      });
      expect(overflow, `${href} stap ${step}`).toBeLessThanOrEqual(1);
    }
  }
});
