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
