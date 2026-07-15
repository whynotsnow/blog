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
	expect(compressedLargeCardWidth).toBeLessThanOrEqual(346);
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
	expect(maximumCardWidth).toBeLessThanOrEqual(346);
	expect(maximumSidebarWidth).toBeCloseTo(272, 0);
	expect(shellGeometry.shellWidth).toBeLessThanOrEqual(1352 + 1);
	expect(shellGeometry.bannerWidth).toBeCloseTo(1920, 0);
	expect(shellGeometry.gridWidth).toBeLessThanOrEqual(1352 + 1);
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

test("container-content pages distinguish supported and content-only widths", async ({
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
		expect(geometry.supportWidth).toBe(0);
		expect(geometry.gridWidth).toBeLessThanOrEqual(1064 + 1);
		expect(geometry.navbarWidth).toBeCloseTo(home.navbarWidth, 0);
	}
});

test("container-content pages do not inherit legacy root scaling", async ({
	page,
}) => {
	for (const width of [1280, 1281, 1920]) {
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

	await page.setViewportSize({ width: 1767, height: 900 });
	await gotoPage(page, "/posts/markdown-tutorial/");
	const tocRegion = page.locator(".sidebar-toc-region--container");
	await expect(tocRegion).toHaveCSS("display", "none");

	await page.setViewportSize({ width: 1768, height: 900 });
	await expect(tocRegion).toHaveCSS("display", "block");
	const tocGeometry = await page.evaluate(() => {
		const shell = document.querySelector<HTMLElement>(".main-grid-shell")!;
		const rail = document.querySelector<HTMLElement>(
			".sidebar-toc-region__rail",
		)!;
		const shellRect = shell.getBoundingClientRect();
		const railRect = rail.getBoundingClientRect();
		return {
			shellRight: shellRect.right,
			railLeft: railRect.left,
			railRight: railRect.right,
		};
	});
	expect(tocGeometry.railLeft).toBeGreaterThan(tocGeometry.shellRight);
	expect(tocGeometry.railRight).toBeLessThanOrEqual(1768 + 1);
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
	expect(lightBackground).not.toBe("none");

	await page.locator("html").evaluate((node) => node.classList.add("dark"));
	expect(
		await overlay.evaluate(
			(node) => getComputedStyle(node).backgroundImage,
		),
	).not.toBe("none");

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
