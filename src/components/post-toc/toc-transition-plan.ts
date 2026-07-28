import type { DesktopTocViewState } from "./toc-desktop-state";

export type TocHighlightMode = "move" | "deferred-move" | "fade-in" | "hidden";
export type TocSlotAction = "none" | "expand" | "collapse" | "switch";

export interface TocTransitionPlan {
	state: DesktopTocViewState;
	slotAction: TocSlotAction;
	highlightMode: TocHighlightMode;
	deferHighlightUntilSlotSettled: boolean;
}

export function resolveTocTransitionPlan(
	previous: DesktopTocViewState | null,
	state: DesktopTocViewState,
): TocTransitionPlan {
	const slotAction: TocSlotAction = (() => {
		if (!previous) return state.expandedRootIndex >= 0 ? "expand" : "none";
		if (previous.expandedRootIndex === state.expandedRootIndex)
			return "none";
		if (previous.expandedRootIndex < 0 && state.expandedRootIndex >= 0) {
			return "expand";
		}
		if (previous.expandedRootIndex >= 0 && state.expandedRootIndex < 0) {
			return "collapse";
		}
		return "switch";
	})();

	const isBoundaryEntry =
		state.highlightIndex >= 0 && previous?.mode === "roots-only";
	const isBranchSwitch =
		state.highlightIndex >= 0 && state.transitionType === "root-switch";
	const shouldDeferHighlight = isBoundaryEntry || isBranchSwitch;

	const highlightMode: TocHighlightMode =
		state.highlightIndex < 0
			? "hidden"
			: isBoundaryEntry
				? "fade-in"
				: isBranchSwitch
					? "deferred-move"
					: "move";

	return {
		state,
		slotAction,
		highlightMode,
		deferHighlightUntilSlotSettled: shouldDeferHighlight,
	};
}
