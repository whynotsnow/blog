import type { Page, Response } from "@playwright/test";

type GotoPageOptions = {
	suppressNotices?: boolean;
};

export async function gotoPage(
	page: Page,
	url: string,
	options: GotoPageOptions = {},
): Promise<Response | null> {
	if (options.suppressNotices !== false) {
		await page.addInitScript(() => {
			localStorage.setItem(
				"site-notice:read:site-building-2026-07",
				"true",
			);
			localStorage.setItem(
				"site-notice:read:site-content-updates-2026-07",
				"true",
			);
		});
	}

	return page.goto(url, { waitUntil: "load", timeout: 60_000 });
}
