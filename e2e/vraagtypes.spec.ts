import { expect, test, type Page } from "@playwright/test";
import {
  dragTokenAlong,
  dragTokenToMeters,
  metersToScreen,
  skipQuestions,
  solveOrder,
  startUntimed,
  unlockAll,
} from "./helpers";

const check = (page: Page) =>
  page.getByRole("button", { name: "Controleer" }).click();
const retry = (page: Page) =>
  page.getByRole("button", { name: "Probeer opnieuw" }).click();
const feedback = (page: Page) => page.getByTestId("feedback");

/** Waar elk vraagtype in de lessen staat. */
const PLACE_BOTH = { lesson: "verdedigen-met-blok", skip: 0 };
const SPOT_ERROR = { lesson: "blokvarianten", skip: 3, expert: true };
const ORDER = { lesson: "veld-en-basis", skip: 0 };
const FREEZE = { lesson: "peel", skip: 0 };
const ROUTE = { lesson: "transitie", skip: 1, locked: true };

interface Where {
  lesson: string;
  skip: number;
  expert?: boolean;
  locked?: boolean;
}

async function openQuestion(page: Page, where: Where) {
  if (where.expert || where.locked) await unlockAll(page);
  await page.goto(`./#/les/${where.lesson}/quiz`);
  if (where.expert) await startUntimed(page);
  await skipQuestions(page, where.skip);
}

const serveOrder = ["B1", "A2", "B2", "A1"];

test("beide spelers plaatsen: fout en goed", async ({ page }) => {
  await openQuestion(page, PLACE_BOTH);

  await dragTokenToMeters(page, "A1", 7.4, 6.2);
  await check(page);
  await expect(feedback(page)).toContainText("Niet juist");
  await expect(feedback(page)).toContainText("Nog niet goed: A2.");

  await retry(page);
  await dragTokenToMeters(page, "A1", 7.4, 6.2);
  await dragTokenToMeters(page, "A2", 3, 6.6);
  await check(page);
  await expect(feedback(page)).toContainText("Juist");
});

test("fout zoeken: fout en goed, met tikken op het veld", async ({ page }) => {
  await openQuestion(page, SPOT_ERROR);

  await page.getByRole("button", { name: "A1", exact: true }).click();
  await expect(feedback(page)).toContainText("Niet juist");

  await retry(page);
  const spot = await metersToScreen(page, "scene", 3, 5.5);
  await page.mouse.click(spot.x, spot.y);
  await expect(feedback(page)).toContainText("Juist");
  await expect(feedback(page)).toContainText("vroeg in de lijn");
});

test("volgorde: fout en goed", async ({ page }) => {
  await openQuestion(page, ORDER);

  await check(page);
  await expect(feedback(page)).toContainText("Niet juist");

  await retry(page);
  await solveOrder(page, serveOrder);
  await check(page);
  await expect(feedback(page)).toContainText("Juist");
});

test("freeze frame: stopt op de set, fout en goed", async ({ page }) => {
  await openQuestion(page, FREEZE);

  // De animatie moet echt lopen en dan stilvallen.
  const ball = page.getByTestId("scene-ball");
  const first = await ball.getAttribute("transform");
  await expect(ball).not.toHaveAttribute("transform", first ?? "", {
    timeout: 3000,
  });
  await page.waitForTimeout(1800);
  const stopped = await ball.getAttribute("transform");
  await page.waitForTimeout(400);
  expect(await ball.getAttribute("transform")).toBe(stopped);

  await page
    .getByRole("button", { name: /^Toch springen en de lijn afsluiten/ })
    .click();
  await expect(feedback(page)).toContainText("Niet juist");

  await retry(page);
  await page
    .getByRole("button", { name: "Peelen en roepen dat er geen blok komt" })
    .click();
  await expect(feedback(page)).toContainText("Juist");
});

