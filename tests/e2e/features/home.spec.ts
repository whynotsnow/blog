import { expect, test } from "@playwright/test";
import { gotoPage } from "../../support/navigation";

test("home sections expose configured guide destinations", async ({ page }) => {
	await page.setViewportSize({ width: 1536, height: 900 });
	await gotoPage(page, "/");

	const sections = page.locator(".home-section");
	await expect(sections).toHaveCount(3);
	await expect(sections.nth(0).locator("h2")).toHaveText("最近更新");
	await expect(sections.nth(1).locator("h2")).toHaveText("推荐阅读");
	await expect(sections.nth(2).locator("h2")).toHaveText("文章分类");
	await expect(
		sections
			.nth(0)
			.locator('.home-section__link[href="/category/recent/"]'),
	).toBeVisible();
	await expect(
		sections
			.nth(1)
			.locator('.home-section__link[href="/category/recommended/"]'),
	).toBeVisible();
	await expect(
		sections.nth(2).locator('.home-section__link[href="/category/"]'),
	).toBeVisible();
	await expect(sections.locator(".home-section__link")).toHaveText([
		"更多",
		"更多",
		"全部分类",
	]);

	for (const [index, expectedCount] of [3, 3].entries()) {
		const cards = sections.nth(index).locator(".post-list__item");
		await expect(cards).toHaveCount(expectedCount);
		await expect(cards.locator(".post-list-card__cover")).toHaveCount(
			expectedCount,
		);
		const heights = await cards.evaluateAll((items) =>
			items.map((item) => getComputedStyle(item).height),
		);
		expect(new Set(heights).size).toBe(1);
		expect(Number.parseFloat(heights[0])).toBeGreaterThan(350);
	}
	await expect(sections.nth(2).locator("[data-category-card]")).toHaveCount(
		5,
	);
	await expect(
		sections.nth(2).locator('[data-category-card="tech"]'),
	).toBeVisible();
	await expect(
		sections.nth(2).locator(".category-hub-card__posts"),
	).toHaveCount(0);

	const desktopSectionGap = await page
		.locator(".home-page")
		.evaluate((node) => Number.parseFloat(getComputedStyle(node).rowGap));
	expect(desktopSectionGap).toBeCloseTo(48, 1);

	await page.setViewportSize({ width: 375, height: 812 });
	const mobileSectionGap = await page
		.locator(".home-page")
		.evaluate((node) => Number.parseFloat(getComputedStyle(node).rowGap));
	expect(mobileSectionGap).toBeCloseTo(32, 1);
});

test("home section headers follow Feed width and responsive typography", async ({
	page,
}) => {
	const readGeometry = () =>
		page.evaluate(() => {
			const header = document.querySelector<HTMLElement>(
				".home-section__header",
			)!;
			const title = header.querySelector<HTMLElement>(
				".home-section__title",
			)!;
			const feed =
				document.querySelector<HTMLElement>("#post-list-recent")!;
			const support = document.querySelector<HTMLElement>(
				".support-module-slot",
			)!;
			const grid = document.querySelector<HTMLElement>("#main-grid")!;
			const headerRect = header.getBoundingClientRect();
			const feedRect = feed.getBoundingClientRect();
			const supportRect = support.getBoundingClientRect();
			const gridRect = grid.getBoundingClientRect();
			const section = header.closest<HTMLElement>(".home-section")!;
			const sectionGap = Number.parseFloat(
				getComputedStyle(section).rowGap,
			);
			const feedGap = Number.parseFloat(getComputedStyle(feed).rowGap);

			return {
				headerLeft: headerRect.left,
				headerRight: headerRect.right,
				headerWidth: headerRect.width,
				feedLeft: feedRect.left,
				feedRight: feedRect.right,
				feedWidth: feedRect.width,
				supportLeft: supportRect.left,
				supportRight: supportRect.right,
				gridLeft: gridRect.left,
				gridRight: gridRect.right,
				titleSize: Number.parseFloat(getComputedStyle(title).fontSize),
				sectionGap,
				feedGap,
				headerToFeedGap: feedRect.top - headerRect.bottom,
				columnCount:
					getComputedStyle(feed).gridTemplateColumns.split(" ")
						.length,
			};
		});

	const samples: Awaited<ReturnType<typeof readGeometry>>[] = [];
	for (const width of [375, 600, 639, 640, 1280]) {
		await page.setViewportSize({ width, height: 900 });
		await gotoPage(page, "/");
		const geometry = await readGeometry();
		samples.push(geometry);

		expect(Math.abs(geometry.headerLeft - geometry.feedLeft)).toBeLessThan(
			1,
		);
		expect(
			Math.abs(geometry.headerRight - geometry.feedRight),
		).toBeLessThan(1);
		expect(
			Math.abs(geometry.headerWidth - geometry.feedWidth),
		).toBeLessThan(1);
		if (width < 880) {
			expect(
				Math.abs(geometry.supportLeft - geometry.gridLeft),
			).toBeLessThan(1);
			expect(
				Math.abs(geometry.supportRight - geometry.gridRight),
			).toBeLessThan(1);
		}
		expect(geometry.titleSize).toBeCloseTo(18, 1);
		expect(geometry.headerToFeedGap).toBeCloseTo(geometry.sectionGap, 1);
		expect(geometry.sectionGap).toBeCloseTo(geometry.feedGap, 1);
	}

	expect(samples[0].headerWidth).toBeCloseTo(343, 0);
	expect(samples[1].headerWidth).toBeCloseTo(400, 0);
	expect(samples[2].columnCount).toBe(1);
	expect(samples[3].headerWidth).toBeCloseTo(608, 0);
	expect(samples[3].columnCount).toBe(2);
	expect(samples.at(-1)!.titleSize).toBeCloseTo(18, 1);
});
