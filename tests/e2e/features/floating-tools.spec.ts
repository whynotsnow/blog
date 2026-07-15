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

test("floating tools controls the user Pio preference", async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await gotoPage(page, "/");

	await page.locator("#floating-tools-switch").click();
	const toggle = page.getByRole("button", { name: "隐藏看板娘" });
	await expect(toggle).toBeVisible();
	await toggle.click();

	await expect
		.poll(() => page.evaluate(() => localStorage.getItem("posterGirl")))
		.toBe("0");
	await expect(page.locator(".pio-container")).toHaveAttribute(
		"data-user-visible",
		"false",
	);

	const showToggle = page.getByRole("button", { name: "显示看板娘" });
	await showToggle.click();
	await expect
		.poll(() => page.evaluate(() => localStorage.getItem("posterGirl")))
		.toBe("1");
	await expect(page.locator(".pio-container")).toHaveAttribute(
		"data-user-visible",
		"true",
	);
});

test("floating tools moves above the expanded music player", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await gotoPage(page, "/");

	await page
		.locator('.mini-player [role="button"][aria-label="展开音乐播放器"]')
		.click();
	await expect(page.locator(".expanded-player")).toBeVisible();
	await expect(page.locator("#floating-tools")).toHaveAttribute(
		"data-music-expanded",
		"true",
	);

	const geometry = await page.evaluate(() => {
		const tools = document
			.getElementById("floating-tools-switch")
			?.getBoundingClientRect();
		const player = document
			.querySelector<HTMLElement>(".expanded-player")
			?.getBoundingClientRect();
		return {
			toolsBottom: tools?.bottom ?? Number.POSITIVE_INFINITY,
			playerTop: player?.top ?? 0,
		};
	});

	expect(geometry.toolsBottom).toBeLessThanOrEqual(geometry.playerTop - 8);
});
