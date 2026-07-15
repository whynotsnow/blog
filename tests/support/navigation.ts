import type { Page, Response } from "@playwright/test";

export async function gotoPage(
	page: Page,
	url: string,
): Promise<Response | null> {
	return page.goto(url, { waitUntil: "load", timeout: 60_000 });
}
