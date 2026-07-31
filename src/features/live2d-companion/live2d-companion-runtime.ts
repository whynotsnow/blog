import { live2dCompanionConfig } from "@/config";
import type {
	Live2DCompanionCollapsedPosition,
	Live2DCompanionDragPointer,
	Live2DCompanionStoredPosition,
	Live2DWidgetConfig,
} from "./types";
import { defaultAvatarSrc } from "./widget-config";

const collapsedDragActivationDistance = 6;
const expressionLabels = live2dCompanionConfig.expressionMenu?.labels ?? {};

type Live2DPositionRuntime = {
	saveStoredPosition: (position: Live2DCompanionStoredPosition) => void;
	saveCollapsedPosition: (position: Live2DCompanionCollapsedPosition) => void;
	getCollapsedPositionFromRect: (
		rect: DOMRect,
	) => Live2DCompanionCollapsedPosition;
	getExpandedPositionFromCollapsed: () => Live2DCompanionStoredPosition;
	clampPosition: (
		position: Live2DCompanionStoredPosition,
	) => Live2DCompanionStoredPosition;
	clampCollapsedPosition: (
		position: Live2DCompanionCollapsedPosition,
	) => Live2DCompanionCollapsedPosition;
};

type Live2DCompanionRuntimeOptions = {
	widgetConfig: Live2DWidgetConfig;
	frameHeight: number;
	getIframeEl: () => HTMLIFrameElement | undefined;
	getRootEl: () => HTMLDivElement | undefined;
	getExpressionPanelEl: () => HTMLDivElement | undefined;
	getDisposed: () => boolean;
	getFrameMounted: () => boolean;
	setFrameMounted: (mounted: boolean) => void;
	setLoaded: (loaded: boolean) => void;
	getCollapsed: () => boolean;
	setCollapsed: (collapsed: boolean) => void;
	getExpressionPanelOpen: () => boolean;
	setExpressionPanelOpenState: (open: boolean) => void;
	getAvailableExpressions: () => string[];
	setAvailableExpressions: (expressions: string[]) => void;
	setExpressionPanelAnchor: (anchor?: { x: number; y: number }) => void;
	setActiveAvatarSrc: (src: string) => void;
	setDragReady: (ready: boolean) => void;
	getDragging: () => boolean;
	setDragging: (dragging: boolean) => void;
	setStoredPosition: (
		position: Live2DCompanionStoredPosition | undefined,
	) => void;
	getStoredPosition: () => Live2DCompanionStoredPosition | undefined;
	getCollapsedPosition: () => Live2DCompanionCollapsedPosition | undefined;
	setCollapsedPosition: (
		position: Live2DCompanionCollapsedPosition | undefined,
	) => void;
	getCollapsedAvatarDragging: () => boolean;
	setCollapsedAvatarDragging: (dragging: boolean) => void;
	position: Live2DPositionRuntime;
	commitView: () => void;
};

