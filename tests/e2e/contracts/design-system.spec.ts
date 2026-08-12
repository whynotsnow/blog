import { expect, test } from "@playwright/test";
import { gotoPage } from "../../support/navigation";

test("design tokens and patterns preserve page contracts", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await gotoPage(page, "/");

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

	const profileCard = page.locator(".profile-card");
	await page.evaluate(() => {
		document.body.classList.add("wallpaper-full");
		document.documentElement.style.setProperty(
			"--card-transparent-opacity",
			"0.35",
		);
	});
	await expect
		.poll(() =>
			profileCard.evaluate(
				(node) => getComputedStyle(node).backgroundColor,
			),
		)
		.toContain("0.35");

	await gotoPage(page, "/archive/");
	await expect(page.locator("panel-card").first()).toHaveClass(
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

	await gotoPage(page, "/posts/markdown-tutorial/");
	const article = page.locator(".post-detail__article");
	const readingFlow = page.locator(".post-detail__content");
	await expect(article).toHaveClass(/ds-surface-card/);
	await expect(readingFlow).toHaveClass(/ds-reading-flow/);

	const normalSurface = await article.evaluate((node) => {
		document.body.classList.remove(
			"wallpaper-transparent",
			"wallpaper-full",
		);
		const styles = getComputedStyle(node);
		return {
			background: styles.backgroundColor,
			radius: styles.borderRadius,
		};
	});
	expect(normalSurface.background).not.toBe("rgba(0, 0, 0, 0)");
	expect(normalSurface.radius).not.toBe("0px");

	const wallpaperSurface = await article.evaluate((node) => {
		document.body.classList.add("wallpaper-full");
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

	await page.evaluate(() => {
		document.body.classList.add("wallpaper-full");
		document.documentElement.style.setProperty(
			"--card-transparent-opacity",
			"0.35",
		);
	});
	await expect
		.poll(() =>
			article.evaluate((node) => getComputedStyle(node).backgroundColor),
		)
		.toContain("0.35");

	const widthContract = await readingFlow.evaluate((node) => {
		const rootSize = Number.parseFloat(
			getComputedStyle(document.documentElement).fontSize,
		);
		return {
			reading: node.getBoundingClientRect().width,
			readingLimit: 52 * rootSize,
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

	await gotoPage(page, "/archive/");
	await expect(page.locator("body")).not.toHaveClass(/is-home|is-post/);
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth - window.innerWidth,
		),
	).toBeLessThanOrEqual(0);
});
