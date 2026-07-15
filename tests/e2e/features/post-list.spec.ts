import { expect, test } from "@playwright/test";
import { gotoPage } from "../../support/navigation";
import { useStoredPreference } from "../../support/preferences";

test("saved Grid preference follows the post Feed container width", async ({
	page,
}) => {
	await useStoredPreference(page, "postListLayout", "grid");

	await page.setViewportSize({ width: 375, height: 812 });
	await gotoPage(page, "/");

	const postList = page.locator('[data-post-list-renderer="astro"]').first();
	await expect(postList).toHaveClass(/grid-mode/);
	await expect(postList).toHaveCSS("display", "grid");
	expect(
		await postList.evaluate(
			(node) =>
				getComputedStyle(node).gridTemplateColumns.split(" ").length,
		),
	).toBe(1);

	await page.reload();
	await expect(postList).toHaveClass(/grid-mode/);

	await page.setViewportSize({ width: 560, height: 812 });
	expect(
		await postList.evaluate(
			(node) =>
				getComputedStyle(node).gridTemplateColumns.split(" ").length,
		),
	).toBe(1);

	await page.setViewportSize({ width: 700, height: 812 });
	expect(
		await postList.evaluate(
			(node) =>
				getComputedStyle(node).gridTemplateColumns.split(" ").length,
		),
	).toBe(2);
});

test("fluid two-column post Grid fills the Feed and keeps the semantic gap", async ({
	page,
}) => {
	await useStoredPreference(page, "postListLayout", "grid");
	await page.setViewportSize({ width: 1000, height: 900 });
	await gotoPage(page, "/");

	const postList = page.locator('[data-post-list-renderer="astro"]').first();
	const cards = postList.locator(":scope > .post-list__item");
	await expect(cards).toHaveCount(6);

	const geometry = await postList.evaluate((node) => {
		const items = Array.from(
			node.querySelectorAll<HTMLElement>(":scope > .post-list__item"),
		);
		const first = items[0]?.getBoundingClientRect();
		const second = items[1]?.getBoundingClientRect();
		return {
			columnCount:
				getComputedStyle(node).gridTemplateColumns.split(" ").length,
			columnGap: Number.parseFloat(getComputedStyle(node).columnGap),
			cardGap: first && second ? second.left - first.right : Number.NaN,
			leftInset: first
				? first.left - node.getBoundingClientRect().left
				: Number.NaN,
			rightInset: second
				? node.getBoundingClientRect().right - second.right
				: Number.NaN,
		};
	});

	expect(geometry.columnCount).toBe(2);
	expect(Math.abs(geometry.cardGap - geometry.columnGap)).toBeLessThan(1);
	expect(Math.abs(geometry.leftInset)).toBeLessThan(1);
	expect(Math.abs(geometry.rightInset)).toBeLessThan(1);

	const coverHeight = await cards
		.first()
		.locator(".home-post-card__cover")
		.evaluate((node) => Number.parseFloat(getComputedStyle(node).height));
	expect(coverHeight).toBeGreaterThanOrEqual(160);
	expect(coverHeight).toBeLessThanOrEqual(224);
});

test("post list view does not imply desktop page layout preference", async ({
	page,
}) => {
	await page.addInitScript(() => {
		localStorage.setItem("postListLayout", "grid");
		localStorage.removeItem("desktopLayoutPreference");
	});
	await page.setViewportSize({ width: 1400, height: 900 });
	await gotoPage(page, "/anime/");

	const grid = page.locator("#main-grid");
	await expect(grid).toHaveAttribute(
		"data-shell-strategy",
		"viewport-legacy",
	);
	await expect(grid).toHaveAttribute("data-post-list-view", "grid");
	await expect(grid).toHaveAttribute(
		"data-effective-desktop-layout",
		"content-right",
	);
});

test("post list keeps Astro snapshots and switches to Svelte for tag pagination", async ({
	page,
}) => {
	await gotoPage(page, "/");

	const astroList = page.locator('[data-post-list-renderer="astro"]').first();
	await expect(astroList).toBeVisible();
	await expect(
		astroList.locator(":scope > .post-list__item").first(),
	).toHaveClass(/ds-surface-card/);

	await gotoPage(page, "/category/tech/");
	await expect(
		page.locator('[data-post-list-renderer="astro"]').first(),
	).toBeVisible();

	const tagLink = page.locator('a[href^="/category/tech/?tag="]').first();
	await expect(tagLink).toBeVisible();
	await tagLink.click();

	await expect(page).toHaveURL(/\?tag=/);
	const svelteList = page.locator('[data-post-list-renderer="svelte"]');
	await expect(svelteList).toBeVisible();
	await expect(
		svelteList.locator(":scope > .post-list__item").first(),
	).toHaveClass(/ds-surface-card/);
});
