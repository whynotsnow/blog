import { applyLayoutMode, getLayoutMode } from "@/utils/layout-mode";

export function initializePostList(container: HTMLElement): void {
	requestAnimationFrame(() => {
		if (!container.isConnected) return;
		applyLayoutMode(getLayoutMode());
	});
}
