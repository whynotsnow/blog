import { expect, test } from "@playwright/test";
import { gotoPage } from "../../support/navigation";
import { useStoredPreference } from "../../support/preferences";

test("responsive width budgets preserve Card and support module stability", async ({
	page,
}) => {
	await useStoredPreference(page, "postListLayout", "grid");
	await page.setViewportSize({ width: 1000, height: 900 });
	await gotoPage(page, "/");

	const mainGrid = page.locator("#main-grid");
	const postList = page.locator('[data-post-list-renderer="astro"]').first();
	const readFirstTrackWidth = () =>
		postList.evaluate((node) =>
			Number.parseFloat(getComputedStyle(node).gridTemplateColumns),
		);
	const mediumCardWidth = await readFirstTrackWidth();
	expect(
		await mainGrid.evaluate(
			(node) =>
				getComputedStyle(node).gridTemplateColumns.split(" ").length,
		),
	).toBe(2);
	expect(
		await postList.evaluate(
			(node) =>
				getComputedStyle(node).gridTemplateColumns.split(" ").length,
		),
	).toBe(2);

	await page.setViewportSize({ width: 1280, height: 900 });
	await expect(
		page.locator(".page-support-region .profile-card"),
	).toBeVisible();
	await expect
		.poll(() =>
			postList.evaluate(
				(node) =>
					getComputedStyle(node).gridTemplateColumns.split(" ")
						.length,
			),
		)
		.toBe(3);
	const compressedLargeCardWidth = await readFirstTrackWidth();
	const compressedSidebarWidth = await page
		.locator(".page-support-region")
		.evaluate((node) => node.getBoundingClientRect().width);
	expect(compressedLargeCardWidth).toBeGreaterThanOrEqual(295);
	expect(compressedLargeCardWidth).toBeLessThanOrEqual(323);
	expect(
		Math.abs(compressedLargeCardWidth - mediumCardWidth) / mediumCardWidth,
	).toBeLessThan(0.12);
	expect(compressedSidebarWidth).toBeGreaterThanOrEqual(248 - 1);
	expect(compressedSidebarWidth).toBeLessThanOrEqual(272 + 1);

	await page.setViewportSize({ width: 1920, height: 1080 });
	await expect
		.poll(() =>
			postList.evaluate(
				(node) =>
					getComputedStyle(node).gridTemplateColumns.split(" ")
						.length,
			),
		)
		.toBe(3);
	const maximumCardWidth = await readFirstTrackWidth();
	const maximumSidebarWidth = await page
		.locator(".page-support-region")
		.evaluate((node) => node.getBoundingClientRect().width);
	const shellGeometry = await page.evaluate(() => {
		const shell = document.querySelector<HTMLElement>(".main-grid-shell")!;
		const grid = document.querySelector<HTMLElement>("#main-grid")!;
		const banner = document.querySelector<HTMLElement>("#banner-wrapper")!;
		const navbar = document.querySelector<HTMLElement>(
			"#navbar > .navbar__inner--container-content",
		)!;
		const shellRect = shell.getBoundingClientRect();
		const gridRect = grid.getBoundingClientRect();
		const bannerRect = banner.getBoundingClientRect();
		const navbarRect = navbar.getBoundingClientRect();
		const shellStyle = getComputedStyle(shell);
		return {
			shellWidth: shellRect.width,
			shellContentWidth:
				shellRect.width -
				Number.parseFloat(shellStyle.paddingLeft) -
				Number.parseFloat(shellStyle.paddingRight),
			gridWidth: gridRect.width,
			bannerWidth: bannerRect.width,
			navbarWidth: navbarRect.width,
			leftMargin: gridRect.left - shellRect.left,
			rightMargin: shellRect.right - gridRect.right,
		};
	});

	expect(
		await mainGrid.evaluate(
			(node) =>
				getComputedStyle(node).gridTemplateColumns.split(" ").length,
		),
	).toBe(2);
	expect(maximumCardWidth).toBeGreaterThan(compressedLargeCardWidth);
	expect(maximumCardWidth).toBeLessThanOrEqual(323);
	expect(maximumSidebarWidth).toBeCloseTo(272, 0);
	expect(shellGeometry.shellWidth).toBeLessThanOrEqual(1280 + 1);
	expect(shellGeometry.bannerWidth).toBeCloseTo(1920, 0);
	expect(shellGeometry.gridWidth).toBeLessThanOrEqual(1280 + 1);
	expect(
		Math.abs(shellGeometry.shellWidth - shellGeometry.gridWidth),
	).toBeLessThan(1);
	expect(
		Math.abs(shellGeometry.navbarWidth - shellGeometry.shellContentWidth),
	).toBeLessThan(1);
	expect(
		Math.abs(shellGeometry.leftMargin - shellGeometry.rightMargin),
	).toBeLessThan(1);
	expect(
		await page
			.locator(".support-module-slot")
			.evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
	).toBe(true);
});

