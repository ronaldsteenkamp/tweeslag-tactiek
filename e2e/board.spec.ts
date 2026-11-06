import { expect, test, type Locator, type Page } from "@playwright/test";

async function center(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Element is niet zichtbaar");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function drag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await page.mouse.up();
}

async function dragToken(page: Page, id: string, dx: number, dy: number) {
  const start = await center(page.getByTestId(`token-${id}`));
  await drag(page, start, { x: start.x + dx, y: start.y + dy });
}

/** Een punt op het veld, als fractie van de breedte en hoogte. */
async function fieldPoint(page: Page, fx: number, fy: number) {
  const box = await page.getByTestId("court").boundingBox();
  if (!box) throw new Error("Veld is niet zichtbaar");
  return { x: box.x + box.width * fx, y: box.y + box.height * fy };
}

const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });

test.beforeEach(async ({ page }) => {
  await page.goto("./#/bord");
  await expect(page.getByTestId("court")).toBeVisible();
});

test("toont vier spelers en een bal", async ({ page }) => {
  for (const id of ["A1", "A2", "B1", "B2", "ball"]) {
    await expect(page.getByTestId(`token-${id}`)).toBeVisible();
  }
});

test("een speler is te verslepen en terug te halen met undo", async ({
  page,
}) => {
  const token = page.getByTestId("token-B1");
  const before = await center(token);

  await dragToken(page, "B1", -40, 30);
  const after = await center(token);
  expect(Math.abs(after.x - (before.x - 40))).toBeLessThan(4);
  expect(Math.abs(after.y - (before.y + 30))).toBeLessThan(4);

  await button(page, "Terug").click();
  expect(Math.abs((await center(token)).x - before.x)).toBeLessThan(1);
  await button(page, "Herhaal").click();
  expect(Math.abs((await center(token)).x - after.x)).toBeLessThan(1);
});

test("undo en redo werken met sneltoetsen", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobiel", "Alleen desktop");
  const token = page.getByTestId("token-B1");
  const before = await token.getAttribute("transform");
  await dragToken(page, "B1", 50, 0);
  const after = await token.getAttribute("transform");

  await page.keyboard.press("Control+z");
  expect(await token.getAttribute("transform")).toBe(before);
  await page.keyboard.press("Control+Shift+z");
  expect(await token.getAttribute("transform")).toBe(after);
});

test("een speler is met de pijltjestoetsen te verplaatsen", async ({
  page,
}) => {
  const token = page.getByTestId("token-A2");
  const before = await token.getAttribute("aria-label");
  await token.focus();
  await page.keyboard.press("ArrowLeft");
  expect(await token.getAttribute("aria-label")).not.toBe(before);
});

test("slepen werkt met een vinger", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobiel", "Alleen mobiel");

  const token = page.getByTestId("token-A2");
  const start = await center(token);
  const client = await page.context().newCDPSession(page);
  const touch = (
    type: "touchStart" | "touchMove" | "touchEnd",
    x: number,
    y: number,
  ) =>
    client.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" ? [] : [{ x, y }],
    });

  await touch("touchStart", start.x, start.y);
  for (let step = 1; step <= 8; step += 1) {
    await touch("touchMove", start.x + step * 5, start.y - step * 5);
  }
  await touch("touchEnd", 0, 0);

  const end = await center(token);
  expect(Math.abs(end.x - (start.x + 40))).toBeLessThan(4);
  expect(Math.abs(end.y - (start.y - 40))).toBeLessThan(4);
});

test("een lijn tekenen, selecteren en verwijderen", async ({ page }) => {
  await button(page, "Loop").click();
  await drag(
    page,
    await fieldPoint(page, 0.35, 0.35),
    await fieldPoint(page, 0.6, 0.6),
  );
  const line = page.locator("[data-overlay]");
  await expect(line).toHaveCount(1);

  await button(page, "Selecteer").click();
  await page.mouse.click(
    ...(Object.values(await fieldPoint(page, 0.475, 0.475)) as [
      number,
      number,
    ]),
  );
  await expect(line).toHaveAttribute("data-selected", "true");

  await button(page, "Verwijderen").click();
  await expect(line).toHaveCount(0);
  await button(page, "Terug").click();
  await expect(line).toHaveCount(1);
});

test("het veld verspringt niet als je iets selecteert", async ({ page }) => {
  const before = await page.getByTestId("court").boundingBox();
  await button(page, "Zone").click();
  await drag(
    page,
    await fieldPoint(page, 0.3, 0.3),
    await fieldPoint(page, 0.45, 0.45),
  );
  await expect(button(page, "Groen")).toBeVisible();
  expect(await page.getByTestId("court").boundingBox()).toEqual(before);
});

