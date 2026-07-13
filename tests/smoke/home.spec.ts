import { expect, test } from "@playwright/test";

test("home page renders", async ({ page }) => {
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));

	const response = await page.goto("/");

	expect(response?.ok()).toBe(true);
	await expect(page).toHaveTitle(/怎么不下雪/);
	await expect(page.locator("body")).toContainText("怎么不下雪");
	expect(errors).toEqual([]);
});

test("site notice renders as a shell-level status bar", async ({ page }) => {
	await page.goto("/");

	const notice = page.locator("[data-site-notice]");
	await expect(notice).toBeVisible();
	await expect(notice).toHaveAttribute("data-status", "info");
	await expect(notice).toContainText("网站建设中");
	await expect(notice.locator("xpath=ancestor::widget-layout")).toHaveCount(
		0,
	);
});

test("saved Grid preference remains single-column below md and restores at md", async ({
	page,
}) => {
	await page.addInitScript(() => {
		localStorage.setItem("postListLayout", "grid");
	});

	await page.setViewportSize({ width: 375, height: 812 });
	await page.goto("/");

	const postList = page.locator("#post-list-container");
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

	await page.setViewportSize({ width: 767, height: 812 });
	expect(
		await postList.evaluate(
			(node) =>
				getComputedStyle(node).gridTemplateColumns.split(" ").length,
		),
	).toBe(1);

	await page.setViewportSize({ width: 768, height: 812 });
	expect(
		await postList.evaluate(
			(node) =>
				getComputedStyle(node).gridTemplateColumns.split(" ").length,
		),
	).toBe(2);
});

test("layout breakpoint boundaries do not overlap", async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem("wallpaperMode", "banner");
	});
	await page.setViewportSize({ width: 479, height: 812 });
	await page.goto("/");

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
	await page.setViewportSize({ width: 1279, height: 812 });
	expect(
		await mainGrid.evaluate(
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
	).toBe(3);
});

test("banner sizing follows the mode and responsive contract", async ({
	page,
}) => {
	await page.setViewportSize({ width: 844, height: 390 });
	await page.goto("/");

	const normalBanner = page.locator("#banner-wrapper");
	expect(
		await normalBanner.evaluate(
			(node) =>
				Number.parseFloat(getComputedStyle(node).height) /
				window.innerHeight,
		),
	).toBeCloseTo(0.6, 2);

	await page.addInitScript(() => {
		localStorage.setItem("wallpaperMode", "fullscreen");
	});
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto("/");
	const fullscreenBanner = page.locator("#banner-wrapper");
	expect(
		await fullscreenBanner.evaluate(
			(node) =>
				Number.parseFloat(getComputedStyle(node).height) /
				window.innerHeight,
		),
	).toBeCloseTo(1, 2);

	await page.goto("/posts/markdown-tutorial/");
	await expect(fullscreenBanner).toHaveClass(/mobile-hide-banner/);
	await expect(page.locator(".main-content-layer")).toHaveClass(
		/mobile-main-no-banner/,
	);
});

test("navbar stays sticky while the desktop banner scrolls", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto("/");

	const navbarWrapper = page.locator("#navbar-wrapper");
	await expect(navbarWrapper).toBeVisible();
	await page.evaluate(() => window.scrollTo(0, 200));
	await expect
		.poll(() =>
			navbarWrapper.evaluate((node) => node.getBoundingClientRect().top),
		)
		.toBe(0);
});

test("visible sidebar sticky widgets remain pinned while their grid region scrolls", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto("/");

	const assertPinned = async (
		stickyRegion: ReturnType<typeof page.locator>,
	) => {
		const state = await stickyRegion.evaluate((node) => ({
			position: getComputedStyle(node).position,
			top: getComputedStyle(node).top,
			viewportTop: node.getBoundingClientRect().top,
		}));
		expect(state.position).toBe("sticky");
		expect(state.top).toBe("16px");
		expect(state.viewportTop).toBeLessThanOrEqual(32);
	};

	const rightSticky = page.locator(
		'[data-widget-region="desktop-right"] .widget-region__sticky',
	);
	await expect(rightSticky).toBeVisible();
	await page.evaluate(() => {
		document.documentElement.style.scrollBehavior = "auto";
	});
	await rightSticky.evaluate((node) =>
		node.scrollIntoView({ block: "start" }),
	);
	await page.evaluate(() => window.scrollBy(0, 200));
	await assertPinned(rightSticky);

	const leftSticky = page.locator(
		'[data-widget-region="desktop-left"] .widget-region__sticky',
	);
	await leftSticky.evaluate((node) =>
		node.scrollIntoView({ block: "start" }),
	);
	await page.evaluate(() => window.scrollBy(0, 200));
	await assertPinned(leftSticky);

	await page.setViewportSize({ width: 768, height: 900 });
	await page.goto("/");
	const tabletSticky = page.locator(
		'[data-widget-region="tablet-sidebar"] .widget-region__sticky',
	);
	await expect(tabletSticky).toBeVisible();
	await page.evaluate(() => {
		document.documentElement.style.scrollBehavior = "auto";
	});
	await tabletSticky.evaluate((node) =>
		node.scrollIntoView({ block: "start" }),
	);
	await page.evaluate(() => window.scrollBy(0, 200));
	await assertPinned(tabletSticky);
});

