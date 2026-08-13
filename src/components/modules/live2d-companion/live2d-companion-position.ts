import { live2dCompanionConfig } from "@/config";
import type {
	Live2DCompanionAnchor,
	Live2DCompanionCollapsedSnapEdge,
	Live2DCompanionStoredPosition,
} from "./types";

const anchorStorageKey = "live2d-companion-anchor";
export const collapsedAvatarSize = 48;
const defaultViewportMargin = 16;
const defaultHorizontalInset = 0;
const defaultHorizontalDock = "configured-edge";
const defaultExpandedHorizontalOverflowRatio = 0.5;
const defaultExpandedVerticalOverflowRatio = 0;
const defaultCollapsedCornerSnapTolerance = 8;

type Live2DCompanionHorizontalDock = "configured-edge" | "nearest-edge";

type Live2DCompanionCornerSnapRange = {
	topEnd: number;
	bottomStart: number;
};

type Live2DPositionControllerOptions = {
	widgetWidth: number;
	frameHeight: number;
	getRootEl: () => HTMLDivElement | undefined;
	getCollapsed: () => boolean;
	getCollapsedAvatarDragging: () => boolean;
	getAnchor: () => Live2DCompanionAnchor | undefined;
	setAnchor: (anchor: Live2DCompanionAnchor | undefined) => void;
	getStoredPosition: () => Live2DCompanionStoredPosition | undefined;
	setStoredPosition: (
		position: Live2DCompanionStoredPosition | undefined,
	) => void;
	getCollapsedAvatarPreviewPosition: () =>
		| Live2DCompanionStoredPosition
		| undefined;
	setCollapsedAvatarPreviewPosition: (
		position: Live2DCompanionStoredPosition | undefined,
	) => void;
};

export type Live2DPositionController = {
	readAnchor: () => Live2DCompanionAnchor | undefined;
	saveAnchor: (anchor: Live2DCompanionAnchor) => void;
	getDefaultAnchor: () => Live2DCompanionAnchor;
	getAnchorFromExpandedPosition: (
		position: Live2DCompanionStoredPosition,
	) => Live2DCompanionAnchor;
	getAnchorFromRect: (rect: DOMRect) => Live2DCompanionAnchor;
	getAnchorFromCollapsedPreview: (
		position: Live2DCompanionStoredPosition,
	) => Live2DCompanionAnchor;
	getExpandedPositionFromAnchor: (
		anchor: Live2DCompanionAnchor,
	) => Live2DCompanionStoredPosition;
	ensureAnchorFromRoot: () => Live2DCompanionAnchor;
	clampPosition: (
		position: Live2DCompanionStoredPosition,
	) => Live2DCompanionStoredPosition;
	clampCollapsedAvatarPreviewPosition: (
		position: Live2DCompanionStoredPosition,
		options?: { suppressCornerSnap?: boolean },
	) => Live2DCompanionStoredPosition;
	getCollapsedAvatarPreviewSnapEdge: (
		position: Live2DCompanionStoredPosition,
	) => Live2DCompanionCollapsedSnapEdge | undefined;
	clampPositionsToViewport: () => void;
	buildRootPositionStyle: () => string;
};

