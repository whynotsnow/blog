import { expect, test } from "@playwright/test";
import { gotoPage } from "../../support/navigation";

test("site notice renders as a shell-level status bar", async ({ page }) => {
	await gotoPage(page, "/");

	const notice = page.locator("[data-site-notice]");
	await expect(notice).toBeVisible();
	await expect(notice).toHaveAttribute("data-status", /^(info|success)$/);
	await expect(notice).toContainText(
		/网站建设中，更多功能敬请期待！|本站内容持续更新，感谢你的关注。/,
	);
	await expect(notice.locator("xpath=ancestor::panel-card")).toHaveCount(0);
});

test("site notice floats outside page flow and switches between notices", async ({
	page,
}) => {
	await gotoPage(page, "/");

	const region = page.locator("[data-site-notice-region]");
	const notices = region.locator("[data-site-notice-item]");
	await expect(region).toBeVisible();
	await expect(notices).toHaveCount(2);
	await expect(region).toHaveCSS("position", "fixed");
	await region.hover();

	const geometry = await region.evaluate((element) => ({
		left: element.getBoundingClientRect().left,
		right: element.getBoundingClientRect().right,
		width: element.getBoundingClientRect().width,
		viewportWidth: window.innerWidth,
		zIndex: Number.parseInt(getComputedStyle(element).zIndex, 10),
		navbarZIndex: Number.parseInt(
			getComputedStyle(document.querySelector("#navbar")!).zIndex,
			10,
		),
		messageClientWidth: element.querySelector<HTMLElement>(
			".site-notice-bar__message",
		)!.clientWidth,
		messageScrollWidth: element.querySelector<HTMLElement>(
			".site-notice-bar__message",
		)!.scrollWidth,
		messageWhiteSpace: getComputedStyle(
			element.querySelector(".site-notice-bar__message")!,
		).whiteSpace,
	}));
	expect(geometry.width).toBeLessThan(geometry.viewportWidth);
	expect(geometry.width).toBeLessThanOrEqual(576);
	expect(geometry.left).toBeGreaterThan(geometry.viewportWidth / 2);
	expect(geometry.viewportWidth - geometry.right).toBeGreaterThanOrEqual(16);
	expect(geometry.viewportWidth - geometry.right).toBeLessThanOrEqual(40);
	expect(geometry.zIndex).toBeLessThan(geometry.navbarZIndex);
	expect(geometry.messageWhiteSpace).toBe("nowrap");
	expect(geometry.messageScrollWidth).toBeLessThanOrEqual(
		geometry.messageClientWidth,
	);

	const initialLayout = await page.evaluate(() => ({
		documentHeight: document.documentElement.scrollHeight,
		viewportHeight: document
			.querySelector<HTMLElement>("[data-site-notice-viewport]")
			?.getBoundingClientRect().height,
	}));
	const counter = region.locator("[data-site-notice-index]");
	const initialIndex = Number(await counter.textContent()) - 1;
	const expectedIndex = (initialIndex + 1) % 2;
	await region.locator("[data-site-notice-next]").click();
	await expect(notices.nth(expectedIndex)).toHaveAttribute(
		"data-state",
		"active",
	);
	await expect(counter).toHaveText(String(expectedIndex + 1));
	const switchedLayout = await page.evaluate(() => ({
		documentHeight: document.documentElement.scrollHeight,
		viewportHeight: document
			.querySelector<HTMLElement>("[data-site-notice-viewport]")
			?.getBoundingClientRect().height,
	}));
	expect(switchedLayout).toEqual(initialLayout);
});

test("site notice keeps safe mobile edges", async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await gotoPage(page, "/");

	const geometry = await page
		.locator("[data-site-notice-region]")
		.evaluate((element) => ({
			left: element.getBoundingClientRect().left,
			right: window.innerWidth - element.getBoundingClientRect().right,
			width: element.getBoundingClientRect().width,
		}));
	expect(geometry.left).toBeGreaterThanOrEqual(12);
	expect(geometry.right).toBeGreaterThanOrEqual(12);
	expect(geometry.width).toBeLessThanOrEqual(362);
});

test("site notice keeps its viewport position during Swup navigation", async ({
	page,
}) => {
	await gotoPage(page, "/");
	const region = page.locator("[data-site-notice-region]");
	await expect(region).toBeVisible();
	await expect(
		region.locator("xpath=ancestor::*[@id='swup-container']"),
	).toHaveCount(0);

	const initialTop = await region.evaluate(
		(element) => element.getBoundingClientRect().top,
	);
	await page.evaluate(() => {
		const samples: number[] = [];
		const sample = () => {
			const notice = document.querySelector<HTMLElement>(
				"[data-site-notice-region]",
			);
			if (notice) samples.push(notice.getBoundingClientRect().top);
		};
		const timer = window.setInterval(sample, 8);
		(
			window as typeof window & { __siteNoticeSamples?: number[] }
		).__siteNoticeSamples = samples;
		window.swup.navigate("/category/tech/");
		window.setTimeout(() => window.clearInterval(timer), 1000);
	});

	await expect(page).toHaveURL(/\/category\/tech\/$/);
	await expect(region).toBeVisible();
	await expect
		.poll(() =>
			page.evaluate(() =>
				document.documentElement.classList.contains("is-changing"),
			),
		)
		.toBe(false);
	const samples = await page.evaluate(
		() =>
			(
				window as typeof window & {
					__siteNoticeSamples?: number[];
				}
			).__siteNoticeSamples ?? [],
	);
	expect(samples.length).toBeGreaterThan(2);
	expect(
		Math.max(...samples.map((top) => Math.abs(top - initialTop))),
	).toBeLessThan(1);
});
