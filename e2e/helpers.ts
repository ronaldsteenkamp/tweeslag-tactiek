import { expect, type Page } from "@playwright/test";

/** Reken meters om met dezelfde matrix als de app gebruikt. */
export async function metersToScreen(
  page: Page,
  testId: string,
  x: number,
  y: number,
) {
  return page.getByTestId(testId).evaluate(
    (svg: SVGSVGElement, meters) => {
      const landscape = svg.viewBox.baseVal.width > svg.viewBox.baseVal.height;
      const sx = landscape ? (meters.x + 3) * 100 : (meters.y + 3) * 100;
      const sy = landscape ? (meters.y + 3) * 100 : (19 - meters.x) * 100;
      const matrix = svg.getScreenCTM();
      if (!matrix) throw new Error("Geen schermmatrix");
      const point = new DOMPoint(sx, sy).matrixTransform(matrix);
      return { x: point.x, y: point.y };
    },
    { x, y },
  );
}

/** Sleept een speler langs de gegeven punten in meters. */
export async function dragTokenAlong(
  page: Page,
  id: string,
  points: [number, number][],
) {
  const token = page.getByTestId(`token-${id}`);
  const box = await token.locator("circle").first().boundingBox();
  if (!box) throw new Error("Token is niet zichtbaar");

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (const [x, y] of points) {
    const target = await metersToScreen(page, "quiz-court", x, y);
    await page.mouse.move(target.x, target.y, { steps: 8 });
  }
  await page.mouse.up();
}

export async function dragTokenToMeters(
  page: Page,
  id: string,
  x: number,
  y: number,
) {
  await dragTokenAlong(page, id, [[x, y]]);
}

/** Beantwoordt een aantal vragen willekeurig om bij de volgende vraag te komen. */
export async function skipQuestions(page: Page, count: number) {
  for (let done = 0; done < count; done++) {
    const check = page.getByRole("button", { name: "Controleer" });
    const option = page.getByTestId("option").first();
    await expect(check.or(option).first()).toBeVisible();
    if (await check.isVisible()) {
      // Een routevraag wil eerst een route.
      if (await check.isDisabled()) {
        await page.locator("[data-entity]").first().focus();
        await page.keyboard.press("ArrowLeft");
      }
      await check.click();
    } else {
      await option.click();
    }
    await page
      .getByRole("button", { name: /Volgende vraag|Bekijk je score/ })
      .click();
  }
}

/** Start een quiz op expertniveau zonder tijdslimiet. */
export async function startUntimed(page: Page) {
  await page.getByRole("button", { name: "Start zonder tijdslimiet" }).click();
}

/** Zet de stappen van een volgordevraag goed met de knoppen omhoog. */
export async function solveOrder(page: Page, items: string[]) {
  for (const [place, item] of items.entries()) {
    const list = page.getByRole("listitem");
    const current = (await list.allTextContents()).findIndex((text) =>
      text.startsWith(item),
    );
    for (let index = current; index > place; index--) {
      await page.getByRole("button", { name: `${item} omhoog` }).click();
    }
  }
}
