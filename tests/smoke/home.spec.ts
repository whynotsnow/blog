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
	).toBeVisible();

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
	).toBeVisible();
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