test("looplijn: verkeerd eindpunt, omweg, net en goed", async ({ page }) => {
  await openQuestion(page, ROUTE);
  const button = page.getByRole("button", { name: "Controleer" });
  await expect(button).toBeDisabled();

  await dragTokenToMeters(page, "A1", 7, 6);
  await expect(page.getByTestId("quiz-trail")).toBeVisible();
  await check(page);
  await expect(feedback(page)).toContainText("eindigt niet op de goede plek");

  await retry(page);
  await dragTokenAlong(page, "A1", [
    [7, 7],
    [1, 7],
    [3, 3],
  ]);
  await check(page);
  await expect(feedback(page)).toContainText("onnodige omweg");

  await retry(page);
  await dragTokenAlong(page, "A1", [
    [10, 2],
    [3, 3],
  ]);
  await check(page);
  await expect(feedback(page)).toContainText("andere kant van het net");

  await retry(page);
  await dragTokenToMeters(page, "A1", 3, 3);
  await check(page);
  await expect(feedback(page)).toContainText("Juist");
});

test.describe("met het toetsenbord", () => {
  test.skip(({ isMobile }) => isMobile, "Alleen op desktop");

  async function pressMany(page: Page, key: string, count: number) {
    for (let index = 0; index < count; index++) await page.keyboard.press(key);
  }

  test("beide spelers plaatsen", async ({ page }) => {
    await openQuestion(page, PLACE_BOTH);
    await page.getByTestId("token-A1").focus();
    await pressMany(page, "ArrowDown", 10);
    await page.keyboard.press("Tab");
    await pressMany(page, "ArrowDown", 5);
    await page.getByRole("button", { name: "Controleer" }).focus();
    await page.keyboard.press("Enter");
    await expect(feedback(page)).toContainText("Juist");
  });

  test("een looplijn tekenen", async ({ page }) => {
    await openQuestion(page, ROUTE);
    await page.getByTestId("token-A1").focus();
    await pressMany(page, "ArrowLeft", 7);
    await page.getByRole("button", { name: "Controleer" }).focus();
    await page.keyboard.press("Enter");
    await expect(feedback(page)).toContainText("Juist");
  });

  test("fout zoeken", async ({ page }) => {
    await openQuestion(page, SPOT_ERROR);
    await page.getByRole("button", { name: "A2", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(feedback(page)).toContainText("Juist");
  });

  test("volgorde", async ({ page }) => {
    await openQuestion(page, ORDER);
    const up = page.getByRole("button", { name: /omhoog$/ }).nth(1);
    await up.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status")).toContainText("op plek 1");
    // De focus blijft op het verplaatste item staan.
    await expect(page.locator(":focus")).toHaveAccessibleName(/omhoog$/);
  });
});

test("zonder beweging staat een freeze frame meteen op het eindbeeld", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openQuestion(page, FREEZE);
  const ball = page.getByTestId("scene-ball");
  const end = await ball.getAttribute("transform");
  await page.waitForTimeout(500);
  expect(await ball.getAttribute("transform")).toBe(end);

  await page.getByRole("button", { name: "Bekijk opnieuw" }).click();
  await expect(ball).not.toHaveAttribute("transform", end ?? "");
  await expect(ball).toHaveAttribute("transform", end ?? "", { timeout: 4000 });
});

test("alle types passen op een lage telefoon", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  const next = page.getByRole("button", {
    name: /Volgende vraag|Bekijk je score/,
  });

  await openQuestion(page, PLACE_BOTH);
  await expect(page.getByTestId("token-A2")).toBeInViewport();
  await check(page);
  await expect(next).toBeInViewport();

  await openQuestion(page, SPOT_ERROR);
  await page.getByRole("button", { name: "A2", exact: true }).click();
  await expect(next).toBeInViewport();

  await openQuestion(page, ORDER);
  await expect(page.getByRole("button", { name: "Controleer" })).toBeVisible();
  await check(page);
  await expect(feedback(page)).toBeInViewport();

  await openQuestion(page, FREEZE);
  await page
    .getByRole("button", { name: "Peelen en roepen dat er geen blok komt" })
    .click();
  await expect(next).toBeInViewport();
});
