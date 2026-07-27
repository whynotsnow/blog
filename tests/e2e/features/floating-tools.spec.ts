import { expect, type Page, test } from "@playwright/test";
import { gotoPage } from "../../support/navigation";

const defaultPlaylist = [
	{
		artist: "Test Artist",
		id: 1,
		name: "Test Song",
		pic: "/assets/music/cover/xryx.jpg",
		url: "/assets/music/url/xryx.mp3",
	},
	{
		artist: "Second Artist",
		id: 2,
		name: "Second Song",
		pic: "/assets/music/cover/hitori.jpg",
		url: "/assets/music/url/hitori.mp3",
	},
];

async function mockMusicPlaylist(page: Page, playlist = defaultPlaylist) {
	await page.route("https://meting.whynotsnow.com/**", async (route) => {
		await route.fulfill({
			contentType: "application/json",
			json: playlist,
		});
	});
}

async function openMiniPlayer(page: Page) {
	const miniPlayer = page.locator(".mini-player");
	const hiddenOrb = page.locator(".orb-player");
	await expect(hiddenOrb).toBeVisible({ timeout: 15_000 });
	for (let attempt = 0; attempt < 4; attempt += 1) {
		await hiddenOrb.click();
		try {
			await miniPlayer.waitFor({ state: "visible", timeout: 2_000 });
			return miniPlayer;
		} catch {
			if (await miniPlayer.isVisible()) return miniPlayer;
		}
	}
	await expect(miniPlayer).toBeVisible();
	return miniPlayer;
}

async function expectCompanionMenuIcon(
	page: Page,
	label: string,
	icon: string,
) {
	await expect(
		page.frameLocator("#l2d-iframe").getByRole("button", { name: label }),
	).toHaveAttribute("data-local-icon", icon);
}

test("floating tools owns theme, settings, toc, and back-to-top actions", async ({
	page,
}) => {
	await gotoPage(page, "/posts/markdown-tutorial/");

	const tools = page.locator("#floating-tools");
	const toggle = page.locator("#floating-tools-switch");
	await expect(tools).toBeVisible();
	await expect(toggle).toHaveAttribute("aria-expanded", "false");
	await expect(page.locator("#navbar #scheme-switch")).toHaveCount(0);
	await expect(page.locator("#navbar #display-settings-switch")).toHaveCount(
		0,
	);

	await toggle.click();
	await expect(toggle).toHaveAttribute("aria-expanded", "true");
	await expect(page.locator("#floating-tools #scheme-switch")).toBeVisible();
	await expect(
		page.locator("#floating-tools #display-settings-switch"),
	).toBeVisible();
	await expect(
		page.locator("#floating-tools #music-player-switch"),
	).toBeVisible();
	await expect(
		page.locator("#floating-tools #floating-toc-btn"),
	).toBeVisible();

	const initialDark = await page
		.locator("html")
		.evaluate((element) => element.classList.contains("dark"));
	await page.locator("#floating-tools #scheme-switch").click();
	await expect
		.poll(() =>
			page
				.locator("html")
				.evaluate((element) => element.classList.contains("dark")),
		)
		.toBe(!initialDark);

	const settingsButton = page.locator(
		"#floating-tools #display-settings-switch",
	);
	await expect(settingsButton.locator(".local-icon")).toHaveAttribute(
		"data-local-icon",
		"material-symbols:settings-rounded",
	);
	await settingsButton.click();
	await expect(page.locator("#display-setting")).not.toHaveClass(
		/float-panel-closed/,
	);
	const settingsTransitionProperties = await page
		.locator("#display-setting")
		.evaluate((element) => getComputedStyle(element).transitionProperty);
	expect(settingsTransitionProperties).not.toContain("all");
	expect(settingsTransitionProperties).not.toContain("left");
	expect(settingsTransitionProperties).not.toContain("right");
	expect(settingsTransitionProperties).not.toContain("top");
	const settingsGeometry = await page
		.locator("#display-setting")
		.evaluate((element) => {
			const rect = element.getBoundingClientRect();
			return {
				bottom: window.innerHeight - rect.bottom,
				left: rect.left,
				right: window.innerWidth - rect.right,
				top: rect.top,
			};
		});
	expect(settingsGeometry.top).toBeGreaterThanOrEqual(8);
	expect(settingsGeometry.right).toBeGreaterThanOrEqual(8);
	expect(settingsGeometry.bottom).toBeGreaterThanOrEqual(8);
	expect(settingsGeometry.left).toBeGreaterThanOrEqual(8);
	await page.locator(".post-detail__header h1").click();
	await expect(page.locator("#display-setting")).toHaveClass(
		/float-panel-closed/,
	);

	await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
	await expect(page.locator("#back-to-top-btn")).toBeVisible();
	await page.locator("#back-to-top-btn").click();
	await expect
		.poll(() => page.evaluate(() => window.scrollY))
		.toBeLessThan(8);
});

