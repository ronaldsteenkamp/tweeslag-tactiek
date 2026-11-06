import { expect, test } from "@playwright/test";

test("het manifest voldoet aan de eisen om te installeren", async ({
  page,
  request,
}) => {
  await page.goto("./");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).toBeTruthy();

  const base = new URL(page.url());
  const manifestUrl = new URL(href ?? "", base);
  const manifest = await (await request.get(manifestUrl.href)).json();
  expect(manifest.name).toBe("Tweeslag Tactiek");
  expect(manifest.short_name).toBeTruthy();
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/tweeslag-tactiek/");
  expect(manifest.lang).toBe("nl");

  const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
  expect(sizes).toContain("192x192");
  expect(sizes).toContain("512x512");
  expect(
    manifest.icons.some(
      (icon: { purpose?: string }) => icon.purpose === "maskable",
    ),
  ).toBe(true);

  for (const icon of manifest.icons as { src: string }[]) {
    const response = await request.get(new URL(icon.src, manifestUrl).href);
    expect(response.ok(), icon.src).toBe(true);
  }

  expect(manifest.id).toBe("/tweeslag-tactiek/");
  expect(manifest.shortcuts).toHaveLength(3);
  const factors = manifest.screenshots.map(
    (shot: { form_factor: string }) => shot.form_factor,
  );
  expect(factors).toContain("narrow");
  expect(factors).toContain("wide");
  for (const shot of manifest.screenshots as { src: string }[]) {
    const response = await request.get(new URL(shot.src, manifestUrl).href);
    expect(response.ok(), shot.src).toBe(true);
  }
});

test("de hele app werkt offline na het eerste bezoek", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Pas na herladen regelt de service worker alle verzoeken.
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);

  await context.setOffline(true);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Lessen" })).toBeVisible();

  await page.goto("./#/les/shots");
  await page.reload();
  await expect(page.getByTestId("step-label")).toHaveText("Stap 1 van 5");

  await page.goto("./#/regels");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Spelregels" })).toBeVisible();

  await page.goto("./#/bord");
  await page.reload();
  await expect(page.getByTestId("court")).toBeVisible();

  await context.setOffline(false);
});

test("een gedeelde link opent ook offline", async ({ page, context }) => {
  await page.goto("./#/bord");
  await page.getByRole("button", { name: "Delen", exact: true }).click();
  const url = await page.getByTestId("share-url").inputValue();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);

  await context.setOffline(true);
  await page.goto(url);
  await page.reload();
  await expect(page.getByText(/Gedeeld scenario:/)).toBeVisible();
  await context.setOffline(false);
});

test("zonder browservoorstel toont de knop de uitleg", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Installeren" }).click();
  await expect(page.getByRole("dialog")).toContainText("Zet op beginscherm");
});

test("de knop gebruikt het voorstel van de browser", async ({ page }) => {
  await page.goto("./");
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt: async () => {
        document.body.dataset.prompted = "ja";
      },
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    window.dispatchEvent(event);
  });
  await page.getByRole("button", { name: "Installeren" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-prompted", "ja");
  await expect(page.getByRole("button", { name: "Installeren" })).toBeHidden();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("in de geïnstalleerde app staat geen installatieknop", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "standalone", { value: true });
  });
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "Lessen" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Installeren" })).toHaveCount(
    0,
  );
});