test("spelers hebben geen ring zolang ze geen focus hebben", async ({
  page,
}) => {
  const stroke = await page
    .getByTestId("token-B1")
    .locator("circle")
    .nth(1)
    .evaluate((circle) => getComputedStyle(circle).stroke);
  expect(stroke).toBe("none");
});

test("een zone tekenen en de soort kiezen", async ({ page }) => {
  await button(page, "Zone").click();
  await drag(
    page,
    await fieldPoint(page, 0.3, 0.3),
    await fieldPoint(page, 0.45, 0.45),
  );
  await expect(page.locator("[data-overlay] polygon")).toHaveCount(1);
  await button(page, "Groen").click();
  await page.getByPlaceholder("Naam van de zone").fill("Open");
  await expect(page.locator("[data-overlay] text")).toHaveText("Open");
});

test("stappen toevoegen, dupliceren, herordenen en verwijderen", async ({
  page,
}) => {
  const caption = page.getByPlaceholder("Uitleg bij deze stap");
  await caption.fill("Eerste");
  await button(page, "+ Stap").click();
  await expect(caption).toHaveValue("");
  await caption.fill("Tweede");

  await button(page, "Stap…").click();
  await button(page, "Eerder").click();
  await button(page, "Sluiten").click();
  await expect(caption).toHaveValue("Tweede");
  await button(page, "Stap 2").click();
  await expect(caption).toHaveValue("Eerste");

  await button(page, "Stap…").click();
  await button(page, "Stap dupliceren").click();
  await expect(button(page, "Stap 3")).toBeVisible();

  await button(page, "Stap…").click();
  await button(page, "Stap verwijderen").click();
  await expect(button(page, "Stap 3")).toBeHidden();
});

test("varianten bewaren hun eigen stand", async ({ page }) => {
  await button(page, "Menu").click();
  await button(page, "Variant toevoegen").click();
  await page.getByLabel("Naam van de variant").fill("Blok hoek");
  await button(page, "Sluiten").click();

  const token = page.getByTestId("token-B1");
  const original = await token.getAttribute("transform");
  await dragToken(page, "B1", 30, 30);
  const moved = await token.getAttribute("transform");

  await button(page, "Basis").click();
  expect(await token.getAttribute("transform")).toBe(original);
  await button(page, "Blok hoek").click();
  expect(await token.getAttribute("transform")).toBe(moved);
});

test("opslaan en terug openen via mijn scenario's", async ({ page }) => {
  await button(page, "Menu").click();
  await page.getByLabel("Naam van het scenario").fill("Peel oefening");
  await button(page, "Opslaan").click();
  await expect(page.getByText("Opgeslagen")).toBeVisible();
  await button(page, "Nieuw scenario").click();

  await button(page, "Menu").click();
  await expect(page.getByLabel("Naam van het scenario")).toHaveValue(
    "Nieuw scenario",
  );
  await button(page, "Mijn scenario's").click();
  await expect(page.getByText("Peel oefening")).toBeVisible();
  await page.getByRole("button", { name: "Peel oefening openen" }).click();

  await button(page, "Menu").click();
  await expect(page.getByLabel("Naam van het scenario")).toHaveValue(
    "Peel oefening",
  );
});

test("een concept overleeft herladen", async ({ page }) => {
  await page.getByPlaceholder("Uitleg bij deze stap").fill("Niet kwijtraken");
  await button(page, "+ Stap").click();
  await page.reload();
  await expect(button(page, "Stap 2")).toBeVisible();
  await button(page, "Stap 1").click();
  await expect(page.getByPlaceholder("Uitleg bij deze stap")).toHaveValue(
    "Niet kwijtraken",
  );
});

test("exporteren en importeren als JSON", async ({ page }) => {
  await button(page, "Menu").click();
  await page.getByLabel("Naam van het scenario").fill("Export test");
  const download = page.waitForEvent("download");
  await button(page, "Exporteren").click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("export-test.json");
  const path = await file.path();

  await button(page, "Nieuw scenario").click();
  await button(page, "Menu").click();
  await page.getByTestId("import-file").setInputFiles(path);
  await button(page, "Menu").click();
  await expect(page.getByLabel("Naam van het scenario")).toHaveValue(
    "Export test",
  );
});

test("een ongeldig bestand geeft een nette melding", async ({ page }) => {
  await button(page, "Menu").click();
  await page.getByTestId("import-file").setInputFiles({
    name: "kapot.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"title": "kapot"}'),
  });
  await expect(page.getByRole("alert")).toContainText("kan niet worden");
});

const viewports: [number, number][] = [
  [360, 640],
  [800, 360],
  [800, 600],
  [1280, 720],
];

for (const [width, height] of viewports) {
  test(`het bord past op ${width} x ${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await expect(page.getByTestId("token-B2")).toBeInViewport();
    await expect(button(page, "Delen")).toBeInViewport();
    await expect(button(page, "+ Stap")).toBeInViewport();
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    );
    expect(fits).toBe(true);
  });
}
