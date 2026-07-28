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
		const supportToc =
			document.querySelector<HTMLElement>(".post-support__toc")!;
		const supportTocStyle = getComputedStyle(supportToc);
		const expandedRegion = toc.querySelector<HTMLElement>(
			".toc-expanded-region",
		)!;
		const expandedRegionStyle = getComputedStyle(expandedRegion);

		return {
			supportTocHeight: supportToc.getBoundingClientRect().height,
			supportTocTransition: supportTocStyle.transitionProperty,
			expandedRegionTransition: expandedRegionStyle.transitionProperty,
			supportOverflowY: supportStyle.overflowY,
			tocBodyOverflowY: tocBodyStyle.overflowY,
			tocBodyScrollbarWidth: tocBodyStyle.scrollbarWidth,
			tocOverflowY: tocStyle.overflowY,
			childAnchors: toc.querySelectorAll(
				"a[data-toc-level]:not([data-toc-level='0'])",
			).length,
			expandedRegionCount: toc.querySelectorAll(".toc-expanded-region")
				.length,
		};
	});
	expect(overflowState.supportTocHeight).toBeLessThan(330);
	expect(overflowState.supportTocTransition).toContain("max-height");
	expect(overflowState.expandedRegionTransition).toContain("height");
	expect(overflowState.expandedRegionTransition).toContain("opacity");
	expect(overflowState.expandedRegionTransition).toContain("transform");
	expect(overflowState.supportOverflowY).toBe("visible");
	expect(overflowState.tocBodyOverflowY).toBe("auto");
	expect(overflowState.tocBodyScrollbarWidth).toBe("none");
	expect(overflowState.tocOverflowY).toBe("visible");
	expect(overflowState.childAnchors).toBe(0);
	expect(overflowState.expandedRegionCount).toBeGreaterThan(0);
	await expect(
		page.locator("#toc a", { hasText: "站点施工提示" }),
	).toHaveCount(0);

	await page.locator("#toc").evaluate((toc) => {
		const items = JSON.parse(
			toc.querySelector<HTMLScriptElement>("script[data-toc-items]")
				?.textContent || "[]",
		) as Array<{ id: string; text: string }>;
		const item = items.find((entry) => entry.text.includes("Inline HTML"));
		if (!item) throw new Error("Missing Inline HTML TOC item");
		const heading = document.getElementById(item.id);
		if (!heading) throw new Error(`Missing heading ${item.id}`);
		window.scrollTo({
			top: heading.getBoundingClientRect().top + window.scrollY - 120,
		});
	});
	await expect
		.poll(async () =>
			page.locator("#toc").evaluate((toc) => {
				const activeEntry = toc.querySelector<HTMLElement>("a.visible");
				return (
					activeEntry?.textContent?.replace(/\s+/g, " ").trim() ?? ""
				);
			}),
		)
		.toContain("Inline HTML");

	let expandedTocState = {
		tocCanScroll: false,
		tocScrollTop: 0,
		activeText: "",
		activeEntryVisible: false,
		indicatorStyle: "",
	};
	await expect
		.poll(async () => {
			expandedTocState = await page.locator("#toc").evaluate((toc) => {
				const scrollContainer = toc.closest<HTMLElement>(
					".post-support__toc-body",
				)!;
				const activeEntry = toc.querySelector<HTMLElement>("a.visible");
				const indicator =
					toc.querySelector<HTMLElement>("#active-indicator");
				const tocRect = scrollContainer.getBoundingClientRect();
				const activeRect = activeEntry?.getBoundingClientRect();

				return {
					tocCanScroll:
						scrollContainer.scrollHeight >
						scrollContainer.clientHeight + 1,
					tocScrollTop: scrollContainer.scrollTop,
					activeText:
						activeEntry?.textContent?.replace(/\s+/g, " ").trim() ??
						"",
					activeEntryVisible:
						!!activeRect &&
						activeRect.top >= tocRect.top - 1 &&
						activeRect.bottom <= tocRect.bottom + 1,
					indicatorStyle: indicator?.getAttribute("style") ?? "",
				};
			});
			return (
				expandedTocState.activeText.includes("Inline HTML") &&
				expandedTocState.activeEntryVisible
			);
		})
		.toBe(true);
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
			childCount: childEntries.length,
			indicatorStyle:
				toc
					.querySelector<HTMLElement>("#active-indicator")
					?.getAttribute("style") ?? "",
			transition: (toc as HTMLElement).dataset.tocTransition ?? "",
			mode: (toc as HTMLElement).dataset.tocMode ?? "",
			rootsOnlyReason:
				(toc as HTMLElement).dataset.tocRootsOnlyReason ?? "",
			scrollAnchor: (toc as HTMLElement).dataset.tocScrollAnchor ?? "",
		};
	});
	expect(topState.visibleCount).toBe(0);
	expect(topState.currentBranchCount).toBe(0);
	expect(topState.childCount).toBe(0);
	expect(topState.indicatorStyle).toContain("opacity: 0");
	expect(topState.transition).toBe("roots-only");
	expect(topState.mode).toBe("roots-only");
	expect(topState.rootsOnlyReason).toBe("top");
	expect(topState.scrollAnchor).toBe("top");

	await page.evaluate(() => {
		document.documentElement.style.scrollBehavior = "auto";
		window.scrollTo(0, document.documentElement.scrollHeight);
	});
	await page.waitForFunction(
		() =>
			window.scrollY + window.innerHeight >=
				document.documentElement.scrollHeight - 1 &&
			document.querySelector<HTMLElement>("#toc")?.dataset
				.tocRootsOnlyReason === "bottom",
	);

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
			childCount: childEntries.length,
			tocScrollTop: scrollContainer.scrollTop,
			transition: (toc as HTMLElement).dataset.tocTransition ?? "",
			mode: (toc as HTMLElement).dataset.tocMode ?? "",
			rootsOnlyReason:
				(toc as HTMLElement).dataset.tocRootsOnlyReason ?? "",
			scrollAnchor: (toc as HTMLElement).dataset.tocScrollAnchor ?? "",
		};
	});
	expect(bottomState.visibleCount).toBe(0);
	expect(bottomState.currentBranchCount).toBe(0);
	expect(bottomState.childCount).toBe(0);
	expect(bottomState.transition).toBe("roots-only");
	expect(bottomState.mode).toBe("roots-only");
	expect(bottomState.rootsOnlyReason).toBe("bottom");
	expect(bottomState.scrollAnchor).toBe("bottom");
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
					requestAnimationFrame(() =>
						window.setTimeout(resolve, 180),
					),
				),
			);
		const items = JSON.parse(
			document.querySelector<HTMLScriptElement>(
				"#toc script[data-toc-items]",
			)?.textContent || "[]",
		) as Array<{ id: string; text: string; level: number }>;
		const roots = items
			.map((item, index) => ({ item, index }))
			.filter(({ item }) => item.level === 0);
		const fourthRoot = roots[3];
		const previousRoot = roots[2];
		if (!fourthRoot || !previousRoot) {
			throw new Error(
				"Expected markdown tutorial to expose four TOC roots",
			);
		}

		const previousBranchChild = items
			.map((item, index) => ({ item, index }))
			.find(
				({ item, index }) =>
					index > previousRoot.index &&
					index < fourthRoot.index &&
					item.level === 1,
			);
		if (!previousBranchChild) {
			throw new Error(
				"Expected previous TOC branch to expose a child heading",
			);
		}

		const headingTop = (id: string) => {
			const heading = document.getElementById(id);
			if (!heading) throw new Error(`Missing heading ${id}`);
			return heading.getBoundingClientRect().top + window.scrollY;
		};

		const startY = headingTop(fourthRoot.item.id) - 120;
		const endY = headingTop(previousBranchChild.item.id) - 120;
		window.scrollTo(0, startY);
		await waitFrame();

		const collected: Array<{
			scrollY: number;
			trackerText: string;
			visible: string;
			transition: string;
			scrollAnchor: string;
			tocScrollTop: number;
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
				transition:
					document.querySelector<HTMLElement>("#toc")?.dataset
						.tocTransition ?? "",
				scrollAnchor:
					document.querySelector<HTMLElement>("#toc")?.dataset
						.tocScrollAnchor ?? "",
				tocScrollTop:
					document.querySelector<HTMLElement>(
						".post-support__toc-body",
					)?.scrollTop ?? 0,
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
			sample.visible.includes("This is an H"),
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
		const items = JSON.parse(
			document.querySelector<HTMLScriptElement>(
				"#toc script[data-toc-items]",
			)?.textContent || "[]",
		) as Array<{ id: string; text: string; level: number }>;
		const roots = items
			.map((item, index) => ({ item, index }))
			.filter(({ item }) => item.level === 0);
		const fourthRoot = roots[3];
		if (!fourthRoot) {
			throw new Error("Expected markdown tutorial to expose fourth root");
		}
		const nextRoot = roots[4]?.index ?? items.length;
		const firstChild = items
			.map((item, index) => ({ item, index }))
			.find(
				({ item, index }) =>
					index > fourthRoot.index &&
					index < nextRoot &&
					item.level === 1,
			);
		if (!firstChild) {
			throw new Error("Expected fourth root to expose a child heading");
		}

		const headingId = firstChild.item.id;
		const heading = document.getElementById(headingId);
		if (!heading) throw new Error(`Missing heading ${headingId}`);

		const documentElement = document.documentElement;
		const previousScrollBehavior = documentElement.style.scrollBehavior;
		documentElement.style.scrollBehavior = "auto";
		window.scrollTo(0, document.documentElement.scrollHeight);
		for (let step = 0; step < 20; step += 1) {
			await wait(100);
			if (
				window.scrollY + window.innerHeight >=
					document.documentElement.scrollHeight - 1 &&
				document.querySelector<HTMLElement>("#toc")?.dataset
					.tocRootsOnlyReason === "bottom"
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
			mode: string;
			scrollAnchor: string;
			tocScrollTop: number;
		}> = [];
		for (let step = 0; step < 12; step += 1) {
			await wait(70);
			samples.push({
				visible: normalize(
					document.querySelector("#toc a.visible")?.textContent,
				),
				branch: Array.from(
					document.querySelectorAll<HTMLElement>(
						"#toc a.is-current-branch",
					),
				).map((entry) => normalize(entry.textContent)),
				transition:
					document.querySelector<HTMLElement>("#toc")?.dataset
						.tocTransition ?? "",
				mode:
					document.querySelector<HTMLElement>("#toc")?.dataset
						.tocMode ?? "",
				scrollAnchor:
					document.querySelector<HTMLElement>("#toc")?.dataset
						.tocScrollAnchor ?? "",
				tocScrollTop:
					document.querySelector<HTMLElement>(
						".post-support__toc-body",
					)?.scrollTop ?? 0,
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
		bottomUpState.samples.some(
			(sample) =>
				sample.mode === "normal" &&
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
