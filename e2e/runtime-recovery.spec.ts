import { expect, test } from "./buyer-desktop-evidence";

test("published homepage renders at supported recovery viewports", async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);

  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: Array<{ url: string; error: string | undefined }> = [];
  const badResponses: Array<{ status: number; url: string }> = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    failedRequests.push({
      url: request.url(),
      error: request.failure()?.errorText,
    });
  });
  page.on("response", (response) => {
    if (response.status() >= 400)
      badResponses.push({ status: response.status(), url: response.url() });
  });

  const observations = [];
  const widths = (process.env.RUNTIME_RECOVERY_VIEWPORTS || "1440,1024,768,375")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);
  for (const width of widths) {
    await page.setViewportSize({ width, height: width < 600 ? 900 : 1000 });
    const startedAt = Date.now();
    const response = await page.goto("/us/en", {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("banner")).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1_500);

    const state = await page.evaluate(() => ({
      title: document.title,
      headingCount: document.querySelectorAll("h1, h2, h3").length,
      cmsHeadings: [...document.querySelectorAll("h1, h2, h3")].map((element) =>
        (element.textContent || "").replace(/\s+/g, " ").trim(),
      ),
      sectionTypes: [
        ...document.querySelectorAll("[data-theme-section-type]"),
      ].map((element) => element.getAttribute("data-theme-section-type")),
      images: document.images.length,
      loadedImages: [...document.images].filter(
        (image) => image.complete && image.naturalWidth > 0,
      ).length,
      loadingMarkers: document.querySelectorAll(
        '[aria-busy="true"], [data-loading="true"]',
      ).length,
      scrollWidth: document.documentElement.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 2,
    }));
    await page.screenshot({
      path: testInfo.outputPath(`home-${width}.png`),
      fullPage: true,
      animations: "disabled",
    });
    observations.push({ width, elapsedMs: Date.now() - startedAt, ...state });
  }

  console.log(
    JSON.stringify(
      {
        observations: observations.map(
          ({
            width,
            elapsedMs,
            title,
            headingCount,
            loadedImages,
            loadingMarkers,
            scrollWidth,
            horizontalOverflow,
          }) => ({
            width,
            elapsedMs,
            title,
            headingCount,
            loadedImages,
            loadingMarkers,
            scrollWidth,
            horizontalOverflow,
          }),
        ),
        consoleErrors,
        pageErrors,
        failedRequests,
        badResponses,
      },
      null,
      2,
    ),
  );
  expect(observations.every((item) => item.headingCount > 0)).toBe(true);
  // Marketplace homepage (THEME_TEMPLATE_HOME disabled) — editorial hero + discovery sections.
  for (const expected of [
    "Meaningful things, made by real people.",
    "Jump into featured interests",
    "Featured shops",
    "Gift guides",
  ]) {
    expect(
      observations.every((item) => item.cmsHeadings.includes(expected)),
      `${expected} should render at every viewport`,
    ).toBe(true);
  }
  expect(observations.every((item) => !item.horizontalOverflow)).toBe(true);
  expect(observations.every((item) => item.loadedImages > 0)).toBe(true);
  expect(observations.every((item) => item.loadingMarkers === 0)).toBe(true);
  expect(pageErrors).toEqual([]);
});
