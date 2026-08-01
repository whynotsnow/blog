import { getTocBranchIndexes, getTocNode, type TocGraph } from "./toc-graph";

export interface TocBranchView {
	activeRootIndex: number;
	branchIndexes: Set<number>;
	visibleIndexes: Set<number>;
}

export function resolveTocActiveRootIndex(
	graph: TocGraph,
	activeIndex: number,
): number {
	const activeNode = getTocNode(graph, activeIndex);
	if (activeNode) return activeNode.rootIndex;
	return graph.rootIndexes[0] ?? -1;
}

export function resolveTocBranchView(
	graph: TocGraph,
	activeIndex: number,
	options: { rootsOnly?: boolean } = {},
): TocBranchView {
	if (options.rootsOnly || graph.rootIndexes.length === 0) {
		return {
			activeRootIndex: -1,
			branchIndexes: new Set(),
			visibleIndexes: new Set(graph.rootIndexes),
		};
	}

	const activeRootIndex = resolveTocActiveRootIndex(graph, activeIndex);
	const branchIndexes = new Set(getTocBranchIndexes(graph, activeRootIndex));
	const visibleIndexes = new Set([...graph.rootIndexes, ...branchIndexes]);

	return {
		activeRootIndex,
		branchIndexes,
		visibleIndexes,
	};
}
