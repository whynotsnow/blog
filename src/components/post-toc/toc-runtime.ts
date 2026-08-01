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
export const TOC_ACTIVE_OFFSET = 120;

export interface TocRuntimeState {
	root: Element | null;
	items: TocItem[];
	headings: Array<HTMLElement | undefined>;
}

export interface PostTocRefreshDetail {
	root?: Element;
}

export interface TocOptions {
	maxDepth: number;
	useJapaneseBadge: boolean;
}

export type PostTocRefreshUnsubscribe = () => void;

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

export function getTocOptions(): TocOptions {
	return {
		maxDepth: window.siteConfig?.toc?.depth || 3,
		useJapaneseBadge: window.siteConfig?.toc?.useJapaneseBadge || false,
	};
}

export function getHeadingElementsForItems(
	root: Element | null,
	items: TocItem[],
): Array<HTMLElement | undefined> {
	if (!root) return [];

	const headings = Array.from(
		root.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6"),
	);
	if (items.length === 0) {
		return headings;
	}

	const headingsById = new Map<string, HTMLElement>();
	for (const heading of headings) {
		if (heading.id && !headingsById.has(heading.id)) {
			headingsById.set(heading.id, heading);
		}
	}
	return items.map((item) => headingsById.get(item.id));
}

export function resolveTocRuntimeState(runtimeRoot?: Element): TocRuntimeState {
	const root: Element | null = runtimeRoot || getPostContentRoot();
	const staticItems: TocItem[] = runtimeRoot ? [] : readStaticTocItems();
	const items: TocItem[] =
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
		(heading): heading is HTMLElement => heading?.id === id,
	);
}

export function scrollToHeading(
	id: string,
	options: {
		root?: Element | null;
		offset?: number;
		close?: () => void | Promise<void>;
	} = {},
): boolean {
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

export function ensureTocTargetsScrollable(
	targets: Array<HTMLElement | undefined>,
	offset: number = TOC_ACTIVE_OFFSET,
): void {
	const visibleTargets = targets.filter((target): target is HTMLElement =>
		Boolean(target),
	);
	if (visibleTargets.length === 0) return;

	const lastTargetTop = Math.max(
		...visibleTargets.map(
			(target) => target.getBoundingClientRect().top + window.scrollY,
		),
	);
	const requiredScrollHeight = lastTargetTop - offset + window.innerHeight;
	const currentScrollHeight = document.documentElement.scrollHeight;
	const requiredCompensation = Math.ceil(
		requiredScrollHeight - currentScrollHeight,
	);
	if (requiredCompensation <= 0) return;

	const guard = document.getElementById("page-height-guard");
	if (!guard) return;

	const currentGuardHeight = Number.parseFloat(guard.style.height || "0");
	guard.dataset.state = "active";
	guard.style.height = `${Math.max(currentGuardHeight, requiredCompensation)}px`;
}

export function refreshRuntimeHeadings(root?: Element): void {
	window.dispatchEvent(
		new CustomEvent<PostTocRefreshDetail>(POST_TOC_REFRESH_EVENT, {
			detail: { root },
		}),
	);
}

export const dispatchPostTocRefresh: typeof refreshRuntimeHeadings =
	refreshRuntimeHeadings;

export function onPostTocRefresh(
	callback: (detail: PostTocRefreshDetail) => void,
): PostTocRefreshUnsubscribe {
	const listener = (event: Event): void => {
		callback((event as CustomEvent<PostTocRefreshDetail>).detail ?? {});
	};
	window.addEventListener(POST_TOC_REFRESH_EVENT, listener);
	return () => window.removeEventListener(POST_TOC_REFRESH_EVENT, listener);
}
