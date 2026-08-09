import {
	TocActiveTracker,
	ensureTocTargetsScrollable,
	getHeadingElementsForItems,
	getPostContentRoot,
	onPostTocRefresh,
	resolveTocRuntimeState,
	resolveTocScrollOffset,
	type TocGraph,
	type TocItem,
	type TocScrollDirection,
} from "./toc-runtime";

export type TocStoreReason =
	| "init"
	| "scroll"
	| "scroll-settle"
	| "layout-remeasure"
	| "runtime-refresh"
	| "page-view";

export interface TocStoreSnapshot {
	root: Element | null;
	items: TocItem[];
	headings: Array<HTMLElement | undefined>;
	tracker: TocActiveTracker;
	graph: TocGraph;
	activeIndex: number;
	scrollDirection: TocScrollDirection;
	version: number;
}

type TocStoreSubscriber = (
	snapshot: TocStoreSnapshot,
	reason: TocStoreReason,
) => void;

type TocStoreUnsubscribe = () => boolean;

export class PostTocStore {
	private root: Element | null = null;
	private items: TocItem[] = [];
	private headings: Array<HTMLElement | undefined> = [];
	private tracker = new TocActiveTracker({
		offset: resolveTocScrollOffset(),
	});
	private activeIndex = -1;
	private version = 0;
	private subscribers = new Set<TocStoreSubscriber>();
	private initialized = false;
	private scrollRaf = 0;
	private scrollSettleTimer = 0;
	private resizeRaf = 0;
	private removeRefreshListener: (() => void) | null = null;

	init(): void {
		if (this.initialized) return;
		this.initialized = true;
		window.addEventListener("scroll", this.handleScroll, {
			passive: true,
		});
		window.addEventListener("resize", this.handleResize, {
			passive: true,
		});
		this.removeRefreshListener = onPostTocRefresh(({ root }) => {
			this.refresh(root, "runtime-refresh");
		});
	}

	subscribe(subscriber: TocStoreSubscriber): TocStoreUnsubscribe {
		this.init();
		this.subscribers.add(subscriber);
		subscriber(this.getSnapshot(), "init");
		return () => this.subscribers.delete(subscriber);
	}

	getSnapshot(): TocStoreSnapshot {
		return {
			root: this.root,
			items: this.items,
			headings: this.headings,
			tracker: this.tracker,
			graph: this.tracker.graph,
			activeIndex: this.activeIndex,
			scrollDirection: this.tracker.scrollDirection,
			version: this.version,
		};
	}

	setItems(
		items: TocItem[],
		root: Element | null = getPostContentRoot(),
		reason: TocStoreReason = "init",
	): TocStoreSnapshot {
		this.root = root;
		this.items = items;
		this.headings = getHeadingElementsForItems(root, items);
		this.tracker.setState(items, this.headings, {
			contentRangeEnd: this.getContentRangeEnd(),
		});
		const offset = resolveTocScrollOffset();
		ensureTocTargetsScrollable(this.headings, offset);
		this.activeIndex = this.tracker.update(window.scrollY, offset);
		this.version += 1;
		this.emit(reason);
		return this.getSnapshot();
	}

	refresh(
		root?: Element,
		reason: TocStoreReason = "runtime-refresh",
	): TocStoreSnapshot {
		const state = resolveTocRuntimeState(root);
		this.root = state.root;
		this.items = state.items;
		this.headings = state.headings;
		this.tracker.setState(this.items, this.headings, {
			contentRangeEnd: this.getContentRangeEnd(),
		});
		const offset = resolveTocScrollOffset();
		ensureTocTargetsScrollable(this.headings, offset);
		this.activeIndex = this.tracker.update(window.scrollY, offset);
		this.version += 1;
		this.emit(reason);
		return this.getSnapshot();
	}

	clear(reason: TocStoreReason = "runtime-refresh"): TocStoreSnapshot {
		this.root = null;
		this.items = [];
		this.headings = [];
		this.tracker.setState([], []);
		this.activeIndex = -1;
		this.version += 1;
		this.emit(reason);
		return this.getSnapshot();
	}

	measure(reason: TocStoreReason = "layout-remeasure"): TocStoreSnapshot {
		this.tracker.measure({
			contentRangeEnd: this.getContentRangeEnd(),
		});
		const offset = resolveTocScrollOffset();
		ensureTocTargetsScrollable(this.headings, offset);
		this.activeIndex = this.tracker.update(window.scrollY, offset);
		this.emit(reason);
		return this.getSnapshot();
	}

	update(reason: TocStoreReason = "scroll"): TocStoreSnapshot {
		this.activeIndex = this.tracker.update(
			window.scrollY,
			resolveTocScrollOffset(),
		);
		this.emit(reason);
		return this.getSnapshot();
	}

	dispose(): void {
		window.removeEventListener("scroll", this.handleScroll);
		window.removeEventListener("resize", this.handleResize);
		if (this.scrollRaf) cancelAnimationFrame(this.scrollRaf);
		if (this.resizeRaf) cancelAnimationFrame(this.resizeRaf);
		if (this.scrollSettleTimer) window.clearTimeout(this.scrollSettleTimer);
		this.removeRefreshListener?.();
		this.removeRefreshListener = null;
		this.initialized = false;
		this.subscribers.clear();
	}

	private handleScroll = (): void => {
		if (this.scrollSettleTimer) {
			window.clearTimeout(this.scrollSettleTimer);
		}
		this.scrollSettleTimer = window.setTimeout(() => {
			this.scrollSettleTimer = 0;
			this.measure("scroll-settle");
		}, 160);
		if (this.scrollRaf) return;
		this.scrollRaf = requestAnimationFrame(() => {
			this.scrollRaf = 0;
			this.update("scroll");
		});
	};

	private handleResize = (): void => {
		if (this.resizeRaf) return;
		this.resizeRaf = requestAnimationFrame(() => {
			this.resizeRaf = 0;
			this.measure("layout-remeasure");
		});
	};

	private emit(reason: TocStoreReason): void {
		const snapshot = this.getSnapshot();
		for (const subscriber of this.subscribers) {
			subscriber(snapshot, reason);
		}
	}

	private getContentRangeEnd(): number {
		if (!this.root) return Number.POSITIVE_INFINITY;
		return this.root.getBoundingClientRect().bottom + window.scrollY;
	}
}

const store = new PostTocStore();

export function getPostTocStore(): PostTocStore {
	return store;
}
