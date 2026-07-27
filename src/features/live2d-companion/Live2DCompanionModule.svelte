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

	type Live2DExpressionMenuConfig = {
		panelIcon?: string;
		panelLabel?: string;
		enablePanel?: boolean;
		maxActions?: number;
		maxPanelItems?: number;
		labels?: Record<string, string>;
		shortcuts?: Array<{
			name: string;
			label: string;
			icon?: string;
		}>;
	};

	type Live2DIdlePlaybackConfig = {
		enable?: boolean;
		interval?: number;
		includeActions?: boolean;
		includePanel?: boolean;
		expressions?: string[];
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
		_models?: Array<{
			path: string;
			scale?: number;
			offset?: [number, number];
			tips?: Record<string, unknown>;
		}>;
		_modelProfiles?: Array<{
			path: string;
			label?: string;
			avatar?: string;
			defaultParameters?: Record<string, number>;
			expressionMenu?: Live2DExpressionMenuConfig;
			idlePlayback?: Live2DIdlePlaybackConfig;
		}>;
		_modelSwitch?: {
			icon?: string;
			label?: string;
		};
		_expressionMenu?: Live2DExpressionMenuConfig;
		_idlePlayback?: Live2DIdlePlaybackConfig;
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
			items: [];
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
	let expressionPanelOpen = false;
	let availableExpressions: string[] = [];
	let expressionPanelAnchor: { x: number; y: number } | undefined;
	let expressionPanelEl: HTMLDivElement | undefined;
	const modelStorageKey = "live2d-companion-model-index";
	const defaultAvatarSrc =
		live2dCompanionConfig.avatar ??
		"/live2d-companion/models/NOIR/avatar.png";
	let activeAvatarSrc = defaultAvatarSrc;

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
		const modelEntries = (
			live2dCompanionConfig.models ?? [
				"/live2d-companion/models/NOIR/noir.model3.json",
			]
		).map((model) => (typeof model === "string" ? { path: model } : model));
		const modelConfigs: Live2DCompanionModelConfig[] = modelEntries.map(
			(model) => ({
				path: model.path,
				...(typeof (model.scale ?? live2dCompanionConfig.modelScale) ===
					"number" && {
					scale: model.scale ?? live2dCompanionConfig.modelScale,
				}),
				...((model.offset ?? live2dCompanionConfig.modelOffset) && {
					offset: model.offset ?? live2dCompanionConfig.modelOffset,
				}),
			}),
		);
		const modelProfiles = modelEntries.map((model) => ({
			path: model.path,
			...(model.label && { label: model.label }),
			...(model.avatar && { avatar: model.avatar }),
			...(model.expressionMenu && {
				expressionMenu: model.expressionMenu,
			}),
			...(model.idlePlayback && {
				idlePlayback: model.idlePlayback,
			}),
			...((model.defaultParameters ??
				live2dCompanionConfig.defaultParameters) && {
				defaultParameters:
					model.defaultParameters ??
					live2dCompanionConfig.defaultParameters,
			}),
		}));
		const tipsData = buildTipsData();
		const modelHeight =
			live2dCompanionConfig.height ?? live2dCompanionConfig.width ?? 280;

		if (Object.keys(tipsData).length > 0 && modelConfigs.length === 1) {
			modelConfigs[0].tips = tipsData;
		}

		const widgetConfig: Live2DWidgetConfig = {
			model: modelConfigs[0],
			_models: modelConfigs,
			_modelProfiles: modelProfiles,
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
			...(live2dCompanionConfig.modelSwitch && {
				_modelSwitch: live2dCompanionConfig.modelSwitch,
			}),
			...(live2dCompanionConfig.expressionMenu && {
				_expressionMenu: live2dCompanionConfig.expressionMenu,
			}),
			...(live2dCompanionConfig.idlePlayback && {
				_idlePlayback: live2dCompanionConfig.idlePlayback,
			}),
		};

		widgetConfig.menus = { items: [] };

		return widgetConfig;
	}

	const widgetConfig = buildWidgetConfig();
	const widgetWidth = live2dCompanionConfig.width ?? 280;
	const widgetHeight = live2dCompanionConfig.height ?? widgetWidth;
	const frameHeight = Math.min(widgetHeight + 72, 360);
	const expressionLabels = live2dCompanionConfig.expressionMenu?.labels ?? {};
	const expandLabel = live2dCompanionConfig.dialog?.welcome
		? normalizeMessages(live2dCompanionConfig.dialog.welcome)?.[0]
		: "Show companion";

	function getModelAvatarByStoredIndex() {
		const models = live2dCompanionConfig.models ?? [];
		const modelEntries = models.map((model) =>
			typeof model === "string" ? { path: model } : model,
		);
		if (modelEntries.length === 0) return defaultAvatarSrc;
		const rawIndex = Number(localStorage.getItem(modelStorageKey));
		const index = Number.isFinite(rawIndex)
			? Math.max(0, Math.min(modelEntries.length - 1, rawIndex))
			: 0;
		return modelEntries[index]?.avatar ?? defaultAvatarSrc;
	}

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

	function getExpressionLabel(name: string) {
		return expressionLabels[name] ?? name;
	}

	function postExpressionPanelState(open = expressionPanelOpen) {
		postToFrame({
			type: "live2d-companion-expression-panel-state",
			open,
		});
	}

	function setExpressionPanelOpen(open: boolean) {
		expressionPanelOpen = open;
		postExpressionPanelState(open);
	}

	function closeExpressionPanel() {
		setExpressionPanelOpen(false);
	}

	function toggleExpressionPanel(anchor?: { x: number; y: number }) {
		if (availableExpressions.length === 0) return;
		if (anchor) expressionPanelAnchor = anchor;
		setExpressionPanelOpen(!expressionPanelOpen);
	}

	function handleExpressionControlMouseLeave(event: MouseEvent) {
		if (!expressionPanelOpen) return;
		const relatedTarget = event.relatedTarget;
		if (
			relatedTarget instanceof Node &&
			(relatedTarget === iframeEl ||
				expressionPanelEl?.contains(relatedTarget))
		) {
			return;
		}
		closeExpressionPanel();
	}

	function selectExpression(name: string) {
		postToFrame({
			type: "live2d-companion-command",
			command: { type: "expression", name },
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
		if (event.data?.type === "l2d-model-state") {
			activeAvatarSrc =
				typeof event.data.avatar === "string" && event.data.avatar
					? event.data.avatar
					: defaultAvatarSrc;
		}
		if (event.data?.type === "l2d-expressions") {
			availableExpressions = Array.isArray(event.data.expressions)
				? event.data.expressions.filter(
						(name: unknown): name is string =>
							typeof name === "string",
					)
				: [];
			closeExpressionPanel();
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
			if (event.data.action === "toggleExpressionPanel") {
				const anchor =
					typeof event.data.anchor?.x === "number" &&
					typeof event.data.anchor?.y === "number"
						? {
								x: event.data.anchor.x,
								y: event.data.anchor.y,
							}
						: undefined;
				toggleExpressionPanel(anchor);
			}
			if (event.data.action === "closeExpressionPanel") {
				closeExpressionPanel();
			}
		}
	}

	function collapseCompanion() {
		if (collapsed || collapsing) return;
		closeExpressionPanel();
		collapsing = true;
		window.clearTimeout(pendingCollapse);
		pendingCollapse = window.setTimeout(() => {
			setCollapsed(true);
			collapsing = false;
		}, 80);
	}

	function syncFramePointerFromEvent(event?: MouseEvent) {
		if (!event || !iframeEl) return;
		const rect = iframeEl.getBoundingClientRect();
		postToFrame({
			type: "live2d-companion-sync-pointer",
			point: {
				x: event.clientX - rect.left,
				y: event.clientY - rect.top,
			},
		});
	}

	function expandCompanion(event?: MouseEvent) {
		window.clearTimeout(pendingCollapse);
		collapsing = false;
		setCollapsed(false);
		if (frameMounted) {
			scheduleInit();
		} else {
			queueFrameMount();
		}
		requestAnimationFrame(() => syncFramePointerFromEvent(event));
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
		if (command.type === "expression") {
			closeExpressionPanel();
			postToFrame({ type: "live2d-companion-command", command });
		}
	}

	onMount(() => {
		disposed = false;
		collapsed = getLive2DCompanionCollapsed(false);
		activeAvatarSrc = getModelAvatarByStoredIndex();
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
			closeExpressionPanel();
		};
	});

	onDestroy(() => {
		disposed = true;
		window.clearTimeout(pendingInit);
		window.clearTimeout(pendingFrameMount);
		window.clearTimeout(pendingCollapse);
		themeObserver?.disconnect();
		closeExpressionPanel();
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
			role="application"
			src="/live2d-companion/live2d-host.html"
			allowtransparency={true}
			data-width={widgetWidth}
			style={`height: ${frameHeight}px;`}
			bind:this={iframeEl}
			onmouseleave={handleExpressionControlMouseLeave}
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
		<img src={activeAvatarSrc} alt="" decoding="async" loading="eager" />
	</button>
	{#if expressionPanelOpen && availableExpressions.length > 0}
		<div
			class="live2d-companion__expression-panel"
			role="group"
			aria-label="全部表情"
			style={`--expression-panel-anchor-x: ${expressionPanelAnchor?.x ?? widgetWidth}px; --expression-panel-anchor-y: ${expressionPanelAnchor?.y ?? frameHeight}px;`}
			bind:this={expressionPanelEl}
			onmouseleave={handleExpressionControlMouseLeave}
		>
			{#each availableExpressions as expression (expression)}
				<button
					type="button"
					class="live2d-companion__expression-option"
					title={getExpressionLabel(expression)}
					aria-label={getExpressionLabel(expression)}
					onclick={() => selectExpression(expression)}
				>
					{getExpressionLabel(expression)}
				</button>
			{/each}
		</div>
	{/if}
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

	.live2d-companion__expression-panel {
		position: absolute;
		z-index: 3;
		left: calc(var(--expression-panel-anchor-x, 0px) + 0.5rem);
		top: var(--expression-panel-anchor-y, 0px);
		display: grid;
		grid-template-columns: repeat(4, 2.15rem);
		gap: 0.25rem;
		width: max-content;
		max-width: calc(100vw - 2rem);
		padding: 0.35rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--surface-overlay);
		box-shadow: var(--shadow-raised);
		backdrop-filter: blur(12px);
		pointer-events: auto;
	}

	.live2d-companion.left .live2d-companion__expression-panel {
		left: calc(var(--expression-panel-anchor-x, 0px) + 0.5rem);
	}

	.live2d-companion.right .live2d-companion__expression-panel {
		right: calc(
			var(--live2d-companion-width, 280px) -
				var(--expression-panel-anchor-x, 0px) + 0.5rem
		);
		left: auto;
	}

	.live2d-companion__expression-option {
		box-sizing: border-box;
		width: 2.15rem;
		height: 1.65rem;
		min-width: 0;
		padding: 0 0.2rem;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: color-mix(in srgb, var(--surface-overlay) 88%, transparent);
		color: var(--text);
		font:
			600 0.68rem/1 system-ui,
			-apple-system,
			BlinkMacSystemFont,
			"Segoe UI",
			sans-serif;
		letter-spacing: 0;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease,
			transform 0.15s ease;
	}

	.live2d-companion__expression-option:hover {
		background: var(--surface);
		color: var(--accent);
		transform: translateY(-1px);
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
