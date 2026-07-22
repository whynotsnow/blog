import { expect, test } from "@playwright/test";
import { gotoPage } from "../../support/navigation";

test("new shell icons resolve from repository assets without Iconify", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.route(/https:\/\/(?:api|code)\.iconify\.design\//, (route) =>
		route.abort(),
	);
	await gotoPage(page, "/");
	await page.locator("#floating-tools-switch").click();

	for (const name of [
		"material-symbols:widgets-rounded",
		"material-symbols:music-note-rounded",
		"material-symbols:settings-rounded",
		"material-symbols:face-retouching-natural-rounded",
	]) {
		await expect(
			page.locator(`[data-local-icon='${name}']`).first(),
		).toBeVisible();
	}
	const icons = page.locator("[data-local-icon]");
	const sources = await icons.evaluateAll((elements) =>
		elements.map((element) => getComputedStyle(element).maskImage),
	);
	for (const source of sources) {
		expect(source).not.toBe("none");
		expect(source).not.toContain("iconify.design");
	}
});

test("activity center owns notice unread state in the top-right shell", async ({
	page,
}) => {
	const pageErrors: string[] = [];
	page.on("pageerror", (error) => pageErrors.push(error.message));
	await gotoPage(page, "/");

	const toggle = page.locator("#activity-center-switch");
	const panel = page.locator("#activity-center-panel");
	await expect(toggle).toBeVisible();
	await expect(toggle.locator("[data-activity-unread]")).toHaveText("2");
	await expect(panel).toBeVisible();

	const geometry = await toggle.evaluate((element) => {
		const rect = element.getBoundingClientRect();
		return {
			right: window.innerWidth - rect.right,
			top: rect.top,
			width: rect.width,
			height: rect.height,
			hasViteOverlay: Boolean(
				document.querySelector("vite-error-overlay"),
			),
		};
	});
	expect(geometry.right).toBeGreaterThanOrEqual(12);
	expect(geometry.top).toBeLessThan(80);
	expect(geometry.width).toBeGreaterThanOrEqual(44);
	expect(geometry.height).toBeGreaterThanOrEqual(44);
	expect(geometry.hasViteOverlay).toBe(false);

	await expect(panel.locator(".activity-center__notice")).toHaveCount(2);
	await expect(
		panel.locator(".activity-center__section-heading").last(),
	).toContainText("通知");
	await expect(panel.getByRole("button", { name: "全部 2" })).toBeVisible();
	await expect(panel.getByRole("button", { name: "未读 2" })).toBeVisible();
	await expect(panel.getByRole("button", { name: "重要 1" })).toBeVisible();
	await expect(
		panel.locator(".activity-center__notice").first(),
	).toHaveAttribute("data-level", "important");
	await expect(panel).toContainText("站点施工提示");
	await expect(panel).toContainText("内容更新说明");
	await expect(toggle.locator("[data-activity-unread]")).toHaveText("2");
	await expect(page.locator("[data-site-notice-region]")).toHaveCount(0);
	await toggle.click();
	await expect(panel).toBeHidden();
	await page.reload();
	await expect(panel).toBeHidden();
	await toggle.click();
	await expect(panel).toBeVisible();

	await panel.getByRole("button", { name: /查看通知: 站点施工提示/ }).click();
	const dialog = page.locator(".activity-center__dialog");
	await expect(dialog).toBeVisible();
	const dialogGeometry = await page
		.locator(".activity-center__dialog-backdrop")
		.evaluate((backdrop) => {
			const dialog = backdrop.querySelector<HTMLElement>(
				".activity-center__dialog",
			)!;
			const rect = dialog.getBoundingClientRect();
			return {
				parentTag: backdrop.parentElement?.tagName,
				portalHost:
					backdrop.parentElement?.hasAttribute(
						"data-activity-center-portal",
					) ?? false,
				backdropFilter: getComputedStyle(backdrop).backdropFilter,
				top: rect.top,
				bottom: window.innerHeight - rect.bottom,
			};
		});
	expect(dialogGeometry.parentTag).toBe("DIV");
	expect(dialogGeometry.portalHost).toBe(true);
	expect(dialogGeometry.backdropFilter).toBe("none");
	expect(dialogGeometry.top).toBeGreaterThanOrEqual(16);
	expect(dialogGeometry.bottom).toBeGreaterThanOrEqual(16);
	const lockedBody = await page.evaluate(() => ({
		overflow: document.body.style.overflow,
		position: document.body.style.position,
		top: document.body.style.top,
		width: document.body.style.width,
	}));
	expect(lockedBody).toMatchObject({
		overflow: "hidden",
		position: "fixed",
		width: "100%",
	});
	expect(lockedBody.top).toMatch(/^-?0px$/);
	await expect(dialog).toContainText("站点目前仍在持续建设中");
	await expect(dialog).toContainText("页面布局会继续优化");
	await expect(toggle.locator("[data-activity-unread]")).toHaveText("1");
	await expect
		.poll(() =>
			page.evaluate(() =>
				localStorage.getItem("site-notice:read:site-building-2026-07"),
			),
		)
		.toBe("true");

	await dialog.getByRole("button", { name: "已读" }).click();
	await expect(dialog).toBeHidden();
	await expect
		.poll(() =>
			page.evaluate(() => ({
				overflow: document.body.style.overflow,
				position: document.body.style.position,
				top: document.body.style.top,
				width: document.body.style.width,
			})),
		)
		.toEqual({
			overflow: "",
			position: "",
			top: "",
			width: "",
		});
	await toggle.click();
	await expect(panel).toBeVisible();
	await panel.getByRole("button", { name: "全部已读" }).click();
	await expect(toggle.locator("[data-activity-unread]")).toHaveCount(0);
	await expect(panel.getByRole("button", { name: "未读 0" })).toBeVisible();
	await panel.getByRole("button", { name: "未读 0" }).click();
	await expect(panel).toContainText("没有未读通知");
	await expect
		.poll(() =>
			page.evaluate(() => [
				localStorage.getItem("site-notice:read:site-building-2026-07"),
				localStorage.getItem(
					"site-notice:read:site-content-updates-2026-07",
				),
			]),
		)
		.toEqual(["true", "true"]);
	expect(pageErrors).toEqual([]);
});