test("container-content pages keep supported widths and reading measures", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1536, height: 900 });

	const readGeometry = async () =>
		page.evaluate(() => {
			const grid = document.querySelector<HTMLElement>("#main-grid")!;
			const support = document.querySelector<HTMLElement>(
				".page-support-region",
			);
			const navbar = document.querySelector<HTMLElement>(
				"#navbar > .navbar__inner--container-content",
			)!;
			return {
				gridWidth: grid.getBoundingClientRect().width,
				supportWidth: support?.getBoundingClientRect().width ?? 0,
				navbarWidth: navbar.getBoundingClientRect().width,
			};
		});

	await gotoPage(page, "/");
	const home = await readGeometry();
	expect(home.supportWidth).toBeGreaterThanOrEqual(248 - 1);
	expect(home.supportWidth).toBeLessThanOrEqual(272 + 1);

	for (const pathname of ["/category/tech/", "/posts/markdown-tutorial/"]) {
		await gotoPage(page, pathname);
		const geometry = await readGeometry();
		expect(geometry.supportWidth).toBeGreaterThanOrEqual(248 - 1);
		expect(geometry.supportWidth).toBeLessThanOrEqual(272 + 1);
		expect(geometry.gridWidth).toBeLessThanOrEqual(1280 + 1);
		expect(geometry.navbarWidth).toBeCloseTo(home.navbarWidth, 0);
	}

	await gotoPage(page, "/posts/markdown-tutorial/");
	const readingWidth = await page
		.locator(".post-detail__content")
		.evaluate((node) => node.getBoundingClientRect().width);
	expect(readingWidth).toBeLessThanOrEqual(768 + 1);
});

test("container breakpoints retain minimum safe budgets after Shell contraction", async ({
	page,
}) => {
	await useStoredPreference(page, "postListLayout", "grid");
	await page.setViewportSize({ width: 1920, height: 1080 });
	await gotoPage(page, "/");

	const shell = page.locator(".main-grid-shell");
	const mainGrid = page.locator("#main-grid");
	const postList = page.locator('[data-post-list-renderer="astro"]').first();
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
	const readFeedGeometry = () =>
		postList.evaluate((node) => {
			const columns = getComputedStyle(node)
				.gridTemplateColumns.split(" ")
				.map(Number.parseFloat);
			return {
				columnCount: columns.length,
				firstCardWidth: columns[0] ?? 0,
			};
		});

	await setListingWidth(607);
	expect((await readFeedGeometry()).columnCount).toBe(1);
	await setListingWidth(608);
	const twoColumnMinimum = await readFeedGeometry();
	expect(twoColumnMinimum.columnCount).toBe(2);
	expect(twoColumnMinimum.firstCardWidth).toBeCloseTo(296, 0);
	await setListingWidth(931);
	expect((await readFeedGeometry()).columnCount).toBe(2);
	await setListingWidth(932);
	const threeColumnMinimum = await readFeedGeometry();
	expect(threeColumnMinimum.columnCount).toBe(3);
	expect(threeColumnMinimum.firstCardWidth).toBeCloseTo(300, 0);

	await listingPage.evaluate((node) => {
		const element = node as HTMLElement;
		element.style.removeProperty("width");
		element.style.removeProperty("max-width");
	});

	const setShellWidth = async (width: number) => {
		await shell.evaluate((node, nextWidth) => {
			const element = node as HTMLElement;
			element.style.width = `${nextWidth}px`;
			element.style.maxWidth = "none";
		}, width);
	};
	const readShellGeometry = () =>
		mainGrid.evaluate((node) => {
			const tracks = getComputedStyle(node)
				.gridTemplateColumns.split(" ")
				.map(Number.parseFloat);
			const feed = node
				.querySelector<HTMLElement>(".page-main-content")
				?.getBoundingClientRect();
			const support = node
				.querySelector<HTMLElement>(".page-support-region")
				?.getBoundingClientRect();
			return {
				trackCount: tracks.length,
				feedWidth: feed?.width ?? 0,
				supportWidth: support?.width ?? 0,
			};
		});

	await setShellWidth(879);
	expect((await readShellGeometry()).trackCount).toBe(1);
	await setShellWidth(880);
	const supportedTwoColumnMinimum = await readShellGeometry();
	expect(supportedTwoColumnMinimum.trackCount).toBe(2);
	expect(supportedTwoColumnMinimum.feedWidth).toBeCloseTo(608, 0);
	expect(supportedTwoColumnMinimum.supportWidth).toBeCloseTo(256, 0);
	await setShellWidth(1199);
	const supportedTwoColumnMaximum = await readShellGeometry();
	expect(supportedTwoColumnMaximum.feedWidth).toBeCloseTo(656, 0);
	expect(supportedTwoColumnMaximum.supportWidth).toBeCloseTo(272, 0);
	await setShellWidth(1200);
	const supportedThreeColumnMinimum = await readShellGeometry();
	expect(supportedThreeColumnMinimum.trackCount).toBe(2);
	expect(supportedThreeColumnMinimum.feedWidth).toBeCloseTo(932, 0);
	expect(supportedThreeColumnMinimum.supportWidth).toBeCloseTo(252, 0);
});

