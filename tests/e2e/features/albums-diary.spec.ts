import { expect, test } from "@playwright/test";
import { gotoPage } from "../../support/navigation";

test("albums page renders filter tabs and album cards", async ({ page }) => {
	const response = await gotoPage(page, "/albums/");

	expect(response?.ok()).toBe(true);
	await expect(page.locator("#albums-grid .album-card")).toHaveCount(1);
	await expect
		.poll(() =>
			page
				.locator("#albums-grid .album-card")
				.first()
				.evaluate((card) => getComputedStyle(card).opacity),
		)
		.toBe("1");

	const filter = page.locator(".filter-tabs__item", { hasText: "Kawai" });
	await expect(filter).toBeVisible();
	await filter.click();
	await expect(filter).toHaveClass(/is-active/);
	await expect(
		page.locator("#albums-grid .album-card.filtered-out"),
	).toHaveCount(0);
});

test("album detail opens photos with Fancybox", async ({ page }) => {
	await gotoPage(page, "/albums/AcgExample/");

	const firstImage = page.locator(".gallery-masonry img").first();
	await expect(firstImage).toBeVisible();
	await expect
		.poll(() =>
			firstImage.evaluate((image) =>
				image instanceof HTMLImageElement ? image.naturalWidth : 0,
			),
		)
		.toBeGreaterThan(0);

	const firstPhoto = page.locator(".gallery-masonry [data-fancybox]").first();
	await expect(firstPhoto).toBeVisible();
	await firstPhoto.click();

	await expect(page).toHaveURL(/\/albums\/AcgExample\/$/);
	await expect(page.locator(".fancybox__container")).toBeVisible();
	await expect
		.poll(() =>
			page.locator(".fancybox__container").evaluate((container) => {
				const styles = getComputedStyle(container);
				return styles.getPropertyValue("--f-thumb-width").trim();
			}),
		)
		.toBe("64px");
});

test("diary page renders static entries and opens images with Fancybox", async ({
	page,
}) => {
	const response = await gotoPage(page, "/diary/");

	expect(response?.ok()).toBe(true);
	await expect(page.locator("#diary-list .moment-card")).toHaveCount(1);
	await expect
		.poll(() =>
			page
				.locator("#diary-list .moment-card")
				.first()
				.evaluate((card) => getComputedStyle(card).opacity),
		)
		.toBe("1");

	const firstLoadedImage = page.locator(".diary-images img").first();
	await expect(firstLoadedImage).toBeVisible();
	await expect
		.poll(() =>
			firstLoadedImage.evaluate((image) =>
				image instanceof HTMLImageElement ? image.naturalWidth : 0,
			),
		)
		.toBeGreaterThan(0);

	const firstImage = page.locator(".diary-images [data-fancybox]").first();
	await expect(firstImage).toBeVisible();
	await firstImage.click();

	await expect(page).toHaveURL(/\/diary\/$/);
	await expect(page.locator(".fancybox__container")).toBeVisible();
	await expect
		.poll(() =>
			page.locator(".fancybox__container").evaluate((container) => {
				const styles = getComputedStyle(container);
				return styles.getPropertyValue("--f-button-width").trim();
			}),
		)
		.toBe("44px");
});