test("floating tools controls music visibility while the player owns its presentation", async ({
	page,
}) => {
	await mockMusicPlaylist(page);
	await page.addInitScript(() => {
		HTMLMediaElement.prototype.play = function () {
			this.dispatchEvent(new Event("play"));
			return Promise.resolve();
		};
		HTMLMediaElement.prototype.pause = function () {
			this.dispatchEvent(new Event("pause"));
		};
	});
	await gotoPage(page, "/");

	const tools = page.locator("#floating-tools");
	const miniPlayer = page.locator(".mini-player");
	const hiddenOrb = page.locator(".orb-player");
	await expect(miniPlayer).not.toBeVisible();
	await expect(hiddenOrb).toBeVisible();

	await page.locator("#floating-tools-switch").click();
	const musicSwitch = page.locator("#music-player-switch");
	await expect(musicSwitch).toHaveAttribute("aria-pressed", "true");
	await expect(musicSwitch).toHaveAccessibleName("隐藏播放器");
	await musicSwitch.click();
	await expect(musicSwitch).toHaveAttribute("aria-pressed", "false");
	await expect(musicSwitch).toHaveAccessibleName("显示音乐播放器");
	await expect(hiddenOrb).not.toBeVisible();
	await musicSwitch.click();
	await expect(musicSwitch).toHaveAttribute("aria-pressed", "true");
	await expect(hiddenOrb).toBeVisible();
	await hiddenOrb.hover();
	const defaultCoverPresentation = await hiddenOrb.evaluate((element) => {
		const rect = element.getBoundingClientRect();
		const player = element.closest<HTMLElement>(".music-player");
		const matrix = new DOMMatrix(getComputedStyle(element).transform);
		return {
			height: rect.height,
			overflow: player ? getComputedStyle(player).overflow : "",
			scaleX: Math.hypot(matrix.a, matrix.b),
			width: rect.width,
		};
	});
	expect(defaultCoverPresentation.overflow).toBe("visible");
	expect(defaultCoverPresentation.width).toBeCloseTo(48, 0);
	expect(defaultCoverPresentation.height).toBeCloseTo(48, 0);
	expect(defaultCoverPresentation.scaleX).toBeCloseTo(1, 2);

	const collapsedCoverGeometry = await hiddenOrb.evaluate((element) => {
		const rect = element.getBoundingClientRect();
		return { bottom: rect.bottom, top: rect.top };
	});
	await hiddenOrb.click();
	await expect(miniPlayer).toBeVisible();
	await expect
		.poll(() =>
			miniPlayer
				.locator(".mini-player__cover")
				.evaluate((element, collapsedGeometry) => {
					const rect = element.getBoundingClientRect();
					return Math.max(
						Math.abs(collapsedGeometry.bottom - rect.bottom),
						Math.abs(collapsedGeometry.top - rect.top),
					);
				}, collapsedCoverGeometry),
		)
		.toBeLessThanOrEqual(2);

	const expandedTransition = await miniPlayer
		.getByRole("button", { name: "展开音乐播放器" })
		.evaluate(async (button) => {
			const frames: Array<{
				expandedClipPath: string | null;
				miniOpacity: number | null;
				toolsKeyframeCount: number | null;
				toolsSwitchTop: number | null;
				toolsTransitionDuration: number | null;
			}> = [];
			const startedAt = performance.now();
			(button as HTMLElement).click();

			await new Promise<void>((resolve) => {
				const sample = (now: number) => {
					const expandedState = document.querySelector<HTMLElement>(
						".music-player__state--expanded",
					);
					const miniState = document.querySelector<HTMLElement>(
						".music-player__state--mini",
					);
					const tools = document.getElementById("floating-tools");
					const toolsSwitch = document.getElementById(
						"floating-tools-switch",
					);
					const toolsRail = tools?.querySelector<HTMLElement>(
						".floating-tools__rail",
					);
					const toolsAnimation = toolsRail?.getAnimations()[0];
					const toolsEffect =
						toolsAnimation?.effect as KeyframeEffect | null;
					frames.push({
						expandedClipPath: expandedState
							? getComputedStyle(expandedState).clipPath
							: null,
						miniOpacity: miniState
							? Number(getComputedStyle(miniState).opacity)
							: null,
						toolsKeyframeCount:
							toolsEffect?.getKeyframes().length ?? null,
						toolsSwitchTop:
							toolsSwitch?.getBoundingClientRect().top ?? null,
						toolsTransitionDuration:
							Number(toolsEffect?.getTiming().duration) || null,
					});
					if (now - startedAt >= 360) {
						resolve();
						return;
					}
					requestAnimationFrame(sample);
				};
				requestAnimationFrame(sample);
			});

			return frames;
		});
	const expandedClipPaths = expandedTransition
		.map(({ expandedClipPath }) => expandedClipPath)
		.filter((value): value is string => value !== null);
	const toolsSwitchTops = expandedTransition
		.map(({ toolsSwitchTop }) => toolsSwitchTop)
		.filter((value): value is number => value !== null);
	expect(
		expandedClipPaths.some((clipPath) => clipPath.includes("inset(")),
	).toBe(true);
	expect(
		new Set(toolsSwitchTops.map((top) => top.toFixed(2))).size,
	).toBeGreaterThanOrEqual(2);
	expect(
		Math.max(...toolsSwitchTops) - Math.min(...toolsSwitchTops),
	).toBeGreaterThan(20);
	expect(
		expandedTransition.some(
			({ toolsTransitionDuration }) => toolsTransitionDuration === 420,
		),
	).toBe(true);
	expect(
		expandedTransition.some(
			({ toolsKeyframeCount }) => toolsKeyframeCount === 31,
		),
	).toBe(true);

	const panel = page.locator("#music-player-panel");
	await expect(panel).toBeVisible();
	await expect(miniPlayer).not.toBeVisible();
	await expect(panel.locator(".song-title")).toHaveText("Test Song");
	await page.waitForTimeout(100);
	const collapseTransition = await panel
		.getByTitle("收起播放器")
		.evaluate(async (button) => {
			const samples: Array<{
				keyframeCount: number | null;
				top: number;
				transitionDuration: number | null;
			}> = [];
			const startedAt = performance.now();
			(button as HTMLButtonElement).click();

			await new Promise<void>((resolve) => {
				const sample = (now: number) => {
					const toolsRail = document.querySelector<HTMLElement>(
						".floating-tools__rail",
					);
					const toolsSwitch = document.getElementById(
						"floating-tools-switch",
					);
					const animation = toolsRail?.getAnimations()[0];
					const effect = animation?.effect as KeyframeEffect | null;
					if (toolsSwitch) {
						samples.push({
							keyframeCount:
								effect?.getKeyframes().length ?? null,
							top: toolsSwitch.getBoundingClientRect().top,
							transitionDuration:
								Number(effect?.getTiming().duration) || null,
						});
					}
					if (now - startedAt >= 360) {
						resolve();
						return;
					}
					requestAnimationFrame(sample);
				};
				requestAnimationFrame(sample);
			});

			return samples;
		});
	const collapseTops = collapseTransition.map(({ top }) => top);
	expect(
		new Set(collapseTops.map((top) => top.toFixed(2))).size,
	).toBeGreaterThanOrEqual(2);
	expect(collapseTops.at(-1)).toBeGreaterThan(collapseTops[0]);
	expect(
		collapseTransition.some(
			({ transitionDuration }) => transitionDuration === 420,
		),
	).toBe(true);
	expect(
		collapseTransition.some(({ keyframeCount }) => keyframeCount === 31),
	).toBe(true);
	await expect(panel).not.toBeVisible();
	await expect(miniPlayer).toBeVisible();
	await expect(page.locator(".music-player__state")).toHaveCount(1);

	await miniPlayer.getByRole("button", { name: "展开音乐播放器" }).click();
	await expect(panel).toBeVisible();
	const playOrderButton = panel.locator("[data-play-order]");
	await expect(playOrderButton).toHaveAttribute(
		"data-play-order",
		"sequential",
	);
	await playOrderButton.click();
	await expect(playOrderButton).toHaveAttribute("data-play-order", "shuffle");
	await expect(playOrderButton).toHaveAttribute("aria-pressed", "true");
	await playOrderButton.click();
	await expect(playOrderButton).toHaveAttribute(
		"data-play-order",
		"sequential",
	);
	const playButton = panel.getByRole("button", {
		name: "播放",
		exact: true,
	});
	await expect(playButton).toBeEnabled();
	await playButton.click();
	await expect(tools).toHaveAttribute("data-music-playing", "true");
	await expect(tools).toHaveAttribute("data-music-loading", "false");
	await expect(musicSwitch.locator(".local-icon")).toHaveCSS(
		"animation-name",
		"floating-music-note-beat",
	);
	await page.locator("#floating-tools-switch").click();
	await musicSwitch.click();
	await expect(musicSwitch).toHaveAttribute("aria-pressed", "false");
	await expect(panel).not.toBeVisible();
	await expect(page.locator(".music-player")).not.toBeVisible();

	await musicSwitch.click();
	await expect(musicSwitch).toHaveAttribute("aria-pressed", "true");
	await expect(panel).toBeVisible();

	await panel.getByTitle("收起播放器").click();
	await expect(panel).not.toBeVisible();
	await expect(miniPlayer).toBeVisible();
	await miniPlayer.getByRole("button", { name: "暂停" }).click();
	await expect(tools).toHaveAttribute("data-music-playing", "false");
	await expect(miniPlayer).toBeVisible();
	const compactTransition = await miniPlayer
		.getByTitle("收起播放器")
		.evaluate(async (button) => {
			const player = document.querySelector<HTMLElement>(".music-player");
			if (!player) throw new Error("Music player container is missing");

			const initialRect = player.getBoundingClientRect();
			const frames: Array<{
				height: number;
				miniClipPath: string | null;
				miniWidth: number | null;
				width: number;
			}> = [
				{
					height: initialRect.height,
					miniClipPath: null,
					miniWidth: initialRect.width,
					width: initialRect.width,
				},
			];
			const startedAt = performance.now();
			(button as HTMLButtonElement).click();

			await new Promise<void>((resolve) => {
				const sample = (now: number) => {
					const rect = player.getBoundingClientRect();
					const miniState = player.querySelector<HTMLElement>(
						".music-player__state--mini",
					);
					const miniStyle = miniState
						? getComputedStyle(miniState)
						: null;
					frames.push({
						height: rect.height,
						miniClipPath: miniStyle?.clipPath ?? null,
						miniWidth: miniState?.offsetWidth ?? null,
						width: rect.width,
					});
					if (now - startedAt >= 320) {
						resolve();
						return;
					}
					requestAnimationFrame(sample);
				};
				requestAnimationFrame(sample);
			});

			return {
				frames,
				transitionProperty: getComputedStyle(player).transitionProperty,
			};
		});
	expect(compactTransition.transitionProperty).toContain("height");
	expect(compactTransition.transitionProperty).toContain("width");
	expect(compactTransition.frames[0].height).toBeGreaterThanOrEqual(70);
	expect(compactTransition.frames.at(-1)?.height).toBeCloseTo(72, 0);
	expect(compactTransition.frames.at(-1)?.width).toBeLessThanOrEqual(56);
	expect(
		compactTransition.frames.every(
			({ height }) => Math.abs(height - 72) <= 1,
		),
	).toBe(true);
	expect(
		compactTransition.frames
			.map(({ miniWidth }) => miniWidth)
			.filter((width): width is number => width !== null)
			.every((width) => width >= 279),
	).toBe(true);
	const miniClipPathFrames = compactTransition.frames
		.map(({ miniClipPath }) => miniClipPath)
		.filter((clipPath): clipPath is string => clipPath !== null);
	expect(
		miniClipPathFrames.some((clipPath) => clipPath.includes("ellipse(")),
	).toBe(true);
	await expect(hiddenOrb).not.toHaveClass(/opacity-0/);
	await expect(hiddenOrb.locator(".orb-player__cover")).toHaveAttribute(
		"src",
		"/assets/music/cover/xryx.jpg",
	);
	const revealTransition = await hiddenOrb.evaluate(async (orb) => {
		const frames: Array<{
			coverOpacity: number | null;
			miniClipPath: string | null;
			orbTranslateX: number | null;
		}> = [];
		const startedAt = performance.now();
		(orb as HTMLElement).click();

		await new Promise<void>((resolve) => {
			const sample = (now: number) => {
				const hiddenState = document.querySelector<HTMLElement>(
					".music-player__state--hidden",
				);
				const miniState = document.querySelector<HTMLElement>(
					".music-player__state--mini",
				);
				const miniCover = document.querySelector<HTMLElement>(
					".mini-player__cover",
				);
				frames.push({
					coverOpacity: miniCover
						? Number(getComputedStyle(miniCover).opacity)
						: null,
					miniClipPath: miniState
						? getComputedStyle(miniState).clipPath
						: null,
					orbTranslateX: hiddenState
						? new DOMMatrix(getComputedStyle(hiddenState).transform)
								.e
						: null,
				});
				if (now - startedAt >= 480) {
					resolve();
					return;
				}
				requestAnimationFrame(sample);
			};
			requestAnimationFrame(sample);
		});

		return frames;
	});
	const revealClipPaths = revealTransition
		.map(({ miniClipPath }) => miniClipPath)
		.filter((clipPath): clipPath is string => clipPath !== null);
	const coverOpacities = revealTransition
		.map(({ coverOpacity }) => coverOpacity)
		.filter((opacity): opacity is number => opacity !== null);
	const orbTranslateX = revealTransition
		.map(({ orbTranslateX }) => orbTranslateX)
		.filter((value): value is number => value !== null);
	expect(
		revealClipPaths.some((clipPath) => clipPath.includes("ellipse(")),
	).toBe(true);
	expect(Math.max(...orbTranslateX.map(Math.abs))).toBeLessThanOrEqual(0.1);
	expect(Math.min(...coverOpacities)).toBeLessThan(0.25);
	expect(Math.max(...coverOpacities)).toBeGreaterThan(0.9);
	await expect(miniPlayer).toBeVisible();
});