test("container-content pages do not inherit legacy root scaling", async ({
	page,
}) => {
	for (const width of [375, 767, 768, 769, 1280, 1281, 1920]) {
		await page.setViewportSize({ width, height: 900 });
		await gotoPage(page, "/");
		expect(
			await page.evaluate(() =>
				Number.parseFloat(
					getComputedStyle(document.documentElement).fontSize,
				),
			),
		).toBe(16);
	}
});

test("container-content compensates shared Shell type without resizing its containers", async ({
	page,
}) => {
	const readSharedShell = () =>
		page.evaluate(() => {
			const banner =
				document.querySelector<HTMLElement>("#banner-wrapper")!;
			const bannerTitle =
				document.querySelector<HTMLElement>(".banner-title")!;
			const bannerSubtitle =
				document.querySelector<HTMLElement>(".banner-subtitle")!;
			const navbarInner = document.querySelector<HTMLElement>(
				"#navbar > .navbar__inner",
			)!;
			const navbarLink = document.querySelector<HTMLElement>(
				"#navbar .navbar__link",
			)!;
			const footerMeta =
				document.querySelector<HTMLElement>(".site-footer__meta")!;
			const footerStats =
				document.querySelector<HTMLElement>(".footer-stats")!;
			const footerStatsContent = document.querySelector<HTMLElement>(
				".footer-stats__content",
			)!;
			const footerMetaRow = document.querySelector<HTMLElement>(
				".site-footer__meta-row:not(:last-child)",
			)!;
			const mainContent =
				document.querySelector<HTMLElement>(".page-main-content")!;
			const rootStyle = getComputedStyle(document.documentElement);

			return {
				bannerStrategy: banner.dataset.shellStrategy,
				bannerHeight: banner.getBoundingClientRect().height,
				bannerTitleSize: Number.parseFloat(
					getComputedStyle(bannerTitle).fontSize,
				),
				bannerSubtitleSize: Number.parseFloat(
					getComputedStyle(bannerSubtitle).fontSize,
				),
				navbarHeight: navbarInner.getBoundingClientRect().height,
				navbarWidth: navbarInner.getBoundingClientRect().width,
				navbarFontSize: Number.parseFloat(
					getComputedStyle(navbarLink).fontSize,
				),
				mainContentOffset: Number.parseFloat(
					rootStyle.getPropertyValue("--main-content-offset"),
				),
				pageEntryClearance: Number.parseFloat(
					getComputedStyle(mainContent).scrollMarginBlockStart,
				),
				footerWidth: footerMeta
					.closest(".site-footer")!
					.getBoundingClientRect().width,
				footerMetaSize: Number.parseFloat(
					getComputedStyle(footerMeta).fontSize,
				),
				footerStatsSize: Number.parseFloat(
					getComputedStyle(footerStats).fontSize,
				),
				footerStatsColumnGap: Number.parseFloat(
					getComputedStyle(footerStatsContent).columnGap,
				),
				footerStatsWrapRowGap: Number.parseFloat(
					getComputedStyle(footerStatsContent).rowGap,
				),
				footerMetaRowGap: Number.parseFloat(
					getComputedStyle(footerMetaRow).marginBlockEnd,
				),
			};
		});

	await page.setViewportSize({ width: 1536, height: 900 });
	await gotoPage(page, "/");
	const compensated = await readSharedShell();
	expect(compensated.bannerStrategy).toBe("container-content");
	expect(compensated.bannerHeight).toBeCloseTo(585, 0);
	expect(compensated.bannerTitleSize).toBeCloseTo(86.4, 1);
	expect(compensated.bannerSubtitleSize).toBeCloseTo(27, 1);
	expect(compensated.navbarFontSize).toBeCloseTo(14.4, 1);
	expect(compensated.footerMetaSize).toBeCloseTo(12.6, 1);
	expect(compensated.footerStatsSize).toBeCloseTo(11.7, 1);
	expect(compensated.footerStatsColumnGap).toBeCloseTo(21.6, 1);
	expect(compensated.footerStatsWrapRowGap).toBeCloseTo(7.2, 1);
	expect(compensated.footerMetaRowGap).toBeCloseTo(7.2, 1);
	expect(compensated.navbarHeight).toBeCloseTo(64.8, 1);
	expect(compensated.mainContentOffset).toBeCloseTo(79.2, 1);
	expect(compensated.pageEntryClearance).toBeCloseTo(93.6, 1);

	for (const pathname of ["/category/tech/", "/posts/markdown-tutorial/"]) {
		await gotoPage(page, pathname);
		const contentPage = await readSharedShell();
		expect(contentPage.bannerStrategy).toBe("container-content");
		expect(contentPage.bannerHeight).toBeCloseTo(
			compensated.bannerHeight,
			0,
		);
		expect(contentPage.navbarFontSize).toBeCloseTo(
			compensated.navbarFontSize,
			1,
		);
		expect(contentPage.footerMetaSize).toBeCloseTo(
			compensated.footerMetaSize,
			1,
		);
		expect(contentPage.footerStatsSize).toBeCloseTo(
			compensated.footerStatsSize,
			1,
		);
		expect(contentPage.footerStatsColumnGap).toBeCloseTo(
			compensated.footerStatsColumnGap,
			1,
		);
		expect(contentPage.footerStatsWrapRowGap).toBeCloseTo(
			compensated.footerStatsWrapRowGap,
			1,
		);
		expect(contentPage.footerMetaRowGap).toBeCloseTo(
			compensated.footerMetaRowGap,
			1,
		);
		expect(contentPage.navbarHeight).toBeCloseTo(
			compensated.navbarHeight,
			0,
		);
		expect(contentPage.mainContentOffset).toBeCloseTo(
			compensated.mainContentOffset,
			1,
		);
	}

	await page.setViewportSize({ width: 2000, height: 900 });
	await gotoPage(page, "/");
	const restored = await readSharedShell();
	expect(restored.bannerHeight).toBeCloseTo(compensated.bannerHeight, 0);
	expect(restored.bannerTitleSize).toBeCloseTo(90, 1);
	expect(restored.bannerSubtitleSize).toBeCloseTo(30, 1);
	expect(restored.navbarFontSize).toBeCloseTo(16, 1);
	expect(restored.footerMetaSize).toBeCloseTo(14, 1);
	expect(restored.footerStatsSize).toBeCloseTo(13, 1);
	expect(restored.footerStatsColumnGap).toBeCloseTo(24, 1);
	expect(restored.footerStatsWrapRowGap).toBeCloseTo(8, 1);
	expect(restored.footerMetaRowGap).toBeCloseTo(8, 1);
	expect(restored.navbarHeight).toBeCloseTo(72, 0);
	expect(restored.mainContentOffset).toBeCloseTo(88, 1);
	expect(restored.pageEntryClearance).toBeCloseTo(104, 1);
	expect(restored.navbarWidth).toBeGreaterThanOrEqual(
		compensated.navbarWidth,
	);
	expect(
		Math.abs(restored.footerWidth - compensated.footerWidth),
	).toBeLessThan(1);
});

