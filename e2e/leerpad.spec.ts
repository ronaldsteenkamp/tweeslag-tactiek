import { expect, test, type Page } from "@playwright/test";
import { skipQuestions } from "./helpers";

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

const allBasis = Object.fromEntries(
  [
    "veld-en-basis",
    "pass-ontvangst",
    "opbouw",
    "bloksignalen",
    "verdedigen-met-blok",
    "peel",
    "shots",
  ].map((id) => [id, { maxStep: 4, score: 2, total: 3 }]),
);

async function seedV2(page: Page, lessons: object, alleOntgrendeld = false) {
  await page.addInitScript(
    ([key, value]) => {
      if (key && value && !localStorage.getItem(key)) {
        localStorage.setItem(key, value);
      }
    },
    [
      KEY_V2,
      JSON.stringify({ version: 2, lessons, alleOntgrendeld, toetsen: {} }),
    ],
  );
}

test("een directe link naar een vergrendelde les toont wat er nog moet", async ({
  page,
}) => {
  await page.goto("./#/les/opslagtactiek");
  const locked = page.getByTestId("lesson-locked");
  await expect(locked).toContainText("zit nog op slot");
  await expect(locked.getByRole("link", { name: "Shots" })).toBeVisible();

  await locked.getByRole("button", { name: "Alles ontgrendelen" }).click();
  await expect(page.getByTestId("step-label")).toHaveText(/^Stap 1 van/);
});

test("na alle basislessen gaat gevorderd open, vereisten blijven gelden", async ({
  page,
}) => {
  await seedV2(page, allBasis);
  await page.goto("./");
  const gevorderd = page.getByTestId("niveau-gevorderd");
  await expect(gevorderd.getByText(/Rond eerst de lessen/)).toBeHidden();
  await expect(
    gevorderd.getByRole("link", { name: /Opslagtactiek/ }),
  ).not.toContainText("Op slot");
  await expect(
    gevorderd.getByRole("link", { name: /Van verdediging naar aanval/ }),
  ).toContainText("Op slot");

  await page.goto("./#/les/transitie");
  await expect(page.getByTestId("lesson-locked")).toContainText(
    "bouwt voort op andere lessen",
  );
});

test("een gevorderde les doorlopen tot en met de quiz", async ({ page }) => {
  await seedV2(page, allBasis);
  await page.goto("./#/les/opslagtactiek");
  for (let step = 1; step < 7; step += 1) {
    await page.getByRole("button", { name: "Volgende", exact: true }).click();
  }
  await page.getByRole("link", { name: "Start de quiz" }).click();
  await skipQuestions(page, 4);
  await expect(page.getByTestId("quiz-score")).toBeVisible();
  await page.getByRole("link", { name: "Terug naar de lessen" }).click();
  await expect(
    page
      .getByTestId("niveau-gevorderd")
      .getByRole("link", { name: /Opslagtactiek/ }),
  ).toContainText("Afgerond");
});

test("de varianten van een les zijn te kiezen", async ({ page }) => {
  await seedV2(page, {}, true);
  await page.goto("./#/les/blokken-of-peelen");
  const label = page.getByTestId("step-label");
  await expect(label).toHaveText("Stap 1 van 6");
  await page.getByRole("button", { name: "Slechte set" }).click();
  await expect(label).toHaveText("Stap 1 van 3");
  await expect(page.getByTestId("caption")).toContainText("ver van het net");
  await page.getByRole("button", { name: "Uitleg", exact: true }).click();
  await expect(label).toHaveText("Stap 1 van 6");
});

test("een niveautoets afronden, met links naar de lessen", async ({ page }) => {
  await seedV2(page, allBasis);
  await page.goto("./");
  await page.getByTestId("exam-basis").click();
  await expect(page.getByText("14 gemengde vragen")).toBeVisible();
  await page.getByRole("button", { name: "Start de toets" }).click();
  await skipQuestions(page, 14);

  const result = page.getByTestId("exam-result");
  await expect(page.getByTestId("exam-score")).toHaveText(
    /^Je score: \d+ van de 14 vragen goed\.$/,
  );
  const scoreText = await page.getByTestId("exam-score").textContent();
  const score = Number(scoreText?.match(/\d+/)?.[0]);
  await expect(result.getByRole("link", { name: /^Naar les:/ })).toHaveCount(
    14 - score,
  );
  await result.getByRole("link", { name: "Terug naar de lessen" }).click();
  await expect(page.getByTestId("exam-basis")).toContainText(
    `Beste score ${score}/14`,
  );
});

test("een gesloten niveautoets legt uit wat er moet", async ({ page }) => {
  await page.goto("./#/toets/gevorderd");
  await expect(page.getByTestId("exam-locked")).toContainText(
    "Rond eerst alle lessen",
  );
});

test("de niveautoets gevorderd werkt", async ({ page }) => {
  await seedV2(page, {}, true);
  await page.goto("./#/toets/gevorderd");
  await page.getByRole("button", { name: "Start de toets" }).click();
  await skipQuestions(page, 12);
  await expect(page.getByTestId("exam-score")).toHaveText(/van de 12 vragen/);
});
