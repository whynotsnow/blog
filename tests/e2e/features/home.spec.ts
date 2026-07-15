import { expect, test } from "@playwright/test";
import { gotoPage } from "../../support/navigation";

test("home sections expose six-card guide destinations", async ({ page }) => {
	await page.setViewportSize({ width: 1536, height: 900 });
	await gotoPage(page, "/");

	const sections = page.locator(".home-section");
	await expect(sections).toHaveCount(3);
	await expect(sections.nth(0).locator("h2")).toHaveText("最近更新");
	await expect(sections.nth(1).locator("h2")).toHaveText("推荐阅读");
	await expect(sections.nth(2).locator("h2")).toHaveText("技术文章");
	await expect(
		sections.nth(0).locator('a[href="/archive/?sort=updated"]'),
	).toBeVisible();
	await expect(sections.nth(1).locator('a[href="/archive/"]')).toBeVisible();
	await expect(
		sections.nth(2).locator('a[href="/category/technology/"]'),
	).toBeVisible();

	for (let index = 0; index < 3; index += 1) {
		const cards = sections.nth(index).locator(".post-list__item");
		await expect(cards).toHaveCount(6);
		await expect(cards.locator(".home-post-card__cover")).toHaveCount(6);
		const heights = await cards.evaluateAll((items) =>
			items.map((item) => getComputedStyle(item).height),
		);
		expect(new Set(heights).size).toBe(1);
		expect(Number.parseFloat(heights[0])).toBeGreaterThan(350);
	}
});