test("category filter and post TOC follow their owning width budgets", async ({
	page,
}) => {
	await page.setViewportSize({ width: 375, height: 812 });
	await gotoPage(page, "/category/tech/");
	const mobileFilter = page.locator(".category-filter__mobile");
	const filterOptions = page.locator(".category-filter__options");
	await expect(mobileFilter).toBeVisible();
	await expect(filterOptions).toBeHidden();
	await mobileFilter.locator("summary").click();
	await expect(filterOptions).toBeVisible();

	await page.setViewportSize({ width: 900, height: 900 });
	await expect(mobileFilter).toBeHidden();
	await expect(filterOptions).toBeVisible();

	await page.setViewportSize({ width: 1280, height: 900 });
	await gotoPage(page, "/posts/markdown-tutorial/");
	await expect(page.locator(".sidebar-toc-region--container")).toHaveCount(0);
	await expect(page.locator(".post-support__toc")).toBeVisible();
	await expect(
		page.locator(".post-support__toc table-of-contents#toc a").first(),
	).toBeVisible();

	const supportTocGeometry = await page.evaluate(() => {
		const grid = document.querySelector<HTMLElement>("#main-grid")!;
		const main = document.querySelector<HTMLElement>(".page-main-content")!;
		const support = document.querySelector<HTMLElement>(
			".page-support-region",
		)!;
		const article = document.querySelector<HTMLElement>(
			".post-detail__content",
		)!;
		const gridRect = grid.getBoundingClientRect();
		const mainRect = main.getBoundingClientRect();
		const supportRect = support.getBoundingClientRect();
		const articleRect = article.getBoundingClientRect();
		return {
			gridRight: gridRect.right,
			mainRight: mainRect.right,
			supportLeft: supportRect.left,
			supportRight: supportRect.right,
			supportWidth: supportRect.width,
			articleWidth: articleRect.width,
		};
	});
	expect(supportTocGeometry.supportLeft).toBeGreaterThanOrEqual(
		supportTocGeometry.mainRight,
	);
	expect(supportTocGeometry.supportRight).toBeLessThanOrEqual(
		supportTocGeometry.gridRight + 1,
	);
	expect(supportTocGeometry.supportWidth).toBeGreaterThanOrEqual(248 - 1);
	expect(supportTocGeometry.supportWidth).toBeLessThanOrEqual(272 + 1);
	expect(supportTocGeometry.articleWidth).toBeLessThanOrEqual(768 + 1);
});

