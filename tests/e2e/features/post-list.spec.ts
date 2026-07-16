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
	expect(compensatedAstro.titleSize).toBeCloseTo(20, 1);
	expect(compensatedAstro.summarySize).toBeCloseTo(14, 1);
	expect(compensatedAstro.tagSize).toBeCloseTo(12, 1);
	expect(compensatedAstro.metaSize).toBeCloseTo(12, 1);
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
	expect(compensatedSvelte.metaSize).toBeCloseTo(
		compensatedAstro.metaSize!,
		1,
	);
	expect(compensatedSvelte.contentOverflows).toBe(false);

	await page.setViewportSize({ width: 2000, height: 900 });
	await gotoPage(page, "/");
	const restored = await readCardGeometry("astro");
	expect(restored.width).toBeCloseTo(compensatedAstro.width, 0);
	expect(restored.height).toBeCloseTo(464, 1);
	expect(restored.cardHeight).toBeCloseTo(464, 1);
	expect(restored.contentPaddingBlockStart).toBeCloseTo(20, 1);
	expect(restored.titleSize).toBeCloseTo(20, 1);
	expect(restored.summarySize).toBeCloseTo(14, 1);
	expect(restored.tagSize).toBeCloseTo(12, 1);
	expect(restored.metaSize).toBeCloseTo(12, 1);
	expect(restored.intrinsicSize).toContain("464px");
	expect(
		Math.abs(restored.coverHeight - compensatedAstro.coverHeight),
	).toBeLessThan(1);
});

test("Grid Card typography stays fixed across the former root breakpoint", async ({
	page,
}) => {
	await useStoredPreference(page, "postListLayout", "grid");

	for (const width of [767, 768, 769]) {
		await page.setViewportSize({ width, height: 900 });
		await gotoPage(page, "/");

		const card = page.locator(".home-post-card").first();
		const typography = await card.evaluate((node) => {
			const readSize = (selector: string) =>
				Number.parseFloat(
					getComputedStyle(node.querySelector<HTMLElement>(selector)!)
						.fontSize,
				);
			return {
				root: Number.parseFloat(
					getComputedStyle(document.documentElement).fontSize,
				),
				title: readSize(".home-post-card__title"),
				summary: readSize(".home-post-card__summary"),
				meta: readSize(".home-post-card__meta"),
				tag: readSize(".home-post-card__tag"),
			};
		});

		expect(typography).toEqual({
			root: 16,
			title: 20,
			summary: 14,
			meta: 12,
			tag: 12,
		});
	}
});

test("Grid Card reserves stable content slots and exposes full clipped text", async ({
	page,
}) => {
	await useStoredPreference(page, "postListLayout", "grid");
	await page.setViewportSize({ width: 1536, height: 900 });
	await gotoPage(page, "/");

	const card = page.locator(".home-post-card").first();
	const contract = await card.evaluate((node) => {
		const title = node.querySelector<HTMLElement>(
			".home-post-card__title",
		)!;
		const summary = node.querySelector<HTMLElement>(
			".home-post-card__summary",
		)!;
		const meta = node.querySelector<HTMLElement>(".home-post-card__meta")!;
		const categoryMeta = meta.querySelector<HTMLElement>(
			".home-post-card__meta-item--category",
		)!;
		const wordsMeta = meta.querySelector<HTMLElement>(
			".home-post-card__meta-item--words",
		)!;
		const categoryLink = categoryMeta.querySelector<HTMLElement>(
			".home-post-card__meta-link",
		)!;
		categoryLink.textContent = "这是一个用于验证收缩规则的超长文章分类";
		const tags = node.querySelector<HTMLElement>(".home-post-card__tags")!;
		const visibleTags = Array.from(
			tags.querySelectorAll<HTMLElement>(
				".home-post-card__tag:not([hidden])",
			),
		);
		return {
			titleText: title.textContent?.trim(),
			titleTooltip: title.title,
			titleHeight: title.getBoundingClientRect().height,
			titleLineHeight: Number.parseFloat(
				getComputedStyle(title).lineHeight,
			),
			summaryText: summary.textContent?.trim(),
			summaryTooltip: summary.title,
			summaryHeight: summary.getBoundingClientRect().height,
			summaryLineHeight: Number.parseFloat(
				getComputedStyle(summary).lineHeight,
			),
			metaDisplay: getComputedStyle(meta).display,
			metaWraps: meta.scrollHeight > meta.clientHeight + 1,
			categoryToWordsGap:
				wordsMeta.getBoundingClientRect().left -
				categoryMeta.getBoundingClientRect().right,
			categoryIsClipped:
				categoryLink.scrollWidth > categoryLink.clientWidth,
			wordsStayInsideMeta:
				wordsMeta.getBoundingClientRect().right <=
				meta.getBoundingClientRect().right + 1,
			tagRows: new Set(visibleTags.map((tag) => tag.offsetTop)).size,
			tagsOverflow: tags.scrollHeight > tags.clientHeight + 1,
		};
	});

	expect(contract.titleTooltip).toBe(contract.titleText);
	expect(contract.titleHeight).toBeCloseTo(contract.titleLineHeight, 1);
	expect(contract.summaryTooltip).toBe(contract.summaryText);
	expect(contract.summaryHeight).toBeCloseTo(
		contract.summaryLineHeight * 2,
		1,
	);
	expect(contract.metaDisplay).toBe("flex");
	expect(contract.metaWraps).toBe(false);
	expect(contract.categoryToWordsGap).toBeGreaterThan(0);
	expect(contract.categoryToWordsGap).toBeLessThanOrEqual(10);
	expect(contract.categoryIsClipped).toBe(true);
	expect(contract.wordsStayInsideMeta).toBe(true);
	expect(contract.tagRows).toBeLessThanOrEqual(2);
	expect(contract.tagsOverflow).toBe(false);

	const pinnedCard = page
		.locator('.home-post-card[data-pinned="true"]')
		.first();
	await expect(
		pinnedCard.locator(".home-post-card__pinned-badge"),
	).toHaveText("置顶");
	await expect(pinnedCard.locator(".home-post-card__pin")).toHaveCount(0);
});

