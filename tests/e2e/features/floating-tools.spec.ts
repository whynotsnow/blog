import { expect, test } from "@playwright/test";
import { gotoPage } from "../../support/navigation";

test("floating tools owns theme, settings, toc, and back-to-top actions", async ({
	page,
}) => {
	await gotoPage(page, "/posts/markdown-tutorial/");

	const tools = page.locator("#floating-tools");
	const toggle = page.locator("#floating-tools-switch");
	await expect(tools).toBeVisible();
	await expect(toggle).toHaveAttribute("aria-expanded", "false");
	await expect(page.locator("#navbar #scheme-switch")).toHaveCount(0);
	await expect(page.locator("#navbar #display-settings-switch")).toHaveCount(
		0,
	);

	await toggle.click();
	await expect(toggle).toHaveAttribute("aria-expanded", "true");
	await expect(page.locator("#floating-tools #scheme-switch")).toBeVisible();
	await expect(
		page.locator("#floating-tools #display-settings-switch"),
	).toBeVisible();
	await expect(
		page.locator("#floating-tools #floating-toc-btn"),
	).toBeVisible();

	const initialDark = await page
		.locator("html")
		.evaluate((element) => element.classList.contains("dark"));
	await page.locator("#floating-tools #scheme-switch").click();
	await expect
		.poll(() =>
			page
				.locator("html")
				.evaluate((element) => element.classList.contains("dark")),
		)
		.toBe(!initialDark);

	const settingsButton = page.locator(
		"#floating-tools #display-settings-switch",
	);
	await settingsButton.click();
	await expect(page.locator("#display-setting")).not.toHaveClass(
		/float-panel-closed/,
	);
	await page.locator(".post-detail__header h1").click();
	await expect(page.locator("#display-setting")).toHaveClass(
		/float-panel-closed/,
	);

	await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
	await expect(page.locator("#back-to-top-btn")).toBeVisible();
	await page.locator("#back-to-top-btn").click();
	await expect
		.poll(() => page.evaluate(() => window.scrollY))
		.toBeLessThan(8);
});

test("floating tools keeps a safe mobile touch target", async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await gotoPage(page, "/");

	const geometry = await page
		.locator("#floating-tools-switch")
		.evaluate((element) => {
			const rect = element.getBoundingClientRect();
			return {
				width: rect.width,
				height: rect.height,
				right: window.innerWidth - rect.right,
				bottom: window.innerHeight - rect.bottom,
			};
		});

	expect(geometry.width).toBeGreaterThanOrEqual(44);
	expect(geometry.height).toBeGreaterThanOrEqual(44);
	expect(geometry.right).toBeGreaterThanOrEqual(12);
	expect(geometry.bottom).toBeGreaterThanOrEqual(12);
});
