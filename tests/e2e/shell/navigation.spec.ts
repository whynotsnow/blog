import { expect, test } from "@playwright/test";
import { gotoPage } from "../../support/navigation";
import { useStoredPreference } from "../../support/preferences";

const entryAlignmentTolerance = 8;

test("category and post pages align the main region and keep a fixed visible navbar", async ({
	page,
}) => {
	await useStoredPreference(page, "wallpaperMode", "banner");
	await page.setViewportSize({ width: 1024, height: 900 });
	await gotoPage(page, "/category/tech/");

	const banner = page.locator("#banner-wrapper");
	const mainContent = page.locator(".main-content-layer");
	await expect(banner).not.toHaveClass(/mobile-hide-banner/);
	await expect(mainContent).not.toHaveClass(/mobile-main-no-banner/);
	await expect
		.poll(() => page.evaluate(() => window.scrollY))
		.toBeGreaterThan(0);

	const pageMain = page.locator(".page-main-content");
	await expect
		.poll(() =>
			pageMain.evaluate(
				(node) =>
					Math.abs(
						node.getBoundingClientRect().top -
							Number.parseFloat(
								getComputedStyle(node).scrollMarginTop,
							),
					) < 1,
			),
		)
		.toBe(true);

	const navbar = page.locator("#navbar");
	await expect(navbar).toHaveClass(/scrolled/);
	await expect(page.locator("body")).toHaveClass(/navbar-fixed-visible/);
	await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
	await expect(navbar).toHaveClass(/scrolled/);
	await expect(page.locator("#top-row")).toHaveCSS("position", "fixed");

	await gotoPage(page, "/posts/markdown-tutorial/");
	await expect
		.poll(() => page.evaluate(() => window.scrollY))
		.toBeGreaterThan(0);
	await expect(banner).not.toHaveClass(/mobile-hide-banner/);
	await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
	await expect(navbar).toHaveClass(/scrolled/);

	await useStoredPreference(page, "wallpaperMode", "overlay");
	await gotoPage(page, "/category/tech/");
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
	await expect(banner).toBeHidden();
});

test("fullscreen category and post pages align the main region", async ({
	page,
}) => {
	await useStoredPreference(page, "wallpaperMode", "fullscreen");
	await page.setViewportSize({ width: 1440, height: 900 });
	await gotoPage(page, "/category/tech/");

	const readMainOffset = () =>
		page
			.locator(".page-main-content")
			.evaluate((node) =>
				Math.abs(
					node.getBoundingClientRect().top -
						Number.parseFloat(
							getComputedStyle(node).scrollMarginBlockStart,
						),
				),
			);
	await expect
		.poll(readMainOffset)
		.toBeLessThanOrEqual(entryAlignmentTolerance);
	await expect
		.poll(() => page.evaluate(() => window.scrollY))
		.toBeGreaterThan(0);
	await expect
		.poll(() => page.evaluate(() => Boolean(window.swup)))
		.toBe(true);

	await page.evaluate(() => {
		window.swup.navigate("/posts/markdown-tutorial/");
	});
	await expect(page).toHaveURL(/\/posts\/markdown-tutorial\/$/);
	await expect(page.locator("#navigation-progress")).toHaveAttribute(
		"data-state",
		"idle",
	);
	await expect
		.poll(readMainOffset)
		.toBeLessThanOrEqual(entryAlignmentTolerance);
});

test("direct post URLs animate to the page entry on first load", async ({
	page,
}) => {
	await useStoredPreference(page, "wallpaperMode", "banner");
	await page.setViewportSize({ width: 1024, height: 900 });
	await page.addInitScript(() => {
		const nativeScrollTo = window.scrollTo.bind(window);
		const state = window as typeof window & {
			__firstLoadEntryScrollCalls?: number[];
		};
		state.__firstLoadEntryScrollCalls = [];
		window.scrollTo = ((
			optionsOrX?: ScrollToOptions | number,
			y?: number,
		) => {
			const top = typeof optionsOrX === "object" ? optionsOrX.top : y;
			if (typeof top === "number") {
				state.__firstLoadEntryScrollCalls?.push(top);
			}

			if (typeof optionsOrX === "object") {
				nativeScrollTo(optionsOrX);
				return;
			}

			nativeScrollTo(optionsOrX ?? 0, y ?? 0);
		}) as typeof window.scrollTo;
	});

	await gotoPage(page, "/posts/markdown-tutorial/");

	const pageMain = page.locator(".page-main-content");
	await expect
		.poll(() =>
			pageMain.evaluate((node) =>
				Math.abs(
					node.getBoundingClientRect().top -
						Number.parseFloat(
							getComputedStyle(node).scrollMarginBlockStart,
						),
				),
			),
		)
		.toBeLessThanOrEqual(entryAlignmentTolerance);

	const scrollCalls = await page.evaluate(
		() =>
			(
				window as typeof window & {
					__firstLoadEntryScrollCalls?: number[];
				}
			).__firstLoadEntryScrollCalls ?? [],
	);
	expect(scrollCalls.length).toBeGreaterThan(3);
	expect(scrollCalls[0]).toBeLessThan(scrollCalls.at(-1) ?? 0);
	expect(
		scrollCalls.every(
			(value, index) => index === 0 || value >= scrollCalls[index - 1],
		),
	).toBe(true);
});

