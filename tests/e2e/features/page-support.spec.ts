import { expect, test } from "@playwright/test";
import { E2E_CATEGORY, E2E_POSTS } from "../../support/content-fixtures";
import { gotoPage } from "../../support/navigation";

test("page support modules follow page-specific intent", async ({ page }) => {
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
	await expect(
		page.locator(
			".home-support__panel, .home-support .global-discovery-card",
		),
	).toHaveCount(4);
	await expect(
		page.locator('.home-support [data-discovery-card="recent"]'),
	).toContainText("最近更新");
	await expect(
		page.locator(
			'.home-support [data-discovery-card="recent"] .global-discovery-card__item',
		),
	).toHaveCount(4);
	await expect(
		page.locator('.home-support [data-discovery-card="category"]'),
	).toContainText("全部分类");
	await expect(
		page.locator('.home-support [data-discovery-card="category"]'),
	).toContainText(E2E_CATEGORY.name);
	await expect(
		page.locator(".home-support__heading", { hasText: "站点概览" }),
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
	await gotoPage(page, E2E_CATEGORY.path);
	await expect(page.locator("#main-grid")).toHaveAttribute(
		"data-has-support",
		"true",
	);
	await expect(page.locator(".category-support")).toBeHidden();
	await expect(page.locator(".profile-card")).toHaveCount(0);

	await page.setViewportSize({ width: 1280, height: 900 });
	await gotoPage(page, "/category/");
	await expect(page.locator(".category-support")).toBeVisible();
	await expect(
		page.locator('.category-support [data-discovery-card="category"]'),
	).toHaveCount(0);
	await expect(
		page.locator('.category-support [data-discovery-card="recent"]'),
	).toBeVisible();
	await expect(
		page.locator('.category-support [data-discovery-card="recommended"]'),
	).toBeVisible();
	await expect(
		page.locator(".category-support__heading", { hasText: "热门标签" }),
	).toBeVisible();
	await expect(
		page.locator(".category-support__heading", { hasText: "其他分类" }),
	).toHaveCount(0);
	await expect(
		page.locator(".category-support__heading", { hasText: "分类导航" }),
	).toHaveCount(0);

	await gotoPage(page, E2E_CATEGORY.path);
	await expect(page.locator(".category-support")).toBeVisible();
	await expect(
		page.locator(".category-support__heading", { hasText: "最近更新" }),
	).toHaveCount(0);
	await expect(
		page.locator(".category-support__heading", { hasText: "热门标签" }),
	).toHaveCount(0);
	await expect(
		page.locator(".category-support .support-link-panel__heading", {
			hasText: "分类导航",
		}),
	).toHaveCount(0);
	await expect(
		page.locator('.category-support [data-discovery-card="category"]'),
	).toBeVisible();
	await expect(
		page.locator('.category-support [data-discovery-card="category"]'),
	).toContainText("全部分类");
	await expect(
		page.locator(
			'.category-support [data-discovery-card="category"] .global-discovery-card__header',
		),
	).toHaveAttribute("href", "/category/");
	await expect(
		page.locator('.category-support [data-discovery-card="recent"]'),
	).toContainText("最近更新");
	await expect(
		page.locator(
			'.category-support [data-discovery-card="recent"] .global-discovery-card__item',
		),
	).toHaveCount(4);
	await expect(
		page.locator('.category-support [data-discovery-card="recommended"]'),
	).toContainText("推荐阅读");
	await expect(
		page.locator(
			'.category-support [data-discovery-card="recommended"] .global-discovery-card__item',
		),
	).toHaveCount(4);
	await expect(
		page.locator(".category-support__heading", { hasText: "其他分类" }),
	).toHaveCount(0);
	await expect(
		page.locator(".category-support__heading", { hasText: "当前分类" }),
	).toHaveCount(0);
	await expect(page.locator(".profile-card")).toHaveCount(0);

	await page.setViewportSize({ width: 375, height: 812 });
	await gotoPage(page, E2E_POSTS.writing.path);
	await expect(page.locator(".post-support")).toBeHidden();
	await expect(page.locator(".profile-card")).toHaveCount(0);

	await page.setViewportSize({ width: 1280, height: 900 });
	await gotoPage(page, E2E_POSTS.writing.path);
	await expect(page.locator(".post-support")).toBeVisible();
	await expect(page.locator(".post-support__toc")).toBeVisible();
	await expect(
		page.locator(".post-support__heading", { hasText: "继续阅读" }),
	).toHaveCount(0);
	await expect(
		page.locator(".post-support__heading", { hasText: "推荐阅读" }),
	).toHaveCount(0);
	await expect(
		page.locator('.post-support [data-discovery-card="category"]'),
	).toContainText("全部分类");
	await expect(
		page.locator('.post-support [data-discovery-card="category"]'),
	).toContainText(E2E_CATEGORY.name);
	await expect(
		page.locator('.post-support [data-discovery-card="recent"]'),
	).toContainText("最近更新");
	await expect(
		page.locator(
			'.post-support [data-discovery-card="recent"] .global-discovery-card__item',
		),
	).toHaveCount(4);
	await expect(
		page.locator('.post-support [data-discovery-card="recommended"]'),
	).toContainText("推荐阅读");
	await expect(
		page.locator(".post-support__heading", { hasText: "阅读信息" }),
	).toHaveCount(0);
	await expect(page.locator(".sidebar-toc-region--container")).toHaveCount(0);
});

test("ordinary content pages do not render comment modules", async ({
	page,
}) => {
	await gotoPage(page, "/about/");
	await expect(page.locator("#main-grid")).toHaveAttribute(
		"data-shell-strategy",
		"container-content",
	);
	await expect(page.locator("#main-grid")).toHaveAttribute(
		"data-has-support",
		"false",
	);
	await expect(page.locator("[data-comment-service]")).toHaveCount(0);
	await expect(page.locator("#tcomment")).toHaveCount(0);

	await gotoPage(page, "/friends/");
	await expect(page.locator("#main-grid")).toHaveAttribute(
		"data-shell-strategy",
		"container-content",
	);
	await expect(page.locator("#main-grid")).toHaveAttribute(
		"data-has-support",
		"false",
	);
	await expect(page.locator("[data-comment-service]")).toHaveCount(0);
	await expect(page.locator("#tcomment")).toHaveCount(0);

	await gotoPage(page, E2E_POSTS.writing.path);
	await expect(
		page.locator(
			".post-detail__comment-card[data-comment-service='twikoo']",
		),
	).toHaveCount(1);
});
