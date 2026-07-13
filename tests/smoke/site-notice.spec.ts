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
	await region.locator("[data-site-notice-next]").click();
	await expect(notices.nth(1)).toHaveAttribute("data-state", "active");
	await expect(region.locator("[data-site-notice-index]")).toHaveText("2");
});
