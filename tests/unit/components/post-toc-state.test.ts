import { describe, expect, it } from "vitest";
import type { TocItem } from "@/components/post-toc/toc-data";
import { buildTocGraph } from "@/components/post-toc/toc-graph";
import { resolveDesktopTocViewportState } from "@/components/post-toc/toc-desktop-state";

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
	});

	it("keeps roots visible and switches only the current branch", () => {
		const graph = buildTocGraph(items);
		const previous = resolveDesktopTocViewportState({
			graph,
			activeIndex: 4,
			scrollDirection: "down",
			reason: "init",
		});
		const next = resolveDesktopTocViewportState({
			graph,
			activeIndex: 2,
			previous,
			scrollDirection: "up",
		});

		expect(next.transitionType).toBe("branch-switch");
		expect([...next.visibleIndexes]).toEqual([0, 1, 3, 2]);
		expect([...next.branchIndexes]).toEqual([1, 2]);
		expect(next.activeRootIndex).toBe(1);
		expect(next.visibleIndexes.has(4)).toBe(false);
	});
});
