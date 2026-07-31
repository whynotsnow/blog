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

test("post detail flow keeps article blocks on one content rail", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await gotoPage(page, "/posts/markdown-tutorial/");

	const railState = await page.evaluate(() => {
		const railSelectors = [
			".post-detail__header",
			"#post-cover",
			".post-detail__content",
			"#share-component",
			"#license-component",
			".post-detail__after-flow-inner > .post-detail__comment-card",
			".post-detail__navigation",
		];
		const readRects = (selectors: string[]) =>
			selectors
				.map((selector) => {
					const element = document.querySelector(selector);
					if (!element) return null;
					const rect = element.getBoundingClientRect();
					return {
						selector,
						x: Math.round(rect.x),
						width: Math.round(rect.width),
					};
				})
				.filter((rect): rect is NonNullable<typeof rect> =>
					Boolean(rect),
				);
		const railRects = readRects(railSelectors);

		const article = document
			.querySelector(".post-detail__article")
			?.getBoundingClientRect();
		const afterFlow = document
			.querySelector(".post-detail__after-flow")
			?.getBoundingClientRect();
		const afterFlowInner = document
			.querySelector(".post-detail__after-flow-inner")
			?.getBoundingClientRect();
		const navigationCard = document.querySelector(
			".post-detail__navigation-card",
		);
		const navigationCardStyle = navigationCard
			? getComputedStyle(navigationCard)
			: null;

		return {
			railRects,
			articleX: article ? Math.round(article.x) : null,
			articleWidth: article ? Math.round(article.width) : null,
			afterFlowX: afterFlow ? Math.round(afterFlow.x) : null,
			afterFlowWidth: afterFlow ? Math.round(afterFlow.width) : null,
			afterFlowInnerX: afterFlowInner
				? Math.round(afterFlowInner.x)
				: null,
			afterFlowInnerWidth: afterFlowInner
				? Math.round(afterFlowInner.width)
				: null,
			navigationCardBorderWidth: navigationCardStyle
				? Number.parseFloat(navigationCardStyle.borderTopWidth)
				: 0,
			navigationCardBackground:
				navigationCardStyle?.backgroundColor ?? "",
			overflow: document.documentElement.scrollWidth - window.innerWidth,
		};
	});

	expect(railState.railRects.length).toBeGreaterThanOrEqual(4);
	const [firstRailRect] = railState.railRects;
	for (const rect of railState.railRects) {
		expect(rect.x, rect.selector).toBe(firstRailRect.x);
		expect(rect.width, rect.selector).toBe(firstRailRect.width);
	}
	expect(railState.afterFlowX).toBe(railState.articleX);
	expect(railState.afterFlowWidth).toBe(railState.articleWidth);
	expect(railState.afterFlowInnerX).toBe(firstRailRect.x);
	expect(railState.afterFlowInnerWidth).toBe(firstRailRect.width);
	expect(railState.navigationCardBorderWidth).toBeGreaterThan(0);
	expect(railState.navigationCardBackground).not.toBe("rgba(0, 0, 0, 0)");
	expect(railState.overflow).toBeLessThanOrEqual(0);
});

