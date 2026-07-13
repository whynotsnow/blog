import { expect, test } from "@playwright/test";

test("site notice floats outside page flow and switches between notices", async ({
	page,
}) => {
	await page.goto("/");

	const region = page.locator("[data-site-notice-region]");
	const notices = region.locator("[data-site-notice-item]");
	await expect(region).toBeVisible();
	await expect(notices).toHaveCount(2);
	await expect(region).toHaveCSS("position", "fixed");

	const geometry = await region.evaluate((element) => ({
		width: element.getBoundingClientRect().width,
		viewportWidth: window.innerWidth,
	}));
	expect(geometry.width).toBeLessThan(geometry.viewportWidth);
	expect(geometry.width).toBeLessThanOrEqual(768);

	await expect(notices.nth(0)).toHaveAttribute("data-state", "active");
	const initialLayout = await page.evaluate(() => ({
		documentHeight: document.documentElement.scrollHeight,
		viewportHeight: document
			.querySelector<HTMLElement>("[data-site-notice-viewport]")
			?.getBoundingClientRect().height,
	}));
	await region.locator("[data-site-notice-next]").click();
	await expect(notices.nth(1)).toHaveAttribute("data-state", "active");
	await expect(region.locator("[data-site-notice-index]")).toHaveText("2");
	const switchedLayout = await page.evaluate(() => ({
		documentHeight: document.documentElement.scrollHeight,
		viewportHeight: document
			.querySelector<HTMLElement>("[data-site-notice-viewport]")
			?.getBoundingClientRect().height,
	}));
	expect(switchedLayout).toEqual(initialLayout);
});

test("site notice keeps its viewport position during Swup navigation", async ({
	page,
}) => {
	await page.goto("/");
	const region = page.locator("[data-site-notice-region]");
	await expect(region).toBeVisible();
	await expect(
		region.locator("xpath=ancestor::*[@id='swup-container']"),
	).toHaveCount(0);

	const initialTop = await region.evaluate(
		(element) => element.getBoundingClientRect().top,
	);
	await page.evaluate(() => {
		const samples: number[] = [];
		const sample = () => {
			const notice = document.querySelector<HTMLElement>(
				"[data-site-notice-region]",
			);
			if (notice) samples.push(notice.getBoundingClientRect().top);
		};
		const timer = window.setInterval(sample, 8);
		(
			window as typeof window & { __siteNoticeSamples?: number[] }
		).__siteNoticeSamples = samples;
		window.swup.navigate("/category/tech/");
		window.setTimeout(() => window.clearInterval(timer), 1000);
	});

	await expect(page).toHaveURL(/\/category\/tech\/$/);
	await expect(region).toBeVisible();
	await expect
		.poll(() =>
			page.evaluate(() =>
				document.documentElement.classList.contains("is-changing"),
			),
		)
		.toBe(false);
	const samples = await page.evaluate(
		() =>
			(
				window as typeof window & {
					__siteNoticeSamples?: number[];
				}
			).__siteNoticeSamples ?? [],
	);
	expect(samples.length).toBeGreaterThan(2);
	expect(
		Math.max(...samples.map((top) => Math.abs(top - initialTop))),
	).toBeLessThan(1);
});