test("hidden music control moves from playlist loading fallback to the first cover", async ({
	page,
}) => {
	let releasePlaylistRequest = () => {};
	const playlistRequestGate = new Promise<void>((resolve) => {
		releasePlaylistRequest = resolve;
	});
	await page.route("https://meting.whynotsnow.com/**", async (route) => {
		await playlistRequestGate;
		await route.fulfill({
			contentType: "application/json",
			json: [
				{
					artist: "Loading Artist",
					id: 1,
					name: "Loaded Song",
					pic: "/assets/music/cover/xryx.jpg",
					url: "/assets/music/url/xryx.mp3",
				},
			],
		});
	});
	await gotoPage(page, "/");

	const hiddenOrb = page.locator(".orb-player");
	const fallback = hiddenOrb.locator(".orb-player__fallback-icon");
	await expect(hiddenOrb).toBeVisible();
	await expect(hiddenOrb).toHaveClass(/orb-player--fallback/);
	await expect(fallback).toHaveClass(/orb-player__fallback-icon--loading/);
	await expect(fallback).toHaveCSS(
		"animation-name",
		"fallback-music-loading",
	);

	releasePlaylistRequest();
	await expect(hiddenOrb.locator(".orb-player__cover")).toHaveAttribute(
		"src",
		"/assets/music/cover/xryx.jpg",
	);
	await expect(fallback).toHaveCount(0);
});