test("Twikoo comment actions keep canonical path and do not jump to page top", async ({
	page,
}) => {
	await page.route("**/assets/css/twikoo.css", async (route) => {
		await route.fulfill({
			contentType: "text/css",
			body: ".tk-input .el-textarea__inner { border-radius: 0; }",
		});
	});
	await page.route("**/assets/js/twikoo.nocss.js", async (route) => {
		await route.fulfill({
			contentType: "application/javascript",
			body: `
				window.__twikooInitCalls = [];
				window.twikoo = {
					init(config) {
						window.__twikooInitCalls.push({ ...config });
						const root = document.querySelector(config.el);
						if (!root) throw new Error("Missing Twikoo root");
						root.innerHTML = [
							'<div class="tk-comments">',
							'  <article id="mock-comment-target" class="tk-comment">',
							'    <p>Mock comment</p>',
							'    <a class="tk-ruser" href="#" data-reply-ref>@reader</a>',
							'    <button class="tk-action-link" data-like>Like</button>',
							'  </article>',
							'</div>'
						].join("");
						root.querySelector("[data-reply-ref]").addEventListener("click", (event) => {
							event.preventDefault();
							document.getElementById("mock-comment-target").scrollIntoView({
								behavior: "instant",
								block: "center"
							});
						});
						return Promise.resolve();
					}
				};
			`,
		});
	});

	await gotoPage(page, "/posts/markdown-tutorial/");
	await expect(
		page.locator("#tcomment[data-twikoo-state='ready']"),
	).toBeVisible();
	await expect(page.locator("#mock-comment-target")).toBeVisible();

	const initCalls = await page.evaluate(
		() =>
			(
				window as typeof window & {
					__twikooInitCalls?: Array<{ path?: string; el?: string }>;
				}
			).__twikooInitCalls ?? [],
	);
	expect(initCalls).toHaveLength(1);
	expect(initCalls[0]).toMatchObject({
		el: "#tcomment",
		path: "/posts/markdown-tutorial/",
	});

	await page.evaluate(() => {
		const comment = document.getElementById("mock-comment-target");
		if (!comment) throw new Error("Missing mock comment target");
		window.scrollTo({
			top:
				comment.getBoundingClientRect().top +
				window.scrollY -
				window.innerHeight * 0.45,
			behavior: "instant",
		});
	});

	const beforeClick = await page.evaluate(() => ({
		hash: window.location.hash,
		scrollY: window.scrollY,
	}));
	expect(beforeClick.scrollY).toBeGreaterThan(100);

	await page.locator("[data-reply-ref]").click();

	const afterReplyClick = await page.evaluate(() => ({
		hash: window.location.hash,
		scrollY: window.scrollY,
	}));
	expect(afterReplyClick.hash).toBe(beforeClick.hash);
	expect(afterReplyClick.scrollY).toBeGreaterThan(100);

	await page.locator("[data-like]").click();

	const afterButtonClick = await page.evaluate(() => ({
		hash: window.location.hash,
		scrollY: window.scrollY,
	}));
	expect(afterButtonClick.hash).toBe(beforeClick.hash);
	expect(afterButtonClick.scrollY).toBeGreaterThan(100);
});

test("Twikoo receives encoded canonical path for non-ascii post routes", async ({
	page,
}) => {
	await page.route("**/assets/css/twikoo.css", async (route) => {
		await route.fulfill({
			contentType: "text/css",
			body: ".tk-comments { display: block; }",
		});
	});
	await page.route("**/assets/js/twikoo.nocss.js", async (route) => {
		await route.fulfill({
			contentType: "application/javascript",
			body: `
				window.__twikooInitCalls = [];
				window.twikoo = {
					init(config) {
						window.__twikooInitCalls.push({ ...config });
						const root = document.querySelector(config.el);
						if (!root) throw new Error("Missing Twikoo root");
						root.innerHTML = '<div id="mock-comment-target" class="tk-comments">Mock comments</div>';
						return Promise.resolve();
					}
				};
			`,
		});
	});

	await gotoPage(
		page,
		"/posts/%E6%88%91%E7%9A%84%E5%8D%9A%E5%AE%A2%E6%96%87%E7%AB%A0-3/",
	);
	await expect(
		page.locator("#tcomment[data-twikoo-state='ready']"),
	).toBeVisible();

	const initCalls = await page.evaluate(
		() =>
			(
				window as typeof window & {
					__twikooInitCalls?: Array<{ path?: string; el?: string }>;
				}
			).__twikooInitCalls ?? [],
	);
	expect(initCalls).toHaveLength(1);
	expect(initCalls[0]).toMatchObject({
		el: "#tcomment",
		path: "/posts/%E6%88%91%E7%9A%84%E5%8D%9A%E5%AE%A2%E6%96%87%E7%AB%A0-3/",
	});
});

