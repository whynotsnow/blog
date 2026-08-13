import { onDestroy, onMount } from "svelte";
import { writable, type Writable } from "svelte/store";
import { live2dCompanionConfig } from "@/config";
import {
	LIVE2D_COMPANION_COMMAND_EVENT,
	type Live2DCompanionCommandDetail,
} from "./events";
import { createLive2DPositionController } from "./live2d-companion-position";
import { createLive2DCompanionRuntime } from "./live2d-companion-runtime";
import {
	getLive2DCompanionCollapsed,
	setLive2DCompanionCollapsed,
} from "./preferences";
import type {
	Live2DCompanionAnchor,
	Live2DCompanionStoredPosition,
} from "./types";
import {
	buildWidgetConfig,
	defaultAvatarSrc,
	getModelAvatarByStoredIndex,
	normalizeMessages,
} from "./widget-config";

export type Live2DCompanionModuleView = {
	frameMounted: boolean;
	loaded: boolean;
	collapsed: boolean;
	collapsing: boolean;
	dragReady: boolean;
	dragging: boolean;
	collapsedAvatarDragging: boolean;
	collapsedAvatarSnapping: boolean;
	activeAvatarSrc: string;
	expressionPanelOpen: boolean;
	availableExpressions: string[];
	expressionPanelAnchor?: { x: number; y: number };
	rootPositionStyle: string;
};

export type Live2DCompanionModuleConstants = {
	widgetWidth: number;
	frameHeight: number;
	expandLabel: string | undefined;
};

export type Live2DCompanionModule = {
	view: Writable<Live2DCompanionModuleView>;
	setIframeEl: (element?: HTMLIFrameElement) => void;
	setRootEl: (element?: HTMLDivElement) => void;
	setExpressionPanelEl: (element?: HTMLDivElement) => void;
	getExpressionLabel: (name: string) => string;
	handleExpressionControlMouseLeave: (event: MouseEvent) => void;
	selectExpression: (name: string) => void;
	beginCollapsedAvatarPointer: (event: PointerEvent) => void;
	preventCollapsedAvatarNativeDrag: (event: DragEvent) => void;
	handleCollapsedAvatarClick: (event: MouseEvent) => void;
};

const widgetConfig = buildWidgetConfig();
const widgetWidth = live2dCompanionConfig.width ?? 280;
const widgetHeight = live2dCompanionConfig.height ?? widgetWidth;
const frameHeight = Math.min(widgetHeight + 72, 360);

export const live2dCompanionModuleConstants: Live2DCompanionModuleConstants = {
	widgetWidth: widgetWidth,
	frameHeight: frameHeight,
	expandLabel: live2dCompanionConfig.dialog?.welcome
		? normalizeMessages(live2dCompanionConfig.dialog.welcome)?.[0]
		: "Show companion",
};

function createInitialView(): Live2DCompanionModuleView {
	return {
		frameMounted: false,
		loaded: false,
		collapsed: false,
		collapsing: false,
		dragReady: false,
		dragging: false,
		collapsedAvatarDragging: false,
		collapsedAvatarSnapping: false,
		activeAvatarSrc: defaultAvatarSrc,
		expressionPanelOpen: false,
		availableExpressions: [],
		rootPositionStyle: `--live2d-companion-width: ${widgetWidth}px; --live2d-companion-height: ${frameHeight}px;`,
	};
}