test("home retains banner-aware navbar behavior", async ({ page }) => {
	await useStoredPreference(page, "wallpaperMode", "banner");
	await gotoPage(page, "/");

	const navbar = page.locator("#navbar");
	await expect(page.locator("body")).not.toHaveClass(/navbar-fixed-visible/);
	await expect(navbar).not.toHaveClass(/scrolled/);
	await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
	await expect(navbar).not.toHaveClass(/scrolled/);
	await page.evaluate(() => window.scrollTo({ top: 120, behavior: "auto" }));
	await expect(navbar).toHaveClass(/scrolled/);
});

test("Swup shows navigation progress independently from page entry scrolling", async ({
	page,
}) => {
	await gotoPage(page, "/");
	await page.route("**/*", async (route) => {
		if (route.request().url().includes("progress-test=1")) {
			await new Promise((resolve) => setTimeout(resolve, 120));
		}
		await route.continue();
	});
	await expect
		.poll(() => page.evaluate(() => Boolean(window.swup)))
		.toBe(true);

	await page.evaluate(() => {
		window.swup.navigate("/archive/?progress-test=1");
	});
	const progress = page.locator("#navigation-progress");
	await expect(progress).toHaveAttribute("data-state", "active");
	await expect(progress).toBeVisible();
	await expect(page).toHaveURL(/\/archive\/\?progress-test=1$/);
	await expect(progress).toHaveAttribute("data-state", "idle");
});

test("category links use one smooth page-entry scroll", async ({ page }) => {
	await useStoredPreference(page, "wallpaperMode", "banner");
	await gotoPage(page, "/category/tech/");
	await expect
		.poll(() => page.evaluate(() => Boolean(window.swup)))
		.toBe(true);
	await page.evaluate(() => window.scrollBy({ top: 500, behavior: "auto" }));
	const initialScrollHeight = await page.evaluate(
		() => document.documentElement.scrollHeight,
	);

	await page.evaluate(() => {
		const state = window as typeof window & {
			__pageEntryScrollCalls?: number[];
			__pageEntryScrollHeights?: number[];
		};
		const nativeScrollTo = window.scrollTo.bind(window);
		state.__pageEntryScrollCalls = [];
		state.__pageEntryScrollHeights = [];
		window.scrollTo = ((options: ScrollToOptions) => {
			state.__pageEntryScrollCalls?.push(options.top ?? window.scrollY);
			state.__pageEntryScrollHeights?.push(
				document.documentElement.scrollHeight,
			);
			nativeScrollTo(options);
		}) as typeof window.scrollTo;
		window.swup.navigate("/category/work/");
	});

	await expect(page).toHaveURL(/\/category\/work\/$/);
	await expect(page.locator("#navigation-progress")).toHaveAttribute(
		"data-state",
		"idle",
	);
	await expect
		.poll(() =>
			page
				.locator(".page-main-content")
				.evaluate((node) =>
					Math.abs(
						node.getBoundingClientRect().top -
							Number.parseFloat(
								getComputedStyle(node).scrollMarginBlockStart,
							),
					),
				),
		)
		.toBeLessThan(1);
	const scrollCalls = await page.evaluate(
		() =>
			(
				window as typeof window & {
					__pageEntryScrollCalls?: number[];
				}
			).__pageEntryScrollCalls ?? [],
	);
	expect(scrollCalls.length).toBeGreaterThan(3);
	expect(scrollCalls[0]).toBeGreaterThan(scrollCalls.at(-1) ?? 0);
	expect(
		scrollCalls.every(
			(value, index) => index === 0 || value <= scrollCalls[index - 1],
		),
	).toBe(true);
	const scrollHeights = await page.evaluate(
		() =>
			(
				window as typeof window & {
					__pageEntryScrollHeights?: number[];
				}
			).__pageEntryScrollHeights ?? [],
	);
	expect(Math.max(...scrollHeights)).toBeLessThanOrEqual(
		initialScrollHeight + 1,
	);
	await expect(page.locator("#page-height-extend")).toHaveCount(0);
	await expect
		.poll(() =>
			page.locator("#page-height-guard").evaluate((node) => ({
				height: Number.parseFloat(getComputedStyle(node).height),
				state: (node as HTMLElement).dataset.state,
			})),
		)
		.toEqual({ height: 0, state: "idle" });
});