test("Grid Card hides Meta icons only at the confirmed compact threshold", async ({
	page,
}) => {
	await useStoredPreference(page, "postListLayout", "grid");
	await page.setViewportSize({ width: 1536, height: 900 });
	await gotoPage(page, "/");

	const postList = page.locator('[data-post-list-renderer="astro"]').first();
	const card = postList.locator(":scope > .post-list__item").first();
	await card.evaluate((node) => {
		const list = node.parentElement as HTMLElement;
		list.style.display = "block";
		list.style.width = "304px";
		node.style.width = "304px";
		const category = node.querySelector<HTMLElement>(
			".home-post-card__meta-link",
		);
		const words = node.querySelector<HTMLElement>(
			".home-post-card__meta-item--words span",
		);
		if (category) category.textContent = "前端工程实践指南";
		if (words) words.textContent = "9.9万字";
	});

	const icons = card.locator(".home-post-card__meta-icon");
	await expect(icons.first()).toHaveCSS("display", "none");
	const compact = await card.evaluate((node) => ({
		categoryWidth:
			node
				.querySelector<HTMLElement>(".home-post-card__meta-link")
				?.getBoundingClientRect().width ?? 0,
		wordsVisible:
			getComputedStyle(
				node.querySelector<HTMLElement>(
					".home-post-card__meta-item--words",
				)!,
			).display !== "none",
	}));
	expect(compact.categoryWidth).toBeGreaterThanOrEqual(60);
	expect(compact.wordsVisible).toBe(true);

	await card.evaluate((node) => {
		const list = node.parentElement as HTMLElement;
		list.style.width = "305px";
		node.style.width = "305px";
	});
	await expect(icons.first()).not.toHaveCSS("display", "none");
	const regularCategoryWidth = await card
		.locator(".home-post-card__meta-link")
		.evaluate((node) => node.getBoundingClientRect().width);
	expect(regularCategoryWidth).toBeGreaterThanOrEqual(60);
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
	const expectSharedCardStructure = async (renderer: "astro" | "svelte") => {
		const card = page
			.locator(`[data-post-list-renderer="${renderer}"]`)
			.first()
			.locator(":scope > .post-list__item")
			.first();

		await expect(card).toHaveAttribute("data-has-cover", /true|false/);
		await expect(card).toHaveAttribute(
			"data-has-description",
			/true|false/,
		);
		await expect(
			card.locator(":scope > .home-post-card__content"),
		).toHaveCount(1);
		await expect(
			card.locator(":scope > .home-post-card__cover"),
		).toHaveCount(1);
		await expect(card.locator(".home-post-card__title")).toHaveCount(1);
		await expect(card.locator(".home-post-card__meta")).toHaveCount(1);
		await expect(card.locator(".home-post-card__meta-item")).toHaveCount(3);
		await expect(card.locator(".home-post-card__summary")).toHaveCount(1);
		await expect(card.locator(".home-post-card__tags")).toHaveCount(1);
	};

	await gotoPage(page, "/");

	const astroList = page.locator('[data-post-list-renderer="astro"]').first();
	await expect(astroList).toBeVisible();
	await expect(
		astroList.locator(":scope > .post-list__item").first(),
	).toHaveClass(/ds-surface-card/);
	await expectSharedCardStructure("astro");

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
	await expectSharedCardStructure("svelte");
});