test("hidden music control falls back to the themed icon when cover loading fails", async ({
	page,
}) => {
	await mockMusicPlaylist(page, [
		{
			artist: "Fallback Artist",
			id: 1,
			name: "Fallback Song",
			pic: "/assets/music/cover/missing-cover.jpg",
			url: "/assets/music/url/xryx.mp3",
		},
	]);
	await page.addInitScript(() => {
		HTMLMediaElement.prototype.play = function () {
			this.dispatchEvent(new Event("play"));
			return Promise.resolve();
		};
	});
	await gotoPage(page, "/");

	const miniPlayer = await openMiniPlayer(page);
	await miniPlayer.getByRole("button", { name: "展开音乐播放器" }).click();
	const panel = page.locator("#music-player-panel");
	await expect(panel.locator(".song-title")).toHaveText("Fallback Song");
	await panel.getByRole("button", { name: "播放", exact: true }).click();
	await panel.getByTitle("隐藏播放器").click();

	const hiddenOrb = page.locator(".orb-player");
	await expect(hiddenOrb).toHaveClass(/orb-player--fallback/);
	await expect(hiddenOrb.locator(".orb-player__cover")).toHaveCount(0);
	await expect(hiddenOrb.locator(".orb-player__fallback-icon")).toBeVisible();
});

test("floating tools keeps a safe mobile touch target", async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await gotoPage(page, "/");

	const geometry = await page
		.locator("#floating-tools-switch")
		.evaluate((element) => {
			const rect = element.getBoundingClientRect();
			return {
				width: rect.width,
				height: rect.height,
				right: window.innerWidth - rect.right,
				bottom: window.innerHeight - rect.bottom,
			};
		});

	expect(geometry.width).toBeGreaterThanOrEqual(44);
	expect(geometry.height).toBeGreaterThanOrEqual(44);
	expect(geometry.right).toBeGreaterThanOrEqual(12);
	expect(geometry.bottom).toBeGreaterThanOrEqual(12);

	await page.locator("#floating-tools-switch").click();
	await page.locator("#display-settings-switch").click();
	await expect(page.locator("#display-setting")).not.toHaveClass(
		/float-panel-closed/,
	);
	const panelGeometry = await page
		.locator("#display-setting")
		.evaluate((element) => {
			const rect = element.getBoundingClientRect();
			return {
				bottom: window.innerHeight - rect.bottom,
				height: rect.height,
				left: rect.left,
				right: window.innerWidth - rect.right,
			};
		});
	expect(panelGeometry.left).toBeGreaterThanOrEqual(8);
	expect(panelGeometry.right).toBeGreaterThanOrEqual(8);
	expect(panelGeometry.bottom).toBeGreaterThanOrEqual(8);
	expect(panelGeometry.height).toBeLessThanOrEqual(844 - 16);
});

