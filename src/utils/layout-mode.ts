import { siteConfig } from "@/config";
import { setDesktopLayoutPreference } from "@/features/layout-preference/controller";

export type LayoutMode = "list" | "grid";

const STORAGE_KEY = "postListLayout";
let layoutModeEventsBound = false;

function isLayoutMode(value: string | null): value is LayoutMode {
	return value === "list" || value === "grid";
}

function getDefaultLayoutMode(): LayoutMode {
	return siteConfig.postListLayout.defaultMode === "grid" ? "grid" : "list";
}

export function getLayoutMode(): LayoutMode {
	const sessionLayout = sessionStorage.getItem(STORAGE_KEY);
	if (isLayoutMode(sessionLayout)) return sessionLayout;

	const localLayout = localStorage.getItem(STORAGE_KEY);
	if (isLayoutMode(localLayout)) {
		sessionStorage.setItem(STORAGE_KEY, localLayout);
		return localLayout;
	}

	return getDefaultLayoutMode();
}

function publishLayoutInit(mode: LayoutMode) {
	window.dispatchEvent(
		new CustomEvent("layoutInit", { detail: { layout: mode } }),
	);
}

function publishLayoutChange(mode: LayoutMode) {
	window.dispatchEvent(
		new CustomEvent("layoutChange", {
			detail: { layout: mode },
		}),
	);
}

export function applyLayoutMode(mode: LayoutMode = getLayoutMode()): void {
	const mainGrid = document.getElementById("main-grid");
	mainGrid?.setAttribute("data-layout-mode", mode);

	const postListContainers = document.querySelectorAll<HTMLElement>(
		"[data-post-list-renderer]",
	);
	postListContainers.forEach((postListContainer) => {
		postListContainer.classList.add("layout-switching");
		postListContainer.classList.toggle("grid-mode", mode === "grid");
		postListContainer.classList.toggle("list-mode", mode === "list");
		postListContainer.classList.add("js-initialized");

		window.setTimeout(() => {
			postListContainer.classList.remove("layout-switching");
		}, 500);
	});

	publishLayoutInit(mode);
}

export function setLayoutMode(mode: LayoutMode): void {
	sessionStorage.setItem(STORAGE_KEY, mode);
	localStorage.setItem(STORAGE_KEY, mode);
	applyLayoutMode(mode);
	setDesktopLayoutPreference(
		mode === "grid" ? "content-right" : "three-column",
	);
	publishLayoutChange(mode);
}

export function syncStoredLayoutMode(): LayoutMode {
	const mode = getLayoutMode();
	sessionStorage.setItem(STORAGE_KEY, mode);
	localStorage.setItem(STORAGE_KEY, mode);
	setDesktopLayoutPreference(
		mode === "grid" ? "content-right" : "three-column",
	);
	return mode;
}

export function bindLayoutModeEvents(): void {
	if (layoutModeEventsBound) return;
	layoutModeEventsBound = true;

	window.addEventListener("layoutChange", (event) => {
		const mode = (event as CustomEvent<{ layout?: string }>).detail?.layout;
		if (mode === "grid" || mode === "list") {
			applyLayoutMode(mode);
		}
	});

	window.addEventListener("storage", (event) => {
		if (event.key !== STORAGE_KEY) return;
		applyLayoutMode(event.newValue === "grid" ? "grid" : "list");
	});
}
