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

test("post TOC ignores headings outside article content", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 720 });
	await gotoPage(page, "/posts/markdown-tutorial/");
	await expect(page.locator("#toc a").first()).toBeVisible();
	const staticTocItems = await page.locator("#post-toc-data").evaluate(
		(dataElement) =>
			JSON.parse(dataElement.textContent || "[]") as Array<{
				id: string;
				text: string;
			}>,
	);
	expect(staticTocItems.length).toBeGreaterThan(0);
	expect(staticTocItems.map((item) => item.text)).toContain(
		"Markdown Tutorial",
	);

	await page.evaluate(() => {
		const heading = document.createElement("h2");
		heading.id = "outside-post-heading";
		heading.textContent = "Outside Post Heading";
		document.querySelector("#main-grid")?.prepend(heading);
		document
			.querySelector<
				HTMLElement & { regenerateTOC?: () => void }
			>("table-of-contents")
			?.regenerateTOC?.();
	});

	await expect(
		page.locator("#toc a", { hasText: "Outside Post Heading" }),
	).toHaveCount(0);

	expect(staticTocItems.map((item) => item.text)).not.toContain(
		"Outside Post Heading",
	);
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

	await page
		.locator("#toc a", { hasText: "Inline HTML" })
		.evaluate((entry) => {
			const id = decodeURIComponent(
				(entry as HTMLAnchorElement).hash.slice(1),
			);
			const heading = document.getElementById(id);
			if (!heading) throw new Error(`Missing heading ${id}`);
			window.scrollTo({
				top: heading.getBoundingClientRect().top + window.scrollY - 120,
			});
		});
	await page.waitForTimeout(520);

	const expandedTocState = await page.locator("#toc").evaluate((toc) => {
		const scrollContainer = toc.closest<HTMLElement>(
			".post-support__toc-body",
		)!;
		const activeEntry = toc.querySelector<HTMLElement>("a.visible");
		const indicator = toc.querySelector<HTMLElement>("#active-indicator");
		const tocRect = scrollContainer.getBoundingClientRect();
		const activeRect = activeEntry?.getBoundingClientRect();

		return {
			tocCanScroll:
				scrollContainer.scrollHeight > scrollContainer.clientHeight + 1,
			tocScrollTop: scrollContainer.scrollTop,
			activeText:
				activeEntry?.textContent?.replace(/\s+/g, " ").trim() ?? "",
			activeEntryVisible:
				!!activeRect &&
				activeRect.top >= tocRect.top - 1 &&
				activeRect.bottom <= tocRect.bottom + 1,
			indicatorStyle: indicator?.getAttribute("style") ?? "",
		};
	});
	expect(expandedTocState.tocCanScroll).toBe(true);
	expect(expandedTocState.tocScrollTop).toBeGreaterThan(0);
	expect(expandedTocState.activeText).toContain("Inline HTML");
	expect(expandedTocState.activeEntryVisible).toBe(true);
	expect(expandedTocState.indicatorStyle).toContain("top: 0");
	expect(expandedTocState.indicatorStyle).toContain("bottom: auto");
	expect(expandedTocState.indicatorStyle).toContain("transform: translateY");
});

test("post support TOC collapses to root list at document boundaries", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1280, height: 720 });
	await gotoPage(page, "/posts/markdown-tutorial/");
	await expect(page.locator("#toc a").first()).toBeVisible();
	await page.waitForTimeout(320);

	const topState = await page.locator("#toc").evaluate((toc) => {
		const entries = Array.from(
			toc.querySelectorAll<HTMLAnchorElement>("a"),
		);
		const childEntries = entries.filter(
			(entry) => entry.dataset.tocLevel !== "0",
		);
		return {
			visibleCount: toc.querySelectorAll("a.visible").length,
			currentBranchCount: toc.querySelectorAll("a.is-current-branch")
				.length,
			collapsedChildren: childEntries.filter((entry) =>
				entry.classList.contains("is-collapsed"),
			).length,
			childCount: childEntries.length,
			indicatorStyle:
				toc
					.querySelector<HTMLElement>("#active-indicator")
					?.getAttribute("style") ?? "",
			transition: (toc as HTMLElement).dataset.tocTransition ?? "",
		};
	});
	expect(topState.visibleCount).toBe(0);
	expect(topState.currentBranchCount).toBe(0);
	expect(topState.collapsedChildren).toBe(topState.childCount);
	expect(topState.indicatorStyle).toContain("opacity: 0");
	expect(topState.transition).toBe("boundary-start");

	await page.evaluate(() => {
		window.scrollTo(0, document.documentElement.scrollHeight);
	});
	await page.waitForTimeout(420);

	const bottomState = await page.locator("#toc").evaluate((toc) => {
		const entries = Array.from(
			toc.querySelectorAll<HTMLAnchorElement>("a"),
		);
		const childEntries = entries.filter(
			(entry) => entry.dataset.tocLevel !== "0",
		);
		const scrollContainer = toc.closest<HTMLElement>(
			".post-support__toc-body",
		)!;
		return {
			visibleCount: toc.querySelectorAll("a.visible").length,
			currentBranchCount: toc.querySelectorAll("a.is-current-branch")
				.length,
			collapsedChildren: childEntries.filter((entry) =>
				entry.classList.contains("is-collapsed"),
			).length,
			childCount: childEntries.length,
			tocScrollTop: scrollContainer.scrollTop,
			transition: (toc as HTMLElement).dataset.tocTransition ?? "",
		};
	});
	expect(bottomState.visibleCount).toBe(0);
	expect(bottomState.currentBranchCount).toBe(0);
	expect(bottomState.collapsedChildren).toBe(bottomState.childCount);
	expect(bottomState.tocScrollTop).toBe(0);
	expect(bottomState.transition).toBe("boundary-end");
});

