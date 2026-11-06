import { expect, test, type Locator, type Page } from "@playwright/test";

async function center(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Element is niet zichtbaar");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function dragWithMouse(
  page: Page,
  token: Locator,
  dx: number,
  dy: number,
) {
  const start = await center(token);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + dx, start.y + dy, { steps: 8 });
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await expect(page.getByTestId("court")).toBeVisible();
});

test("toont vier spelers en een bal", async ({ page }) => {
  for (const id of ["A1", "A2", "B1", "B2", "ball"]) {
    await expect(page.getByTestId(`token-${id}`)).toBeVisible();
  }
});

test("een speler is te verslepen en terug te zetten", async ({ page }) => {
  const token = page.getByTestId("token-B1");
  const before = await center(token);

  await dragWithMouse(page, token, -40, 30);
  const after = await center(token);
  expect(after.x).toBeCloseTo(before.x - 40, 0);
  expect(after.y).toBeCloseTo(before.y + 30, 0);

  await page.getByRole("button", { name: "Beginopstelling" }).click();
  const reset = await center(token);
  expect(reset.x).toBeCloseTo(before.x, 0);
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

test("slepen werkt met een vinger", async ({ page, browserName }, testInfo) => {
  test.skip(
    browserName !== "chromium" || testInfo.project.name !== "mobiel",
    "Alleen mobiel",
  );

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
  expect(end.x).toBeCloseTo(start.x + 40, 0);
  expect(end.y).toBeCloseTo(start.y - 40, 0);
});

test("de ligging volgt het scherm en elk tikdoel is groot genoeg", async ({
  page,
}, testInfo) => {
  const orientation =
    testInfo.project.name === "mobiel" ? "portrait" : "landscape";
  await expect(page.getByTestId("court")).toHaveAttribute(
    "data-orientation",
    orientation,
  );

  const box = await page
    .getByTestId("token-ball")
    .locator("circle")
    .first()
    .boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
});

const viewports: [number, number][] = [
  [800, 600],
  [800, 360],
  [1280, 720],
  [360, 640],
];

for (const [width, height] of viewports) {
  test(`het veld past op ${width} x ${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const fits = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth <= innerWidth && root.scrollHeight <= innerHeight;
    });
    expect(fits).toBe(true);

    for (const id of ["A1", "A2", "B1", "B2", "ball"]) {
      await expect(page.getByTestId(`token-${id}`)).toBeInViewport();
    }
    await expect(
      page.getByRole("button", { name: "Draai veld" }),
    ).toBeInViewport();
  });
}
