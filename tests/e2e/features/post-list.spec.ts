import { expect, test } from "@playwright/test";
import { gotoPage } from "../../support/navigation";
import { useStoredPreference } from "../../support/preferences";

test("fixed Grid view follows the post Feed container width", async ({
	page,
}) => {
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

test("category hub lists all categories and links to category pages", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1000, height: 900 });
	await gotoPage(page, "/category/");

	const hub = page.locator("[data-category-hub]");
	await expect(hub).toHaveAttribute("data-category-hub-view", "all");
	await expect(page.locator("#category-hub-title")).toHaveText("全部分类");
	await expect(
		page.locator(".category-hub-tab[aria-current='page']"),
	).toHaveText("全部分类");
	const activeTab = page.locator(".category-hub-tab[aria-current='page']");
	await activeTab.hover();
	const activeTabColors = await activeTab.evaluate((tab) => {
		const probe = document.createElement("span");
		probe.style.color = "var(--text-on-accent)";
		document.body.append(probe);
		const textOnAccent = getComputedStyle(probe).color;
		probe.remove();

		return {
			color: getComputedStyle(tab).color,
			textOnAccent,
		};
	});
	expect(activeTabColors.color).toBe(activeTabColors.textOnAccent);
	await expect(
		page.locator('.category-hub-tab[href="/category/recent/"]'),
	).toHaveText("最近更新");
	await expect(
		page.locator('.category-hub-tab[href="/category/recommended/"]'),
	).toHaveText("推荐阅读");

	const techCard = page.locator('[data-category-card="tech"]');
	await expect(techCard).toBeVisible();
	await expect(techCard.locator(".category-hub-card__main")).toHaveAttribute(
		"href",
		"/category/tech/",
	);
	await expect(
		techCard.locator(".category-hub-card__post").first(),
	).toBeVisible();

	await techCard.locator(".category-hub-card__main").click();
	await expect(page).toHaveURL(/\/category\/tech\/$/);
	await expect(page.locator("#category-filter-title")).toHaveText("技术");
});

test("category recommended view renders recommended posts", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1000, height: 900 });
	await gotoPage(page, "/category/recommended/");

	const hub = page.locator("[data-category-hub]");
	await expect(hub).toHaveAttribute("data-category-hub-view", "recommended");
	await expect(page.locator("#category-hub-title")).toHaveText("推荐阅读");
	await expect(
		page.locator(".category-hub-tab[aria-current='page']"),
	).toHaveText("推荐阅读");
	await expect(page.locator("#category-filter-title")).toHaveCount(0);

	const postList = page.locator("#category-recommended-post-list");
	await expect(postList).toHaveAttribute("data-post-list-renderer", "astro");
	await expect(postList.locator(":scope > .post-list__item")).toHaveCount(12);
	await page.locator('.category-hub-tab[href="/category/"]').click();
	await expect(page).toHaveURL(/\/category\/$/);
	await expect(hub).toHaveAttribute("data-category-hub-view", "all");
});

test("category recent view renders recently updated posts", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1000, height: 900 });
	await gotoPage(page, "/category/recent/");

	const hub = page.locator("[data-category-hub]");
	await expect(hub).toHaveAttribute("data-category-hub-view", "recent");
	await expect(page.locator("#category-hub-title")).toHaveText("最近更新");
	await expect(
		page.locator(".category-hub-tab[aria-current='page']"),
	).toHaveText("最近更新");
	await expect(page.locator("#category-filter-title")).toHaveCount(0);

	const postList = page.locator("#category-recent-post-list");
	await expect(postList).toHaveAttribute("data-post-list-renderer", "astro");
	await expect(postList.locator(":scope > .post-list__item")).toHaveCount(12);
	await page
		.locator('.category-hub-tab[href="/category/recommended/"]')
		.click();
	await expect(page).toHaveURL(/\/category\/recommended\/$/);
	await expect(hub).toHaveAttribute("data-category-hub-view", "recommended");
});