test("post support TOC keeps active heading stable across branch transitions", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1280, height: 720 });
	await gotoPage(page, "/posts/markdown-tutorial/");
	await expect(page.locator("#toc a").first()).toBeVisible();

	const transitionState = await page.evaluate(async () => {
		const normalize = (value: string | null | undefined) =>
			value?.replace(/\s+/g, " ").trim() ?? "";
		const waitFrame = () =>
			new Promise<void>((resolve) =>
				requestAnimationFrame(() =>
					requestAnimationFrame(() => resolve()),
				),
			);
		const entries = Array.from(
			document.querySelectorAll<HTMLAnchorElement>("#toc a"),
		);
		const roots = entries
			.map((entry, index) => ({ entry, index }))
			.filter(({ entry }) => entry.dataset.tocLevel === "0");
		const fourthRoot = roots[3];
		const previousRoot = roots[2];
		if (!fourthRoot || !previousRoot) {
			throw new Error(
				"Expected markdown tutorial to expose four TOC roots",
			);
		}

		const previousBranchChild = entries
			.map((entry, index) => ({ entry, index }))
			.find(
				({ entry, index }) =>
					index > previousRoot.index &&
					index < fourthRoot.index &&
					entry.dataset.tocLevel === "1",
			);
		if (!previousBranchChild) {
			throw new Error(
				"Expected previous TOC branch to expose a child heading",
			);
		}

		const headingTop = (entry: HTMLAnchorElement) => {
			const id = decodeURIComponent(entry.hash.slice(1));
			const heading = document.getElementById(id);
			if (!heading) throw new Error(`Missing heading ${id}`);
			return heading.getBoundingClientRect().top + window.scrollY;
		};

		const startY = headingTop(fourthRoot.entry) - 120;
		const endY = headingTop(previousBranchChild.entry) - 120;
		window.scrollTo(0, startY);
		await waitFrame();

		const collected: Array<{
			scrollY: number;
			trackerText: string;
			visible: string;
		}> = [];
		for (let step = 0; step <= 20; step += 1) {
			const progress = step / 20;
			window.scrollTo(0, startY + (endY - startY) * progress);
			await waitFrame();
			collected.push({
				scrollY: Math.round(window.scrollY),
				trackerText:
					(
						document.querySelector<
							HTMLElementTagNameMap["table-of-contents"]
						>("table-of-contents") as HTMLElement & {
							activeTracker?: {
								getActiveNode?: () => { text?: string } | null;
							};
						}
					)?.activeTracker?.getActiveNode?.()?.text ?? "",
				visible: normalize(
					document.querySelector("#toc a.visible")?.textContent,
				),
			});
		}
		await new Promise((resolve) => window.setTimeout(resolve, 300));
		const scrollContainer = document.querySelector<HTMLElement>(
			".post-support__toc-body",
		);
		const activeEntry =
			document.querySelector<HTMLElement>("#toc a.visible");
		const containerRect = scrollContainer?.getBoundingClientRect();
		const activeRect = activeEntry?.getBoundingClientRect();

		return {
			samples: collected,
			activeFullyVisible:
				!!containerRect &&
				!!activeRect &&
				activeRect.top >= containerRect.top - 1 &&
				activeRect.bottom <= containerRect.bottom + 1,
		};
	});
	const scrolledSamples = transitionState.samples.filter(
		(sample) => sample.scrollY > 100 && sample.visible.length > 0,
	);
	const targetRegionSamples = scrolledSamples.filter((sample) =>
		sample.trackerText.includes("This is an H"),
	);

	expect(
		targetRegionSamples.some((sample) =>
			sample.visible.includes("Markdown Tutorial"),
		),
	).toBe(false);
	expect(
		targetRegionSamples.some((sample) =>
			sample.visible.includes("This is an H1"),
		),
	).toBe(true);
	expect(
		targetRegionSamples.some((sample) => sample.visible.length > 0),
	).toBe(true);
	expect(transitionState.activeFullyVisible).toBe(true);
});

