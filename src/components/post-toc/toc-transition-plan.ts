import type { DesktopTocViewState } from "./toc-desktop-state";

export type TocHighlightMode = "move" | "fade-in" | "fade-in-place" | "hidden";
export type TocSlotAction = "none" | "expand" | "collapse" | "switch";

export interface TocTransitionPlan {
	state: DesktopTocViewState;
	slotAction: TocSlotAction;
	highlightMode: TocHighlightMode;
	deferHighlightUntilSlotSettled: boolean;
	deferIndicatorUntilSlotSettled: boolean;
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
	const isChildToRootBoundarySwitch =
		state.highlightIndex >= 0 &&
		previous?.highlightIndex !== undefined &&
		previous.highlightIndex >= 0 &&
		previous.activeRootIndex === state.activeRootIndex &&
		previous.highlightIndex !== state.highlightIndex &&
		state.highlightIndex === state.activeRootIndex;
	const highlightMode: TocHighlightMode =
		state.highlightIndex < 0
			? "hidden"
			: isBoundaryEntry
				? "fade-in"
				: isBranchSwitch
					? "fade-in-place"
					: isChildToRootBoundarySwitch
						? "fade-in-place"
						: "move";

	return {
		state,
		slotAction,
		highlightMode,
		deferHighlightUntilSlotSettled: false,
		deferIndicatorUntilSlotSettled:
			state.highlightIndex >= 0 &&
			(slotAction === "expand" || slotAction === "switch"),
	};
}
