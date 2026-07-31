import { live2dCompanionConfig } from "@/config";
import type {
	Live2DCompanionCollapsedPosition,
	Live2DCompanionStoredPosition,
} from "./types";

const positionStorageKey = "live2d-companion-position";
const collapsedPositionStorageKey = "live2d-companion-collapsed-position";
export const collapsedAvatarSize = 48;
export const collapsedViewportMargin = 16;

type Live2DPositionControllerOptions = {
	widgetWidth: number;
	frameHeight: number;
	getRootEl: () => HTMLDivElement | undefined;
	getCollapsed: () => boolean;
	getCollapsedAvatarDragging: () => boolean;
	getStoredPosition: () => Live2DCompanionStoredPosition | undefined;
	setStoredPosition: (
		position: Live2DCompanionStoredPosition | undefined,
	) => void;
	getCollapsedPosition: () => Live2DCompanionCollapsedPosition | undefined;
	setCollapsedPosition: (
		position: Live2DCompanionCollapsedPosition | undefined,
	) => void;
};

export function createLive2DPositionController(
	options: Live2DPositionControllerOptions,
) {
	function saveStoredPosition(position: Live2DCompanionStoredPosition) {
		localStorage.setItem(positionStorageKey, JSON.stringify(position));
	}

	function saveCollapsedPosition(position: Live2DCompanionCollapsedPosition) {
		localStorage.setItem(
			collapsedPositionStorageKey,
			JSON.stringify(position),
		);
	}

	function getCollapsedAvatarSize() {
		const rect = options.getRootEl()?.getBoundingClientRect();
		return rect?.width || collapsedAvatarSize;
	}

	function clampCollapsedPosition(
		position: Live2DCompanionCollapsedPosition,
	) {
		const size = getCollapsedAvatarSize();
		const minTop = collapsedViewportMargin;
		const maxTop = Math.max(
			minTop,
			window.innerHeight - size - collapsedViewportMargin,
		);
		return {
			edge: position.edge,
			top: Math.min(Math.max(position.top, minTop), maxTop),
		};
	}

	function getDefaultCollapsedPosition(): Live2DCompanionCollapsedPosition {
		return clampCollapsedPosition({
			edge: live2dCompanionConfig.position === "left" ? "left" : "right",
			top:
				window.innerHeight -
				collapsedAvatarSize -
				Math.max(12, collapsedViewportMargin * 0.75),
		});
	}

	function readCollapsedPosition() {
		try {
			const raw = localStorage.getItem(collapsedPositionStorageKey);
			if (!raw) return undefined;
			const value = JSON.parse(
				raw,
			) as Partial<Live2DCompanionCollapsedPosition>;
			if (
				(value.edge !== "left" && value.edge !== "right") ||
				typeof value.top !== "number" ||
				!Number.isFinite(value.top)
			) {
				return undefined;
			}
			return clampCollapsedPosition({
				edge: value.edge,
				top: value.top,
			});
		} catch {
			return undefined;
		}
	}

	function getRootSize() {
		const fallbackSize = options.getCollapsed()
			? collapsedAvatarSize
			: options.widgetWidth;
		const rect = options.getRootEl()?.getBoundingClientRect();
		return {
			width: rect?.width || fallbackSize,
			height:
				rect?.height ||
				(options.getCollapsed()
					? collapsedAvatarSize
					: options.frameHeight),
		};
	}

	function clampPosition(position: Live2DCompanionStoredPosition) {
		const size = getRootSize();
		const minLeft = -size.width * 0.5;
		const minTop = -size.height * 0.5;
		const maxLeft = window.innerWidth - size.width * 0.5;
		const maxTop = window.innerHeight - size.height * 0.5;
		return {
			left: Math.min(Math.max(position.left, minLeft), maxLeft),
			top: Math.min(Math.max(position.top, minTop), maxTop),
		};
	}

	function readStoredPosition() {
		try {
			const raw = localStorage.getItem(positionStorageKey);
			if (!raw) return undefined;
			const value = JSON.parse(
				raw,
			) as Partial<Live2DCompanionStoredPosition>;
			if (
				typeof value.left !== "number" ||
				typeof value.top !== "number" ||
				!Number.isFinite(value.left) ||
				!Number.isFinite(value.top)
			) {
				return undefined;
			}
			return clampPosition({ left: value.left, top: value.top });
		} catch {
			return undefined;
		}
	}

	function getCollapsedPositionFromRect(rect: DOMRect) {
		return clampCollapsedPosition({
			edge:
				rect.left + rect.width / 2 < window.innerWidth / 2
					? "left"
					: "right",
			top: rect.top,
		});
	}

	function ensureCollapsedPositionFromRoot() {
		const current = options.getCollapsedPosition();
		const rect = options.getRootEl()?.getBoundingClientRect();
		const position = rect
			? getCollapsedPositionFromRect(rect)
			: (current ?? getDefaultCollapsedPosition());
		options.setCollapsedPosition(position);
		saveCollapsedPosition(position);
		return position;
	}

	function getExpandedPositionFromCollapsed() {
		const nextCollapsedPosition =
			options.getCollapsedPosition() ?? getDefaultCollapsedPosition();
		const collapsedPosition = clampCollapsedPosition(nextCollapsedPosition);
		options.setCollapsedPosition(collapsedPosition);
		const left =
			collapsedPosition.edge === "left"
				? collapsedViewportMargin
				: window.innerWidth -
					options.widgetWidth -
					collapsedViewportMargin;
		return clampPosition({
			left,
			top: collapsedPosition.top,
		});
	}

	function clampPositionsToViewport() {
		const storedPosition = options.getStoredPosition();
		if (storedPosition) {
			const position = clampPosition(storedPosition);
			options.setStoredPosition(position);
			saveStoredPosition(position);
		}

		const collapsedPosition = options.getCollapsedPosition();
		if (collapsedPosition) {
			const position = clampCollapsedPosition(collapsedPosition);
			options.setCollapsedPosition(position);
			saveCollapsedPosition(position);
		}
	}

	function buildRootPositionStyle() {
		const base = `--live2d-companion-width: ${options.widgetWidth}px; --live2d-companion-height: ${options.frameHeight}px;`;
		if (options.getCollapsed() || options.getCollapsedAvatarDragging()) {
			const position =
				options.getCollapsedPosition() ?? getDefaultCollapsedPosition();
			const edgeOffset =
				position.edge === "left"
					? `--live2d-companion-collapsed-left: ${collapsedViewportMargin}px; --live2d-companion-collapsed-right: auto;`
					: `--live2d-companion-collapsed-left: auto; --live2d-companion-collapsed-right: ${collapsedViewportMargin}px;`;
			return `${base} --live2d-companion-collapsed-top: ${position.top}px; ${edgeOffset}`;
		}

		const storedPosition = options.getStoredPosition();
		return storedPosition
			? `${base} --live2d-companion-left: ${storedPosition.left}px; --live2d-companion-top: ${storedPosition.top}px;`
			: base;
	}

	return {
		readStoredPosition,
		saveStoredPosition,
		readCollapsedPosition,
		saveCollapsedPosition,
		getDefaultCollapsedPosition,
		getCollapsedPositionFromRect,
		getExpandedPositionFromCollapsed,
		ensureCollapsedPositionFromRoot,
		clampPosition,
		clampCollapsedPosition,
		clampPositionsToViewport,
		buildRootPositionStyle,
	};
}
