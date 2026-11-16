import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const targets = [
	{
		mode: "fallback",
		origin: process.env.V2_FALLBACK_URL || "http://127.0.0.1:3317",
		chrome: "default",
	},
	{
		mode: "published",
		origin: process.env.V2_PUBLISHED_URL || "http://127.0.0.1:3318",
		chrome: "published",
	},
];
const viewports = [
	{ width: 1440, height: 1000 },
	{ width: 1024, height: 900 },
	{ width: 768, height: 1024 },
	{ width: 390, height: 844 },
	{ width: 360, height: 800 },
];
const stamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
const evidence = new URL(
	`../../docs/evidence/storefront-redesign/v2-certification/${stamp}/`,
	import.meta.url,
);
const results = [];
const selectedMode = process.argv[2];
if (selectedMode && !targets.some(({ mode }) => mode === selectedMode)) {
	throw new Error(
		"Choose fallback or published, or omit the mode to capture both.",
	);
}

for (const target of targets) {
	const origin = new URL(target.origin);
	if (!["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname)) {
		throw new Error(
			`Use a local certification server for the ${target.mode} capture.`,
		);
	}
}

await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({
	channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
});

try {
	for (const target of targets) {
		if (selectedMode && selectedMode !== target.mode) continue;
		const modeDir = new URL(`${target.mode}/`, evidence);
		await mkdir(modeDir, { recursive: true });
		for (const viewport of viewports) {
			const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
			const issues = [];
			const failedRequests = [];
			const localTelemetry = [];
			page.on("pageerror", (error) => issues.push(error.message));
			page.on("response", (response) => {
				if (response.status() >= 400) {
					const url = new URL(response.url());
					const failure = { status: response.status(), path: url.pathname };
					if (
						response.status() === 404 &&
						/^\/_vercel\/(insights|speed-insights)\/script\.js$/.test(
							url.pathname,
						)
					) {
						localTelemetry.push(failure);
					} else {
						failedRequests.push(failure);
					}
				}
			});
			page.on("requestfailed", (request) => {
				const error = request.failure()?.errorText;
				if (error && error !== "net::ERR_ABORTED") {
					failedRequests.push({ error, path: new URL(request.url()).pathname });
				}
			});
			try {
				const url = new URL("/us/en", target.origin).href;
				const response = await page.goto(url, {
					waitUntil: "domcontentloaded",
					timeout: 60000,
				});
				await page.waitForSelector("[data-storefront-home-source], main h1", {
					timeout: 25000,
				});
				// Bring lazy catalog images into view before a full-page capture.
				await page.evaluate(async () => {
					await document.fonts.ready;
					for (
						let offset = 0;
						offset < document.documentElement.scrollHeight;
						offset += innerHeight * 0.8
					) {
						window.scrollTo(0, offset);
						await new Promise((resolve) => setTimeout(resolve, 130));
					}
					const images = [...document.images].filter(
						(image) => image.currentSrc && image.getClientRects().length,
					);
					await Promise.race([
						Promise.allSettled(images.map((image) => image.decode())),
						new Promise((resolve) => setTimeout(resolve, 6000)),
					]);
					window.scrollTo(0, 0);
				});
				const pageState = await page.evaluate(() => {
					const source = (name) =>
						document
							.querySelector(`[data-storefront-${name}-source]`)
							?.getAttribute(`data-storefront-${name}-source`) ?? null;
					const visible = (element) => element.getClientRects().length > 0;
					return {
						sources: {
							home: source("home"),
							header: source("header"),
							footer: source("footer"),
						},
						defaultChrome: {
							header: document.querySelectorAll("[data-gift-header]").length,
							footer: document.querySelectorAll("[data-gift-footer]").length,
						},
						horizontalOverflow:
							document.documentElement.scrollWidth > innerWidth,
						headings: [...document.querySelectorAll("main h1, main h2")]
							.filter(visible)
							.map((heading) => heading.textContent?.trim()),
						visibleSearchFields: [
							...document.querySelectorAll(
								'header input[type="search"], header input[role="combobox"]',
							),
						].filter(visible).length,
						catalogLinks: new Set(
							[...document.querySelectorAll('main a[href*="/products/"]')].map(
								(link) => link.pathname,
							),
						).size,
						sellerLinks: new Set(
							[...document.querySelectorAll('main a[href*="/sellers/"]')].map(
								(link) => link.pathname,
							),
						).size,
						brokenImages: [...document.images]
							.filter(
								(image) =>
									visible(image) &&
									image.currentSrc &&
									image.complete &&
									!image.naturalWidth,
							)
							.map((image) => new URL(image.currentSrc).pathname),
					};
				});
				const screenshot = `homepage-${viewport.width}.png`;
				await page.screenshot({
					path: fileURLToPath(new URL(screenshot, modeDir)),
					fullPage: true,
					animations: "disabled",
					timeout: 30000,
				});
				const passed =
					response?.ok() &&
					pageState.sources.home === "fallback" &&
					pageState.sources.header === target.chrome &&
					pageState.sources.footer === target.chrome &&
					pageState.defaultChrome.header ===
						(target.mode === "fallback" ? 1 : 0) &&
					pageState.defaultChrome.footer ===
						(target.mode === "fallback" ? 1 : 0) &&
					!pageState.horizontalOverflow &&
					pageState.visibleSearchFields === 1 &&
					pageState.catalogLinks > 0 &&
					pageState.sellerLinks > 0 &&
					pageState.brokenImages.length === 0 &&
					issues.length === 0 &&
					failedRequests.length === 0;
				results.push({
					mode: target.mode,
					url,
					viewport,
					status: response?.status(),
					screenshot,
					passed: Boolean(passed),
					...pageState,
					issues,
					failedRequests,
					localTelemetry,
				});
			} catch (error) {
				results.push({
					mode: target.mode,
					viewport,
					passed: false,
					error: error.message,
				});
			} finally {
				const result = results.at(-1);
				console.log(JSON.stringify(result));
				await writeFile(
					new URL("results.json", evidence),
					JSON.stringify(results, null, 2),
					"utf8",
				);
				await page.close();
			}
		}
	}
} finally {
	await browser.close();
}

if (!results.length || results.some((result) => !result.passed))
	process.exitCode = 1;