export function useLive2DCompanionModule(): Live2DCompanionModule {
	let iframeEl: HTMLIFrameElement | undefined;
	let rootEl: HTMLDivElement | undefined;
	let expressionPanelEl: HTMLDivElement | undefined;
	let frameMounted = false;
	let loaded = false;
	let collapsed = false;
	let collapsing = false;
	let pendingCollapse: number | undefined;
	let themeObserver: MutationObserver | undefined;
	let disposed = false;
	let expressionPanelOpen = false;
	let availableExpressions: string[] = [];
	let expressionPanelAnchor: { x: number; y: number } | undefined;
	let dragReady = false;
	let dragging = false;
	let storedPosition: Live2DCompanionStoredPosition | undefined;
	let anchor: Live2DCompanionAnchor | undefined;
	let collapsedAvatarPreviewPosition:
		| Live2DCompanionStoredPosition
		| undefined;
	let collapsedAvatarDragging = false;
	let collapsedAvatarSnapping = false;
	let activeAvatarSrc = defaultAvatarSrc;

	const view = writable<Live2DCompanionModuleView>(createInitialView());
	const positionController = createLive2DPositionController({
		widgetWidth,
		frameHeight,
		getRootEl: () => rootEl,
		getCollapsed: () => collapsed,
		getCollapsedAvatarDragging: () => collapsedAvatarDragging,
		getAnchor: () => anchor,
		setAnchor: (positionAnchor) => {
			anchor = positionAnchor;
		},
		getStoredPosition: () => storedPosition,
		setStoredPosition: (position) => {
			storedPosition = position;
		},
		getCollapsedAvatarPreviewPosition: () => collapsedAvatarPreviewPosition,
		setCollapsedAvatarPreviewPosition: (position) => {
			collapsedAvatarPreviewPosition = position;
		},
	});
	const runtime = createLive2DCompanionRuntime({
		widgetConfig,
		frameHeight,
		getIframeEl: () => iframeEl,
		getRootEl: () => rootEl,
		getExpressionPanelEl: () => expressionPanelEl,
		getDisposed: () => disposed,
		getFrameMounted: () => frameMounted,
		setFrameMounted: (mounted) => {
			frameMounted = mounted;
		},
		setLoaded: (nextLoaded) => {
			loaded = nextLoaded;
		},
		getCollapsed: () => collapsed,
		setCollapsed: (nextCollapsed) => {
			setCollapsed(nextCollapsed);
		},
		getExpressionPanelOpen: () => expressionPanelOpen,
		setExpressionPanelOpenState: (open) => {
			expressionPanelOpen = open;
		},
		getAvailableExpressions: () => availableExpressions,
		setAvailableExpressions: (expressions) => {
			availableExpressions = expressions;
		},
		setExpressionPanelAnchor: (anchor) => {
			expressionPanelAnchor = anchor;
		},
		setActiveAvatarSrc: (src) => {
			activeAvatarSrc = src;
		},
		setDragReady: (ready) => {
			dragReady = ready;
		},
		getDragging: () => dragging,
		setDragging: (nextDragging) => {
			dragging = nextDragging;
		},
		setStoredPosition: (position) => {
			storedPosition = position;
		},
		getStoredPosition: () => storedPosition,
		getAnchor: () => anchor,
		setAnchor: (positionAnchor) => {
			anchor = positionAnchor;
		},
		getCollapsedAvatarPreviewPosition: () => collapsedAvatarPreviewPosition,
		setCollapsedAvatarPreviewPosition: (position) => {
			collapsedAvatarPreviewPosition = position;
		},
		getCollapsedAvatarDragging: () => collapsedAvatarDragging,
		setCollapsedAvatarDragging: (nextDragging) => {
			collapsedAvatarDragging = nextDragging;
		},
		setCollapsedAvatarSnapping: (nextSnapping) => {
			collapsedAvatarSnapping = nextSnapping;
		},
		position: positionController,
		commitView: commitView,
	});

	function commitView(): void {
		view.set({
			frameMounted: frameMounted,
			loaded: loaded,
			collapsed: collapsed,
			collapsing: collapsing,
			dragReady: dragReady,
			dragging: dragging,
			collapsedAvatarDragging: collapsedAvatarDragging,
			collapsedAvatarSnapping: collapsedAvatarSnapping,
			activeAvatarSrc: activeAvatarSrc,
			expressionPanelOpen: expressionPanelOpen,
			availableExpressions: availableExpressions,
			expressionPanelAnchor: expressionPanelAnchor,
			rootPositionStyle: positionController.buildRootPositionStyle(),
		});
	}

	function setCollapsed(nextCollapsed: boolean): void {
		collapsed = nextCollapsed;
		setLive2DCompanionCollapsed(nextCollapsed);
		commitView();
	}

	function clampPositionsToViewport(): void {
		positionController.clampPositionsToViewport();
		commitView();
	}

	function collapseCompanion(): void {
		if (collapsed || collapsing) return;
		runtime.closeExpressionPanel();
		positionController.ensureAnchorFromRoot();
		storedPosition = undefined;
		collapsing = true;
		commitView();
		window.clearTimeout(pendingCollapse);
		pendingCollapse = window.setTimeout(() => {
			setCollapsed(true);
			collapsing = false;
			commitView();
		}, 80);
	}

	function expandCompanion(event?: MouseEvent): void {
		if (collapsed) {
			const nextAnchor = anchor ?? positionController.getDefaultAnchor();
			anchor = nextAnchor;
			positionController.saveAnchor(nextAnchor);
			storedPosition =
				positionController.getExpandedPositionFromAnchor(nextAnchor);
		}
		window.clearTimeout(pendingCollapse);
		collapsing = false;
		setCollapsed(false);
		if (frameMounted) {
			runtime.scheduleInit();
		} else {
			runtime.queueFrameMount();
		}
		requestAnimationFrame(() => runtime.syncFramePointerFromEvent(event));
	}

	function toggleCollapsed(): void {
		if (collapsed) {
			expandCompanion();
		} else {
			collapseCompanion();
		}
	}

	function handleActionMessage(event: MessageEvent): void {
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
			runtime.toggleExpressionPanel(anchor);
		}
		if (event.data.action === "closeExpressionPanel") {
			runtime.closeExpressionPanel();
		}
	}

	function handleMessage(event: MessageEvent): void {
		if (!iframeEl || event.source !== iframeEl.contentWindow) return;
		if (event.data?.type === "l2d-loaded") {
			runtime.applyLoadedMessage(event);
		}
		if (event.data?.type === "l2d-model-state") {
			runtime.applyModelStateMessage(event);
		}
		if (event.data?.type === "l2d-expressions") {
			runtime.applyExpressionsMessage(event);
		}
		if (event.data?.type === "l2d-action") {
			handleActionMessage(event);
		}
		if (event.data?.type === "l2d-drag-ready") {
			dragReady = event.data.ready === true;
			commitView();
		}
		if (event.data?.type === "l2d-drag-start") {
			const point = event.data.point;
			if (typeof point?.x === "number" && typeof point?.y === "number") {
				runtime.startDrag(point);
			}
		}
		if (event.data?.type === "l2d-drag-move") {
			const point = event.data.point;
			if (typeof point?.x === "number" && typeof point?.y === "number") {
				runtime.updateDrag(point);
			}
		}
		if (event.data?.type === "l2d-drag-end") {
			runtime.endDrag();
		}
	}

	function handleCommand(event: Event): void {
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
			runtime.postToFrame({ type: "live2d-companion-command", command });
		}
		if (command.type === "expression") {
			runtime.closeExpressionPanel();
			runtime.postToFrame({ type: "live2d-companion-command", command });
		}
	}

	function handleWindowPointerMove(event: PointerEvent): void {
		runtime.updateDragFromClientPoint(event.clientX, event.clientY);
		runtime.updateCollapsedAvatarDrag(event);
	}

	function handleWindowPointerUp(event: PointerEvent): void {
		runtime.endDrag();
		runtime.endCollapsedAvatarPointer(event, expandCompanion);
	}

	function handleWindowPointerCancel(event: PointerEvent): void {
		runtime.cancelCollapsedAvatarPointer(event);
	}

	function preventCollapsedAvatarNativeDrag(event: DragEvent): void {
		event.preventDefault();
	}

	onMount(() => {
		disposed = false;
		collapsed = getLive2DCompanionCollapsed(false);
		activeAvatarSrc = getModelAvatarByStoredIndex();
		anchor = positionController.readAnchor();
		if (!anchor) {
			anchor = positionController.getDefaultAnchor();
			positionController.saveAnchor(anchor);
		}
		storedPosition = collapsed
			? undefined
			: positionController.getExpandedPositionFromAnchor(anchor);
		commitView();
		window.addEventListener("message", handleMessage);
		window.addEventListener("pointermove", handleWindowPointerMove);
		window.addEventListener("pointerup", handleWindowPointerUp);
		window.addEventListener("pointercancel", handleWindowPointerCancel);
		window.addEventListener("resize", clampPositionsToViewport);
		window.addEventListener(LIVE2D_COMPANION_COMMAND_EVENT, handleCommand);
		themeObserver = new MutationObserver(runtime.postTheme);
		themeObserver.observe(document.documentElement, {
			attributeFilter: ["class", "data-theme", "style"],
			attributes: true,
		});
		if (document.readyState === "complete") {
			runtime.queueFrameMount();
		} else {
			window.addEventListener("load", runtime.queueFrameMount, {
				once: true,
			});
		}

		return () => {
			disposed = true;
			window.clearTimeout(pendingCollapse);
			window.removeEventListener("message", handleMessage);
			window.removeEventListener("pointermove", handleWindowPointerMove);
			window.removeEventListener("pointerup", handleWindowPointerUp);
			window.removeEventListener(
				"pointercancel",
				handleWindowPointerCancel,
			);
			window.removeEventListener("resize", clampPositionsToViewport);
			window.removeEventListener(
				LIVE2D_COMPANION_COMMAND_EVENT,
				handleCommand,
			);
			window.removeEventListener("load", runtime.queueFrameMount);
			runtime.cleanupFrameTimers();
			themeObserver?.disconnect();
			themeObserver = undefined;
			runtime.closeExpressionPanel();
		};
	});

	onDestroy(() => {
		disposed = true;
		window.clearTimeout(pendingCollapse);
		runtime.cleanupFrameTimers();
		themeObserver?.disconnect();
		window.removeEventListener("pointermove", handleWindowPointerMove);
		window.removeEventListener("pointerup", handleWindowPointerUp);
		window.removeEventListener("pointercancel", handleWindowPointerCancel);
		window.removeEventListener("resize", clampPositionsToViewport);
		runtime.closeExpressionPanel();
	});

	return {
		view: view,
		setIframeEl: (element?: HTMLIFrameElement) => {
			iframeEl = element;
		},
		setRootEl: (element?: HTMLDivElement) => {
			rootEl = element;
		},
		setExpressionPanelEl: (element?: HTMLDivElement) => {
			expressionPanelEl = element;
		},
		getExpressionLabel: runtime.getExpressionLabel,
		handleExpressionControlMouseLeave:
			runtime.handleExpressionControlMouseLeave,
		selectExpression: runtime.selectExpression,
		beginCollapsedAvatarPointer: runtime.beginCollapsedAvatarPointer,
		preventCollapsedAvatarNativeDrag: preventCollapsedAvatarNativeDrag,
		handleCollapsedAvatarClick: (event: MouseEvent) =>
			runtime.handleCollapsedAvatarClick(event, expandCompanion),
	};
}