test("Grid Card height follows its cover while Content keeps a bounded budget", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1920, height: 1080 });
	await gotoPage(page, "/");

	const postList = page.locator('[data-post-list-renderer="astro"]').first();
	const firstCard = postList.locator(":scope > .post-list__item").first();
	const listingPage = postList.locator(
		"xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' listing-page ')][1]",
	);
	const setListingWidth = async (width: number) => {
		await listingPage.evaluate((node, nextWidth) => {
			const element = node as HTMLElement;
			element.style.width = `${nextWidth}px`;
			element.style.maxWidth = "none";
		}, width);
	};
	const readCardGeometry = () =>
		firstCard.evaluate((node) => {
			const card = node.matches(".home-post-card")
				? node
				: node.querySelector<HTMLElement>(".home-post-card")!;
			const summary = card.querySelector<HTMLElement>(
				".home-post-card__summary",
			)!;
			const tags = card.querySelector<HTMLElement>(
				".home-post-card__tags",
			)!;
			const content = card.querySelector<HTMLElement>(
				".home-post-card__content",
			)!;
			const tagsStyle = getComputedStyle(tags);
			const contentStyle = getComputedStyle(content);
			const cover = card.querySelector<HTMLElement>(
				".home-post-card__cover",
			)!;
			return {
				columnCount: getComputedStyle(
					node.parentElement!,
				).gridTemplateColumns.split(" ").length,
				height: Number.parseFloat(getComputedStyle(card).height),
				coverHeight: Number.parseFloat(getComputedStyle(cover).height),
				contentHeight: Number.parseFloat(contentStyle.height),
				gapBeforeTags:
					tags.offsetTop - (summary.offsetTop + summary.offsetHeight),
				tagsHeight: Number.parseFloat(tagsStyle.height),
				tagsPaddingBlockEnd: Number.parseFloat(
					tagsStyle.paddingBlockEnd,
				),
				tagsMarginBlockEnd: Number.parseFloat(tagsStyle.marginBlockEnd),
				contentPaddingBlockEnd: Number.parseFloat(
					contentStyle.paddingBlockEnd,
				),
				contentBottomGap:
					content.clientHeight - (tags.offsetTop + tags.offsetHeight),
				contentOverflows:
					content.scrollHeight > content.clientHeight + 1,
			};
		});

	await setListingWidth(607);
	const singleColumn = await readCardGeometry();
	expect(singleColumn.columnCount).toBe(1);
	expect(singleColumn.contentOverflows).toBe(false);

	await setListingWidth(608);
	const twoColumn = await readCardGeometry();
	expect(twoColumn.columnCount).toBe(2);
	expect(twoColumn.contentOverflows).toBe(false);
	expect(twoColumn.contentHeight).toBeCloseTo(singleColumn.contentHeight, 1);
	expect(twoColumn.coverHeight).toBeLessThan(singleColumn.coverHeight);
	expect(twoColumn.height).toBeLessThan(singleColumn.height);

	await listingPage.evaluate((node) => {
		const element = node as HTMLElement;
		element.style.removeProperty("width");
		element.style.removeProperty("max-width");
	});

	for (const width of [1243, 1247, 1280, 1281, 2000]) {
		await page.setViewportSize({ width, height: 900 });
		const geometry = await readCardGeometry();
		expect(geometry.height).toBeCloseTo(
			geometry.coverHeight + geometry.contentHeight + 2,
			1,
		);
		expect(geometry.contentHeight).toBeGreaterThanOrEqual(215);
		expect(geometry.contentHeight).toBeLessThanOrEqual(226);
		expect(geometry.gapBeforeTags).toBeGreaterThanOrEqual(10);
		expect(geometry.gapBeforeTags).toBeLessThanOrEqual(13);
		expect(geometry.tagsHeight).toBeGreaterThanOrEqual(55);
		expect(geometry.tagsHeight).toBeLessThanOrEqual(57);
		expect(geometry.tagsPaddingBlockEnd).toBe(0);
		expect(geometry.tagsMarginBlockEnd).toBe(0);
		expect(geometry.contentPaddingBlockEnd).toBeGreaterThanOrEqual(17);
		expect(geometry.contentPaddingBlockEnd).toBeLessThanOrEqual(21);
		expect(geometry.contentBottomGap).toBeCloseTo(
			geometry.contentPaddingBlockEnd,
			1,
		);
		expect(geometry.contentOverflows).toBe(false);
	}
});

test("fluid two-column post Grid fills the Feed and keeps the semantic gap", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1000, height: 900 });
	await gotoPage(page, "/");

	const postList = page.locator('[data-post-list-renderer="astro"]').first();
	const cards = postList.locator(":scope > .post-list__item");
	await expect(cards).toHaveCount(3);
	await expect(cards.first()).toHaveCSS("box-shadow", "none");

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

