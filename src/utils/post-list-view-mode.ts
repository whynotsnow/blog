import { siteConfig } from "@/config";

export type PostListViewMode = "list" | "grid";

const STORAGE_KEY = "postListLayout";
let postListViewEventsBound = false;

function isPostListViewMode(value: string | null): value is PostListViewMode {
	return value === "list" || value === "grid";
}

function getDefaultPostListViewMode(): PostListViewMode {
	return siteConfig.postListLayout.defaultMode === "grid" ? "grid" : "list";
}

export function getPostListViewMode(): PostListViewMode {
	const sessionLayout = sessionStorage.getItem(STORAGE_KEY);
	if (isPostListViewMode(sessionLayout)) return sessionLayout;

	const localLayout = localStorage.getItem(STORAGE_KEY);
	if (isPostListViewMode(localLayout)) {
		sessionStorage.setItem(STORAGE_KEY, localLayout);
		return localLayout;
	}

	return getDefaultPostListViewMode();
}

function publishPostListViewChange(mode: PostListViewMode) {
	window.dispatchEvent(
		new CustomEvent("postListViewChange", {
			detail: { view: mode },
		}),
	);
}

export function applyPostListViewMode(
	mode: PostListViewMode = getPostListViewMode(),
): void {
	const mainGrid = document.getElementById("main-grid");
	mainGrid?.setAttribute("data-post-list-view", mode);

	const postListContainers = document.querySelectorAll<HTMLElement>(
		"[data-post-list-renderer]",
	);
	postListContainers.forEach((postListContainer) => {
		postListContainer.classList.add("post-list-view-switching");
		postListContainer.classList.toggle("grid-mode", mode === "grid");
		postListContainer.classList.toggle("list-mode", mode === "list");
		postListContainer.classList.add("js-initialized");

		window.setTimeout(() => {
			postListContainer.classList.remove("post-list-view-switching");
		}, 500);
	});
}

export function setPostListViewMode(mode: PostListViewMode): void {
	sessionStorage.setItem(STORAGE_KEY, mode);
	localStorage.setItem(STORAGE_KEY, mode);
	applyPostListViewMode(mode);
	publishPostListViewChange(mode);
}

export function syncStoredPostListViewMode(): PostListViewMode {
	const mode = getPostListViewMode();
	sessionStorage.setItem(STORAGE_KEY, mode);
	localStorage.setItem(STORAGE_KEY, mode);
	return mode;
}

export function bindPostListViewModeEvents(): void {
	if (postListViewEventsBound) return;
	postListViewEventsBound = true;

	window.addEventListener("postListViewChange", (event) => {
		const mode = (event as CustomEvent<{ view?: string }>).detail?.view;
		if (mode === "grid" || mode === "list") {
			applyPostListViewMode(mode);
		}
	});

	window.addEventListener("storage", (event) => {
		if (event.key !== STORAGE_KEY) return;
		applyPostListViewMode(event.newValue === "grid" ? "grid" : "list");
	});
}
