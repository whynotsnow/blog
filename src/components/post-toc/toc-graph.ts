import type { TocItem } from "./toc-data";

export interface TocNode extends TocItem {
	index: number;
	parentIndex: number | null;
	childrenIndexes: number[];
	prevIndex: number | null;
	nextIndex: number | null;
	rootIndex: number;
	rangeStart: number;
	rangeEnd: number;
}

export interface TocGraph {
	items: TocItem[];
	nodes: TocNode[];
	rootIndexes: number[];
	byId: Map<string, TocNode>;
}

export function createEmptyTocGraph(): TocGraph {
	return {
		items: [],
		nodes: [],
		rootIndexes: [],
		byId: new Map(),
	};
}

export function buildTocGraph(items: TocItem[]): TocGraph {
	const stack: number[] = [];
	const rootIndexes: number[] = [];
	const nodes: TocNode[] = [];
	let rootIndex = 0;

	for (let index = 0; index < items.length; index++) {
		const item = items[index];
		while (stack.length > item.level) stack.pop();

		const parentIndex =
			item.level > 0 ? (stack[item.level - 1] ?? null) : null;
		if (item.level === 0) {
			rootIndex = index;
			rootIndexes.push(index);
		}

		const node: TocNode = {
			...item,
			index,
			parentIndex,
			childrenIndexes: [],
			prevIndex: index > 0 ? index - 1 : null,
			nextIndex: index < items.length - 1 ? index + 1 : null,
			rootIndex,
			rangeStart: Number.POSITIVE_INFINITY,
			rangeEnd: Number.POSITIVE_INFINITY,
		};
		nodes.push(node);

		if (parentIndex !== null) {
			nodes[parentIndex]?.childrenIndexes.push(index);
		}

		stack[item.level] = index;
		stack.length = item.level + 1;
	}

	return {
		items,
		nodes,
		rootIndexes,
		byId: new Map(nodes.map((node) => [node.id, node])),
	};
}

export function getTocNode(graph: TocGraph, index: number): TocNode | null {
	return index >= 0 ? (graph.nodes[index] ?? null) : null;
}

export function getTocBranchIndexes(
	graph: TocGraph,
	rootIndex: number,
): number[] {
	const root = getTocNode(graph, rootIndex);
	if (!root) return [];

	const branchIndexes: number[] = [];
	for (let index = root.index; index < graph.nodes.length; index++) {
		const node = graph.nodes[index];
		if (index !== root.index && node.level === 0) break;
		branchIndexes.push(index);
	}
	return branchIndexes;
}

export function getTocAncestorIndexes(
	graph: TocGraph,
	index: number,
): number[] {
	const ancestors: number[] = [];
	let parentIndex = getTocNode(graph, index)?.parentIndex ?? null;
	while (parentIndex !== null) {
		ancestors.unshift(parentIndex);
		parentIndex = getTocNode(graph, parentIndex)?.parentIndex ?? null;
	}
	return ancestors;
}
