import { expect, test } from "@playwright/test";
import { gotoPage } from "../../support/navigation";

test("post detail components render through the thin route", async ({
	page,
}) => {
	await gotoPage(page, "/posts/markdown-tutorial/");

	await expect(page.locator(".post-detail__shell")).toBeVisible();
	await expect(page.locator(".post-detail__header h1")).toBeVisible();
	await expect(page.locator(".post-detail__content")).toBeVisible();
	await expect(page.locator(".post-detail__navigation")).toBeVisible();
	await expect(page.locator("#post-container")).toHaveCount(1);
	await expect(
		page.locator(
			"#post-cover.onload-animation, #share-component.onload-animation, .license-container.onload-animation",
		),
	).toHaveCount(0);

	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.reload();
	expect(errors).toEqual([]);
});

test("post detail exposes one canonical route", async ({ page, request }) => {
	const response = await gotoPage(page, "/posts/encrypted-example/");

	expect(response?.ok()).toBe(true);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		"href",
		"https://blog.whynotsnow.com/posts/encrypted-example/",
	);
	await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
		"content",
		"https://blog.whynotsnow.com/posts/encrypted-example/",
	);

	const legacyResponse = await request.get("/posts/encrypted-post/");
	expect(legacyResponse.status()).toBe(404);
});

test("post content shares markdown styles and copy behavior", async ({
	page,
}) => {
	await gotoPage(page, "/posts/markdown-tutorial/");

	const content = page.locator(".post-content");
	await expect(content).toBeVisible();
	await expect(content.locator(".expressive-code").first()).toBeVisible();

	const copyButton = content.locator(".copy-btn").first();
	await expect(copyButton).toBeVisible();
	await copyButton.click();
	await expect(copyButton).toHaveClass(/success/);
});