test("activity center reports live article reading status", async ({
	page,
}) => {
	await page.addInitScript(() => {
		localStorage.setItem("site-notice:read:site-building-2026-07", "true");
		localStorage.setItem(
			"site-notice:read:site-content-updates-2026-07",
			"true",
		);
	});
	await gotoPage(page, "/posts/markdown-tutorial/");

	const toggle = page.locator("#activity-center-switch");
	const initialProgress = Number(
		await toggle.getAttribute("data-reading-progress"),
	);

	await page.evaluate(() => {
		const article = document.getElementById("post-container");
		if (!article) return;
		const top = window.scrollY + article.getBoundingClientRect().top;
		window.scrollTo(0, top + article.offsetHeight * 0.5);
	});
	await expect
		.poll(async () =>
			Number(await toggle.getAttribute("data-reading-progress")),
		)
		.toBeGreaterThan(initialProgress);
	await expect(page.locator("#navbar-wrapper")).not.toHaveClass(
		/navbar-hidden/,
	);
	await expect(toggle).toBeInViewport();

	await toggle.click();
	const reading = page.locator("[data-activity-reading]");
	await expect(reading).toBeVisible();
	await expect(
		reading.locator(".activity-center__reading-title"),
	).toContainText("Markdown");
	await expect(
		reading.locator(".activity-center__reading-meta"),
	).toContainText(/进度 [1-9][0-9]?%/);
	await expect(
		reading.locator(".activity-center__current-heading"),
	).toBeVisible();
	await expect
		.poll(() =>
			page.evaluate(() =>
				localStorage.getItem(
					`reading-position:${window.location.pathname}`,
				),
			),
		)
		.not.toBeNull();
});

test("activity center anchors the mobile notice panel below navbar", async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.addInitScript(() => {
		localStorage.setItem("site-notice:read:site-building-2026-07", "true");
		localStorage.setItem(
			"site-notice:read:site-content-updates-2026-07",
			"true",
		);
	});
	await gotoPage(page, "/");
	await page.locator("#activity-center-switch").click();

	const geometry = await page
		.locator("#activity-center-panel")
		.evaluate((element) => {
			const rect = element.getBoundingClientRect();
			const navbarRect = document
				.getElementById("navbar-wrapper")!
				.getBoundingClientRect();
			const filters = Array.from(
				element.querySelectorAll<HTMLElement>(
					".activity-center__filters button",
				),
			).map((button) => button.getBoundingClientRect());
			const noticeSummary = element.querySelector<HTMLElement>(
				".activity-center__notice p",
			)!;
			return {
				left: rect.left,
				right: window.innerWidth - rect.right,
				top: rect.top,
				navbarGap: rect.top - navbarRect.bottom,
				height: rect.height,
				filterRows: new Set(filters.map((filter) => filter.top)).size,
				filterMinWidth: Math.min(
					...filters.map((filter) => filter.width),
				),
				noticeSummaryFits:
					noticeSummary.scrollWidth <= noticeSummary.clientWidth,
			};
		});
	expect(geometry.left).toBeGreaterThanOrEqual(12);
	expect(geometry.right).toBeGreaterThanOrEqual(12);
	expect(geometry.top).toBeGreaterThanOrEqual(56);
	expect(geometry.navbarGap).toBeGreaterThanOrEqual(8);
	expect(geometry.navbarGap).toBeLessThanOrEqual(24);
	expect(geometry.height).toBeLessThan(844 * 0.8);
	expect(geometry.filterRows).toBe(1);
	expect(geometry.filterMinWidth).toBeGreaterThan(96);
	expect(geometry.noticeSummaryFits).toBe(true);

	await page
		.locator("#activity-center-panel")
		.getByRole("button", { name: /查看通知: 站点施工提示/ })
		.click();
	const dialogGeometry = await page
		.locator(".activity-center__dialog")
		.evaluate((dialog) => {
			const rect = dialog.getBoundingClientRect();
			const actions = Array.from(
				dialog.querySelectorAll<HTMLElement>(
					".activity-center__dialog-actions :is(a, button)",
				),
			).map((action) => action.getBoundingClientRect());
			return {
				left: rect.left,
				right: window.innerWidth - rect.right,
				bottom: window.innerHeight - rect.bottom,
				height: rect.height,
				actionRows: new Set(actions.map((action) => action.top)).size,
				actionMinWidth: Math.min(
					...actions.map((action) => action.width),
				),
			};
		});
	expect(dialogGeometry.left).toBeGreaterThanOrEqual(8);
	expect(dialogGeometry.right).toBeGreaterThanOrEqual(8);
	expect(dialogGeometry.bottom).toBeGreaterThanOrEqual(0);
	expect(dialogGeometry.height).toBeLessThan(844 * 0.9);
	expect(dialogGeometry.actionRows).toBeGreaterThanOrEqual(1);
	expect(dialogGeometry.actionMinWidth).toBeGreaterThan(320);
});