export function createLive2DPositionController(
	options: Live2DPositionControllerOptions,
): Live2DPositionController {
	function clamp(value: number, min: number, max: number): number {
		return Math.min(Math.max(value, min), max);
	}

	const positionBounds = live2dCompanionConfig.ui?.positionBounds ?? {};
	const viewportMargin =
		typeof positionBounds.viewportMargin === "number" &&
		Number.isFinite(positionBounds.viewportMargin)
			? Math.max(0, positionBounds.viewportMargin)
			: defaultViewportMargin;
	const horizontalInset =
		typeof positionBounds.horizontalInset === "number" &&
		Number.isFinite(positionBounds.horizontalInset)
			? Math.max(0, positionBounds.horizontalInset)
			: defaultHorizontalInset;
	const horizontalDock: Live2DCompanionHorizontalDock =
		positionBounds.horizontalDock === "nearest-edge"
			? "nearest-edge"
			: defaultHorizontalDock;
	const configuredEdge =
		live2dCompanionConfig.position === "right" ? "right" : "left";
	const expandedHorizontalOverflowRatio =
		typeof positionBounds.expandedHorizontalOverflowRatio === "number" &&
		Number.isFinite(positionBounds.expandedHorizontalOverflowRatio)
			? clamp(positionBounds.expandedHorizontalOverflowRatio, 0, 1)
			: defaultExpandedHorizontalOverflowRatio;
	const expandedVerticalOverflowRatio =
		typeof positionBounds.expandedVerticalOverflowRatio === "number" &&
		Number.isFinite(positionBounds.expandedVerticalOverflowRatio)
			? clamp(positionBounds.expandedVerticalOverflowRatio, 0, 1)
			: defaultExpandedVerticalOverflowRatio;
	const collapsedCornerSnapTolerance =
		typeof positionBounds.collapsedCornerSnapTolerance === "number" &&
		Number.isFinite(positionBounds.collapsedCornerSnapTolerance)
			? Math.max(0, positionBounds.collapsedCornerSnapTolerance)
			: defaultCollapsedCornerSnapTolerance;

	function getCollapsedAvatarSize(): number {
		return collapsedAvatarSize;
	}

	function getExpandedWidth(): number {
		return options.widgetWidth;
	}

	function getExpandedHeight(): number {
		return options.frameHeight;
	}

	function getCollapsedCornerSnapRange(): Live2DCompanionCornerSnapRange {
		const size = getCollapsedAvatarSize();
		const expandedHeight = getExpandedHeight();
		const minTop = viewportMargin;
		const maxTop = Math.max(
			minTop,
			window.innerHeight - size - viewportMargin,
		);
		// 折叠头像靠近上下边缘时吸附到角落，展开后仍尽量保持同一视觉锚点。
		return {
			topEnd: clamp(
				viewportMargin +
					collapsedCornerSnapTolerance +
					expandedHeight / 2 -
					size / 2,
				minTop,
				maxTop,
			),
			bottomStart: clamp(
				window.innerHeight -
					viewportMargin -
					collapsedCornerSnapTolerance -
					expandedHeight / 2 -
					size / 2,
				minTop,
				maxTop,
			),
		};
	}

	function resolveAnchorEdge(centerX: number): Live2DCompanionAnchor["edge"] {
		if (horizontalDock === "configured-edge") return configuredEdge;
		return centerX < window.innerWidth / 2 ? "left" : "right";
	}

	function clampAnchor(anchor: Live2DCompanionAnchor): Live2DCompanionAnchor {
		return {
			edge:
				horizontalDock === "configured-edge"
					? configuredEdge
					: anchor.edge,
			centerY: clamp(anchor.centerY, 0, window.innerHeight),
		};
	}

	function saveAnchor(anchor: Live2DCompanionAnchor): void {
		localStorage.setItem(
			anchorStorageKey,
			JSON.stringify(clampAnchor(anchor)),
		);
	}

	function readAnchor(): Live2DCompanionAnchor | undefined {
		try {
			const raw = localStorage.getItem(anchorStorageKey);
			if (!raw) return undefined;
			const value = JSON.parse(raw) as Partial<Live2DCompanionAnchor>;
			if (
				(value.edge !== "left" && value.edge !== "right") ||
				typeof value.centerY !== "number" ||
				!Number.isFinite(value.centerY)
			) {
				return undefined;
			}
			return clampAnchor({
				edge: value.edge,
				centerY: value.centerY,
			});
		} catch {
			return undefined;
		}
	}

	function getDefaultAnchor(): Live2DCompanionAnchor {
		const size = collapsedAvatarSize;
		const defaultTop =
			window.innerHeight - size - Math.max(12, viewportMargin * 0.75);
		return clampAnchor({
			edge: configuredEdge,
			centerY: defaultTop + size / 2,
		});
	}

	function getCollapsedDockLeft(edge: Live2DCompanionAnchor["edge"]): number {
		const size = getCollapsedAvatarSize();
		if (edge === "left") return horizontalInset;
		return window.innerWidth - size - horizontalInset;
	}

	function getExpandedDockLeft(edge: Live2DCompanionAnchor["edge"]): number {
		const width = getExpandedWidth();
		if (edge === "left") return horizontalInset;
		return window.innerWidth - width - horizontalInset;
	}

	function clampCollapsedAvatarPreviewPosition(
		position: Live2DCompanionStoredPosition,
		options: { suppressCornerSnap?: boolean } = {},
	): Live2DCompanionStoredPosition {
		const size = getCollapsedAvatarSize();
		const minLeft = horizontalInset;
		const minTop = viewportMargin;
		const maxLeft = Math.max(
			minLeft,
			window.innerWidth - size - horizontalInset,
		);
		const maxTop = Math.max(
			minTop,
			window.innerHeight - size - viewportMargin,
		);
		const top = clamp(position.top, minTop, maxTop);
		const edge = resolveAnchorEdge(position.left + size / 2);
		// 拖拽预览时可暂时关闭角落吸附，提交位置时再决定是否吸附。
		const snapEdge = options.suppressCornerSnap
			? undefined
			: getCollapsedAvatarPreviewSnapEdge({ ...position, top });
		return {
			left:
				horizontalDock === "configured-edge"
					? clamp(getCollapsedDockLeft(edge), minLeft, maxLeft)
					: clamp(position.left, minLeft, maxLeft),
			top:
				snapEdge === "top"
					? minTop
					: snapEdge === "bottom"
						? maxTop
						: top,
		};
	}

	function getCollapsedAvatarPreviewSnapEdge(
		position: Live2DCompanionStoredPosition,
	): Live2DCompanionCollapsedSnapEdge | undefined {
		const snapRange = getCollapsedCornerSnapRange();
		if (position.top <= snapRange.topEnd) return "top";
		if (position.top >= snapRange.bottomStart) return "bottom";
		return undefined;
	}

	function getExpandedPositionFromAnchor(
		anchor: Live2DCompanionAnchor,
	): Live2DCompanionStoredPosition {
		const height = getExpandedHeight();
		const collapsedPosition = getCollapsedPositionFromAnchor(anchor);
		const collapsedTopGap = collapsedPosition.top;
		const collapsedBottomGap =
			window.innerHeight -
			(collapsedPosition.top + getCollapsedAvatarSize());
		const edge = clampAnchor(anchor).edge;
		const left = getExpandedDockLeft(edge);
		let top = anchor.centerY - height / 2;
		if (collapsedTopGap <= viewportMargin + collapsedCornerSnapTolerance) {
			top = viewportMargin;
		} else if (
			collapsedBottomGap <=
			viewportMargin + collapsedCornerSnapTolerance
		) {
			top = window.innerHeight - height - viewportMargin;
		}
		return clampPosition({
			left,
			top,
		});
	}

	function getCollapsedPositionFromAnchor(
		anchor: Live2DCompanionAnchor,
	): Live2DCompanionStoredPosition {
		const size = getCollapsedAvatarSize();
		const edge = clampAnchor(anchor).edge;
		return clampCollapsedAvatarPreviewPosition({
			left: getCollapsedDockLeft(edge),
			top: anchor.centerY - size / 2,
		});
	}

	function clampPosition(
		position: Live2DCompanionStoredPosition,
	): Live2DCompanionStoredPosition {
		const width = getExpandedWidth();
		const height = getExpandedHeight();
		// 展开态允许有限溢出，让模型能贴边停靠，但仍保留可拖回视口的面积。
		let minLeft = horizontalInset - width * expandedHorizontalOverflowRatio;
		let maxLeft =
			window.innerWidth -
			horizontalInset -
			width * (1 - expandedHorizontalOverflowRatio);
		if (horizontalDock === "configured-edge") {
			const dockLeft = getExpandedDockLeft(configuredEdge);
			if (configuredEdge === "left") {
				minLeft =
					horizontalInset - width * expandedHorizontalOverflowRatio;
				maxLeft = horizontalInset;
			} else {
				minLeft = dockLeft;
				maxLeft = dockLeft + width * expandedHorizontalOverflowRatio;
			}
		}
		const minTop = -height * expandedVerticalOverflowRatio;
		const maxTop =
			window.innerHeight - height * (1 - expandedVerticalOverflowRatio);
		return {
			left: clamp(position.left, minLeft, maxLeft),
			top: clamp(position.top, minTop, maxTop),
		};
	}

	function getAnchorFromExpandedPosition(
		position: Live2DCompanionStoredPosition,
	): Live2DCompanionAnchor {
		const width = getExpandedWidth();
		const height = getExpandedHeight();
		const expandedPosition = clampPosition(position);
		const expandedBottomGap =
			window.innerHeight - (expandedPosition.top + height);
		let centerY = expandedPosition.top + height / 2;
		if (
			expandedPosition.top <=
			viewportMargin + collapsedCornerSnapTolerance
		) {
			centerY = viewportMargin + getCollapsedAvatarSize() / 2;
		} else if (
			expandedBottomGap <=
			viewportMargin + collapsedCornerSnapTolerance
		) {
			centerY =
				window.innerHeight -
				viewportMargin -
				getCollapsedAvatarSize() / 2;
		}
		return clampAnchor({
			edge: resolveAnchorEdge(expandedPosition.left + width / 2),
			centerY,
		});
	}

	function getAnchorFromRect(rect: DOMRect): Live2DCompanionAnchor {
		const bottomGap = window.innerHeight - rect.bottom;
		let centerY = rect.top + rect.height / 2;
		if (rect.top <= viewportMargin + collapsedCornerSnapTolerance) {
			centerY = viewportMargin + getCollapsedAvatarSize() / 2;
		} else if (bottomGap <= viewportMargin + collapsedCornerSnapTolerance) {
			centerY =
				window.innerHeight -
				viewportMargin -
				getCollapsedAvatarSize() / 2;
		}
		return clampAnchor({
			edge: resolveAnchorEdge(rect.left + rect.width / 2),
			centerY,
		});
	}

	function getAnchorFromCollapsedPreview(
		position: Live2DCompanionStoredPosition,
	): Live2DCompanionAnchor {
		const size = getCollapsedAvatarSize();
		const preview = clampCollapsedAvatarPreviewPosition(position);
		return clampAnchor({
			edge: resolveAnchorEdge(preview.left + size / 2),
			centerY: preview.top + size / 2,
		});
	}

	function ensureAnchorFromRoot(): Live2DCompanionAnchor {
		const rect = options.getRootEl()?.getBoundingClientRect();
		const anchor = rect
			? getAnchorFromRect(rect)
			: (options.getAnchor() ?? getDefaultAnchor());
		options.setAnchor(anchor);
		saveAnchor(anchor);
		return anchor;
	}

	function clampPositionsToViewport(): void {
		const anchor = options.getAnchor();
		if (anchor) {
			const position = clampAnchor(anchor);
			options.setAnchor(position);
			saveAnchor(position);
		}

		const storedPosition = options.getStoredPosition();
		if (storedPosition) {
			options.setStoredPosition(clampPosition(storedPosition));
		}

		const previewPosition = options.getCollapsedAvatarPreviewPosition();
		if (previewPosition) {
			options.setCollapsedAvatarPreviewPosition(
				clampCollapsedAvatarPreviewPosition(previewPosition),
			);
		}
	}

	function buildRootPositionStyle(): string {
		const base = `--live2d-companion-width: ${options.widgetWidth}px; --live2d-companion-height: ${options.frameHeight}px;`;
		const previewPosition = options.getCollapsedAvatarPreviewPosition();
		if (options.getCollapsedAvatarDragging() && previewPosition) {
			// 拖拽中的 collapsed avatar 使用预览坐标，不提前改写持久化 anchor。
			const position = clampCollapsedAvatarPreviewPosition(
				previewPosition,
				{ suppressCornerSnap: true },
			);
			return `${base} --live2d-companion-collapsed-left: ${position.left}px; --live2d-companion-collapsed-right: auto; --live2d-companion-collapsed-top: ${position.top}px;`;
		}

		const anchor = clampAnchor(options.getAnchor() ?? getDefaultAnchor());
		if (options.getCollapsed() || options.getCollapsedAvatarDragging()) {
			const position = getCollapsedPositionFromAnchor(anchor);
			const edgeOffset =
				anchor.edge === "left"
					? `--live2d-companion-collapsed-left: ${position.left}px; --live2d-companion-collapsed-right: auto;`
					: `--live2d-companion-collapsed-left: auto; --live2d-companion-collapsed-right: ${window.innerWidth - position.left - getCollapsedAvatarSize()}px;`;
			return `${base} --live2d-companion-collapsed-top: ${position.top}px; ${edgeOffset}`;
		}

		const storedPosition =
			options.getStoredPosition() ??
			getExpandedPositionFromAnchor(anchor);
		return `${base} --live2d-companion-left: ${storedPosition.left}px; --live2d-companion-top: ${storedPosition.top}px;`;
	}

	return {
		readAnchor: readAnchor,
		saveAnchor: saveAnchor,
		getDefaultAnchor: getDefaultAnchor,
		getAnchorFromExpandedPosition: getAnchorFromExpandedPosition,
		getAnchorFromRect: getAnchorFromRect,
		getAnchorFromCollapsedPreview: getAnchorFromCollapsedPreview,
		getExpandedPositionFromAnchor: getExpandedPositionFromAnchor,
		ensureAnchorFromRoot: ensureAnchorFromRoot,
		clampPosition: clampPosition,
		clampCollapsedAvatarPreviewPosition:
			clampCollapsedAvatarPreviewPosition,
		getCollapsedAvatarPreviewSnapEdge: getCollapsedAvatarPreviewSnapEdge,
		clampPositionsToViewport: clampPositionsToViewport,
		buildRootPositionStyle: buildRootPositionStyle,
	};
}