test("floating tools controls the Live2D companion preference", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	const iconifyRequests: string[] = [];
	page.on("request", (request) => {
		if (request.url().startsWith("https://api.iconify.design/")) {
			iconifyRequests.push(request.url());
		}
	});
	await page.route(
		"**/live2d-companion/models/14jiang/model.moc3",
		async (route) => {
			await new Promise((resolve) => setTimeout(resolve, 500));
			await route.continue();
		},
		{ times: 1 },
	);
	await page.addInitScript(() => {
		if (window.top !== window) return;
		localStorage.removeItem("live2d-companion-mounted");
		localStorage.removeItem("live2d-companion-collapsed");
		localStorage.removeItem("live2d-companion-model-index");
	});
	await gotoPage(page, "/");

	await expect(page.locator("#floating-tools-switch")).toBeVisible({
		timeout: 15_000,
	});
	await expect(page.locator(".live2d-companion")).toHaveAttribute(
		"data-live2d-companion-mounted",
		"true",
		{ timeout: 15_000 },
	);
	await expect(page.locator(".live2d-companion")).toHaveClass(
		/live2d-companion--loading/,
	);
	await expect(page.locator(".live2d-companion__avatar")).toBeVisible();
	const loadingAvatarGeometry = await page
		.locator(".live2d-companion__avatar")
		.evaluate((element) => {
			const rect = element.getBoundingClientRect();
			return { height: rect.height, width: rect.width };
		});
	expect(loadingAvatarGeometry.width).toBeCloseTo(48, 0);
	expect(loadingAvatarGeometry.height).toBeCloseTo(48, 0);
	await page.locator("#floating-tools-switch").click({ force: true });
	const toggle = page.getByRole("button", { name: "隐藏看板娘" });
	await expect(toggle).toBeVisible();
	await expect(toggle).toHaveAttribute("aria-pressed", "true");
	await expect(toggle.locator(".local-icon")).toHaveAttribute(
		"data-local-icon",
		"material-symbols:face-retouching-natural-rounded",
	);
	await expect(page.locator("#l2d-iframe")).toHaveCount(1);
	const companionGeometry = await page
		.locator(".live2d-companion")
		.evaluate((el) => {
			const rect = el.getBoundingClientRect();
			const oldTransparentLayerPoint = {
				x: rect.left + 8,
				y: rect.bottom - 500,
			};
			const hit = document.elementFromPoint(
				oldTransparentLayerPoint.x,
				oldTransparentLayerPoint.y,
			) as HTMLElement | null;
			return {
				height: rect.height,
				hitId: hit?.id ?? "",
				hitClass: hit?.className.toString() ?? "",
			};
		});
	expect(companionGeometry.height).toBeLessThanOrEqual(352);
	expect(companionGeometry.hitId).not.toBe("l2d-iframe");
	expect(companionGeometry.hitClass).not.toContain("live2d-companion");
	await toggle.click();

	await expect
		.poll(() =>
			page.evaluate(() =>
				localStorage.getItem("live2d-companion-mounted"),
			),
		)
		.toBe("0");
	await expect(page.locator(".live2d-companion")).toHaveCount(0);
	await expect(page.locator("#l2d-iframe")).toHaveCount(0);

	const showToggle = page.getByRole("button", { name: "显示看板娘" });
	await expect(showToggle).toHaveAttribute("aria-pressed", "false");
	await expect(showToggle.locator(".local-icon")).toHaveAttribute(
		"data-local-icon",
		"material-symbols:face-retouching-off-rounded",
	);
	await showToggle.click();
	await expect
		.poll(() =>
			page.evaluate(() =>
				localStorage.getItem("live2d-companion-mounted"),
			),
		)
		.toBe("1");
	await expect(page.locator(".live2d-companion")).toHaveAttribute(
		"data-live2d-companion-mounted",
		"true",
	);
	await expect(page.locator("#l2d-iframe")).toHaveCount(1);
	await expect(page.locator("#l2d-iframe")).not.toHaveAttribute(
		"data-config",
	);
	await expect(page.locator("#l2d-iframe")).toHaveAttribute(
		"data-width",
		"280",
	);
	await expect(page.locator(".live2d-companion")).toHaveClass(
		/live2d-companion--loaded/,
	);
	await expect(
		page.frameLocator("#l2d-iframe").getByRole("button", {
			name: "休眠",
		}),
	).toHaveCount(0);
	await expect(
		page.frameLocator("#l2d-iframe").getByText("正在加载"),
	).toHaveCount(0);
	const canvasGeometry = await page
		.frameLocator("#l2d-iframe")
		.locator("canvas")
		.evaluate((element) => {
			const rect = element.getBoundingClientRect();
			return { height: rect.height, width: rect.width };
		});
	expect(canvasGeometry.width).toBeCloseTo(280, 0);
	expect(canvasGeometry.height).toBeCloseTo(280, 0);
	const expressions = await page
		.frameLocator("#l2d-iframe")
		.locator("canvas")
		.evaluate(() => {
			const frameWindow = window as Window & {
				widgetInstance?: {
					l2d?: {
						getExpressions: () => string[];
						getParams: () => Array<{ id: string; value: number }>;
						setExpression: (name: string) => void;
					};
				};
				__lastLive2DExpression?: string;
			};
			const l2d = frameWindow.widgetInstance?.l2d;
			const originalSetExpression = l2d?.setExpression.bind(l2d);
			if (l2d && originalSetExpression) {
				l2d.setExpression = (name: string) => {
					frameWindow.__lastLive2DExpression = name;
					originalSetExpression(name);
				};
			}
			return l2d?.getExpressions() ?? [];
		});
	expect(expressions).toContain("smile");
	expect(expressions).toContain("heart-combo");
	expect(expressions).not.toContain("hide-watermark");
	expect(expressions).toHaveLength(22);
	await expect(
		page
			.frameLocator("#l2d-iframe")
			.getByRole("button", { name: "切换模型" }),
	).toBeVisible();
	await expect(
		page
			.frameLocator("#l2d-iframe")
			.getByRole("button", { name: "切换模型" }),
	).toHaveAttribute("data-local-icon", "material-symbols:swap-horiz-rounded");
	const getCompanionMenuState = () =>
		page
			.frameLocator("#l2d-iframe")
			.locator(".live2d-companion-menu")
			.evaluate((element) => {
				const style = getComputedStyle(element);
				return {
					opacity: style.opacity,
					pointerEvents: style.pointerEvents,
				};
			});
	await expect.poll(getCompanionMenuState).toEqual({
		opacity: "0",
		pointerEvents: "none",
	});
	await page.frameLocator("#l2d-iframe").locator("canvas").hover();
	await expect.poll(getCompanionMenuState).toEqual({
		opacity: "1",
		pointerEvents: "auto",
	});
	await expect(
		page
			.frameLocator("#l2d-iframe")
			.getByRole("button", { name: "全部表情" }),
	).toBeVisible();
	await expect(
		page
			.frameLocator("#l2d-iframe")
			.getByRole("button", { name: "全部表情" }),
	).toHaveAttribute("title", "全部表情");
	await expectCompanionMenuIcon(
		page,
		"全部表情",
		"material-symbols:grid-view-rounded",
	);
	await expect(
		page.frameLocator("#l2d-iframe").getByRole("button", {
			name: "微笑",
		}),
	).toBeVisible();
	await expect(
		page.frameLocator("#l2d-iframe").getByRole("button", {
			name: "微笑",
		}),
	).toHaveAttribute("title", "微笑");
	await expectCompanionMenuIcon(
		page,
		"微笑",
		"material-symbols:sentiment-satisfied-rounded",
	);
	await expectCompanionMenuIcon(
		page,
		"心动",
		"material-symbols:mood-heart-rounded",
	);
	await expectCompanionMenuIcon(
		page,
		"生气",
		"material-symbols:sentiment-frustrated-rounded",
	);
	await expectCompanionMenuIcon(
		page,
		"晕乎",
		"material-symbols:face-shake-rounded",
	);
	await expectCompanionMenuIcon(
		page,
		"脸红",
		"material-symbols:sentiment-excited-rounded",
	);
	await expect(
		page.frameLocator("#l2d-iframe").getByRole("button", {
			name: "冒汗",
		}),
	).toHaveCount(0);
	await page
		.frameLocator("#l2d-iframe")
		.getByRole("button", { name: "全部表情" })
		.click();
	await expect(
		page
			.locator(".live2d-companion__expression-panel")
			.getByRole("button", { name: "X 嘴" }),
	).toBeVisible();
	const expressionPanelGeometry = await page
		.locator(".live2d-companion__expression-panel")
		.evaluate((element) => {
			const rect = element.getBoundingClientRect();
			const style = getComputedStyle(element);
			const iframe =
				document.querySelector<HTMLIFrameElement>("#l2d-iframe");
			const iframeRect = iframe?.getBoundingClientRect();
			const canvas = iframe?.contentDocument?.querySelector("canvas");
			const canvasRect = canvas?.getBoundingClientRect();
			const canvasRight =
				iframeRect && canvasRect
					? iframeRect.left + canvasRect.right
					: undefined;
			const buttonRect = iframe?.contentDocument
				?.querySelector<HTMLElement>(
					"#live2d-companion-expression-panel-toggle",
				)
				?.getBoundingClientRect();
			const panelTopGap =
				iframeRect && buttonRect
					? rect.top - (iframeRect.top + buttonRect.top)
					: Number.POSITIVE_INFINITY;
			return {
				buttonTop: buttonRect?.top ?? Number.POSITIVE_INFINITY,
				buttonCount: element.querySelectorAll("button").length,
				hasVerticalOverflow:
					element.scrollHeight > element.clientHeight,
				overflowY: style.overflowY,
				panelTopGap,
				rightOfCanvas: canvasRight ? rect.left >= canvasRight : true,
			};
		});
	expect(expressionPanelGeometry.buttonCount).toBe(22);
	expect(expressionPanelGeometry.hasVerticalOverflow).toBe(false);
	expect(expressionPanelGeometry.overflowY).toBe("visible");
	expect(Math.abs(expressionPanelGeometry.panelTopGap)).toBeLessThanOrEqual(
		2,
	);
	expect(expressionPanelGeometry.rightOfCanvas).toBe(true);
	await expect(
		page
			.locator(".live2d-companion__expression-panel")
			.getByRole("button", { name: "X 嘴" }),
	).toHaveAttribute("title", "X 嘴");
	await expect(
		page
			.locator(".live2d-companion__expression-panel")
			.getByRole("button", { name: "冒汗" }),
	).toBeVisible();
	await expect.poll(getCompanionMenuState).toEqual({
		opacity: "1",
		pointerEvents: "auto",
	});
	await page
		.locator(".live2d-companion__expression-panel")
		.getByRole("button", { name: "X 嘴" })
		.click();
	await expect
		.poll(() =>
			page
				.frameLocator("#l2d-iframe")
				.locator("body")
				.evaluate(
					() =>
						(
							window as Window & {
								__lastLive2DExpression?: string;
							}
						).__lastLive2DExpression,
				),
		)
		.toBe("x-mouth");
	await expect(
		page.locator(".live2d-companion__expression-panel"),
	).toBeVisible();
	await expect.poll(getCompanionMenuState).toEqual({
		opacity: "1",
		pointerEvents: "auto",
	});
	await page
		.frameLocator("#l2d-iframe")
		.getByRole("button", { name: "心动" })
		.click();
	await expect(
		page.locator(".live2d-companion__expression-panel"),
	).toHaveCount(0);
	await expect
		.poll(() =>
			page
				.frameLocator("#l2d-iframe")
				.locator("body")
				.evaluate(
					() =>
						(
							window as Window & {
								__lastLive2DExpression?: string;
							}
						).__lastLive2DExpression,
				),
		)
		.toBe("heart-combo");
	const watermarkParameter = await page
		.frameLocator("#l2d-iframe")
		.locator("canvas")
		.evaluate(() => {
			const frameWindow = window as Window & {
				widgetInstance?: {
					l2d?: {
						getParams: () => Array<{ id: string; value: number }>;
					};
				};
			};
			return frameWindow.widgetInstance?.l2d
				?.getParams()
				.find((parameter) => parameter.id === "CheekPuff2");
		});
	expect(watermarkParameter?.value).toBeCloseTo(1, 2);
	await page.evaluate(() => {
		window.dispatchEvent(
			new CustomEvent("live2d-companion-command", {
				detail: {
					command: {
						type: "expression",
						name: "smile",
					},
				},
			}),
		);
	});
	await expect
		.poll(() =>
			page
				.frameLocator("#l2d-iframe")
				.locator("body")
				.evaluate(
					() =>
						(
							window as Window & {
								__lastLive2DExpression?: string;
							}
						).__lastLive2DExpression,
				),
		)
		.toBe("smile");
	const collapseButtonGeometry = await page
		.frameLocator("#l2d-iframe")
		.getByRole("button", { name: "收起看板娘" })
		.evaluate((element) => {
			const buttonRect = element.getBoundingClientRect();
			const buttonStyle = getComputedStyle(element);
			const canvas = document.querySelector("canvas");
			const root = canvas?.parentElement;
			const rootDivs = root
				? Array.from(root.children).filter(
						(child) => child.tagName === "DIV",
					)
				: [];
			return {
				buttonHeight: buttonRect.height,
				buttonWidth: buttonRect.width,
				borderWidth: buttonStyle.borderTopWidth,
				backgroundColor: buttonStyle.backgroundColor,
				iconName: element.getAttribute("data-local-icon"),
				isInWidgetMenu: rootDivs[1] === element.parentElement,
				menuChildCount: element.parentElement?.children.length ?? 0,
				svgCount: element.querySelectorAll("svg").length,
				text: element.textContent?.trim() ?? "",
				transform: buttonStyle.transform,
			};
		});
	expect(collapseButtonGeometry.buttonWidth).toBeCloseTo(24, 0);
	expect(collapseButtonGeometry.buttonHeight).toBeCloseTo(24, 0);
	expect(collapseButtonGeometry.iconName).toBe(
		"material-symbols:collapse-content-rounded",
	);
	expect(collapseButtonGeometry.borderWidth).toBe("1px");
	expect(collapseButtonGeometry.backgroundColor).not.toContain(
		"96, 165, 250",
	);
	expect(collapseButtonGeometry.isInWidgetMenu).toBe(true);
	expect(collapseButtonGeometry.menuChildCount).toBe(8);
	expect(collapseButtonGeometry.svgCount).toBe(1);
	expect(collapseButtonGeometry.text).toBe("");
	expect(collapseButtonGeometry.transform).toBe("none");
	expect(iconifyRequests).toHaveLength(0);
	const widgetTipChrome = await page
		.frameLocator("#l2d-iframe")
		.locator(".live2d-companion-widget-tip")
		.first()
		.evaluate((element) => {
			const style = getComputedStyle(element);
			const rgb = style.backgroundColor.match(/\d+(\.\d+)?/g) ?? [];
			const [red = 0, green = 0, blue = 0] = rgb.map(Number);
			return {
				backgroundColor: style.backgroundColor,
				isNeutralBackground:
					Math.abs(red - green) <= 8 && Math.abs(green - blue) <= 8,
				maxWidth: style.maxWidth,
				textAlign: style.textAlign,
				whiteSpace: style.whiteSpace,
			};
		});
	expect(widgetTipChrome.backgroundColor).not.toContain("96, 165, 250");
	expect(widgetTipChrome.isNeutralBackground).toBe(true);
	expect(widgetTipChrome.whiteSpace).toBe("normal");
	expect(widgetTipChrome.textAlign).toBe("left");
	expect(widgetTipChrome.maxWidth).not.toBe("200px");
	await page.route(
		"**/live2d-companion/models/NOIR/noir.moc3",
		async (route) => {
			await new Promise((resolve) => setTimeout(resolve, 200));
			await route.continue();
		},
		{ times: 1 },
	);
	await page
		.frameLocator("#l2d-iframe")
		.getByRole("button", { name: "切换模型" })
		.click();
	await expect
		.poll(
			() =>
				page
					.frameLocator("#l2d-iframe")
					.locator("canvas")
					.evaluate(
						() =>
							(
								window as Window & {
									widgetInstance?: {
										l2d?: {
											getExpressions: () => string[];
										};
									};
								}
							).widgetInstance?.l2d?.getExpressions() ?? [],
					),
			{ timeout: 15_000 },
		)
		.toEqual(["eyeclose", "quanquan", "tears", "white"]);
	await expect(
		page.frameLocator("#l2d-iframe").getByRole("button", { name: "闭眼" }),
	).toBeVisible();
	await expectCompanionMenuIcon(
		page,
		"闭眼",
		"material-symbols:visibility-off-outline-rounded",
	);
	await expectCompanionMenuIcon(
		page,
		"圈圈眼",
		"material-symbols:cyclone-rounded",
	);
	await expectCompanionMenuIcon(
		page,
		"眼泪",
		"material-symbols:water-drop-rounded",
	);
	await expectCompanionMenuIcon(
		page,
		"变白",
		"material-symbols:invert-colors-rounded",
	);
	await expect(
		page.frameLocator("#l2d-iframe").getByRole("button", { name: "变白" }),
	).toHaveAttribute("title", "变白");
	await expect(
		page
			.frameLocator("#l2d-iframe")
			.getByRole("button", { name: "全部表情" }),
	).toHaveCount(0);
	await expect(
		page.locator(".live2d-companion__expression-panel"),
	).toHaveCount(0);
	const noirActionGeometry = await page
		.frameLocator("#l2d-iframe")
		.getByRole("button", { name: "变白" })
		.evaluate((element) => {
			const menu = element.parentElement;
			const menuStyle = menu ? getComputedStyle(menu) : undefined;
			return {
				menuChildCount: menu?.children.length ?? 0,
				menuTop: menuStyle?.top ?? "",
				transform: getComputedStyle(element).transform,
			};
		});
	expect(noirActionGeometry.menuChildCount).toBe(6);
	expect(noirActionGeometry.menuTop).toBe("14px");
	expect(noirActionGeometry.transform).toBe("none");
	await page.mouse.move(720, 120);
	await expect(
		page.locator(".live2d-companion__expression-panel"),
	).toHaveCount(0);
	expect(iconifyRequests).toHaveLength(0);
	await page.evaluate(() => {
		window.dispatchEvent(
			new CustomEvent("live2d-companion-command", {
				detail: {
					command: {
						type: "message",
						text: "组件交互测试：这是一段用于验证长文本换行和高度限制的消息内容，应该在气泡内部自然换行，而不是继续使用蓝色背景或把 iframe 撑得过高。",
					},
				},
			}),
		);
	});
	await expect(
		page.frameLocator("#l2d-iframe").locator("#live2d-companion-message"),
	).toContainText("组件交互测试");
	const messageChrome = await page
		.frameLocator("#l2d-iframe")
		.locator("#live2d-companion-message")
		.evaluate((element) => {
			const style = getComputedStyle(element);
			const rgb = style.backgroundColor.match(/\d+(\.\d+)?/g) ?? [];
			const [red = 0, green = 0, blue = 0] = rgb.map(Number);
			return {
				backgroundColor: style.backgroundColor,
				borderWidth: style.borderTopWidth,
				height: element.getBoundingClientRect().height,
				isNeutralBackground:
					Math.abs(red - green) <= 8 && Math.abs(green - blue) <= 8,
				overflowY: style.overflowY,
				textAlign: style.textAlign,
				top: style.top,
				whiteSpace: style.whiteSpace,
				width: element.getBoundingClientRect().width,
			};
		});
	expect(messageChrome.top).toBe("32px");
	expect(messageChrome.borderWidth).toBe("1px");
	expect(messageChrome.backgroundColor).not.toContain("96, 165, 250");
	expect(messageChrome.isNeutralBackground).toBe(true);
	expect(messageChrome.textAlign).toBe("left");
	expect(messageChrome.whiteSpace).toBe("normal");
	expect(messageChrome.overflowY).toBe("auto");
	expect(messageChrome.width).toBeLessThanOrEqual(256);
	expect(messageChrome.height).toBeLessThanOrEqual(108);

	await page.locator("#l2d-iframe").evaluate((iframe) => {
		const frame = iframe as HTMLIFrameElement;
		frame.contentDocument
			?.querySelector<HTMLButtonElement>("#live2d-companion-collapse")
			?.click();
	});
	await expect(page.locator(".live2d-companion")).toHaveCount(1);
	await expect(page.locator(".live2d-companion")).toHaveClass(
		/live2d-companion--collapsed/,
	);
	await expect(page.locator(".live2d-companion__avatar")).toBeVisible();
	await expect(page.locator(".live2d-companion__avatar img")).toHaveAttribute(
		"src",
		"/live2d-companion/models/NOIR/avatar.png",
	);
	const collapsedIframeGeometry = await page
		.locator("#l2d-iframe")
		.evaluate((iframe) => {
			const rect = iframe.getBoundingClientRect();
			return {
				display: window.getComputedStyle(iframe).display,
				height: rect.height,
				width: rect.width,
			};
		});
	expect(collapsedIframeGeometry.display).toBe("none");
	expect(collapsedIframeGeometry.height).toBe(0);
	expect(collapsedIframeGeometry.width).toBe(0);
	await expect(page.getByText("正在休息")).toHaveCount(0);
	await expect(
		page.frameLocator("#l2d-iframe").getByText("正在休眠"),
	).toHaveCount(0);
	await expect
		.poll(() =>
			page.evaluate(() =>
				localStorage.getItem("live2d-companion-collapsed"),
			),
		)
		.toBe("1");
	await expect
		.poll(() =>
			page.evaluate(() =>
				localStorage.getItem("live2d-companion-mounted"),
			),
		)
		.toBe("1");

	await page.locator(".live2d-companion__avatar").click();
	await expect(page.locator(".live2d-companion")).not.toHaveClass(
		/live2d-companion--collapsed/,
	);
	await expect.poll(getCompanionMenuState).toEqual({
		opacity: "1",
		pointerEvents: "auto",
	});
	await expect
		.poll(() =>
			page.evaluate(() =>
				localStorage.getItem("live2d-companion-collapsed"),
			),
		)
		.toBe("0");
});