test("browser history realigns the category and post main regions", async ({
	page,
}) => {
	await useStoredPreference(page, "wallpaperMode", "banner");
	await gotoPage(page, "/category/tech/");
	await expect
		.poll(() => page.evaluate(() => Boolean(window.swup)))
		.toBe(true);

	await page.evaluate(() => {
		window.swup.navigate("/posts/markdown-tutorial/");
	});
	await expect(page).toHaveURL(/\/posts\/markdown-tutorial\/$/);
	await expect(page.locator("#navigation-progress")).toHaveAttribute(
		"data-state",
		"idle",
	);
	const readEntryGeometry = () =>
		page.locator(".page-main-content").evaluate((node) => ({
			top: node.getBoundingClientRect().top,
			clearance: Number.parseFloat(
				getComputedStyle(node).scrollMarginBlockStart,
			),
		}));
	await expect
		.poll(async () => {
			const geometry = await readEntryGeometry();
			return Math.abs(geometry.top - geometry.clearance);
		})
		.toBeLessThan(1);
	const normalEntry = await readEntryGeometry();
	await page.evaluate(() => window.scrollBy({ top: 500, behavior: "auto" }));

	await page.evaluate(() => window.history.back());
	await expect(page).toHaveURL(/\/category\/tech\/$/);
	await expect(page.locator("#navigation-progress")).toHaveAttribute(
		"data-state",
		"idle",
	);
	await expect
		.poll(async () => {
			const geometry = await readEntryGeometry();
			return Math.abs(geometry.top - geometry.clearance);
		})
		.toBeLessThanOrEqual(entryAlignmentTolerance);
	const backEntry = await readEntryGeometry();
	expect(Math.abs(backEntry.top - normalEntry.top)).toBeLessThan(1);

	await page.evaluate(() => window.scrollBy({ top: 500, behavior: "auto" }));
	await page.evaluate(() => window.history.forward());
	await expect(page).toHaveURL(/\/posts\/markdown-tutorial\/$/);
	await expect(page.locator("#navigation-progress")).toHaveAttribute(
		"data-state",
		"active",
	);
	await expect(page.locator("#navigation-progress")).toHaveAttribute(
		"data-state",
		"idle",
	);
	await expect
		.poll(async () => {
			const geometry = await readEntryGeometry();
			return Math.abs(geometry.top - geometry.clearance);
		})
		.toBeLessThan(1);
	const forwardEntry = await readEntryGeometry();
	expect(Math.abs(forwardEntry.top - normalEntry.top)).toBeLessThan(1);
});

test("navbar stays sticky while the desktop banner scrolls", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await gotoPage(page, "/");

	const navbarWrapper = page.locator("#navbar-wrapper");
	await expect(navbarWrapper).toBeVisible();
	await page.evaluate(() => window.scrollTo(0, 200));
	await expect
		.poll(() =>
			navbarWrapper.evaluate((node) => node.getBoundingClientRect().top),
		)
		.toBe(0);
});

test("page layout policy follows Swup navigation", async ({ page }) => {
	await gotoPage(page, "/");

	const grid = page.locator("#main-grid");
	await expect(grid).toHaveAttribute(
		"data-shell-strategy",
		"container-content",
	);
	await expect(grid).toHaveAttribute(
		"data-base-desktop-layout",
		"content-right",
	);
	await expect(grid).toHaveAttribute(
		"data-allowed-desktop-layouts",
		"content-right",
	);

	const postLink = page.locator('a[href^="/posts/"]').first();
	await expect(postLink).toBeVisible();
	await postLink.click();
	await expect(page).toHaveURL(/\/posts\/.+\/$/);
	await expect(page.locator("#swup-container")).toHaveAttribute(
		"data-navbar-behavior",
		"fixed-visible",
	);
	await expect(page.locator("body")).toHaveClass(/navbar-fixed-visible/);
	await expect(page.locator("#navbar")).toHaveClass(/scrolled/);
	await expect(grid).toHaveAttribute(
		"data-base-desktop-layout",
		"content-right",
	);
	await expect(grid).toHaveAttribute(
		"data-allowed-desktop-layouts",
		"content-right",
	);
	await expect(page.locator("#swup-container")).toHaveCount(1);
	await expect(grid).toHaveCount(1);

	await page.goBack();
	await expect(page).toHaveURL(/\/$/);
	await expect(page.locator("#swup-container")).toHaveAttribute(
		"data-navbar-behavior",
		"banner-aware",
	);
	await expect(page.locator("body")).not.toHaveClass(/navbar-fixed-visible/);
	await expect(grid).toHaveAttribute(
		"data-base-desktop-layout",
		"content-right",
	);
	await expect(grid).toHaveAttribute(
		"data-allowed-desktop-layouts",
		"content-right",
	);
});
