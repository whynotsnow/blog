import { expect, test } from "@playwright/test";
import { gotoPage } from "../../support/navigation";

test("new shell icons resolve from repository assets without Iconify", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.route(/https:\/\/(?:api|code)\.iconify\.design\//, (route) =>
		route.abort(),
	);
	await gotoPage(page, "/");
	await page.locator("#floating-tools-switch").click();

	for (const name of [
		"material-symbols:widgets-rounded",
		"material-symbols:music-note-rounded",
		"material-symbols:settings-rounded",
		"material-symbols:face-retouching-natural-rounded",
	]) {
		await expect(
			page.locator(`[data-local-icon='${name}']`).first(),
		).toBeVisible();
	}
	const icons = page.locator("[data-local-icon]");
	const sources = await icons.evaluateAll((elements) =>
		elements.map((element) => getComputedStyle(element).maskImage),
	);
	for (const source of sources) {
		expect(source).not.toBe("none");
		expect(source).not.toContain("iconify.design");
	}
});

test("activity center owns notice unread state in the top-right shell", async ({
	page,
}) => {
	await gotoPage(page, "/");

	const toggle = page.locator("#activity-center-switch");
	const panel = page.locator("#activity-center-panel");
	await expect(toggle).toBeVisible();
	await expect(toggle.locator("[data-activity-unread]")).toHaveText("2");
	await expect(panel).toBeHidden();

	const geometry = await toggle.evaluate((element) => {
		const rect = element.getBoundingClientRect();
		return {
			right: window.innerWidth - rect.right,
			top: rect.top,
			width: rect.width,
			height: rect.height,
		};
	});
	expect(geometry.right).toBeGreaterThanOrEqual(12);
	expect(geometry.top).toBeLessThan(80);
	expect(geometry.width).toBeGreaterThanOrEqual(44);
	expect(geometry.height).toBeGreaterThanOrEqual(44);

	await toggle.click();
	await expect(panel).toBeVisible();
	await expect(panel.locator(".activity-center__notice")).toHaveCount(2);
	await expect(toggle.locator("[data-activity-unread]")).toHaveCount(0);
	await expect(page.locator("[data-site-notice-region]")).toBeHidden();
	await expect
		.poll(() =>
			page.evaluate(() => [
				localStorage.getItem("site-notice:read:site-building-2026-07"),
				localStorage.getItem(
					"site-notice:read:site-content-updates-2026-07",
				),
			]),
		)
		.toEqual(["true", "true"]);
});

test("activity center reports live article reading status", async ({
	page,
}) => {
	await gotoPage(page, "/posts/markdown-tutorial/");

	const toggle = page.locator("#activity-center-switch");
	const initialProgress = Number(
		await toggle.getAttribute("data-reading-progress"),
	);

	await page.evaluate(() => {
		const article = document.getElementById("post-container");
		if (!article) return;
		const top = window.scrollY + article.getBoundingClientRect().top;
		window.scrollTo(0, top + article.offsetHeight * 0.5);
	});
	await expect
		.poll(async () =>
			Number(await toggle.getAttribute("data-reading-progress")),
		)
		.toBeGreaterThan(initialProgress);
	await expect(page.locator("#navbar-wrapper")).not.toHaveClass(
		/navbar-hidden/,
	);
	await expect(toggle).toBeInViewport();

	await toggle.click();
	const reading = page.locator("[data-activity-reading]");
	await expect(reading).toBeVisible();
	await expect(
		reading.locator(".activity-center__reading-title"),
	).toContainText("Markdown");
	await expect(
		reading.locator(".activity-center__reading-meta"),
	).toContainText(/进度 [1-9][0-9]?%/);
	await expect(
		reading.locator(".activity-center__current-heading"),
	).toBeVisible();
	await expect
		.poll(() =>
			page.evaluate(() =>
				localStorage.getItem(
					`reading-position:${window.location.pathname}`,
				),
			),
		)
		.not.toBeNull();
});

test("activity center uses a safe mobile bottom sheet", async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await gotoPage(page, "/");
	await page.locator("#activity-center-switch").click();

	const geometry = await page
		.locator("#activity-center-panel")
		.evaluate((element) => {
			const rect = element.getBoundingClientRect();
			return {
				left: rect.left,
				right: window.innerWidth - rect.right,
				bottom: window.innerHeight - rect.bottom,
				height: rect.height,
			};
		});
	expect(geometry.left).toBeGreaterThanOrEqual(12);
	expect(geometry.right).toBeGreaterThanOrEqual(12);
	expect(geometry.bottom).toBeGreaterThanOrEqual(12);
	expect(geometry.height).toBeLessThan(844 * 0.75);
});
