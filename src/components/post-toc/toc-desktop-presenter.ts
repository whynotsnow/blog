import { getTocBranchIndexes, getTocNode, type TocGraph } from "./toc-graph";
import { renderDesktopTocItem } from "./toc-render";
import type { DesktopTocViewState } from "./toc-desktop-state";
import {
	TOC_SLOT_TRANSITION_MS,
	TocSlotTransitionController,
} from "./toc-slot-transition";

const VISIBLE_CLASS = "visible";
const TRANSITION_FINALIZE_DELAY = TOC_SLOT_TRANSITION_MS + 80;
const VISIBILITY_PADDING = 12;

export interface DesktopTocPresenterOptions {
	host: HTMLElement;
	scrollRoot: HTMLElement;
	indicator: HTMLElement | null;
	graph: TocGraph;
}

export class DesktopTocPresenter {
	private host: HTMLElement;
	private scrollRoot: HTMLElement;
	private indicator: HTMLElement | null;
	private graph: TocGraph;
	private indicatorRaf = 0;
	private scrollRaf = 0;
	private finalizeTimer = 0;
	private renderedRootIndex = -1;
	private slotTransitions = new TocSlotTransitionController();

	constructor(options: DesktopTocPresenterOptions) {
		this.host = options.host;
		this.scrollRoot = options.scrollRoot;
		this.indicator = options.indicator;
		this.graph = options.graph;
	}

	apply(state: DesktopTocViewState) {
		this.host.dataset.tocViewportKey = [
			state.mode,
			state.activeIndex,
			state.activeRootIndex,
			state.expandedRootIndex,
			state.transitionType,
		].join(":");
		this.host.dataset.tocTransition = state.transitionType;
		this.host.dataset.tocMode = state.mode;
		this.host.classList.toggle(
			"toc-roots-only",
			state.mode === "roots-only",
		);

		this.renderExpandedRegion(state.expandedRootIndex, () => {
			if (state.highlightIndex < 0) return;
			this.moveIndicator(state.highlightIndex);
			this.ensureActiveVisible(state.highlightIndex);
		});
		this.applyEntryState(state);

		if (state.highlightIndex < 0) {
			this.hideIndicator();
			this.scrollRoot.scrollTo({ top: 0, left: 0, behavior: "auto" });
			return;
		}

		this.scheduleIndicator(state.highlightIndex);
		this.scheduleScrollCorrection(state.highlightIndex);
	}

	dispose() {
		if (this.indicatorRaf) cancelAnimationFrame(this.indicatorRaf);
		if (this.scrollRaf) cancelAnimationFrame(this.scrollRaf);
		if (this.finalizeTimer) window.clearTimeout(this.finalizeTimer);
		this.indicatorRaf = 0;
		this.scrollRaf = 0;
		this.finalizeTimer = 0;
		this.slotTransitions.dispose();
	}

	private renderExpandedRegion(rootIndex: number, onSettled?: () => void) {
		if (this.renderedRootIndex === rootIndex) {
			return;
		}

		for (const slot of this.host.querySelectorAll<HTMLElement>(
			".toc-expanded-region",
		)) {
			if (Number(slot.dataset.rootIndex) !== rootIndex) {
				this.slotTransitions.collapse(slot);
			}
		}

		this.renderedRootIndex = rootIndex;
		if (rootIndex < 0) return;

		const slot = this.host.querySelector<HTMLElement>(
			`.toc-expanded-region[data-root-index="${rootIndex}"]`,
		);
		if (!slot) return;

		const childItems = getTocBranchIndexes(this.graph, rootIndex)
			.filter((index) => index !== rootIndex)
			.map((index) => ({
				item: this.graph.items[index],
				index,
			}));
		if (!childItems.length) return;

		const nextHTML = childItems
			.map(({ item, index }) => renderDesktopTocItem(item, index))
			.join("");
		this.slotTransitions.expand(slot, nextHTML, onSettled);
	}