test("post support TOC keeps expanded child fully visible when scrolling up from bottom", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1280, height: 520 });
	await gotoPage(page, "/posts/markdown-tutorial/");
	await expect(page.locator("#toc a").first()).toBeVisible();

	const bottomUpState = await page.evaluate(async () => {
		const normalize = (value: string | null | undefined) =>
			value?.replace(/\s+/g, " ").trim() ?? "";
		const wait = (delay: number) =>
			new Promise((resolve) => window.setTimeout(resolve, delay));
		const entries = Array.from(
			document.querySelectorAll<HTMLAnchorElement>("#toc a"),
		);
		const roots = entries
			.map((entry, index) => ({ entry, index }))
			.filter(({ entry }) => entry.dataset.tocLevel === "0");
		const fourthRoot = roots[3];
		if (!fourthRoot) {
			throw new Error("Expected markdown tutorial to expose fourth root");
		}
		const nextRoot = roots[4]?.index ?? entries.length;
		const firstChild = entries
			.map((entry, index) => ({ entry, index }))
			.find(
				({ entry, index }) =>
					index > fourthRoot.index &&
					index < nextRoot &&
					entry.dataset.tocLevel === "1",
			);
		if (!firstChild) {
			throw new Error("Expected fourth root to expose a child heading");
		}

		const headingId = decodeURIComponent(firstChild.entry.hash.slice(1));
		const heading = document.getElementById(headingId);
		if (!heading) throw new Error(`Missing heading ${headingId}`);

		const documentElement = document.documentElement;
		const previousScrollBehavior = documentElement.style.scrollBehavior;
		documentElement.style.scrollBehavior = "auto";
		window.scrollTo(0, document.documentElement.scrollHeight);
		for (let step = 0; step < 20; step += 1) {
			await wait(100);
			if (
				document.querySelector<HTMLElement>("#toc")?.dataset
					.tocTransition === "boundary-end"
			) {
				break;
			}
		}
		window.scrollTo({
			top: heading.getBoundingClientRect().top + window.scrollY - 120,
		});
		const samples: Array<{
			visible: string;
			branch: string[];
			transition: string;
			phase: string;
		}> = [];
		for (let step = 0; step < 12; step += 1) {
			await wait(70);
			samples.push({
				visible: normalize(
					document.querySelector("#toc a.visible")?.textContent,
				),
				branch: Array.from(
					document.querySelectorAll<HTMLElement>(
						"#toc a.is-current-branch:not(.is-collapsed)",
					),
				).map((entry) => normalize(entry.textContent)),
				transition:
					document.querySelector<HTMLElement>("#toc")?.dataset
						.tocTransition ?? "",
				phase:
					document.querySelector<HTMLElement>("#toc")?.dataset
						.tocPhase ?? "",
			});
		}
		documentElement.style.scrollBehavior = previousScrollBehavior;

		const scrollContainer = document.querySelector<HTMLElement>(
			".post-support__toc-body",
		)!;
		const activeEntry =
			document.querySelector<HTMLElement>("#toc a.visible");
		const activeRoot = document.querySelector<HTMLElement>(
			"#toc a.is-current-branch[data-toc-level='0']",
		);
		const containerRect = scrollContainer.getBoundingClientRect();
		const activeRect = activeEntry?.getBoundingClientRect();
		const rootRect = activeRoot?.getBoundingClientRect();

		return {
			samples,
			activeText: normalize(activeEntry?.textContent),
			activeLevel: activeEntry?.dataset.tocLevel ?? "",
			activeRootText: normalize(activeRoot?.textContent),
			activeFullyVisible:
				!!activeRect &&
				activeRect.top >= containerRect.top - 1 &&
				activeRect.bottom <= containerRect.bottom + 1,
			rootVisible:
				!!rootRect &&
				rootRect.bottom >= containerRect.top - 1 &&
				rootRect.top <= containerRect.bottom + 1,
		};
	});

	expect(
		bottomUpState.samples.some((sample) =>
			sample.visible.includes("1 Markdown Tutorial"),
		),
	).toBe(false);
	expect(
		bottomUpState.samples.some(
			(sample) =>
				sample.transition === "boundary-exit" &&
				sample.phase === "prepare" &&
				sample.visible === "" &&
				sample.branch.some((text) => text.includes("4 This is an H1")),
		),
	).toBe(true);
	expect(bottomUpState.activeText.length).toBeGreaterThan(0);
	expect(bottomUpState.activeLevel).toBe("1");
	expect(bottomUpState.activeRootText).toContain("4 This is an H1");
	expect(bottomUpState.activeFullyVisible).toBe(true);
	expect(bottomUpState.rootVisible).toBe(true);
});

test("encrypted posts reuse the shared post content contract", async ({
	page,
}) => {
	await gotoPage(page, "/posts/encrypted-example/");

	await expect(page.locator("#password-protection")).toBeVisible();
	await expect(page.locator("#post-toc-data")).toHaveCount(0);
	await expect(page.locator("#toc a")).toHaveCount(0);
	await page.locator("#password-input").fill("123456");
	await page.locator("#unlock-btn").click();

	const decryptedContent = page.locator("#decrypted-content");
	await expect(decryptedContent).toBeVisible();
	await expect(decryptedContent.locator(".post-content")).toBeVisible();
	await expect(page.locator("#toc a").first()).toBeVisible();
	await expect(
		page.locator("#toc a", { hasText: "Front-matter of Posts" }),
	).toBeVisible();
});