export function createLive2DCompanionRuntime(
	options: Live2DCompanionRuntimeOptions,
) {
	let pendingInit: number | undefined;
	let pendingFrameMount: number | undefined;
	let dragOffset = { x: 0, y: 0 };
	let collapsedAvatarPointerId: number | undefined;
	let collapsedAvatarDragStarted = false;
	let collapsedAvatarDragStart = { x: 0, y: 0 };
	let collapsedAvatarDragOffset = { x: 0, y: 0 };
	let suppressCollapsedAvatarClick = false;

	function postToFrame(message: Record<string, unknown>) {
		const iframeEl = options.getIframeEl();
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
			isDark,
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

	function postExpressionPanelState(open = options.getExpressionPanelOpen()) {
		postToFrame({
			type: "live2d-companion-expression-panel-state",
			open,
		});
	}

	function setExpressionPanelOpen(open: boolean) {
		options.setExpressionPanelOpenState(open);
		postExpressionPanelState(open);
		options.commitView();
	}

	function closeExpressionPanel() {
		setExpressionPanelOpen(false);
	}

	function toggleExpressionPanel(anchor?: { x: number; y: number }) {
		if (options.getAvailableExpressions().length === 0) return;
		if (anchor) options.setExpressionPanelAnchor(anchor);
		setExpressionPanelOpen(!options.getExpressionPanelOpen());
	}

	function handleExpressionControlMouseLeave(event: MouseEvent) {
		if (!options.getExpressionPanelOpen()) return;
		const relatedTarget = event.relatedTarget;
		const iframeEl = options.getIframeEl();
		if (
			relatedTarget instanceof Node &&
			(relatedTarget === iframeEl ||
				options.getExpressionPanelEl()?.contains(relatedTarget))
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
		if (!options.getIframeEl()?.contentWindow) return;
		postToFrame({
			type: "l2d-init",
			config: {
				...options.widgetConfig,
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
		const iframeEl = options.getIframeEl();
		if (options.getDisposed() || !iframeEl) return;
		iframeEl.addEventListener("load", scheduleInit);
		scheduleInit();
	}

	function mountFrame() {
		if (options.getDisposed() || options.getFrameMounted()) return;
		options.setFrameMounted(true);
		options.setLoaded(false);
		options.commitView();
		window.setTimeout(bindFrameAfterRender, 0);
	}

	function queueFrameMount() {
		window.clearTimeout(pendingFrameMount);
		pendingFrameMount = window.setTimeout(() => {
			mountFrame();
		}, 0);
	}

	function syncFramePointerFromEvent(event?: MouseEvent) {
		const iframeEl = options.getIframeEl();
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

	function getParentClientPoint(point: Live2DCompanionDragPointer) {
		const rect = options.getIframeEl()?.getBoundingClientRect();
		if (!rect) return undefined;
		return {
			x: rect.left + point.x,
			y: rect.top + point.y,
		};
	}

	function startDrag(point: Live2DCompanionDragPointer) {
		const clientPoint = getParentClientPoint(point);
		const rect = options.getRootEl()?.getBoundingClientRect();
		if (!clientPoint || !rect) return;
		closeExpressionPanel();
		options.setDragging(true);
		options.setDragReady(true);
		dragOffset = {
			x: clientPoint.x - rect.left,
			y: clientPoint.y - rect.top,
		};
		options.setStoredPosition({
			left: rect.left,
			top: rect.top,
		});
		postToFrame({ type: "live2d-companion-drag-state", dragging: true });
		options.commitView();
	}

	function updateDragFromClientPoint(clientX: number, clientY: number) {
		if (!options.getDragging()) return;
		options.setStoredPosition(
			options.position.clampPosition({
				left: clientX - dragOffset.x,
				top: clientY - dragOffset.y,
			}),
		);
		options.commitView();
	}

	function updateDrag(point: Live2DCompanionDragPointer) {
		const clientPoint = getParentClientPoint(point);
		if (!clientPoint) return;
		updateDragFromClientPoint(clientPoint.x, clientPoint.y);
	}

	function endDrag() {
		if (!options.getDragging()) return;
		options.setDragging(false);
		const storedPosition = options.getStoredPosition();
		if (storedPosition) {
			const position = options.position.clampPosition(storedPosition);
			options.setStoredPosition(position);
			options.position.saveStoredPosition(position);
		}
		postToFrame({ type: "live2d-companion-drag-state", dragging: false });
		options.commitView();
	}

	function beginCollapsedAvatarPointer(event: PointerEvent) {
		if (!options.getCollapsed() || event.button !== 0) return;
		const rect = options.getRootEl()?.getBoundingClientRect();
		if (!rect) return;
		collapsedAvatarPointerId = event.pointerId;
		options.setCollapsedAvatarDragging(true);
		collapsedAvatarDragStarted = false;
		collapsedAvatarDragStart = {
			x: event.clientX,
			y: event.clientY,
		};
		collapsedAvatarDragOffset = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top,
		};
		options.setCollapsedPosition(
			options.getCollapsedPosition() ??
				options.position.getCollapsedPositionFromRect(rect),
		);
		if (event.currentTarget instanceof HTMLElement) {
			try {
				event.currentTarget.setPointerCapture(event.pointerId);
			} catch {
				collapsedAvatarPointerId = undefined;
				options.setCollapsedAvatarDragging(false);
			}
		}
		options.commitView();
	}

	function updateCollapsedAvatarDrag(event: PointerEvent) {
		if (
			!options.getCollapsedAvatarDragging() ||
			event.pointerId !== collapsedAvatarPointerId
		) {
			return;
		}
		const movement = Math.hypot(
			event.clientX - collapsedAvatarDragStart.x,
			event.clientY - collapsedAvatarDragStart.y,
		);
		if (
			!collapsedAvatarDragStarted &&
			movement < collapsedDragActivationDistance
		) {
			return;
		}
		collapsedAvatarDragStarted = true;
		const edge = event.clientX < window.innerWidth / 2 ? "left" : "right";
		options.setCollapsedPosition(
			options.position.clampCollapsedPosition({
				edge,
				top: event.clientY - collapsedAvatarDragOffset.y,
			}),
		);
		event.preventDefault();
		options.commitView();
	}

	function endCollapsedAvatarPointer(
		event: PointerEvent,
		expandCompanion: (event?: MouseEvent) => void,
	) {
		if (
			!options.getCollapsedAvatarDragging() ||
			event.pointerId !== collapsedAvatarPointerId
		) {
			return;
		}
		if (event.currentTarget instanceof HTMLElement) {
			try {
				event.currentTarget.releasePointerCapture(event.pointerId);
			} catch {
				// Pointer capture may already be released by the browser.
			}
		}
		options.setCollapsedAvatarDragging(false);
		collapsedAvatarPointerId = undefined;
		const collapsedPosition = options.getCollapsedPosition();
		if (collapsedAvatarDragStarted && collapsedPosition) {
			const position =
				options.position.clampCollapsedPosition(collapsedPosition);
			options.setCollapsedPosition(position);
			options.position.saveCollapsedPosition(position);
			suppressCollapsedAvatarClick = true;
			window.setTimeout(() => {
				suppressCollapsedAvatarClick = false;
			}, 0);
			event.preventDefault();
			options.commitView();
			return;
		}
		options.commitView();
		expandCompanion(event);
	}

	function cancelCollapsedAvatarPointer(event: PointerEvent) {
		if (
			!options.getCollapsedAvatarDragging() ||
			event.pointerId !== collapsedAvatarPointerId
		) {
			return;
		}
		options.setCollapsedAvatarDragging(false);
		collapsedAvatarPointerId = undefined;
		collapsedAvatarDragStarted = false;
		options.commitView();
	}

	function handleCollapsedAvatarClick(
		event: MouseEvent,
		expandCompanion: (event?: MouseEvent) => void,
	) {
		if (suppressCollapsedAvatarClick) {
			event.preventDefault();
			return;
		}
		if (options.getCollapsed()) expandCompanion(event);
	}

	function applyLoadedMessage(event: MessageEvent) {
		const iframeEl = options.getIframeEl();
		if (!iframeEl) return;
		const height =
			typeof event.data.contentHeight === "number"
				? event.data.contentHeight
				: 500;
		iframeEl.style.height = `${Math.min(height, options.frameHeight)}px`;
		options.setLoaded(true);
		options.commitView();
	}

	function applyModelStateMessage(event: MessageEvent) {
		options.setActiveAvatarSrc(
			typeof event.data.avatar === "string" && event.data.avatar
				? event.data.avatar
				: defaultAvatarSrc,
		);
		options.commitView();
	}

	function applyExpressionsMessage(event: MessageEvent) {
		options.setAvailableExpressions(
			Array.isArray(event.data.expressions)
				? event.data.expressions.filter(
						(name: unknown): name is string =>
							typeof name === "string",
					)
				: [],
		);
		closeExpressionPanel();
		options.commitView();
	}

	function cleanupFrameTimers() {
		window.clearTimeout(pendingInit);
		window.clearTimeout(pendingFrameMount);
		options.getIframeEl()?.removeEventListener("load", scheduleInit);
	}

	return {
		postToFrame,
		postTheme,
		closeExpressionPanel,
		toggleExpressionPanel,
		getExpressionLabel,
		handleExpressionControlMouseLeave,
		selectExpression,
		scheduleInit,
		queueFrameMount,
		syncFramePointerFromEvent,
		startDrag,
		updateDrag,
		updateDragFromClientPoint,
		endDrag,
		beginCollapsedAvatarPointer,
		updateCollapsedAvatarDrag,
		endCollapsedAvatarPointer,
		cancelCollapsedAvatarPointer,
		handleCollapsedAvatarClick,
		applyLoadedMessage,
		applyModelStateMessage,
		applyExpressionsMessage,
		cleanupFrameTimers,
	};
}
