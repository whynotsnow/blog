import { expect, test } from "@playwright/test";
import { gotoPage } from "../../support/navigation";

test("page support modules follow page intent without widget placement", async ({
	page,
}) => {
	test.setTimeout(60_000);
	await page.setViewportSize({ width: 1536, height: 900 });
	await gotoPage(page, "/");
	await expect(page.locator("#main-grid")).toHaveAttribute(
		"data-has-support",
		"true",
	);
	await expect(
		page.locator(".page-support-region .profile-card"),
	).toBeVisible();
	await expect(page.locator(".profile-card")).toHaveCount(1);
	await expect(page.locator(".footer-stats")).toHaveCount(1);

	await page.setViewportSize({ width: 900, height: 900 });
	await gotoPage(page, "/");
	await expect(
		page.locator(".page-support-region .profile-card"),
	).toBeVisible();
	await expect(page.locator(".profile-card")).toHaveCount(1);

	await page.setViewportSize({ width: 375, height: 812 });
	await gotoPage(page, "/");
	await expect(
		page.locator(".page-support-region .profile-card"),
	).toBeVisible();
	await expect(page.locator(".profile-card")).toHaveCount(1);
	await gotoPage(page, "/category/tech/");
	await expect(page.locator("#main-grid")).toHaveAttribute(
		"data-has-support",
		"false",
	);
	await expect(page.locator(".profile-card")).toHaveCount(0);

	await page.setViewportSize({ width: 1280, height: 900 });
	await gotoPage(page, "/category/tech/");
	await expect(page.locator(".profile-card")).toHaveCount(0);

	await page.setViewportSize({ width: 375, height: 812 });
	await gotoPage(page, "/posts/markdown-tutorial/");
	await expect(page.locator(".profile-card")).toHaveCount(0);
});
