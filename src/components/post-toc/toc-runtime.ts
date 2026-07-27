import { buildTocItems, collectTocHeadings, type TocItem } from "./toc-data";

export type { TocItem } from "./toc-data";
export { TocActiveTracker, type TocScrollDirection } from "./toc-active";
export {
	buildTocGraph,
	createEmptyTocGraph,
	getTocAncestorIndexes,
	getTocBranchIndexes,
	getTocNode,
	type TocGraph,
	type TocNode,
} from "./toc-graph";

export const POST_TOC_DATA_ID = "post-toc-data";
export const POST_TOC_REFRESH_EVENT = "post-toc:refresh";
export const TOC_SCROLL_OFFSET = 80;
export const TOC_ACTIVE_OFFSET = 100;

export interface TocRuntimeState {
	root: Element | null;
	items: TocItem[];
	headings: HTMLElement[];
}

export interface PostTocRefreshDetail {
	root?: Element;
}

export function getPostContentRoot(
	scope: ParentNode = document,
): Element | null {
	return (
		scope.querySelector("#post-container .post-detail__content") ||
		scope.querySelector(".markdown-content") ||
		scope.querySelector(".custom-md")
	);
}

export function readStaticTocItems(doc: Document = document): TocItem[] {
	const dataElement = doc.getElementById(POST_TOC_DATA_ID);
	if (!dataElement?.textContent) return [];

	try {
		const items = JSON.parse(dataElement.textContent) as TocItem[];
		return Array.isArray(items) ? items : [];
	} catch (error) {
		console.error("Failed to parse post TOC data:", error);
		return [];
	}
}

export function getTocOptions() {
	return {
		maxDepth: window.siteConfig?.toc?.depth || 3,
		useJapaneseBadge: window.siteConfig?.toc?.useJapaneseBadge || false,
	};
}

export function getHeadingElementsForItems(
	root: Element | null,
	items: TocItem[],
): HTMLElement[] {
	if (!root) return [];

	const itemIds = new Set(items.map((item) => item.id));
	return Array.from(
		root.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6"),
	).filter((heading) =>
		itemIds.size > 0 ? itemIds.has(heading.id) : Boolean(heading.id),
	);
}

export function resolveTocRuntimeState(runtimeRoot?: Element): TocRuntimeState {
	const root = runtimeRoot || getPostContentRoot();
	const staticItems = runtimeRoot ? [] : readStaticTocItems();
	const items =
		staticItems.length > 0
			? staticItems
			: root
				? buildTocItems(collectTocHeadings(root), getTocOptions())
				: [];

	return {
		root,
		items,
		headings: getHeadingElementsForItems(root, items),
	};
}

export function findHeadingById(
	id: string,
	root: Element | null = getPostContentRoot(),
): HTMLElement | undefined {
	return getHeadingElementsForItems(root, []).find(
		(heading) => heading.id === id,
	);
}

export function scrollToHeading(
	id: string,
	options: {
		root?: Element | null;
		offset?: number;
		close?: () => void | Promise<void>;
	} = {},
) {
	const heading = findHeadingById(id, options.root ?? getPostContentRoot());
	if (!heading) return false;

	void options.close?.();
	window.scrollTo({
		top:
			heading.getBoundingClientRect().top +
			window.scrollY -
			(options.offset ?? TOC_SCROLL_OFFSET),
		behavior: "smooth",
	});
	return true;
}

export function refreshRuntimeHeadings(root?: Element) {
	window.dispatchEvent(
		new CustomEvent<PostTocRefreshDetail>(POST_TOC_REFRESH_EVENT, {
			detail: { root },
		}),
	);
}

export const dispatchPostTocRefresh = refreshRuntimeHeadings;

export function onPostTocRefresh(
	callback: (detail: PostTocRefreshDetail) => void,
) {
	const listener = (event: Event) => {
		callback((event as CustomEvent<PostTocRefreshDetail>).detail ?? {});
	};
	window.addEventListener(POST_TOC_REFRESH_EVENT, listener);
	return () => window.removeEventListener(POST_TOC_REFRESH_EVENT, listener);
}
