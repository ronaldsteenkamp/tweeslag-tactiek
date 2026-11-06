import { expect, test, type Page } from "@playwright/test";

const KEY_V1 = "tweeslag-tactiek.voortgang.v1";
const KEY_V2 = "tweeslag-tactiek.voortgang.v2";

const oldProgress = {
  "veld-en-basis": { maxStep: 6, score: 2, total: 3 },
  opbouw: { maxStep: 2 },
};

/** Zet voortgang klaar zoals de vorige versie van de app die opsloeg. */
async function seedV1(page: Page) {
  await page.addInitScript(
    ([key, value]) => {
      if (key && value && !localStorage.getItem(key)) {
        localStorage.setItem(key, value);
      }
    },
    [KEY_V1, JSON.stringify(oldProgress)],
  );
}

test("het overzicht toont de lessen per niveau", async ({ page }) => {
  await page.goto("./");
  for (const name of ["Basis", "Gevorderd", "Expert"]) {
    await expect(
      page.getByRole("heading", { name, level: 2, exact: true }),
    ).toBeVisible();
  }
  const basis = page.getByTestId("niveau-basis");
  await expect(basis.getByRole("link")).toHaveCount(7);
  await expect(basis.getByText("Nieuw")).toHaveCount(7);
  await expect(basis.getByText("0 van 7 afgerond")).toBeVisible();
  await expect(
    page.getByTestId("niveau-gevorderd").getByText(/Rond eerst de lessen/),
  ).toBeVisible();
});

test("oude voortgang klopt na de update", async ({ page }) => {
  await seedV1(page);
  await page.goto("./");

  const basis = page.getByTestId("niveau-basis");
  await expect(basis.getByText("Afgerond 2/3")).toBeVisible();
  await expect(basis.getByText("Bezig")).toBeVisible();
  await expect(basis.getByText("Nieuw")).toHaveCount(5);
  await expect(page.getByTestId("lessons-summary")).toHaveText(
    /^1 van \d+ lessen afgerond$/,
  );

  const stored = await page.evaluate(
    ([v1, v2]) => [
      localStorage.getItem(v1 ?? ""),
      JSON.parse(localStorage.getItem(v2 ?? "") ?? "null"),
    ],
    [KEY_V1, KEY_V2],
  );
  expect(stored[0]).toBe(JSON.stringify(oldProgress));
  expect(stored[1]).toEqual({
    version: 2,
    lessons: oldProgress,
    alleOntgrendeld: false,
    toetsen: {},
  });
});

test("een bestaande les werkt na de migratie door", async ({ page }) => {
  await seedV1(page);
  await page.goto("./#/les/opbouw");
  await page.getByRole("button", { name: "Volgende" }).click();
  await page.getByRole("link", { name: "Lessen", exact: true }).click();
  await expect(page.getByText("Bezig")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Bezig")).toBeVisible();
  await expect(page.getByText("Afgerond 2/3")).toBeVisible();
});

test("Alles ontgrendelen blijft bewaard en kan weer uit", async ({ page }) => {
  await page.goto("./");
  const toggle = page.getByRole("checkbox", { name: /Alles ontgrendelen/ });
  const note = page
    .getByTestId("niveau-gevorderd")
    .getByText(/Rond eerst de lessen/);

  await expect(toggle).not.toBeChecked();
  await toggle.check();
  await expect(note).toBeHidden();

  await page.reload();
  await expect(toggle).toBeChecked();
  await expect(note).toBeHidden();

  await toggle.uncheck();
  await expect(note).toBeVisible();
});

test("de leerdoelen staan bij de les", async ({ page }) => {
  await page.goto("./#/les/peel");
  await page.getByRole("button", { name: "Doelen" }).click();
  const dialog = page.getByRole("dialog", { name: "Leerdoelen" });
  await expect(dialog.getByRole("listitem")).toHaveCount(2);
  await expect(dialog).toContainText("Duurt ongeveer 3 minuten");
  await dialog.getByRole("button", { name: "Sluiten" }).click();
  await expect(dialog).toBeHidden();
});
