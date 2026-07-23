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
	await page.locator(".orb-player").click();
	await expect(miniPlayer).toBeVisible();
	return miniPlayer;
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
				expandedTransform: string | null;
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
						expandedTransform: expandedState
							? getComputedStyle(expandedState).transform
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
	const expandedTransforms = expandedTransition
		.map(({ expandedTransform }) => expandedTransform)
		.filter((value): value is string => value !== null);
	const miniOpacities = expandedTransition
		.map(({ miniOpacity }) => miniOpacity)
		.filter((value): value is number => value !== null);
	const toolsSwitchTops = expandedTransition
		.map(({ toolsSwitchTop }) => toolsSwitchTop)
		.filter((value): value is number => value !== null);
	expect(
		expandedClipPaths.some((clipPath) => clipPath.includes("inset(")),
	).toBe(true);
	expect(new Set(expandedClipPaths).size).toBeGreaterThan(3);
	expect(new Set(expandedTransforms).size).toBeGreaterThan(3);
	expect(Math.min(...miniOpacities)).toBeLessThan(0.4);
	expect(Math.max(...miniOpacities)).toBeGreaterThan(0.8);
	expect(
		new Set(toolsSwitchTops.map((top) => top.toFixed(2))).size,
	).toBeGreaterThan(3);
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
	).toBeGreaterThan(3);
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
	expect(compactTransition.frames.at(-1)?.width).toBeCloseTo(48, 0);
	expect(
		compactTransition.frames.some(({ width }) => width > 60 && width < 270),
	).toBe(true);
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
	expect(new Set(miniClipPathFrames).size).toBeGreaterThan(3);
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
			orbTransform: string | null;
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
					orbTransform: hiddenState
						? getComputedStyle(hiddenState).transform
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
	const orbTransforms = revealTransition
		.map(({ orbTransform }) => orbTransform)
		.filter((transform): transform is string => transform !== null);
	const revealClipPaths = revealTransition
		.map(({ miniClipPath }) => miniClipPath)
		.filter((clipPath): clipPath is string => clipPath !== null);
	const coverOpacities = revealTransition
		.map(({ coverOpacity }) => coverOpacity)
		.filter((opacity): opacity is number => opacity !== null);
	const orbTranslateX = revealTransition
		.map(({ orbTranslateX }) => orbTranslateX)
		.filter((value): value is number => value !== null);
	expect(new Set(orbTransforms).size).toBeGreaterThan(3);
	expect(new Set(revealClipPaths).size).toBeGreaterThan(3);
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

test("floating tools controls the user Pio preference", async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await gotoPage(page, "/");

	await expect(page.locator(".pio-container")).toHaveAttribute(
		"data-pio-mounted",
		"true",
	);
	await page.locator("#floating-tools-switch").click({ force: true });
	const toggle = page.getByRole("button", { name: "隐藏看板娘" });
	await expect(toggle).toBeVisible();
	await expect(toggle).toHaveAttribute("aria-pressed", "true");
	await expect(toggle.locator(".local-icon")).toHaveAttribute(
		"data-local-icon",
		"material-symbols:face-retouching-natural-rounded",
	);
	await expect(page.locator(".pio-container .pio-dialog")).toHaveCount(1);
	await toggle.click();

	await expect
		.poll(() =>
			page.evaluate(() => localStorage.getItem("pio-module-mounted")),
		)
		.toBe("0");
	await expect(page.locator(".pio-container")).toHaveCount(0);
	await expect(page.locator("#pio")).toHaveCount(0);

	const showToggle = page.getByRole("button", { name: "显示看板娘" });
	await expect(showToggle).toHaveAttribute("aria-pressed", "false");
	await expect(showToggle.locator(".local-icon")).toHaveAttribute(
		"data-local-icon",
		"material-symbols:face-retouching-off-rounded",
	);
	await showToggle.click();
	await expect
		.poll(() =>
			page.evaluate(() => localStorage.getItem("pio-module-mounted")),
		)
		.toBe("1");
	await expect(page.locator(".pio-container")).toHaveAttribute(
		"data-pio-mounted",
		"true",
	);
	await expect(page.locator("#pio")).toHaveCount(1);
	await expect(page.locator(".pio-container .pio-dialog")).toHaveCount(1);

	await page.locator(".pio-close").click({ force: true });
	await expect(page.locator(".pio-container")).toHaveCount(1);
	await expect(page.locator(".pio-container")).toHaveClass(/pio-hidden/);
	await expect
		.poll(() => page.evaluate(() => localStorage.getItem("posterGirl")))
		.toBe("0");
	await expect
		.poll(() =>
			page.evaluate(() => localStorage.getItem("pio-module-mounted")),
		)
		.toBe("1");

	await page.locator(".pio-show").click();
	await expect(page.locator(".pio-container")).not.toHaveClass(/pio-hidden/);
	await expect
		.poll(() => page.evaluate(() => localStorage.getItem("posterGirl")))
		.toBe("1");
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
	expect(trackingSamples.sampleCount).toBeGreaterThan(4);
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
