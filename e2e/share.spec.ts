import { expect, test, type Page } from "@playwright/test";

const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });

async function buildAndShare(page: Page) {
  await page.goto("./#/bord");
  const caption = page.getByPlaceholder("Uitleg bij deze stap");
  await caption.fill("Stap een");
  await button(page, "+ Stap").click();
  await caption.fill("Stap twee");
  await button(page, "+ Stap").click();
  await caption.fill("Stap drie");
  await button(page, "Delen").click();
  await page.getByLabel("Naam van het scenario").fill("Blok lijn");
  return page.getByTestId("share-url").inputValue();
}

test("een scenario bouwen, delen en de link openen", async ({
  page,
  context,
}) => {
  const url = await buildAndShare(page);
  await expect(page.getByTestId("qr-code")).toBeVisible();
  expect(url).toContain("#/s/");

  const other = await context.newPage();
  await other.goto(url);
  await expect(other.getByText("Gedeeld scenario: Blok lijn")).toBeVisible();
  await expect(other.getByTestId("step-label")).toHaveText("Stap 1 van 3");
  await expect(other.getByTestId("caption")).toHaveText("Stap een");
  await button(other, "Volgende").click();
  await expect(other.getByTestId("caption")).toHaveText("Stap twee");
});

test("kopiëren geeft een bevestiging", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const url = await buildAndShare(page);
  await button(page, "Kopieer link").click();
  await expect(page.getByText("Link gekopieerd")).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(url);
});

test("een gedeeld scenario opslaan en op het bord openen", async ({ page }) => {
  const url = await buildAndShare(page);
  await page.goto(url);
  await page.reload();
  await button(page, "Opslaan als eigen scenario").click();
  await expect(button(page, "Opgeslagen")).toBeDisabled();

  await button(page, "Op het bord openen").click();
  await expect(page.getByTestId("court")).toBeVisible();
  await expect(button(page, "Stap 3")).toBeVisible();

  await button(page, "Menu").click();
  await button(page, "Mijn scenario's").click();
  await expect(page.getByText("Blok lijn")).toBeVisible();
});

test("een beschadigde link geeft een nette melding", async ({ page }) => {
  await page.goto("./#/s/dit-is-kapot");
  await expect(
    page.getByRole("heading", { name: "Deze link werkt niet" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("beschadigd");
  await page.getByRole("link", { name: "Terug naar de lessen" }).click();
  await expect(page.getByRole("heading", { name: "Lessen" })).toBeVisible();
});

test("een te lange link geeft een nette melding", async ({ page }) => {
  await page.goto(`./#/s/${"a".repeat(9000)}`);
  await expect(page.getByRole("alert")).toContainText("te lang");
});

test("een les is te delen", async ({ page, context }) => {
  await page.goto("./#/les/opbouw");
  await button(page, "Delen").click();
  const url = await page.getByTestId("share-url").inputValue();

  const other = await context.newPage();
  await other.goto(url);
  await expect(
    other.getByText("Gedeeld scenario: De opbouw: pass, set, aanval"),
  ).toBeVisible();
});

test("de QR-code laadt ook offline", async ({ page, context }) => {
  await page.goto("./#/bord");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await button(page, "Delen").click();
  await expect(page.getByTestId("qr-code")).toBeVisible();
  await context.setOffline(false);
});