test("layout breakpoint boundaries do not overlap", async ({ page }) => {
	await useStoredPreference(page, "wallpaperMode", "banner");
	await page.setViewportSize({ width: 479, height: 812 });
	await gotoPage(page, "/");

	const banner = page.locator("#banner-wrapper");
	expect(
		await banner.evaluate(
			(node) =>
				Number.parseFloat(getComputedStyle(node).height) /
				window.innerHeight,
		),
	).toBeCloseTo(0.7, 2);

	await page.setViewportSize({ width: 480, height: 812 });
	expect(
		await banner.evaluate(
			(node) =>
				Number.parseFloat(getComputedStyle(node).height) /
				window.innerHeight,
		),
	).toBeCloseTo(0.75, 2);

	const mainGrid = page.locator("#main-grid");
	const postList = page.locator('[data-post-list-renderer="astro"]').first();
	await page.setViewportSize({ width: 900, height: 812 });
	const supportRegion = page.locator(".page-support-region");
	await expect(supportRegion).toBeVisible();
	expect(
		await page
			.locator(".page-support-region .profile-card")
			.evaluate(
				(node) =>
					getComputedStyle(node).gridTemplateColumns.split(" ")
						.length,
			),
	).toBe(2);
	await expect(page.locator(".footer-stats")).toHaveCount(1);
	expect(
		await mainGrid.evaluate(
			(node) =>
				getComputedStyle(node).gridTemplateColumns.split(" ").length,
		),
	).toBe(1);
	expect(
		await postList.evaluate(
			(node) =>
				getComputedStyle(node).gridTemplateColumns.split(" ").length,
		),
	).toBe(2);

	await page.setViewportSize({ width: 920, height: 812 });
	await expect(supportRegion).toBeVisible();
	expect(
		await mainGrid.evaluate(
			(node) =>
				getComputedStyle(node).gridTemplateColumns.split(" ").length,
		),
	).toBe(2);
	expect(
		await postList.evaluate(
			(node) =>
				getComputedStyle(node).gridTemplateColumns.split(" ").length,
		),
	).toBe(2);

	await page.setViewportSize({ width: 1024, height: 812 });
	expect(
		await mainGrid.evaluate(
			(node) =>
				getComputedStyle(node).gridTemplateColumns.split(" ").length,
		),
	).toBe(2);
	expect(
		await postList.evaluate(
			(node) =>
				getComputedStyle(node).gridTemplateColumns.split(" ").length,
		),
	).toBe(2);

	await page.setViewportSize({ width: 1280, height: 812 });
	expect(
		await mainGrid.evaluate(
			(node) =>
				getComputedStyle(node).gridTemplateColumns.split(" ").length,
		),
	).toBe(2);
	expect(
		await postList.evaluate(
			(node) =>
				getComputedStyle(node).gridTemplateColumns.split(" ").length,
		),
	).toBe(3);

	await page.setViewportSize({ width: 1440, height: 812 });
	expect(
		await mainGrid.evaluate(
			(node) =>
				getComputedStyle(node).gridTemplateColumns.split(" ").length,
		),
	).toBe(2);
	await expect
		.poll(() =>
			postList.evaluate(
				(node) =>
					getComputedStyle(node).gridTemplateColumns.split(" ")
						.length,
			),
		)
		.toBe(3);
});