	private applyEntryState(state: DesktopTocViewState) {
		for (const entry of this.host.querySelectorAll<HTMLAnchorElement>(
			"a[data-toc-index]",
		)) {
			const index = Number(entry.dataset.tocIndex ?? -1);
			const node = getTocNode(this.graph, index);
			const isActive = index === state.highlightIndex;
			const isActiveRoot =
				node?.level === 0 && index === state.activeRootIndex;
			const isCurrentBranch =
				state.mode === "normal" &&
				node?.rootIndex === state.activeRootIndex;

			entry.classList.toggle(VISIBLE_CLASS, isActive);
			entry.classList.toggle(
				"is-current-branch",
				isCurrentBranch || isActiveRoot,
			);
			entry.classList.remove("is-read", "is-collapsed");
			entry.toggleAttribute("aria-current", isActive);
			entry.dataset.tocVisibility = "visible";
		}
	}

	private hideIndicator() {
		this.indicator?.setAttribute("style", "opacity: 0");
	}

	private scheduleIndicator(activeIndex: number) {
		if (this.indicatorRaf) cancelAnimationFrame(this.indicatorRaf);
		this.indicatorRaf = requestAnimationFrame(() => {
			this.indicatorRaf = 0;
			this.moveIndicator(activeIndex);
		});
	}

	private scheduleScrollCorrection(activeIndex: number) {
		if (this.scrollRaf) cancelAnimationFrame(this.scrollRaf);
		if (this.finalizeTimer) window.clearTimeout(this.finalizeTimer);

		this.scrollRaf = requestAnimationFrame(() => {
			this.scrollRaf = 0;
			this.ensureActiveVisible(activeIndex);
		});

		this.finalizeTimer = window.setTimeout(() => {
			this.finalizeTimer = 0;
			this.moveIndicator(activeIndex);
			this.ensureActiveVisible(activeIndex);
		}, TRANSITION_FINALIZE_DELAY);
	}

	private getEntry(index: number) {
		return this.host.querySelector<HTMLAnchorElement>(
			`a[data-toc-index="${index}"]`,
		);
	}

	private moveIndicator(activeIndex: number) {
		if (!this.indicator) return;
		const activeEntry = this.getEntry(activeIndex);
		if (!activeEntry) {
			this.hideIndicator();
			return;
		}

		const parentOffset = this.scrollRoot.getBoundingClientRect().top;
		const scrollOffset = this.scrollRoot.scrollTop;
		const activeEntryRect = activeEntry.getBoundingClientRect();
		const top = Math.max(
			0,
			activeEntryRect.top - parentOffset + scrollOffset,
		);
		const height = Math.max(
			activeEntryRect.height,
			activeEntry.scrollHeight,
		);
		if (height <= 0) {
			this.hideIndicator();
			return;
		}

		this.indicator.setAttribute(
			"style",
			`top: 0; bottom: auto; height: ${height}px; opacity: 1; transform: translateY(${top}px);`,
		);
	}

	private ensureActiveVisible(activeIndex: number) {
		const activeEntry = this.getEntry(activeIndex);
		if (!activeEntry) return;

		const currentScroll = this.scrollRoot.scrollTop;
		const viewportHeight = this.scrollRoot.clientHeight;
		const safeTop = currentScroll + VISIBILITY_PADDING;
		const safeBottom = currentScroll + viewportHeight - VISIBILITY_PADDING;
		const scrollRootRect = this.scrollRoot.getBoundingClientRect();
		const activeRect = activeEntry.getBoundingClientRect();
		const activeTop = currentScroll + activeRect.top - scrollRootRect.top;
		const activeBottom =
			currentScroll + activeRect.bottom - scrollRootRect.top;

		let nextTop = currentScroll;
		if (activeTop < safeTop) {
			nextTop = activeTop - VISIBILITY_PADDING;
		} else if (activeBottom > safeBottom) {
			nextTop = activeBottom - viewportHeight + VISIBILITY_PADDING;
		}

		if (Math.abs(nextTop - currentScroll) < 1) return;
		this.scrollRoot.scrollTo({
			top: Math.max(0, nextTop),
			left: 0,
			behavior: "auto",
		});
	}
}
