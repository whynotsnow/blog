import type { TocGraph } from "./toc-graph";
import type { TocScrollDirection } from "./toc-active";
import { resolveTocActiveRootIndex } from "./toc-view";

export type DesktopTocMode = "roots-only" | "normal";

export type DesktopTocTransitionType =
	| "init"
	| "same-node"
	| "root-switch"
	| "roots-only"
	| "roots-exit"
	| "anchor-jump"
	| "runtime-refresh"
	| "layout-remeasure";

export interface DesktopTocViewState {
	mode: DesktopTocMode;
	activeIndex: number;
	activeRootIndex: number;
	highlightIndex: number;
	expandedRootIndex: number;
	transitionType: DesktopTocTransitionType;
	scrollDirection: TocScrollDirection;
}

export interface ResolveDesktopTocViewOptions {
	graph: TocGraph;
	activeIndex: number;
	previous?: DesktopTocViewState | null;
	scrollDirection: TocScrollDirection;
	rootsOnly?: boolean;
	suppressHighlight?: boolean;
	reason?: DesktopTocTransitionType;
}

function resolveTransitionType({
	activeIndex,
	activeRootIndex,
	previous,
	rootsOnly,
	reason,
}: ResolveDesktopTocViewOptions & {
	activeRootIndex: number;
}): DesktopTocTransitionType {
	if (rootsOnly) return "roots-only";
	if (
		reason === "init" ||
		reason === "runtime-refresh" ||
		reason === "layout-remeasure" ||
		reason === "anchor-jump" ||
		reason === "roots-exit"
	) {
		return reason;
	}
	if (!previous) return "init";
	if (previous.mode === "roots-only") return "roots-exit";
	if (previous.activeRootIndex !== activeRootIndex) return "root-switch";
	if (previous.activeIndex === activeIndex) return "same-node";
	return "same-node";
}

export function resolveDesktopTocViewState(
	options: ResolveDesktopTocViewOptions,
): DesktopTocViewState {
	const rootsOnly = Boolean(options.rootsOnly);
	const mode: DesktopTocMode = rootsOnly ? "roots-only" : "normal";
	const activeRootIndex = rootsOnly
		? -1
		: resolveTocActiveRootIndex(options.graph, options.activeIndex);
	const transitionType = resolveTransitionType({
		...options,
		activeRootIndex,
	});

	return {
		mode,
		activeIndex: rootsOnly ? -1 : options.activeIndex,
		activeRootIndex,
		highlightIndex:
			rootsOnly || options.suppressHighlight ? -1 : options.activeIndex,
		expandedRootIndex: rootsOnly ? -1 : activeRootIndex,
		transitionType,
		scrollDirection: options.scrollDirection,
	};
}