test("Twikoo comment card stays collapsed until the widget renders", async ({
	page,
}) => {
	let releaseScript!: () => void;
	const scriptCanLoad = new Promise<void>((resolve) => {
		releaseScript = resolve;
	});

	await page.route("**/assets/css/twikoo.css", async (route) => {
		await route.fulfill({
			contentType: "text/css",
			body: ".tk-comments { display: block; }",
		});
	});
	await page.route("**/assets/js/twikoo.nocss.js", async (route) => {
		await scriptCanLoad;
		await route.fulfill({
			contentType: "application/javascript",
			body: `
				window.twikoo = {
					init(config) {
						const root = document.querySelector(config.el);
						if (!root) throw new Error("Missing Twikoo root");
						root.innerHTML = '<div class="tk-comments">Rendered comments</div>';
						return Promise.resolve();
					}
				};
			`,
		});
	});

	await page.addInitScript(() => {
		localStorage.setItem("site-notice:read:site-building-2026-07", "true");
		localStorage.setItem(
			"site-notice:read:site-content-updates-2026-07",
			"true",
		);
	});
	await page.goto("/posts/markdown-tutorial/", {
		waitUntil: "domcontentloaded",
		timeout: 60_000,
	});
	const commentCard = page.locator(".post-detail__comment-card");
	await expect(commentCard).toHaveCount(1);
	await expect(commentCard).toHaveCSS("display", "none");

	releaseScript();
	await expect(
		page.locator("#tcomment[data-twikoo-state='ready']"),
	).toBeVisible();
	await expect(commentCard).not.toHaveCSS("display", "none");
	await expect(commentCard.locator(".tk-comments")).toHaveText(
		"Rendered comments",
	);
});

