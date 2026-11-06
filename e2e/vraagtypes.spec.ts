import { expect, test, type Page } from "@playwright/test";
import {
  dragTokenAlong,
  dragTokenToMeters,
  metersToScreen,
  skipQuestions,
  solveOrder,
} from "./helpers";

const PLACE_BOTH = 3;
const SPOT_ERROR = 4;
const ORDER = 5;
const FREEZE = 2;
const ROUTE = 3;

const check = (page: Page) =>
  page.getByRole("button", { name: "Controleer" }).click();
const retry = (page: Page) =>
  page.getByRole("button", { name: "Probeer opnieuw" }).click();
const feedback = (page: Page) => page.getByTestId("feedback");

async function openQuestion(page: Page, lesson: string, skip: number) {
  await page.goto(`./#/les/${lesson}/quiz`);
  await skipQuestions(page, skip);
}

const rallyOrder = [
  "A1 geeft achter de rug het bloksignaal",
  "A2 serveert",
  "B1 krijgt de set bij het net",
  "A1 blokt de lijn en A2 gaat naar de diagonaal",
  "B1 slaat om het blok heen de diagonaal in",
];

test("beide spelers plaatsen: fout en goed", async ({ page }) => {
  await openQuestion(page, "verdedigen-met-blok", PLACE_BOTH);

  await dragTokenToMeters(page, "A1", 7.4, 1.2);
  await check(page);
  await expect(feedback(page)).toContainText("Niet juist");
  await expect(feedback(page)).toContainText("Nog niet goed: A2.");

  await retry(page);
  await dragTokenToMeters(page, "A1", 7.4, 1.2);
  await dragTokenToMeters(page, "A2", 3, 5.5);
  await check(page);
  await expect(feedback(page)).toContainText("Juist");
});

test("fout zoeken: fout en goed, met tikken op het veld", async ({ page }) => {
  await openQuestion(page, "verdedigen-met-blok", SPOT_ERROR);

  await page.getByRole("button", { name: "A1", exact: true }).click();
  await expect(feedback(page)).toContainText("Niet juist");

  await retry(page);
  const spot = await metersToScreen(page, "scene", 3, 1.6);
  await page.mouse.click(spot.x, spot.y);
  await expect(feedback(page)).toContainText("Juist");
  await expect(feedback(page)).toContainText("achter het blok");
});

test("volgorde: fout en goed", async ({ page }) => {
  await openQuestion(page, "verdedigen-met-blok", ORDER);

  await check(page);
  await expect(feedback(page)).toContainText("Niet juist");

  await retry(page);
  await solveOrder(page, rallyOrder);
  await check(page);
  await expect(feedback(page)).toContainText("Juist");
});

test("freeze frame: stopt op de set, fout en goed", async ({ page }) => {
  await openQuestion(page, "peel", FREEZE);

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

  await page.getByRole("button", { name: "Springen voor het blok" }).click();
  await expect(feedback(page)).toContainText("Niet juist");

  await retry(page);
  await page
    .getByRole("button", { name: "Terugtrekken als tweede verdediger" })
    .click();
  await expect(feedback(page)).toContainText("Juist");
});

test("looplijn: verkeerd eindpunt, omweg, net en goed", async ({ page }) => {
  await openQuestion(page, "peel", ROUTE);
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
    [4, 1.5],
  ]);
  await check(page);
  await expect(feedback(page)).toContainText("onnodige omweg");

  await retry(page);
  await dragTokenAlong(page, "A1", [
    [10, 1.5],
    [4, 1.5],
  ]);
  await check(page);
  await expect(feedback(page)).toContainText("andere kant van het net");

  await retry(page);
  await dragTokenToMeters(page, "A1", 4.5, 1.5);
  await check(page);
  await expect(feedback(page)).toContainText("Juist");
});

test.describe("met het toetsenbord", () => {
  test.skip(({ isMobile }) => isMobile, "Alleen op desktop");

  async function pressMany(page: Page, key: string, count: number) {
    for (let index = 0; index < count; index++) await page.keyboard.press(key);
  }

  test("beide spelers plaatsen", async ({ page }) => {
    await openQuestion(page, "verdedigen-met-blok", PLACE_BOTH);
    await page.getByTestId("token-A1").focus();
    await pressMany(page, "ArrowRight", 5);
    await pressMany(page, "ArrowUp", 3);
    await page.keyboard.press("Tab");
    await pressMany(page, "ArrowLeft", 7);
    await pressMany(page, "ArrowDown", 6);
    await page.getByRole("button", { name: "Controleer" }).focus();
    await page.keyboard.press("Enter");
    await expect(feedback(page)).toContainText("Juist");
  });

  test("een looplijn tekenen", async ({ page }) => {
    await openQuestion(page, "peel", ROUTE);
    await page.getByTestId("token-A1").focus();
    await pressMany(page, "ArrowLeft", 6);
    await page.getByRole("button", { name: "Controleer" }).focus();
    await page.keyboard.press("Enter");
    await expect(feedback(page)).toContainText("Juist");
  });

  test("fout zoeken en volgorde", async ({ page }) => {
    await openQuestion(page, "verdedigen-met-blok", SPOT_ERROR);
    await page.getByRole("button", { name: "A2", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(feedback(page)).toContainText("Juist");
    await page.getByRole("button", { name: "Volgende vraag" }).focus();
    await page.keyboard.press("Enter");

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
  await openQuestion(page, "peel", FREEZE);
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
  await openQuestion(page, "verdedigen-met-blok", PLACE_BOTH);
  await expect(page.getByTestId("token-A2")).toBeInViewport();
  await check(page);
  await expect(
    page.getByRole("button", { name: "Volgende vraag" }),
  ).toBeInViewport();
  await page.getByRole("button", { name: "Volgende vraag" }).click();

  await page.getByRole("button", { name: "A2", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Volgende vraag" }),
  ).toBeInViewport();
  await page.getByRole("button", { name: "Volgende vraag" }).click();

  await expect(page.getByRole("button", { name: "Controleer" })).toBeVisible();
  await check(page);
  await expect(feedback(page)).toBeInViewport();

  await openQuestion(page, "peel", FREEZE);
  await page
    .getByRole("button", { name: "Terugtrekken als tweede verdediger" })
    .click();
  await expect(
    page.getByRole("button", { name: "Volgende vraag" }),
  ).toBeInViewport();
});
