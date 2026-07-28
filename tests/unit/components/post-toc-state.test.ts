import { describe, expect, it } from "vitest";
import type { TocItem } from "@/components/post-toc/toc-data";
import { buildTocGraph } from "@/components/post-toc/toc-graph";
import { resolveDesktopTocViewState } from "@/components/post-toc/toc-desktop-state";
import { resolveTocBranchView } from "@/components/post-toc/toc-view";

const items: TocItem[] = [
	{
		id: "one",
		text: "1 Markdown Tutorial",
		depth: 1,
		level: 0,
		badge: "1",
		badgeKind: "text",
	},
	{
		id: "two",
		text: "2 This is an H1",
		depth: 1,
		level: 0,
		badge: "2",
		badgeKind: "text",
	},
	{
		id: "two-child",
		text: "This is an H2",
		depth: 2,
		level: 1,
		badge: "",
		badgeKind: "square",
	},
	{
		id: "three",
		text: "3 This is an H1",
		depth: 1,
		level: 0,
		badge: "3",
		badgeKind: "text",
	},
	{
		id: "three-child",
		text: "This is an H2",
		depth: 2,
		level: 1,
		badge: "",
		badgeKind: "square",
	},
	{
		id: "three-grandchild",
		text: "This is an H3",
		depth: 3,
		level: 2,
		badge: "",
		badgeKind: "dot",
	},
];

describe("desktop TOC state", () => {
	it("builds parent, sibling, and root relationships from TOC items", () => {
		const graph = buildTocGraph(items);

		expect(graph.rootIndexes).toEqual([0, 1, 3]);
		expect(graph.nodes[2]).toMatchObject({
			parentIndex: 1,
			prevIndex: 1,
			nextIndex: 3,
			rootIndex: 1,
		});
		expect(graph.nodes[1].childrenIndexes).toEqual([2]);
		expect(graph.byId.get("three-child")?.parentIndex).toBe(3);
		expect(graph.byId.get("three-grandchild")).toMatchObject({
			parentIndex: 4,
			rootIndex: 3,
		});
	});

	it("tracks the active root and expanded root from the active item", () => {
		const graph = buildTocGraph(items);
		const previous = resolveDesktopTocViewState({
			graph,
			activeIndex: 4,
			scrollDirection: "down",
			reason: "init",
		});
		const next = resolveDesktopTocViewState({
			graph,
			activeIndex: 2,
			previous,
			scrollDirection: "up",
		});

		expect(next.mode).toBe("normal");
		expect(next.transitionType).toBe("root-switch");
		expect(next.activeIndex).toBe(2);
		expect(next.highlightIndex).toBe(2);
		expect(next.activeRootIndex).toBe(1);
		expect(next.expandedRootIndex).toBe(1);
	});

	it("uses roots-only mode at document boundaries", () => {
		const graph = buildTocGraph(items);

		for (const scrollDirection of ["still", "down"] as const) {
			const state = resolveDesktopTocViewState({
				graph,
				activeIndex: scrollDirection === "still" ? -1 : 5,
				scrollDirection,
				rootsOnly: true,
			});

			expect(state.mode).toBe("roots-only");
			expect(state.activeIndex).toBe(-1);
			expect(state.activeRootIndex).toBe(-1);
			expect(state.highlightIndex).toBe(-1);
			expect(state.expandedRootIndex).toBe(-1);
			expect(state.transitionType).toBe("roots-only");
		}
	});

	it("restores active expansion after leaving roots-only mode", () => {
		const graph = buildTocGraph(items);
		const rootsOnlyState = resolveDesktopTocViewState({
			graph,
			activeIndex: 5,
			scrollDirection: "down",
			rootsOnly: true,
		});
		const nextState = resolveDesktopTocViewState({
			graph,
			activeIndex: 5,
			previous: rootsOnlyState,
			scrollDirection: "up",
		});

		expect(nextState.mode).toBe("normal");
		expect(nextState.transitionType).toBe("roots-exit");
		expect(nextState.activeIndex).toBe(5);
		expect(nextState.highlightIndex).toBe(5);
		expect(nextState.activeRootIndex).toBe(3);
		expect(nextState.expandedRootIndex).toBe(3);
	});

	it("shares a root list with only the active root branch expanded", () => {
		const graph = buildTocGraph(items);
		const view = resolveTocBranchView(graph, 5);

		expect(view.activeRootIndex).toBe(3);
		expect([...view.branchIndexes]).toEqual([3, 4, 5]);
		expect([...view.visibleIndexes]).toEqual([0, 1, 3, 4, 5]);
	});

	it("keeps only root entries visible in roots-only mode", () => {
		const graph = buildTocGraph(items);
		const view = resolveTocBranchView(graph, 5, { rootsOnly: true });

		expect(view.activeRootIndex).toBe(-1);
		expect([...view.branchIndexes]).toEqual([]);
		expect([...view.visibleIndexes]).toEqual([0, 1, 3]);
	});
});
