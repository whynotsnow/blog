import { getTocBranchIndexes, getTocNode, type TocGraph } from "./toc-graph";
import type { TocScrollDirection } from "./toc-active";

export type DesktopTocTransitionType =
	| "init"
	| "same-node"
	| "enter-child"
	| "leave-child"
	| "root-to-root"
	| "branch-switch"
	| "anchor-jump"
	| "runtime-refresh"
	| "layout-remeasure";

export type DesktopTocPhase = "idle" | "prepare" | "commit";

export interface DesktopTocViewportState {
	activeIndex: number;
	activeRootIndex: number;
	visibleIndexes: Set<number>;
	branchIndexes: Set<number>;
	readIndexes: Set<number>;
	transitionType: DesktopTocTransitionType;
	phase: DesktopTocPhase;
	scrollDirection: TocScrollDirection;
}

export interface ResolveDesktopTocViewportOptions {
	graph: TocGraph;
	activeIndex: number;
	previous?: DesktopTocViewportState | null;
	scrollDirection: TocScrollDirection;
	reason?: DesktopTocTransitionType;
}

function resolveActiveRootIndex(graph: TocGraph, activeIndex: number) {
	const activeNode = getTocNode(graph, activeIndex);
	if (activeNode) return activeNode.rootIndex;
	return graph.rootIndexes[0] ?? -1;
}

function resolveTransitionType({
	graph,
	activeIndex,
	previous,
	scrollDirection,
	reason,
}: ResolveDesktopTocViewportOptions): DesktopTocTransitionType {
	if (
		reason === "init" ||
		reason === "runtime-refresh" ||
		reason === "layout-remeasure" ||
		reason === "anchor-jump"
	) {
		return reason;
	}
	if (!previous) return "init";
	if (previous.activeIndex === activeIndex) return "same-node";

	const previousNode = getTocNode(graph, previous.activeIndex);
	const nextNode = getTocNode(graph, activeIndex);
	if (!previousNode || !nextNode) return "layout-remeasure";
	if (previousNode.rootIndex !== nextNode.rootIndex) {
		return previousNode.level === 0 && nextNode.level === 0
			? "root-to-root"
			: "branch-switch";
	}
	if (nextNode.level > previousNode.level) return "enter-child";
	if (nextNode.level < previousNode.level) return "leave-child";
	return scrollDirection === "jump" ? "anchor-jump" : "same-node";
}

function resolveVisibleIndexes(graph: TocGraph, activeRootIndex: number) {
	const visibleIndexes = new Set(graph.rootIndexes);
	for (const index of getTocBranchIndexes(graph, activeRootIndex)) {
		visibleIndexes.add(index);
	}
	return visibleIndexes;
}

function resolveReadIndexes(graph: TocGraph, activeIndex: number) {
	const readIndexes = new Set<number>();
	for (const node of graph.nodes) {
		if (node.index < activeIndex && node.index !== node.rootIndex) {
			readIndexes.add(node.index);
		}
	}
	return readIndexes;
}

export function resolveDesktopTocViewportState(
	options: ResolveDesktopTocViewportOptions,
): DesktopTocViewportState {
	const activeRootIndex = resolveActiveRootIndex(
		options.graph,
		options.activeIndex,
	);
	const branchIndexes = new Set(
		getTocBranchIndexes(options.graph, activeRootIndex),
	);
	const transitionType = resolveTransitionType(options);
	const phase =
		transitionType === "same-node" || transitionType === "layout-remeasure"
			? "idle"
			: options.previous
				? "commit"
				: "prepare";

	return {
		activeIndex: options.activeIndex,
		activeRootIndex,
		visibleIndexes: resolveVisibleIndexes(options.graph, activeRootIndex),
		branchIndexes,
		readIndexes: resolveReadIndexes(options.graph, options.activeIndex),
		transitionType,
		phase,
		scrollDirection: options.scrollDirection,
	};
}