test("banner home text stays centered across normal and fullscreen modes", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto("/");

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
	await expect(page.locator(".banner-title")).toHaveCSS("font-size", "96px");

	await page.setViewportSize({ width: 375, height: 812 });
	await page.goto("/");
	await assertCentered();
	await expect(page.locator(".banner-title")).toHaveCSS(
		"font-size",
		"44.8px",
	);

	await page.addInitScript(() => {
		localStorage.setItem("wallpaperMode", "fullscreen");
	});
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto("/");
	await assertCentered();
});

test("banner theme and motion styles follow site state and user preference", async ({
	page,
}) => {
	await page.addInitScript(() => {
		localStorage.setItem("theme", "light");
	});
	await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
	await page.goto("/");

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
	).not.toBe("none");

	const navbarAnimationDelay = await page
		.locator("#navbar")
		.evaluate((node) => getComputedStyle(node).animationDelay);
	expect(navbarAnimationDelay).toBe("0s");
	await expect(page.locator(".banner-enter-animation").first()).toHaveCount(
		1,
	);
});

test("page layout policy follows Swup navigation", async ({ page }) => {
	await page.goto("/");

	const grid = page.locator("#main-grid");
	await expect(grid).toHaveAttribute(
		"data-base-desktop-layout",
		"three-column",
	);
	await expect(grid).toHaveAttribute(
		"data-allowed-desktop-layouts",
		"three-column content-right",
	);

	const postLink = page.locator('a[href^="/posts/"]').first();
	await expect(postLink).toBeVisible();
	await postLink.click();
	await expect(page).toHaveURL(/\/posts\/.+\/$/);
	await expect(grid).toHaveAttribute(
		"data-base-desktop-layout",
		"content-right",
	);
	await expect(grid).toHaveAttribute(
		"data-allowed-desktop-layouts",
		"content-right",
	);
	await expect(page.locator("#swup-container")).toHaveCount(1);
	await expect(grid).toHaveCount(1);

	await page.goBack();
	await expect(page).toHaveURL(/\/$/);
	await expect(grid).toHaveAttribute(
		"data-base-desktop-layout",
		"three-column",
	);
	await expect(grid).toHaveAttribute(
		"data-allowed-desktop-layouts",
		"three-column content-right",
	);
});

test("global motion and scrollbar utilities stay active", async ({ page }) => {
	await page.goto("/");

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

	await page.goto("/timeline/");
	const timeline = page.locator("#timeline-scrollbar");
	await expect(timeline).toHaveCSS("scrollbar-width", "thin");
});