test("banner sizing follows the mode and responsive contract", async ({
	page,
}) => {
	await page.setViewportSize({ width: 844, height: 390 });
	await gotoPage(page, "/");

	const normalBanner = page.locator("#banner-wrapper");
	expect(
		await normalBanner.evaluate(
			(node) =>
				Number.parseFloat(getComputedStyle(node).height) /
				window.innerHeight,
		),
	).toBeCloseTo(0.6, 2);

	await useStoredPreference(page, "wallpaperMode", "fullscreen");
	await page.setViewportSize({ width: 390, height: 844 });
	await gotoPage(page, "/");
	const fullscreenBanner = page.locator("#banner-wrapper");
	expect(
		await fullscreenBanner.evaluate(
			(node) =>
				Number.parseFloat(getComputedStyle(node).height) /
				window.innerHeight,
		),
	).toBeCloseTo(1, 2);

	const fullscreenGeometry = await page.evaluate(() => {
		const banner = document.querySelector<HTMLElement>("#banner-wrapper");
		const content = document.querySelector<HTMLElement>(
			".main-content-layer",
		);
		if (!banner || !content) return null;
		return {
			bannerHeight: banner.getBoundingClientRect().height,
			contentDocumentTop:
				content.getBoundingClientRect().top + window.scrollY,
		};
	});
	expect(fullscreenGeometry).not.toBeNull();
	expect(fullscreenGeometry!.contentDocumentTop).toBeGreaterThanOrEqual(
		fullscreenGeometry!.bannerHeight - 1,
	);

	await gotoPage(page, "/posts/markdown-tutorial/");
	await expect(fullscreenBanner).toHaveClass(/mobile-hide-banner/);
	await expect(page.locator(".main-content-layer")).toHaveClass(
		/mobile-main-no-banner/,
	);
});

