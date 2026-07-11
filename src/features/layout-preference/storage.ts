import type { DesktopLayoutPreference } from "./types";

const STORAGE_KEY = "desktopLayoutPreference";

export function readDesktopLayoutPreference(): DesktopLayoutPreference | null {
	const value = localStorage.getItem(STORAGE_KEY);
	if (value === "three-column" || value === "content-right") return value;

	// Preserve the layout implied by the legacy post-list preference on upgrade.
	const legacyPostListLayout = localStorage.getItem("postListLayout");
	if (legacyPostListLayout === "grid") return "content-right";
	if (legacyPostListLayout === "list") return "three-column";
	return null;
}

export function writeDesktopLayoutPreference(value: DesktopLayoutPreference) {
	localStorage.setItem(STORAGE_KEY, value);
}

export const desktopLayoutPreferenceStorageKey = STORAGE_KEY;
