<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { live2dCompanionConfig } from "@/config";
	import {
		LIVE2D_COMPANION_COMMAND_EVENT,
		type Live2DCompanionCommandDetail,
	} from "./events";
	import {
		getLive2DCompanionCollapsed,
		setLive2DCompanionCollapsed,
	} from "./preferences";

	type Live2DCompanionModelConfig = {
		path: string;
		scale?: number;
		offset?: [number, number];
		tips?: Record<string, unknown>;
	};

	type Live2DWidgetConfig = {
		model: Live2DCompanionModelConfig | Live2DCompanionModelConfig[];
		position: "bottom-left" | "bottom-right";
		size: {
			width: number;
			height: number;
		};
		theme?: Record<string, string>;
		transitionDuration: number;
		transitionType: "slide";
		ui?: {
			themeMode?: "site" | "custom";
			messageOffset?: {
				top?: number;
			};
			collapseIcon?: string;
			collapseLabel?: string;
			hideWidgetStatusPanel?: boolean;
		};
		_hideAbout: boolean;
		menus?: {
			items: Array<{
				icon?: string;
				label: string;
				action: string;
			}>;
			align?: "left" | "right";
		};
	};

	let iframeEl: HTMLIFrameElement;
	let frameMounted = false;
	let loaded = false;
	let collapsed = false;
	let collapsing = false;
	let pendingInit: number | undefined;
	let pendingFrameMount: number | undefined;
	let pendingCollapse: number | undefined;
	let themeObserver: MutationObserver | undefined;
	let disposed = false;

	function normalizeMessages(value?: string | string[]) {
		if (!value) return undefined;
		return Array.isArray(value) ? value : [value];
	}

	function buildTipsData() {
		const tipsData: Record<string, unknown> = {};
		if (live2dCompanionConfig.tips) {
			if (live2dCompanionConfig.tips.welcomeMessage) {
				tipsData.welcomeMessage =
					live2dCompanionConfig.tips.welcomeMessage;
			}
			if (live2dCompanionConfig.tips.messages) {
				tipsData.messages = live2dCompanionConfig.tips.messages;
			}
			if (live2dCompanionConfig.tips.duration)
				tipsData.duration = live2dCompanionConfig.tips.duration;
			if (live2dCompanionConfig.tips.interval)
				tipsData.interval = live2dCompanionConfig.tips.interval;
			return tipsData;
		}

		const welcome = normalizeMessages(
			live2dCompanionConfig.dialog?.welcome,
		);
		const touch = normalizeMessages(live2dCompanionConfig.dialog?.touch);
		if (welcome) tipsData.welcomeMessage = welcome;
		if (touch) tipsData.messages = touch;
		return tipsData;
	}

	function buildWidgetConfig(): Live2DWidgetConfig {
		const modelPaths = live2dCompanionConfig.models ?? [
			"/live2d-companion/models/NOIR/noir.model3.json",
		];
		const modelConfigs = modelPaths.map((path) => ({
			path,
			...(typeof live2dCompanionConfig.modelScale === "number" && {
				scale: live2dCompanionConfig.modelScale,
			}),
			...(live2dCompanionConfig.modelOffset && {
				offset: live2dCompanionConfig.modelOffset,
			}),
		}));
		const tipsData = buildTipsData();
		const modelHeight =
			live2dCompanionConfig.height ?? live2dCompanionConfig.width ?? 280;

		if (Object.keys(tipsData).length > 0 && modelConfigs.length === 1) {
			modelConfigs[0].tips = tipsData;
		}

		const widgetConfig: Live2DWidgetConfig = {
			model: modelConfigs.length === 1 ? modelConfigs[0] : modelConfigs,
			position:
				live2dCompanionConfig.position === "right"
					? "bottom-right"
					: "bottom-left",
			size: {
				width: live2dCompanionConfig.width ?? 280,
				height: modelHeight,
			},
			transitionDuration: 0,
			transitionType: "slide",
			ui: {
				themeMode: live2dCompanionConfig.ui?.themeMode ?? "site",
				messageOffset: {
					top: live2dCompanionConfig.ui?.messageOffset?.top ?? 32,
				},
				collapseIcon:
					live2dCompanionConfig.ui?.collapseIcon ??
					"material-symbols:visibility-off-rounded",
				collapseLabel:
					live2dCompanionConfig.ui?.collapseLabel ??
					live2dCompanionConfig.dialog?.close ??
					"Collapse companion",
				hideWidgetStatusPanel:
					live2dCompanionConfig.ui?.hideWidgetStatusPanel ?? true,
			},
			_hideAbout: live2dCompanionConfig.hideAboutMenu ?? true,
		};

		widgetConfig.menus = {
			items:
				live2dCompanionConfig.menus?.items?.map(
					({ icon, label, action }) => ({
						icon,
						label,
						action,
					}),
				) ?? [],
			...(live2dCompanionConfig.menus?.align && {
				align: live2dCompanionConfig.menus.align,
			}),
		};

		return widgetConfig;
	}

	const widgetConfig = buildWidgetConfig();
	const widgetWidth = live2dCompanionConfig.width ?? 280;
	const widgetHeight = live2dCompanionConfig.height ?? widgetWidth;
	const frameHeight = Math.min(widgetHeight + 72, 360);
	const avatarSrc =
		live2dCompanionConfig.avatar ??
		"/live2d-companion/models/NOIR/avatar.png";
	const expandLabel = live2dCompanionConfig.dialog?.welcome
		? normalizeMessages(live2dCompanionConfig.dialog.welcome)?.[0]
		: "Show companion";

	function setCollapsed(nextCollapsed: boolean) {
		collapsed = nextCollapsed;
		setLive2DCompanionCollapsed(nextCollapsed);
	}

	function postToFrame(message: Record<string, unknown>) {
		if (!iframeEl?.contentWindow) return;
		iframeEl.contentWindow.postMessage(message, "*");
	}

	function readThemeTokens() {
		if (live2dCompanionConfig.ui?.themeMode === "custom") return {};
		const styles = window.getComputedStyle(document.documentElement);
		const read = (name: string) => styles.getPropertyValue(name).trim();
		const isDark = document.documentElement.classList.contains("dark");
		return {
			accent: read("--accent"),
			border: read("--border-default"),
			controlSurface: isDark
				? "rgb(30 30 30 / 86%)"
				: "rgb(255 255 255 / 88%)",
			messageSurface: isDark
				? "rgb(24 24 24 / 88%)"
				: "rgb(255 255 255 / 90%)",
			shadow: read("--shadow-raised"),
			text: read("--text-primary"),
		};
	}

	function postTheme() {
		postToFrame({
			type: "live2d-companion-theme",
			theme: readThemeTokens(),
		});
	}

	function postInit() {
		if (!iframeEl?.contentWindow) return;
		postToFrame({
			type: "l2d-init",
			config: {
				...widgetConfig,
				theme: readThemeTokens(),
			},
		});
	}

	function scheduleInit() {
		window.clearTimeout(pendingInit);
		const idleWindow = window as Window & {
			requestIdleCallback?: (
				callback: IdleRequestCallback,
				options?: IdleRequestOptions,
			) => number;
		};
		const run = () => {
			pendingInit = window.setTimeout(postInit, 0);
		};

		if (idleWindow.requestIdleCallback) {
			idleWindow.requestIdleCallback(run, { timeout: 2000 });
		} else {
			pendingInit = window.setTimeout(postInit, 500);
		}
	}

	function bindFrameAfterRender() {
		if (disposed || !iframeEl) return;
		iframeEl.addEventListener("load", scheduleInit);
		scheduleInit();
	}

	function mountFrame() {
		if (disposed || frameMounted) return;
		frameMounted = true;
		loaded = false;
		window.setTimeout(bindFrameAfterRender, 0);
	}

	function queueFrameMount() {
		window.clearTimeout(pendingFrameMount);
		pendingFrameMount = window.setTimeout(() => {
			mountFrame();
		}, 0);
	}

	function handleMessage(event: MessageEvent) {
		if (!iframeEl || event.source !== iframeEl.contentWindow) return;
		if (event.data?.type === "l2d-loaded") {
			const height =
				typeof event.data.contentHeight === "number"
					? event.data.contentHeight
					: 500;
			iframeEl.style.height = `${Math.min(height, frameHeight)}px`;
			loaded = true;
		}
		if (event.data?.type === "l2d-action") {
			if (event.data.action === "home") {
				window.location.href = "/";
			}
			if (event.data.action === "scrollToTop") {
				window.scrollTo({ top: 0, behavior: "smooth" });
			}
			if (event.data.action === "collapse") {
				collapseCompanion();
			}
		}
	}

	function collapseCompanion() {
		if (collapsed || collapsing) return;
		collapsing = true;
		window.clearTimeout(pendingCollapse);
		pendingCollapse = window.setTimeout(() => {
			setCollapsed(true);
			collapsing = false;
		}, 80);
	}

	function expandCompanion() {
		window.clearTimeout(pendingCollapse);
		collapsing = false;
		setCollapsed(false);
		if (frameMounted) {
			scheduleInit();
		} else {
			queueFrameMount();
		}
	}

	function toggleCollapsed() {
		if (collapsed) {
			expandCompanion();
		} else {
			collapseCompanion();
		}
	}

	function handleCommand(event: Event) {
		const { command } = (event as CustomEvent<Live2DCompanionCommandDetail>)
			.detail;
		if (command.type === "collapse") {
			collapseCompanion();
			return;
		}
		if (command.type === "show") {
			expandCompanion();
			return;
		}
		if (command.type === "toggle") {
			toggleCollapsed();
			return;
		}
		if (command.type === "message") {
			postToFrame({ type: "live2d-companion-command", command });
		}
	}

	onMount(() => {
		disposed = false;
		collapsed = getLive2DCompanionCollapsed(false);
		window.addEventListener("message", handleMessage);
		window.addEventListener(LIVE2D_COMPANION_COMMAND_EVENT, handleCommand);
		themeObserver = new MutationObserver(postTheme);
		themeObserver.observe(document.documentElement, {
			attributeFilter: ["class", "data-theme", "style"],
			attributes: true,
		});
		if (document.readyState === "complete") {
			queueFrameMount();
		} else {
			window.addEventListener("load", queueFrameMount, { once: true });
		}

		return () => {
			disposed = true;
			window.clearTimeout(pendingInit);
			window.clearTimeout(pendingFrameMount);
			window.clearTimeout(pendingCollapse);
			window.removeEventListener("message", handleMessage);
			window.removeEventListener(
				LIVE2D_COMPANION_COMMAND_EVENT,
				handleCommand,
			);
			window.removeEventListener("load", queueFrameMount);
			iframeEl?.removeEventListener("load", scheduleInit);
			themeObserver?.disconnect();
			themeObserver = undefined;
		};
	});

	onDestroy(() => {
		disposed = true;
		window.clearTimeout(pendingInit);
		window.clearTimeout(pendingFrameMount);
		window.clearTimeout(pendingCollapse);
		themeObserver?.disconnect();
	});