test("post support TOC owns internal overflow without sidebar scrollbar", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1280, height: 520 });
	await gotoPage(page, "/posts/markdown-tutorial/");
	await expect(page.locator(".post-support")).toBeVisible();
	await expect(page.locator("#toc a").first()).toBeVisible();
	await page.waitForTimeout(280);

	const overflowState = await page.evaluate(() => {
		const support = document.querySelector<HTMLElement>(".post-support")!;
		const tocBody = document.querySelector<HTMLElement>(
			".post-support__toc-body",
		)!;
		const toc = document.querySelector<HTMLElement>("#toc")!;
		const supportStyle = getComputedStyle(support);
		const tocBodyStyle = getComputedStyle(tocBody);
		const tocStyle = getComputedStyle(toc);
		const collapsedEntry = toc.querySelector<HTMLElement>("a.is-collapsed");
		const collapsedEntryStyle = collapsedEntry
			? getComputedStyle(collapsedEntry)
			: null;
		const supportToc =
			document.querySelector<HTMLElement>(".post-support__toc")!;
		const supportTocStyle = getComputedStyle(supportToc);

		return {
			supportTocHeight: supportToc.getBoundingClientRect().height,
			supportTocTransition: supportTocStyle.transitionProperty,
			supportOverflowY: supportStyle.overflowY,
			tocBodyOverflowY: tocBodyStyle.overflowY,
			tocBodyScrollbarWidth: tocBodyStyle.scrollbarWidth,
			tocOverflowY: tocStyle.overflowY,
			collapsedEntryDisplay: collapsedEntryStyle?.display,
			collapsedEntryMaxHeight: collapsedEntryStyle?.maxHeight,
			collapsedEntryOpacity: collapsedEntryStyle?.opacity,
			collapsedEntryTransition: collapsedEntryStyle?.transitionProperty,
		};
	});
	expect(overflowState.supportTocHeight).toBeLessThan(330);
	expect(overflowState.supportTocTransition).toContain("max-height");
	expect(overflowState.supportOverflowY).toBe("visible");
	expect(overflowState.tocBodyOverflowY).toBe("auto");
	expect(overflowState.tocBodyScrollbarWidth).toBe("none");
	expect(overflowState.tocOverflowY).toBe("visible");
	expect(overflowState.collapsedEntryDisplay).toBe("flex");
	expect(overflowState.collapsedEntryMaxHeight).toBe("0px");
	expect(overflowState.collapsedEntryOpacity).toBe("0");
	expect(overflowState.collapsedEntryTransition).toContain("max-height");
	await expect(
		page.locator("#toc a", { hasText: "站点施工提示" }),
	).toHaveCount(0);

	await page.locator("#toc").evaluate((toc) => {
		const entries = Array.from(
			toc.querySelectorAll<HTMLAnchorElement>("a"),
		);
		for (const entry of entries) {
			entry.classList.remove("is-collapsed", "visible");
		}
		const activeEntry =
			entries.find((entry) =>
				entry.textContent?.includes("Inline HTML"),
			) ?? entries.at(-1);
		activeEntry?.classList.add("visible");
		const scrollContainer = toc.closest<HTMLElement>(
			".post-support__toc-body",
		)!;
		scrollContainer.scrollTop = 0;
	});

	await page.waitForTimeout(280);

	const expandedTocState = await page.locator("#toc").evaluate((toc) => {
		(
			toc as HTMLElement & {
				scrollToActiveHeading?: () => void;
			}
		).scrollToActiveHeading?.();
		const activeEntry = toc.querySelector<HTMLElement>("a.visible");
		const scrollContainer = toc.closest<HTMLElement>(
			".post-support__toc-body",
		)!;

		const tocRect = scrollContainer.getBoundingClientRect();
		const activeRect = activeEntry?.getBoundingClientRect();

		return {
			tocCanScroll:
				scrollContainer.scrollHeight > scrollContainer.clientHeight + 1,
			tocScrollTop: scrollContainer.scrollTop,
			activeEntryVisible:
				!!activeRect &&
				activeRect.top >= tocRect.top - 1 &&
				activeRect.bottom <= tocRect.bottom + 1,
		};
	});
	expect(expandedTocState.tocCanScroll).toBe(true);
	expect(expandedTocState.tocScrollTop).toBeGreaterThan(0);
	expect(expandedTocState.activeEntryVisible).toBe(true);

	const upwardIndicatorState = await page.locator("#toc").evaluate((toc) => {
		const entries = Array.from(
			toc.querySelectorAll<HTMLAnchorElement>("a"),
		);
		for (const entry of entries) {
			entry.classList.remove("is-collapsed", "visible");
		}
		const childIndex = entries.findIndex(
			(entry) => entry.dataset.tocLevel === "1",
		);
		const rootIndex = Math.max(
			0,
			entries
				.slice(0, childIndex)
				.findLastIndex((entry) => entry.dataset.tocLevel === "0"),
		);
		const childEntry = entries[childIndex]!;
		const rootEntry = entries[rootIndex]!;
		const scrollContainer = toc.closest<HTMLElement>(
			".post-support__toc-body",
		)!;
		const tocElement = toc as HTMLElement & {
			indicatorPlacement: "top" | "bottom";
			lastActiveIndicatorIndex: number;
			primeActiveIndicatorFromRect: (rect: DOMRect) => void;
			moveActiveIndicator: (top: number, bottom: number) => void;
		};

		scrollContainer.scrollTop = 0;
		childEntry.classList.add("visible");
		const childRect = childEntry.getBoundingClientRect();
		tocElement.indicatorPlacement = "bottom";
		tocElement.lastActiveIndicatorIndex = childIndex;
		tocElement.primeActiveIndicatorFromRect(childRect);

		childEntry.classList.remove("visible");
		rootEntry.classList.add("visible");
		const parentOffset = scrollContainer.getBoundingClientRect().top;
		const scrollOffset = scrollContainer.scrollTop;
		const rootRect = rootEntry.getBoundingClientRect();
		tocElement.moveActiveIndicator(
			rootRect.top - parentOffset + scrollOffset,
			rootRect.bottom - parentOffset + scrollOffset,
		);

		return {
			style:
				toc
					.querySelector<HTMLElement>("#active-indicator")
					?.getAttribute("style") ?? "",
		};
	});
	expect(upwardIndicatorState.style).toContain("top: auto");
	expect(upwardIndicatorState.style).toContain("bottom:");

	const boundaryState = await page.locator("#toc").evaluate((toc) => {
		const tocElement = toc as HTMLElement & {
			headings: HTMLElement[];
			indicatorPlacement: "top" | "bottom";
			updateAdaptiveState: () => void;
			toggleActiveHeading: () => void;
		};
		const stickyTop = Number.parseFloat(
			getComputedStyle(
				document.querySelector<HTMLElement>(".post-support")!,
			).top,
		);
		const targetTop = stickyTop + 24;
		const mockedTops = new Map<number, number>([
			[0, targetTop - 360],
			[1, targetTop - 320],
			[2, targetTop - 260],
			[3, targetTop - 180],
			[4, targetTop + 140],
			[5, targetTop + 220],
			[6, targetTop + 900],
		]);
		for (const [index, top] of mockedTops) {
			const heading = tocElement.headings[index];
			heading.getBoundingClientRect = (() =>
				({
					top,
					bottom: top + 36,
					height: 36,
					left: 0,
					right: 0,
					width: 0,
					x: 0,
					y: top,
					toJSON: () => ({}),
				}) as DOMRect) as HTMLElement["getBoundingClientRect"];
		}

		tocElement.indicatorPlacement = "bottom";
		tocElement.updateAdaptiveState();
		tocElement.toggleActiveHeading();

		const visibleEntry = toc.querySelector<HTMLElement>("a.visible");
		const currentBranchText = Array.from(
			toc.querySelectorAll<HTMLElement>(
				"a.is-current-branch:not(.is-collapsed)",
			),
		).map((entry) => entry.textContent?.replace(/\s+/g, " ").trim());
		const indicator = toc.querySelector<HTMLElement>("#active-indicator")!;
		const indicatorStyle = getComputedStyle(indicator);

		return {
			visibleText: visibleEntry?.textContent?.replace(/\s+/g, " ").trim(),
			currentBranchText,
			indicatorHeight: Number.parseFloat(indicatorStyle.height),
		};
	});
	expect(boundaryState.currentBranchText.join(" / ")).not.toContain(
		"2 This is an H1",
	);
	expect(boundaryState.currentBranchText.join(" / ")).toContain(
		"3 This is an H1",
	);
	expect(boundaryState.indicatorHeight).toBeGreaterThanOrEqual(32);

	const staleFirstHeadingState = await page
		.locator("#toc")
		.evaluate((toc) => {
			const tocElement = toc as HTMLElement & {
				headings: HTMLElement[];
				indicatorPlacement: "top" | "bottom";
				lastResolvedHeadingIndex: number;
				updateAdaptiveState: () => void;
				toggleActiveHeading: () => void;
			};
			const stickyTop = Number.parseFloat(
				getComputedStyle(
					document.querySelector<HTMLElement>(".post-support")!,
				).top,
			);
			const targetTop = stickyTop + 24;
			for (let i = 0; i <= 6; i++) {
				const heading = tocElement.headings[i];
				heading.getBoundingClientRect = (() =>
					({
						top: targetTop + 240 + i * 40,
						bottom: targetTop + 276 + i * 40,
						height: 36,
						left: 0,
						right: 0,
						width: 0,
						x: 0,
						y: targetTop + 240 + i * 40,
						toJSON: () => ({}),
					}) as DOMRect) as HTMLElement["getBoundingClientRect"];
			}
			tocElement.indicatorPlacement = "bottom";
			tocElement.lastResolvedHeadingIndex = 6;
			tocElement.updateAdaptiveState();
			tocElement.toggleActiveHeading();

			const visibleEntry = toc.querySelector<HTMLElement>("a.visible");
			const currentBranchText = Array.from(
				toc.querySelectorAll<HTMLElement>(
					"a.is-current-branch:not(.is-collapsed)",
				),
			).map((entry) => entry.textContent?.replace(/\s+/g, " ").trim());

			return {
				visibleText: visibleEntry?.textContent
					?.replace(/\s+/g, " ")
					.trim(),
				currentBranchText,
			};
		});
	expect(staleFirstHeadingState.visibleText).not.toContain(
		"1 Markdown Tutorial",
	);
	expect(staleFirstHeadingState.currentBranchText.join(" / ")).not.toContain(
		"1 Markdown Tutorial",
	);
});

test("encrypted posts reuse the shared post content contract", async ({
	page,
}) => {
	await gotoPage(page, "/posts/encrypted-example/");

	await expect(page.locator("#password-protection")).toBeVisible();
	await page.locator("#password-input").fill("123456");
	await page.locator("#unlock-btn").click();

	const decryptedContent = page.locator("#decrypted-content");
	await expect(decryptedContent).toBeVisible();
	await expect(decryptedContent.locator(".post-content")).toBeVisible();
});
