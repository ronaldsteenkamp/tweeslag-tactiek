import { expect, test } from "@playwright/test";
import { dragTokenToMeters } from "./helpers";

test("op een lage telefoon is een token 22 px naast het midden te pakken", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("./#/les/verdedigen-met-blok/quiz");
  const token = page.getByTestId("token-A2");
  const before = await token.getAttribute("transform");
  const box = await token.locator("circle").first().boundingBox();
  if (!box) throw new Error("Token is niet zichtbaar");
  const x = box.x + box.width / 2 + 21;
  const y = box.y + box.height / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 10, y + 30, { steps: 4 });
  await page.mouse.up();
  expect(await token.getAttribute("transform")).not.toBe(before);
});

test("een meerkeuzevraag goed en fout beantwoorden", async ({ page }) => {
  await page.goto("./#/les/veld-en-basis/quiz");

  await page.getByRole("button", { name: "18 × 9 meter" }).click();
  await expect(page.getByTestId("feedback")).toContainText("Niet juist");
  await expect(page.getByTestId("feedback")).toContainText("16 × 8 meter");

  await page.getByRole("button", { name: "Probeer opnieuw" }).click();
  await page.getByRole("button", { name: "16 × 8 meter" }).click();
  await expect(page.getByTestId("feedback")).toContainText("Juist");
});

test("een sleepvraag goed en fout beantwoorden", async ({ page }) => {
  await page.goto("./#/les/veld-en-basis/quiz");
  await page.getByRole("button", { name: "16 × 8 meter" }).click();
  await page.getByRole("button", { name: "Volgende vraag" }).click();

  await dragTokenToMeters(page, "A1", 5, 4);
  await page.getByRole("button", { name: "Controleer" }).click();
  await expect(page.getByTestId("feedback")).toContainText("Niet juist");

  await page.getByRole("button", { name: "Probeer opnieuw" }).click();
  await dragTokenToMeters(page, "A1", -1.5, 4);
  await page.getByRole("button", { name: "Controleer" }).click();
  await expect(page.getByTestId("feedback")).toContainText("Juist");
});

test("de voortgang blijft bewaard na herladen", async ({ page }) => {
  await page.goto("./#/les/veld-en-basis/quiz");
  await page.getByRole("button", { name: "16 × 8 meter" }).click();
  await page.getByRole("button", { name: "Volgende vraag" }).click();
  await dragTokenToMeters(page, "A1", -1.5, 4);
  await page.getByRole("button", { name: "Controleer" }).click();
  await page.getByRole("button", { name: "Volgende vraag" }).click();
  await page.getByRole("button", { name: "Dezelfde speler" }).click();
  await page.getByRole("button", { name: "Probeer opnieuw" }).click();
  await page.getByRole("button", { name: /niet serveerde/ }).click();
  await page.getByRole("button", { name: "Bekijk je score" }).click();
  await expect(page.getByTestId("quiz-score")).toContainText("2 van de 3");

  await page.getByRole("link", { name: "Terug naar de lessen" }).click();
  await expect(page.getByTestId("lessons-summary")).toHaveText(
    /^1 van \d+ lessen afgerond$/,
  );

  await page.reload();
  await expect(page.getByTestId("lessons-summary")).toHaveText(
    /^1 van \d+ lessen afgerond$/,
  );
  await expect(page.getByText("Afgerond 2/3")).toBeVisible();
});

test("een begonnen les staat als bezig in het overzicht", async ({ page }) => {
  await page.goto("./#/les/opbouw");
  await page.getByRole("button", { name: "Volgende" }).click();
  await page.getByRole("link", { name: "Lessen", exact: true }).click();
  await expect(page.getByText("Bezig")).toBeVisible();
});

test("de app werkt als opslag is geblokkeerd", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Opslag geblokkeerd");
      },
    });
  });
  await page.goto("./#/les/opbouw");
  await page.getByRole("button", { name: "Volgende" }).click();
  await expect(page.getByTestId("step-label")).toHaveText("Stap 2 van 6");
});

test("de regelpagina toont regels met bron", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("link", { name: "Regels", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Spelregels" })).toBeVisible();
  await expect(page.getByText(/2,43 m/)).toBeVisible();
  await expect(page.getByText(/2,35 m/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: /FIVB Official Beach/ }),
  ).toBeVisible();
});

test("een eigen signaal uit de instellingen staat in de les", async ({
  page,
}) => {
  await page.goto("./#/les/bloksignalen/quiz");
  await expect(page.getByText("twee vingers")).toBeVisible();
});