</script>

<div
	class={`live2d-companion ${live2dCompanionConfig.position || "right"}`}
	class:live2d-companion--collapsed={collapsed}
	class:live2d-companion--collapsing={collapsing}
	class:live2d-companion--loaded={loaded}
	class:live2d-companion--loading={!loaded}
	data-live2d-companion-mounted="true"
	style={`--live2d-companion-width: ${widgetWidth}px; --live2d-companion-height: ${frameHeight}px;`}
>
	{#if frameMounted}
		<iframe
			id="l2d-iframe"
			title="Live2D companion"
			src="/live2d-companion/live2d-host.html"
			allowtransparency="true"
			data-config={JSON.stringify(widgetConfig)}
			data-width={widgetWidth}
			style={`height: ${frameHeight}px;`}
			bind:this={iframeEl}
		></iframe>
	{/if}
	<button
		type="button"
		class="live2d-companion__avatar"
		class:is-loading={!loaded}
		aria-label={expandLabel}
		title={expandLabel}
		onclick={expandCompanion}
	>
		<img src={avatarSrc} alt="" decoding="async" loading="eager" />
	</button>
</div>

<style>
	.live2d-companion {
		position: fixed;
		z-index: 999;
		bottom: 0;
		width: var(--live2d-companion-width, 280px);
		height: var(--live2d-companion-height, 392px);
		pointer-events: none;
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	.live2d-companion.left {
		left: 0;
	}

	.live2d-companion.right {
		right: 0;
	}

	.live2d-companion--loaded {
		opacity: 1;
	}

	.live2d-companion--loading,
	.live2d-companion--collapsed {
		width: 3rem;
		height: 3rem;
		opacity: 1;
	}

	.live2d-companion.left.live2d-companion--loading,
	.live2d-companion.left.live2d-companion--collapsed {
		left: 1rem;
		bottom: 0.75rem;
	}

	.live2d-companion.right.live2d-companion--loading,
	.live2d-companion.right.live2d-companion--collapsed {
		right: 1rem;
		bottom: 0.75rem;
	}

	#l2d-iframe {
		position: absolute;
		inset-inline-start: 0;
		bottom: 0;
		width: 100%;
		height: var(--live2d-companion-height, 392px);
		border: 0;
		background: transparent;
		pointer-events: auto;
		opacity: 1;
		transition: opacity 0.2s ease;
	}

	.live2d-companion__avatar {
		display: none;
		position: absolute;
		inset: 0;
		width: 3rem;
		height: 3rem;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: var(--surface-overlay);
		box-shadow: var(--shadow-raised);
		cursor: pointer;
		pointer-events: auto;
		overflow: hidden;
		transition:
			box-shadow 0.2s ease,
			transform 0.2s ease;
	}

	.live2d-companion__avatar:hover {
		transform: translateY(-2px);
		box-shadow:
			var(--shadow-raised),
			0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent);
	}

	.live2d-companion__avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.live2d-companion__avatar.is-loading::after {
		content: "";
		position: absolute;
		inset: 0.25rem;
		border: 2px solid
			color-mix(in srgb, var(--text-primary) 20%, transparent);
		border-top-color: var(--accent);
		border-radius: 999px;
		animation: live2d-companion-spin 0.8s linear infinite;
	}

	.live2d-companion--loading #l2d-iframe,
	.live2d-companion--collapsing #l2d-iframe,
	.live2d-companion--collapsed #l2d-iframe {
		opacity: 0;
		pointer-events: none;
	}

	.live2d-companion--collapsing #l2d-iframe {
		transition: none;
	}

	.live2d-companion--collapsed #l2d-iframe {
		display: none;
	}

	.live2d-companion--loading .live2d-companion__avatar,
	.live2d-companion--collapsed .live2d-companion__avatar {
		display: block;
	}

	@keyframes live2d-companion-spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