test("multi-column post Card derives height from Cover and Content across desktop compensation", async ({
	page,
}) => {
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
				contentHeight: Number.parseFloat(contentStyle.height),
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
	expect(compensatedAstro.cardHeight).toBeCloseTo(
		compensatedAstro.coverHeight + compensatedAstro.contentHeight + 2,
		1,
	);
	expect(compensatedAstro.height).toBeCloseTo(compensatedAstro.cardHeight, 1);
	expect(compensatedAstro.contentPaddingBlockStart).toBeCloseTo(18, 1);
	expect(compensatedAstro.titleSize).toBeCloseTo(20, 1);
	expect(compensatedAstro.summarySize).toBeCloseTo(14, 1);
	expect(compensatedAstro.tagSize).toBeCloseTo(12, 1);
	expect(compensatedAstro.metaSize).toBeCloseTo(12, 1);
	expect(compensatedAstro.intrinsicSize).toContain("400px");
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
	expect(compensatedSvelte.contentHeight).toBeCloseTo(
		compensatedAstro.contentHeight,
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
	expect(restored.cardHeight).toBeCloseTo(
		restored.coverHeight + restored.contentHeight + 2,
		1,
	);
	expect(restored.height).toBeCloseTo(restored.cardHeight, 1);
	expect(restored.contentPaddingBlockStart).toBeCloseTo(20, 1);
	expect(restored.titleSize).toBeCloseTo(20, 1);
	expect(restored.summarySize).toBeCloseTo(14, 1);
	expect(restored.tagSize).toBeCloseTo(12, 1);
	expect(restored.metaSize).toBeCloseTo(12, 1);
	expect(restored.intrinsicSize).toContain("400px");
	expect(
		Math.abs(restored.coverHeight - compensatedAstro.coverHeight),
	).toBeLessThan(1);
});

test("Grid Card typography stays fixed across the former root breakpoint", async ({
	page,
}) => {
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

test("legacy post list storage does not imply desktop page layout preference", async ({
	page,
}) => {
	await page.addInitScript(() => {
		localStorage.setItem("postListLayout", "list");
	});
	await page.setViewportSize({ width: 1400, height: 900 });
	await gotoPage(page, "/anime/");

	const grid = page.locator("#main-grid");
	await expect(grid).toHaveAttribute(
		"data-shell-strategy",
		"container-content",
	);
	await expect(grid).toHaveAttribute("data-desktop-layout", "content-right");
});

test("post list keeps Astro snapshots and switches to Svelte for tag pagination", async ({
	page,
}) => {
	await useStoredPreference(page, "live2d-companion-mounted", "0");
	await page.setViewportSize({ width: 1440, height: 900 });

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

test("category filter keeps one visual and responsive contract in tag mode", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await gotoPage(page, "/category/tech/");

	const filter = page.locator(".category-filter");
	const readFilterGeometry = () =>
		filter.evaluate((node) => {
			const rect = node.getBoundingClientRect();
			const style = getComputedStyle(node);
			return {
				width: rect.width,
				height: rect.height,
				borderRadius: style.borderRadius,
				padding: style.padding,
			};
		});
	const expectDimensionMatch = (received: number, expected: number) => {
		expect(Math.abs(received - expected)).toBeLessThanOrEqual(3);
	};

	await expect(filter).toHaveClass(/ds-surface-card/);
	await expect(filter).toContainText(/\d+ 篇文章/);
	const defaultGeometry = await readFilterGeometry();

	const tagLink = filter.locator('a[href^="/category/tech/?tag="]').first();
	await tagLink.click();
	await expect(page).toHaveURL(/\?tag=/);
	await expect(
		page.locator('[data-post-list-renderer="svelte"]'),
	).toBeVisible();
	await expect(filter).toHaveClass(/ds-surface-card/);
	await expect(
		filter.locator('a[href*="?tag="][aria-current="page"]'),
	).toContainText("#");
	await expect(page.locator(".post-taxonomy-nav")).toHaveCount(0);

	const tagGeometry = await readFilterGeometry();
	expectDimensionMatch(tagGeometry.width, defaultGeometry.width);
	expectDimensionMatch(tagGeometry.height, defaultGeometry.height);
	expect(tagGeometry.borderRadius).toBe(defaultGeometry.borderRadius);
	expect(tagGeometry.padding).toBe(defaultGeometry.padding);

	await page.setViewportSize({ width: 375, height: 812 });
	const mobileFilter = filter.locator(".category-filter__mobile");
	const filterOptions = filter.locator(".category-filter__options");
	await expect(mobileFilter).toBeVisible();
	await expect(filterOptions).toBeHidden();
	await mobileFilter.locator("summary").click();
	await expect(filterOptions).toBeVisible();
});

test("category tag index prefetches when idle and is reused for tag navigation", async ({
	page,
}) => {
	await useStoredPreference(page, "live2d-companion-mounted", "0");
	let indexRequests = 0;
	page.on("request", (request) => {
		if (new URL(request.url()).pathname === "/api/categories/tech.json/") {
			indexRequests += 1;
		}
	});

	await gotoPage(page, "/category/tech/");
	await expect(
		page.locator('[data-post-list-renderer="astro"]'),
	).toBeVisible();
	await expect.poll(() => indexRequests).toBe(1);

	const tagLinks = page.locator(
		'.category-filter a[href^="/category/tech/?tag="]',
	);
	const firstTagLink = tagLinks.first();
	await expect(firstTagLink).toBeVisible();
	await firstTagLink.evaluate((node) =>
		node.scrollIntoView({ block: "center", inline: "nearest" }),
	);
	await firstTagLink.click();
	await expect(
		page.locator('[data-post-list-renderer="svelte"]'),
	).toBeVisible();
	const loadedIndexRequests = indexRequests;
	expect(loadedIndexRequests).toBeGreaterThanOrEqual(1);
	expect(loadedIndexRequests).toBeLessThanOrEqual(2);

	const nextPage = page.locator(
		'#category-pagination a[aria-label="Next Page"]',
	);
	await expect(nextPage).toBeEnabled();
	await nextPage.click();
	await expect(page).toHaveURL(/tagPage=2/);
	await expect(
		page.locator('[data-post-list-renderer="svelte"]'),
	).toBeVisible();
	expect(indexRequests).toBe(loadedIndexRequests);

	await page.goBack();
	await expect(page).not.toHaveURL(/tagPage=2/);
	await expect(
		page.locator('[data-post-list-renderer="svelte"]'),
	).toBeVisible();
	expect(indexRequests).toBe(loadedIndexRequests);

	await tagLinks.nth(1).click();
	await expect(
		page.locator('[data-post-list-renderer="svelte"]'),
	).toBeVisible();
	expect(indexRequests).toBe(loadedIndexRequests);
});

test("category tag index skips constrained prefetch but loads in tag mode", async ({
	page,
}) => {
	await page.addInitScript(() => {
		Object.defineProperty(navigator, "connection", {
			configurable: true,
			value: { effectiveType: "4g", saveData: true },
		});
	});

	let indexRequests = 0;
	page.on("request", (request) => {
		if (new URL(request.url()).pathname === "/api/categories/tech.json/") {
			indexRequests += 1;
		}
	});

	await gotoPage(page, "/category/tech/");
	await page.waitForTimeout(1000);
	expect(indexRequests).toBe(0);

	await page
		.locator('.category-filter a[href^="/category/tech/?tag="]')
		.first()
		.click();
	await expect(
		page.locator('[data-post-list-renderer="svelte"]'),
	).toBeVisible();
	expect(indexRequests).toBe(1);
});

test("category tag index exposes a retry state after a request failure", async ({
	page,
}) => {
	let attempts = 0;
	await page.route("**/api/categories/tech.json/", async (route) => {
		attempts += 1;
		if (attempts === 1) {
			await route.fulfill({ status: 503, body: "unavailable" });
			return;
		}
		await route.fallback();
	});

	await gotoPage(page, "/category/tech/?tag=vue");
	const errorState = page.locator('[data-category-index-state="error"]');
	await expect(errorState).toBeVisible();
	await errorState.getByRole("button", { name: "重试" }).click();
	await expect(
		page.locator('[data-post-list-renderer="svelte"]'),
	).toBeVisible();
	expect(attempts).toBe(2);
});

test("unknown category tags render an empty result without loading the index", async ({
	page,
}) => {
	let indexRequests = 0;
	page.on("request", (request) => {
		if (new URL(request.url()).pathname === "/api/categories/tech.json/") {
			indexRequests += 1;
		}
	});

	await gotoPage(page, "/category/tech/?tag=missing-tag");
	await expect(
		page.locator('[data-post-list-renderer="svelte"]'),
	).toBeVisible();
	await expect(
		page.locator('[data-post-list-renderer="svelte"] .post-list__item'),
	).toHaveCount(0);
	await expect(page.locator(".category-filter")).toContainText("0 篇文章");
	expect(indexRequests).toBe(0);
});