test("banner home text stays centered across normal and fullscreen modes", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await gotoPage(page, "/");

	const assertCentered = async () => {
		const geometry = await page
			.locator(".banner-text-overlay")
			.evaluate((overlay) => {
				const overlayRect = overlay.getBoundingClientRect();
				const contentRect =
					overlay.firstElementChild?.getBoundingClientRect();
				return {
					display: getComputedStyle(overlay).display,
					alignItems: getComputedStyle(overlay).alignItems,
					justifyContent: getComputedStyle(overlay).justifyContent,
					overlayCenterX: overlayRect.left + overlayRect.width / 2,
					overlayCenterY: overlayRect.top + overlayRect.height / 2,
					contentCenterX: contentRect
						? contentRect.left + contentRect.width / 2
						: null,
					contentCenterY: contentRect
						? contentRect.top + contentRect.height / 2
						: null,
				};
			});

		expect(geometry.display).toBe("flex");
		expect(geometry.alignItems).toBe("center");
		expect(geometry.justifyContent).toBe("center");
		expect(geometry.contentCenterX).toBeCloseTo(geometry.overlayCenterX, 0);
		expect(geometry.contentCenterY).toBeCloseTo(geometry.overlayCenterY, 0);
	};

	await assertCentered();
	const desktopTitleSize = await page
		.locator(".banner-title")
		.evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize));
	const desktopTextWidth = await page
		.locator(".banner-text-overlay > div")
		.evaluate((node) => node.getBoundingClientRect().width);
	expect(desktopTitleSize).toBeLessThanOrEqual(96);
	expect(desktopTextWidth).toBeLessThanOrEqual(832);

	await page.setViewportSize({ width: 768, height: 812 });
	await gotoPage(page, "/");
	await assertCentered();
	const tabletTitleSize = await page
		.locator(".banner-title")
		.evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize));

	await page.setViewportSize({ width: 375, height: 812 });
	await gotoPage(page, "/");
	await assertCentered();
	const mobileTitleSize = await page
		.locator(".banner-title")
		.evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize));
	expect(mobileTitleSize).toBeLessThan(tabletTitleSize);
	expect(tabletTitleSize).toBeLessThan(desktopTitleSize);

	await useStoredPreference(page, "wallpaperMode", "fullscreen");
	await page.setViewportSize({ width: 1280, height: 900 });
	await gotoPage(page, "/");
	await assertCentered();
});

test("banner theme and motion styles follow site state and user preference", async ({
	page,
}) => {
	await useStoredPreference(page, "theme", "light");
	await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
	await gotoPage(page, "/");

	const overlay = page.locator(".banner-text-overlay");
	const lightBackground = await overlay.evaluate(
		(node) => getComputedStyle(node).backgroundImage,
	);
	expect(lightBackground).toBe("none");

	await page.locator("html").evaluate((node) => node.classList.add("dark"));
	expect(
		await overlay.evaluate(
			(node) => getComputedStyle(node).backgroundImage,
		),
	).toBe("none");

	const navbarAnimationDelay = await page
		.locator("#navbar")
		.evaluate((node) => getComputedStyle(node).animationDelay);
	expect(navbarAnimationDelay).toBe("0s");
	await expect(page.locator(".banner-enter-animation").first()).toHaveCount(
		1,
	);
	const activeSlide = page.locator(
		'#banner-carousel [data-banner-slide][data-active="true"]',
	);
	await expect(activeSlide).toHaveCount(1);
	expect(
		await activeSlide.evaluate(
			(node) => getComputedStyle(node).animationName,
		),
	).toBe("none");

	const carousel = page.locator("#banner-carousel");
	await expect(carousel.locator("[data-banner-slide] img")).toHaveCount(2);
	await expect(
		carousel.locator("template[data-banner-slide-content]"),
	).toHaveCount(4);
	await carousel.hover();
	await expect(carousel).toHaveAttribute("data-paused", "true");
	await page.mouse.move(10, 700);
	await expect(carousel).not.toHaveAttribute("data-paused");
});

test("global motion and scrollbar utilities stay active", async ({ page }) => {
	await gotoPage(page, "/");

	await expect(page.locator("html")).not.toHaveAttribute(
		"data-overlayscrollbars-initialize",
		/.+/,
	);
	await expect(page.locator("body")).not.toHaveAttribute(
		"data-overlayscrollbars-initialize",
		/.+/,
	);

	const navbarTransition = await page
		.locator("#navbar > div")
		.last()
		.evaluate((node) => getComputedStyle(node).transitionProperty);
	expect(navbarTransition).not.toContain("all");

	const routeContainer = page.locator("#swup-container");
	await expect(routeContainer).toHaveClass(/transition-swup-layout/);
	await expect(page.locator("#content-wrapper")).not.toHaveClass(
		/onload-animation|transition-leaving/,
	);
	const postItemAnimation = await page
		.locator(".post-list__item")
		.first()
		.evaluate((node) => getComputedStyle(node).animationName);
	expect(postItemAnimation).toContain("post-list-item-enter");

	await gotoPage(page, "/timeline/");
	const timeline = page.locator("#timeline-scrollbar");
	await expect(timeline).toHaveCSS("scrollbar-width", "thin");
});