test("Live2D companion remains available on medium and small viewports", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1024, height: 768 });
	await page.addInitScript(() => {
		if (window.top !== window) return;
		localStorage.removeItem("live2d-companion-mounted");
		localStorage.removeItem("live2d-companion-collapsed");
		localStorage.removeItem("live2d-companion-model-index");
	});
	await gotoPage(page, "/");

	await expect(page.locator("#floating-tools-switch")).toBeVisible({
		timeout: 15_000,
	});
	await page.locator("#floating-tools-switch").click({ force: true });
	await expect(
		page.getByRole("button", { name: "隐藏看板娘" }),
	).toBeVisible();
	await expect(page.locator(".live2d-companion")).toHaveCount(1);
	await expect(page.locator("#l2d-iframe")).toHaveCount(1);

	await page.setViewportSize({ width: 390, height: 844 });
	await expect(
		page.getByRole("button", { name: "隐藏看板娘" }),
	).toBeVisible();
	await expect(page.locator(".live2d-companion")).toHaveCount(1);
	await expect(page.locator("#l2d-iframe")).toHaveCount(1);
});

test("playlist attaches above the player and floating tools clears the full surface", async ({
	page,
}) => {
	await mockMusicPlaylist(page);
	await page.setViewportSize({ width: 1440, height: 900 });
	await gotoPage(page, "/");

	const miniPlayer = await openMiniPlayer(page);
	await miniPlayer.getByRole("button", { name: "展开音乐播放器" }).click();
	await expect(page.locator(".expanded-player")).toBeVisible();
	await expect
		.poll(() =>
			page.evaluate(() => {
				const tools = document
					.getElementById("floating-tools-switch")
					?.getBoundingClientRect();
				const player = document
					.querySelector<HTMLElement>(".expanded-player")
					?.getBoundingClientRect();
				return (
					(player?.top ?? 0) -
					(tools?.bottom ?? Number.POSITIVE_INFINITY)
				);
			}),
		)
		.toBeGreaterThanOrEqual(16);
	await page
		.locator("#music-player-panel")
		.getByRole("button", { name: "播放列表" })
		.click();
	const trackingSamples = await page.evaluate(async () => {
		const samples: number[] = [];
		const startedAt = performance.now();
		while (performance.now() - startedAt < 280) {
			await new Promise<void>((resolve) =>
				requestAnimationFrame(() => resolve()),
			);
			const tools = document
				.getElementById("floating-tools-switch")
				?.getBoundingClientRect();
			const playlist = document
				.querySelector<HTMLElement>(".playlist-panel")
				?.getBoundingClientRect();
			if (tools && playlist && playlist.height > 1) {
				samples.push(playlist.top - tools.bottom);
			}
		}
		return {
			minimumGap: Math.min(...samples),
			sampleCount: samples.length,
			transitionProperty: getComputedStyle(
				document.getElementById("floating-tools")!,
			).transitionProperty,
		};
	});
	expect(trackingSamples.sampleCount).toBeGreaterThan(0);
	expect(trackingSamples.minimumGap).toBeGreaterThanOrEqual(0);
	expect(trackingSamples.transitionProperty).not.toContain("inset-block-end");
	const playlist = page.locator(".playlist-panel");
	await expect(playlist).toBeVisible();
	await expect(
		page.locator(".music-player__panel-stack > .playlist-panel"),
	).toHaveCount(1);
	await expect(page.locator("#floating-tools")).toHaveAttribute(
		"data-music-expanded",
		"true",
	);

	const geometry = await page.evaluate(() => {
		const player = document
			.querySelector<HTMLElement>(".expanded-player")
			?.getBoundingClientRect();
		const playlist = document
			.querySelector<HTMLElement>(".playlist-panel")
			?.getBoundingClientRect();
		const playlistPosition = playlist
			? getComputedStyle(document.querySelector(".playlist-panel")!)
					.position
			: "";
		return {
			playerTop: player?.top ?? 0,
			playlistBottom: playlist?.bottom ?? Number.NEGATIVE_INFINITY,
			playlistPosition,
		};
	});

	expect(
		Math.abs(geometry.playlistBottom - geometry.playerTop),
	).toBeLessThanOrEqual(1);
	expect(geometry.playlistPosition).not.toBe("fixed");
	await expect
		.poll(() =>
			page.evaluate(() => {
				const tools = document
					.getElementById("floating-tools-switch")
					?.getBoundingClientRect();
				const playlist = document
					.querySelector<HTMLElement>(".playlist-panel")
					?.getBoundingClientRect();
				return (
					(tools?.bottom ?? Number.POSITIVE_INFINITY) -
					(playlist?.top ?? 0)
				);
			}),
		)
		.toBeLessThanOrEqual(-8);
});
