import {
	applyPostListViewMode,
	getPostListViewMode,
} from "@/utils/post-list-view-mode";

export function initializePostList(container: HTMLElement): void {
	requestAnimationFrame(() => {
		if (!container.isConnected) return;
		applyPostListViewMode(getPostListViewMode());
	});
}
