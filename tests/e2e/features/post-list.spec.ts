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

test("container-content compensates post Card vertical geometry without changing its width budget", async ({
	page,
}) => {
	await useStoredPreference(page, "postListLayout", "grid");

	const readCardGeometry = async (renderer: "astro" | "svelte") => {
		const postList = page
			.locator(`[data-post-list-renderer="${renderer}"]`)
			.first();
		const item = postList.locator(":scope > .post-list__item").first();
		await expect(item).toBeVisible();

		return item.evaluate((node) => {
			const card = node.matches(".home-post-card")
				? node
				: node.querySelector<HTMLElement>(".home-post-card")!;
			const cover = card.querySelector<HTMLElement>(
				".home-post-card__cover",
			)!;
			const content = card.querySelector<HTMLElement>(
				".home-post-card__content",
			)!;
			const title = card.querySelector<HTMLElement>(
				".home-post-card__title",
			)!;
			const summary = card.querySelector<HTMLElement>(
				".home-post-card__summary",
			)!;
			const tag = card.querySelector<HTMLElement>(
				".home-post-card__tags > :first-child",
			)!;
			const meta = card.querySelector<HTMLElement>(
				".home-post-card__meta",
			);
			const itemStyle = getComputedStyle(node);
			const cardStyle = getComputedStyle(card);
			const contentStyle = getComputedStyle(content);

			return {
				width: Number.parseFloat(itemStyle.width),
				height: Number.parseFloat(itemStyle.height),
				cardHeight: Number.parseFloat(cardStyle.height),
				coverHeight: Number.parseFloat(getComputedStyle(cover).height),
				contentPaddingBlockStart: Number.parseFloat(
					contentStyle.paddingBlockStart,
				),
				titleSize: Number.parseFloat(getComputedStyle(title).fontSize),
				summarySize: Number.parseFloat(
					getComputedStyle(summary).fontSize,
				),
				tagSize: Number.parseFloat(getComputedStyle(tag).fontSize),
				metaSize: meta
					? Number.parseFloat(getComputedStyle(meta).fontSize)
					: null,
				intrinsicSize: itemStyle.containIntrinsicBlockSize,
				contentOverflows:
					content.scrollHeight > content.clientHeight + 1,
			};
		});
	};

	await page.setViewportSize({ width: 1536, height: 900 });
	await gotoPage(page, "/");
	const compensatedAstro = await readCardGeometry("astro");
	expect(compensatedAstro.height).toBeCloseTo(417.6, 1);
	expect(compensatedAstro.cardHeight).toBeCloseTo(417.6, 1);
	expect(compensatedAstro.contentPaddingBlockStart).toBeCloseTo(18, 1);
	expect(compensatedAstro.titleSize).toBeCloseTo(20.7, 1);
	expect(compensatedAstro.summarySize).toBeCloseTo(14.4, 1);
	expect(compensatedAstro.tagSize).toBeCloseTo(10.8, 1);
	expect(compensatedAstro.metaSize).toBeCloseTo(12.6, 1);
	expect(compensatedAstro.intrinsicSize).toContain("417.6px");
	expect(compensatedAstro.contentOverflows).toBe(false);

	await gotoPage(page, "/category/tech/");
	const tagLink = page.locator('a[href^="/category/tech/?tag="]').first();
	await tagLink.click();
	await expect(page).toHaveURL(/\?tag=/);
	const compensatedSvelte = await readCardGeometry("svelte");
	expect(compensatedSvelte.height).toBeCloseTo(compensatedAstro.height, 1);
	expect(compensatedSvelte.cardHeight).toBeCloseTo(
		compensatedAstro.cardHeight,
		1,
	);
	expect(compensatedSvelte.titleSize).toBeCloseTo(
		compensatedAstro.titleSize,
		1,
	);
	expect(compensatedSvelte.summarySize).toBeCloseTo(
		compensatedAstro.summarySize,
		1,
	);
	expect(compensatedSvelte.tagSize).toBeCloseTo(compensatedAstro.tagSize, 1);
	expect(compensatedSvelte.contentOverflows).toBe(false);

	await page.setViewportSize({ width: 2000, height: 900 });
	await gotoPage(page, "/");
	const restored = await readCardGeometry("astro");
	expect(restored.width).toBeCloseTo(compensatedAstro.width, 0);
	expect(restored.height).toBeCloseTo(464, 1);
	expect(restored.cardHeight).toBeCloseTo(464, 1);
	expect(restored.contentPaddingBlockStart).toBeCloseTo(20, 1);
	expect(restored.titleSize).toBeCloseTo(23.9, 1);
	expect(restored.summarySize).toBeCloseTo(16, 1);
	expect(restored.tagSize).toBeCloseTo(12, 1);
	expect(restored.metaSize).toBeCloseTo(14, 1);
	expect(restored.intrinsicSize).toContain("464px");
	expect(
		Math.abs(restored.coverHeight - compensatedAstro.coverHeight),
	).toBeLessThan(1);
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
