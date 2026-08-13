import type { TocItem } from "./toc-data";
import {
	buildTocGraph,
	createEmptyTocGraph,
	type TocGraph,
	type TocNode,
} from "./toc-graph";

export type TocScrollDirection = "up" | "down" | "still" | "jump";
export type TocBoundaryState = "empty" | "before" | "inside" | "after";

const DEFAULT_ACTIVE_OFFSET = 100;
const JUMP_SCROLL_DELTA = 240;

function getWindowScrollY(): number {
	return typeof window === "undefined" ? 0 : window.scrollY;
}

function getDocumentTop(element: HTMLElement): number {
	return element.getBoundingClientRect().top + getWindowScrollY();
}

function findIndexAtProbe(nodes: TocNode[], probeY: number): number {
	let low = 0;
	let high = nodes.length - 1;
	let activeIndex = -1;
	while (low <= high) {
		const middle = Math.floor((low + high) / 2);
		const node = nodes[middle];
		if (node.rangeStart <= probeY) {
			activeIndex = node.index;
			low = middle + 1;
		} else {
			high = middle - 1;
		}
	}
	return activeIndex;
}

export function resolveTocScrollDirection(
	previousScrollY: number,
	nextScrollY: number,
): TocScrollDirection {
	const delta = nextScrollY - previousScrollY;
	if (Math.abs(delta) >= JUMP_SCROLL_DELTA) return "jump";
	if (delta > 0) return "down";
	if (delta < 0) return "up";
	return "still";
}

export class TocActiveTracker {
	graph: TocGraph = createEmptyTocGraph();
	nodes: TocNode[] = [];
	headings: Array<HTMLElement | undefined> = [];
	activeIndex = -1;
	scrollDirection: TocScrollDirection = "still";
	private activeId = "";
	private lastScrollY = getWindowScrollY();
	private offset: number;
	private contentRangeEnd = Number.POSITIVE_INFINITY;

	constructor(options: { offset?: number } = {}) {
		this.offset = options.offset ?? DEFAULT_ACTIVE_OFFSET;
	}

	setState(
		items: TocItem[],
		headings: Array<HTMLElement | undefined>,
		options: { contentRangeEnd?: number } = {},
	): number {
		const previousActiveId = this.getActiveNode()?.id ?? this.activeId;
		this.graph = buildTocGraph(items);
		this.nodes = this.graph.nodes;
		this.headings = headings;
		this.measure(options);

		const retainedIndex = previousActiveId
			? this.nodes.findIndex((node) => node.id === previousActiveId)
			: -1;
		if (retainedIndex >= 0) {
			this.activeIndex = retainedIndex;
		} else {
			this.activeIndex = findIndexAtProbe(
				this.nodes,
				getWindowScrollY() + this.offset,
			);
		}
		this.activeId = this.getActiveNode()?.id ?? "";
		this.lastScrollY = getWindowScrollY();
		this.scrollDirection = "still";
		return this.activeIndex;
	}

	measure(options: { contentRangeEnd?: number } = {}): void {
		if (typeof options.contentRangeEnd === "number") {
			this.contentRangeEnd = options.contentRangeEnd;
		}

		for (let index = 0; index < this.nodes.length; index++) {
			const node = this.nodes[index];
			const heading = this.headings[index];
			node.rangeStart = heading
				? getDocumentTop(heading)
				: Number.POSITIVE_INFINITY;
		}

		for (let index = 0; index < this.nodes.length; index++) {
			const node = this.nodes[index];
			const nextNode = this.nodes[index + 1];
			node.rangeEnd = nextNode
				? nextNode.rangeStart
				: Math.max(node.rangeStart, this.contentRangeEnd);
		}
	}

	update(
		scrollY: number = getWindowScrollY(),
		offset: number = this.offset,
	): number {
		this.offset = offset;
		this.scrollDirection = resolveTocScrollDirection(
			this.lastScrollY,
			scrollY,
		);
		this.lastScrollY = scrollY;

		if (!this.nodes.length) {
			this.activeIndex = -1;
			this.activeId = "";
			return this.activeIndex;
		}

		const probeY = scrollY + this.offset;
		if (this.activeIndex < 0 || this.scrollDirection === "jump") {
			// 大幅跳转可能跨过多个 heading，重新测量后用二分定位更稳。
			this.measure();
			this.activeIndex = findIndexAtProbe(this.nodes, probeY);
			this.activeId = this.getActiveNode()?.id ?? "";
			return this.activeIndex;
		}

		if (
			this.scrollDirection === "down" ||
			this.scrollDirection === "still"
		) {
			while (
				this.activeIndex < this.nodes.length - 1 &&
				this.nodes[this.activeIndex + 1].rangeStart <= probeY
			) {
				this.activeIndex += 1;
			}
		} else {
			while (
				this.activeIndex >= 0 &&
				this.nodes[this.activeIndex].rangeStart > probeY
			) {
				// 向上滚动回到上一节点链，避免只按数组前一项破坏父子 heading 关系。
				this.activeIndex = this.nodes[this.activeIndex].prevIndex ?? -1;
			}
		}

		const activeNode = this.getActiveNode();
		if (
			activeNode &&
			(activeNode.rangeStart > probeY || activeNode.rangeEnd <= probeY)
		) {
			this.activeIndex = findIndexAtProbe(this.nodes, probeY);
		}

		this.activeId = this.getActiveNode()?.id ?? "";
		return this.activeIndex;
	}

	getActiveNode(): TocNode | null {
		return this.activeIndex >= 0
			? (this.nodes[this.activeIndex] ?? null)
			: null;
	}

	getBoundaryState(
		scrollY: number = getWindowScrollY(),
		offset: number = this.offset,
	): TocBoundaryState {
		if (!this.nodes.length) return "empty";

		const firstNode = this.nodes[0];
		const lastNode = this.nodes[this.nodes.length - 1];
		const probeY = scrollY + offset;
		if (probeY < firstNode.rangeStart) return "before";
		if (Number.isFinite(lastNode.rangeEnd) && probeY >= lastNode.rangeEnd) {
			return "after";
		}
		return "inside";
	}
}