test("post list keeps Astro snapshots and switches to Svelte for tag pagination", async ({
	page,
}) => {
	await page.goto("/");

	const astroList = page.locator('[data-post-list-renderer="astro"]');
	await expect(astroList).toBeVisible();
	await expect(
		astroList.locator(":scope > .post-list__item").first(),
	).toHaveClass(/ds-surface-card/);

	await page.goto("/category/tech/");
	await expect(
		page.locator('[data-post-list-renderer="astro"]'),
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

test("design tokens and patterns preserve page contracts", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto("/");

	const lightTokens = await page.evaluate(() => {
		const styles = getComputedStyle(document.documentElement);
		return {
			surface: styles.getPropertyValue("--surface-page").trim(),
			text: styles.getPropertyValue("--text-primary").trim(),
			reading: styles.getPropertyValue("--width-reading").trim(),
		};
	});
	expect(lightTokens).toEqual({
		surface: expect.any(String),
		text: expect.any(String),
		reading: "48rem",
	});
	expect(lightTokens.surface).not.toBe("");
	expect(lightTokens.text).not.toBe("");

	await expect(page.locator("widget-layout").first()).toHaveClass(
		/ds-surface-card/,
	);
	await expect(page.locator("#search-panel")).toHaveClass(
		/ds-surface-raised/,
	);
	await expect(page.locator("#display-setting")).toHaveClass(
		/ds-surface-raised/,
	);

	const darkSurface = await page.evaluate(() => {
		document.documentElement.classList.add("dark");
		return getComputedStyle(document.documentElement)
			.getPropertyValue("--surface-page")
			.trim();
	});
	expect(darkSurface).not.toBe(lightTokens.surface);

	await page.goto("/posts/markdown-tutorial/");
	const article = page.locator(".post-detail__article");
	const readingFlow = page.locator(".post-detail__content");
	await expect(article).toHaveClass(/ds-surface-content/);
	await expect(readingFlow).toHaveClass(/ds-reading-flow/);

	const normalSurface = await article.evaluate((node) => {
		document.body.classList.remove(
			"wallpaper-transparent",
			"wallpaper-overlay",
		);
		const styles = getComputedStyle(node);
		return {
			background: styles.backgroundColor,
			radius: styles.borderRadius,
		};
	});
	expect(normalSurface.background).toBe("rgba(0, 0, 0, 0)");
	expect(normalSurface.radius).toBe("0px");

	const wallpaperSurface = await article.evaluate((node) => {
		document.body.classList.add("wallpaper-overlay");
		const styles = getComputedStyle(node);
		return {
			background: styles.backgroundColor,
			blur: styles.backdropFilter,
			radius: styles.borderRadius,
		};
	});
	expect(wallpaperSurface.background).not.toBe("rgba(0, 0, 0, 0)");
	expect(wallpaperSurface.blur).toContain("blur");
	expect(wallpaperSurface.radius).not.toBe("0px");

	const widthContract = await readingFlow.evaluate((node) => {
		const rootSize = Number.parseFloat(
			getComputedStyle(document.documentElement).fontSize,
		);
		return {
			reading: node.getBoundingClientRect().width,
			readingLimit: 48 * rootSize,
			wide:
				document
					.querySelector(".expressive-code")
					?.getBoundingClientRect().width ?? 0,
			wideLimit: 52 * rootSize,
			overflow: document.documentElement.scrollWidth - window.innerWidth,
		};
	});
	expect(widthContract.reading).toBeLessThanOrEqual(
		widthContract.readingLimit + 1,
	);
	expect(widthContract.wide).toBeLessThanOrEqual(widthContract.wideLimit + 1);
	expect(widthContract.overflow).toBeLessThanOrEqual(0);

	await page.goto("/archive/");
	await expect(page.locator("body")).not.toHaveClass(/is-home|is-post/);
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth - window.innerWidth,
		),
	).toBeLessThanOrEqual(0);
});

test("post detail components render through the thin route", async ({
	page,
}) => {
	await page.goto("/posts/markdown-tutorial/");

	await expect(page.locator(".post-detail__shell")).toBeVisible();
	await expect(page.locator(".post-detail__header h1")).toBeVisible();
	await expect(page.locator(".post-detail__content")).toBeVisible();
	await expect(page.locator(".post-detail__navigation")).toBeVisible();
	await expect(page.locator("#post-container")).toHaveCount(1);
	await expect(
		page.locator(
			"#post-cover.onload-animation, #share-component.onload-animation, .license-container.onload-animation",
		),
	).toHaveCount(0);

	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.reload();
	expect(errors).toEqual([]);
});

test("post content shares markdown styles and copy behavior", async ({
	page,
}) => {
	await page.goto("/posts/markdown-tutorial/");

	const content = page.locator(".post-content");
	await expect(content).toBeVisible();
	await expect(content.locator(".expressive-code").first()).toBeVisible();

	const copyButton = content.locator(".copy-btn").first();
	await expect(copyButton).toBeVisible();
	await copyButton.click();
	await expect(copyButton).toHaveClass(/success/);
});

test("encrypted posts reuse the shared post content contract", async ({
	page,
}) => {
	await page.goto("/posts/encrypted-post/");

	await expect(page.locator("#password-protection")).toBeVisible();
	await page.locator("#password-input").fill("123456");
	await page.locator("#unlock-btn").click();

	const decryptedContent = page.locator("#decrypted-content");
	await expect(decryptedContent).toBeVisible();
	await expect(decryptedContent.locator(".post-content")).toBeVisible();
});
