import { onPageLifecycle } from "@/utils/page-lifecycle";
import { resolveDesktopLayout } from "./resolver";
import {
	desktopLayoutPreferenceStorageKey,
	readDesktopLayoutPreference,
	writeDesktopLayoutPreference,
} from "./storage";
import type { DesktopLayoutConstraint, DesktopLayoutPreference } from "./types";

let bound = false;

function getConstraint(grid: HTMLElement): DesktopLayoutConstraint {
	const base =
		grid.dataset.baseDesktopLayout === "content-right"
			? "content-right"
			: "three-column";
	const allowed = (grid.dataset.allowedDesktopLayouts ?? base)
		.split(" ")
		.filter(
			(value): value is DesktopLayoutPreference =>
				value === "three-column" || value === "content-right",
		);
	return { base, allowed };
}

export function applyDesktopLayoutPreference() {
	const grid = document.getElementById("main-grid");
	if (!grid) return;
	const layout = resolveDesktopLayout(
		getConstraint(grid),
		readDesktopLayoutPreference(),
	);
	grid.dataset.effectiveDesktopLayout = layout;
	window.dispatchEvent(
		new CustomEvent("desktop-layout-applied", { detail: { layout } }),
	);
}

export function setDesktopLayoutPreference(value: DesktopLayoutPreference) {
	writeDesktopLayoutPreference(value);
	applyDesktopLayoutPreference();
}

export function bindDesktopLayoutPreference() {
	if (bound) return;
	bound = true;
	onPageLifecycle("first-load", applyDesktopLayoutPreference);
	onPageLifecycle("content-replace", applyDesktopLayoutPreference);
	window.addEventListener("storage", (event) => {
		if (event.key === desktopLayoutPreferenceStorageKey) {
			applyDesktopLayoutPreference();
		}
	});
}