test("Twikoo theme styles are available after Swup post navigation", async ({
	page,
}) => {
	await page.route("**/assets/css/twikoo.css", async (route) => {
		await route.fulfill({
			contentType: "text/css",
			body: [
				".tk-comments-title { font-size: 28px; }",
				".tk-action-link:hover { color: var(--twikoo-accent); }",
				".tk-action-icon { color: var(--twikoo-accent); }",
				".tk-input .el-textarea__inner { border-radius: 0; }",
				".el-input.is-active .el-input__inner, .el-input__inner:focus { border-color: var(--twikoo-accent); }",
				".el-button--primary { color: #fff; background: var(--twikoo-accent); border-color: var(--twikoo-accent); }",
				".el-button--text { color: var(--twikoo-accent); }",
				".tk-sort-item.__active { color: var(--twikoo-accent); }",
				".tk-icon.__comments { color: var(--twikoo-accent); }",
				".tk-pagination-pager.__current { color: var(--text-on-accent); background-color: var(--twikoo-accent); }",
				".tk-comments { display: flex; flex-direction: column; }",
				".tk-comments-no { flex: 1; text-align: center; display: flex; align-items: center; justify-content: center; }",
				".el-loading-mask { position: absolute; top: 0; right: 0; bottom: 0; left: 0; }",
				".el-loading-spinner { position: absolute; top: 50%; width: 100%; text-align: center; }",
				".el-loading-spinner .el-loading-text { color: var(--twikoo-accent); }",
				".el-loading-spinner .path { stroke: var(--twikoo-accent); }",
				".tk-replies { border-radius: 0; }",
				".tk-content { line-height: 1; }",
			].join("\n"),
		});
	});
	await page.route("**/assets/js/twikoo.nocss.js", async (route) => {
		await route.fulfill({
			contentType: "application/javascript",
			body: `
				window.__twikooInitCalls = [];
				window.twikoo = {
					init(config) {
						window.__twikooInitCalls.push({ ...config });
						const root = document.querySelector(config.el);
						if (!root) throw new Error("Missing Twikoo root");
						const officialStyle = document.createElement("style");
						officialStyle.dataset.mockTwikooOfficialStyle = "true";
						officialStyle.textContent = [
							'.tk-comments-title { font-size: 32px; }',
							'.tk-replies { border-radius: 0; }',
							'.tk-content { line-height: 1; }',
							'.el-textarea__inner { border-radius: 0; }'
						].join("\\n");
						document.head.append(officialStyle);
						window.setTimeout(() => {
							const delayedStyle = document.createElement("style");
							delayedStyle.dataset.mockTwikooDelayedStyle = "true";
							delayedStyle.textContent = [
								'.tk-comments-title { font-size: 40px; }',
								'.tk-replies { border-radius: 0; }',
								'.tk-content { line-height: 1; }',
								'.tk-input .el-textarea__inner { border-radius: 0; }'
							].join("\\n");
							document.head.append(delayedStyle);
						}, 300);
						const twikooRoot = document.createElement("div");
						twikooRoot.id = "twikoo";
						twikooRoot.className = "twikoo";
						twikooRoot.innerHTML = [
							'<section class="tk-comments">',
							'  <h2 class="tk-comments-title">Comments</h2>',
							'  <div class="tk-meta-input">',
							'    <div class="el-input is-active"><input class="el-input__inner" value="Reader"></div>',
							'  </div>',
							'  <div class="tk-input">',
							'    <textarea class="el-textarea__inner" placeholder="Comment"></textarea>',
							'  </div>',
							'  <div class="tk-submit">',
							'    <button class="el-button el-button--primary tk-send">Send</button>',
							'    <button class="el-button el-button--text tk-preview">Preview</button>',
							'  </div>',
							'  <button class="tk-sort-item __active" type="button">Newest</button>',
							'  <span class="tk-icon __comments"><svg viewBox="0 0 10 10"><path d="M0 0h10v10H0z"></path></svg></span>',
							'  <button class="tk-action-link" type="button"><span class="tk-action-icon">Like</span></button>',
							'  <button class="tk-action-link tk-liked" type="button"><span class="tk-action-icon">Like</span><span class="tk-action-icon-solid">Liked</span></button>',
							'  <div class="tk-pagination-pager __current">1</div>',
							'  <div class="tk-comments-no"><span>没有评论</span></div>',
							'  <div class="el-loading-mask"><div class="el-loading-spinner"><svg><path class="path" d="M0 0h10"></path></svg><i>i</i><span class="el-loading-text">Loading</span></div></div>',
							'  <article class="tk-comment">',
							'    <a class="tk-nick" href="#">Reader</a>',
							'    <div class="tk-time">now</div>',
							'    <div class="tk-content"><p>Mock comment <a href="https://example.com">link</a></p></div>',
							'    <div class="tk-replies">Reply</div>',
							'  </article>',
							'</section>'
						].join("");
						root.replaceWith(twikooRoot);
						return new Promise((resolve) => window.setTimeout(resolve, 600));
					}
				};
			`,
		});
	});

	await gotoPage(page, "/");
	await expect
		.poll(() => page.evaluate(() => Boolean(window.swup)))
		.toBe(true);

	await page.evaluate(() => {
		window.swup.navigate("/posts/markdown-tutorial/");
	});

	await expect(page).toHaveURL(/\/posts\/markdown-tutorial\/$/);
	await expect(
		page.locator('[data-comment-service="twikoo"] #twikoo'),
	).toBeVisible();
	await expect
		.poll(() =>
			page.evaluate(() =>
				Boolean(
					document.head.querySelector(
						"style[data-mock-twikoo-delayed-style='true']",
					),
				),
			),
		)
		.toBe(true);

	const themeState = await page
		.locator('[data-comment-service="twikoo"]')
		.evaluate((root) => {
			function computeCustomValue(property: string) {
				const probe = document.createElement("div");
				probe.style.width = `var(${property})`;
				probe.style.borderRadius = `var(${property})`;
				probe.style.fontSize = `var(${property})`;
				document.body.append(probe);
				const style = getComputedStyle(probe);
				const value = property.includes("radius")
					? style.borderRadius
					: property.includes("text")
						? style.fontSize
						: style.width;
				probe.remove();
				return value;
			}

			function computeCustomColor(property: string) {
				const probe = document.createElement("div");
				probe.style.color = `var(${property})`;
				document.body.append(probe);
				const value = getComputedStyle(probe).color;
				probe.remove();
				return value;
			}

			function computeCssValue(
				property: "borderColor" | "boxShadow",
				value: string,
			) {
				const probe = document.createElement("div");
				probe.style[property] = value;
				root.append(probe);
				const computedValue = getComputedStyle(probe)[property];
				probe.remove();
				return computedValue;
			}

			const input = root.querySelector<HTMLElement>(
				".el-textarea__inner",
			);
			const activeInput = root.querySelector<HTMLElement>(
				".el-input.is-active .el-input__inner",
			);
			const replies = root.querySelector<HTMLElement>(".tk-replies");
			const content = root.querySelector<HTMLElement>(".tk-content");
			const primaryButton = root.querySelector<HTMLElement>(
				".el-button--primary",
			);
			const textButton =
				root.querySelector<HTMLElement>(".el-button--text");
			const sortButton = root.querySelector<HTMLElement>(
				".tk-sort-item.__active",
			);
			const commentsIcon = root.querySelector<HTMLElement>(
				".tk-icon.__comments",
			);
			const actionIcon = root.querySelector<HTMLElement>(
				".tk-action-link:not(.tk-liked) .tk-action-icon",
			);
			const pager = root.querySelector<HTMLElement>(
				".tk-pagination-pager.__current",
			);
			const loadingPath = root.querySelector<SVGPathElement>(
				".el-loading-spinner .path",
			);
			const loadingText = root.querySelector<HTMLElement>(
				".el-loading-spinner .el-loading-text",
			);
			const loadingMask =
				root.querySelector<HTMLElement>(".el-loading-mask");
			const loadingSpinner = root.querySelector<HTMLElement>(
				".el-loading-spinner",
			);
			const noComments =
				root.querySelector<HTMLElement>(".tk-comments-no");
			if (
				!input ||
				!activeInput ||
				!replies ||
				!content ||
				!primaryButton ||
				!textButton ||
				!sortButton ||
				!commentsIcon ||
				!actionIcon ||
				!pager ||
				!loadingPath ||
				!loadingText ||
				!loadingMask ||
				!loadingSpinner ||
				!noComments
			) {
				throw new Error("Missing mocked Twikoo nodes");
			}
			const loadingMaskRect = loadingMask.getBoundingClientRect();
			const loadingSpinnerRect = loadingSpinner.getBoundingClientRect();
			const loadingMaskStyle = getComputedStyle(loadingMask);
			const noCommentsStyle = getComputedStyle(noComments);
			const loadingSpinnerStyle = getComputedStyle(loadingSpinner);

			return {
				themeStyleAfterOfficialStyle:
					Array.from(
						document.head.querySelectorAll("style"),
					).findIndex(
						(node) => node.id === "twikoo-theme-overrides",
					) >
					Math.max(
						Array.from(
							document.head.querySelectorAll("style"),
						).findIndex(
							(node) =>
								node instanceof HTMLElement &&
								node.dataset.mockTwikooOfficialStyle === "true",
						),
						Array.from(
							document.head.querySelectorAll("style"),
						).findIndex(
							(node) =>
								node instanceof HTMLElement &&
								node.dataset.mockTwikooDelayedStyle === "true",
						),
					),
				rootFontSize: getComputedStyle(root).fontSize,
				expectedSmallText: computeCustomValue("--text-small"),
				inputRadius: getComputedStyle(input).borderRadius,
				activeInputBorderColor:
					getComputedStyle(activeInput).borderColor,
				expectedFocusBorderColor: computeCssValue(
					"borderColor",
					"var(--twikoo-accent-border-strong)",
				),
				repliesRadius: getComputedStyle(replies).borderRadius,
				expectedMediumRadius: computeCustomValue("--radius-md"),
				contentLineHeight: getComputedStyle(content).lineHeight,
				accentColor: computeCustomColor("--accent"),
				textOnAccentColor: computeCustomColor("--text-on-accent"),
				primaryButtonColor: getComputedStyle(primaryButton).color,
				textButtonColor: getComputedStyle(textButton).color,
				sortButtonColor: getComputedStyle(sortButton).color,
				commentsIconColor: getComputedStyle(commentsIcon).color,
				actionIconColor: getComputedStyle(actionIcon).color,
				pagerColor: getComputedStyle(pager).color,
				loadingPathStroke: getComputedStyle(loadingPath).stroke,
				loadingTextColor: getComputedStyle(loadingText).color,
				loadingMaskPosition: loadingMaskStyle.position,
				loadingMaskDisplay: loadingMaskStyle.display,
				loadingMaskAlignItems: loadingMaskStyle.alignItems,
				loadingMaskJustifyContent: loadingMaskStyle.justifyContent,
				loadingMaskFlexGrow: loadingMaskStyle.flexGrow,
				loadingMaskAnimationName: loadingMaskStyle.animationName,
				noCommentsDisplay: noCommentsStyle.display,
				noCommentsAlignItems: noCommentsStyle.alignItems,
				noCommentsJustifyContent: noCommentsStyle.justifyContent,
				noCommentsFlexGrow: noCommentsStyle.flexGrow,
				noCommentsAnimationName: noCommentsStyle.animationName,
				loadingSpinnerPosition: loadingSpinnerStyle.position,
				loadingSpinnerWidth: loadingSpinnerStyle.width,
				loadingSpinnerMarginTop: loadingSpinnerStyle.marginTop,
				loadingSpinnerCenterOffset: Math.abs(
					loadingSpinnerRect.left +
						loadingSpinnerRect.width / 2 -
						(loadingMaskRect.left + loadingMaskRect.width / 2),
				),
			};
		});

	expect(themeState.themeStyleAfterOfficialStyle).toBe(true);
	expect(themeState.rootFontSize).toBe(themeState.expectedSmallText);
	expect(themeState.inputRadius).toBe(themeState.expectedMediumRadius);
	expect(themeState.activeInputBorderColor).toBe(
		themeState.expectedFocusBorderColor,
	);
	expect(themeState.repliesRadius).toBe(themeState.expectedMediumRadius);
	expect(Number.parseFloat(themeState.contentLineHeight)).toBeGreaterThan(20);
	expect(themeState.primaryButtonColor).toBe(themeState.textOnAccentColor);
	expect(themeState.textButtonColor).toBe(themeState.accentColor);
	expect(themeState.sortButtonColor).toBe(themeState.accentColor);
	expect(themeState.commentsIconColor).toBe(themeState.accentColor);
	expect(themeState.actionIconColor).toBe(themeState.accentColor);
	expect(themeState.pagerColor).toBe(themeState.textOnAccentColor);
	expect(themeState.loadingPathStroke).toBe(themeState.accentColor);
	expect(themeState.loadingTextColor).toBe(themeState.accentColor);
	expect(themeState.loadingMaskPosition).toBe("static");
	expect(themeState.loadingMaskDisplay).toBe(themeState.noCommentsDisplay);
	expect(themeState.loadingMaskAlignItems).toBe(
		themeState.noCommentsAlignItems,
	);
	expect(themeState.loadingMaskJustifyContent).toBe(
		themeState.noCommentsJustifyContent,
	);
	expect(themeState.loadingMaskFlexGrow).toBe(themeState.noCommentsFlexGrow);
	expect(themeState.loadingMaskAnimationName).toBe("twikoo-state-enter");
	expect(themeState.noCommentsAnimationName).toBe("twikoo-state-enter");
	expect(themeState.loadingSpinnerPosition).toBe("static");
	expect(themeState.loadingSpinnerWidth).not.toBe("100%");
	expect(themeState.loadingSpinnerMarginTop).toBe("0px");
	expect(themeState.loadingSpinnerCenterOffset).toBeLessThanOrEqual(1);

	const initCalls = await page.evaluate(
		() =>
			(
				window as typeof window & {
					__twikooInitCalls?: Array<{ path?: string; el?: string }>;
				}
			).__twikooInitCalls ?? [],
	);
	expect(initCalls).toHaveLength(1);
	expect(initCalls[0]).toMatchObject({
		el: "#tcomment",
		path: "/posts/markdown-tutorial/",
	});

	await page.evaluate(() => {
		document
			.querySelector<HTMLLinkElement>(
				'link[href$="/assets/css/twikoo.css"]',
			)
			?.remove();
		window.swup.navigate("/posts/markdown-extended/");
	});

	await expect(page).toHaveURL(/\/posts\/markdown-extended\/$/);
	await expect(
		page.locator('[data-comment-service="twikoo"] #twikoo'),
	).toBeVisible();
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					document.querySelectorAll(
						'link[href$="/assets/css/twikoo.css"]',
					).length,
			),
		)
		.toBe(1);

	const afterSecondPostInitCalls = await page.evaluate(
		() =>
			(
				window as typeof window & {
					__twikooInitCalls?: Array<{ path?: string; el?: string }>;
				}
			).__twikooInitCalls ?? [],
	);
	expect(afterSecondPostInitCalls).toHaveLength(2);
	expect(afterSecondPostInitCalls[1]).toMatchObject({
		el: "#tcomment",
		path: "/posts/markdown-extended/",
	});
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
		const resolveLength = (value: string) => {
			const probe = document.createElement("div");
			probe.style.position = "fixed";
			probe.style.top = value;
			probe.style.visibility = "hidden";
			document.body.append(probe);
			const pixels = parseFloat(getComputedStyle(probe).top);
			probe.remove();
			return pixels;
		};
		const expandedRegion = toc.querySelector<HTMLElement>(
			".toc-expanded-region",
		)!;
		const expandedRegionStyle = getComputedStyle(expandedRegion);

		return {
			supportStickyTop: parseFloat(supportStyle.top),
			mainContentOffset: resolveLength("var(--main-content-offset)"),
			pageEntryClearance: resolveLength("var(--page-entry-clearance)"),
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
	expect(overflowState.supportStickyTop).toBeCloseTo(
		overflowState.mainContentOffset,
		0,
	);
	expect(overflowState.supportStickyTop).toBeLessThan(
		overflowState.pageEntryClearance,
	);
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
		const content = document.querySelector<HTMLElement>(
			"#post-container .post-detail__content",
		)!;
		window.scrollTo({
			top:
				content.getBoundingClientRect().bottom +
				window.scrollY -
				window.innerHeight +
				120,
		});
	});
	await page.waitForFunction(
		() =>
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
			reachedPageBottom:
				window.scrollY + window.innerHeight >=
				document.documentElement.scrollHeight - 1,
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
	expect(bottomState.reachedPageBottom).toBe(false);
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
				document.querySelector<HTMLElement>("#toc")?.dataset
					.tocRootsOnlyReason === "bottom"
			) {
				break;
			}
		}
		window.scrollTo({
			top: heading.getBoundingClientRect().top + window.scrollY - 48,
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
		await wait(260);
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
			finalMode:
				document.querySelector<HTMLElement>("#toc")?.dataset.tocMode ??
				"",
			finalRootsOnlyReason:
				document.querySelector<HTMLElement>("#toc")?.dataset
					.tocRootsOnlyReason ?? "",
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
	expect(bottomUpState.finalMode).toBe("normal");
	expect(bottomUpState.finalRootsOnlyReason).toBe("none");
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
