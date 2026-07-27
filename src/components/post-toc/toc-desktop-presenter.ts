import { getTocAncestorIndexes, type TocGraph } from "./toc-graph";
import type { DesktopTocViewportState } from "./toc-desktop-state";

const VISIBLE_CLASS = "visible";
const VISIBILITY_PADDING = 12;
const TRANSITION_FINALIZE_DELAY = 260;

export interface DesktopTocPresenterOptions {
	host: HTMLElement;
	scrollRoot: HTMLElement;
	indicator: HTMLElement | null;
	entries: HTMLAnchorElement[];
	graph: TocGraph;
}

function getEntryHeight(entry: HTMLElement) {
	return Math.max(entry.offsetHeight, entry.scrollHeight, 36);
}

export class DesktopTocPresenter {
	private host: HTMLElement;
	private scrollRoot: HTMLElement;
	private indicator: HTMLElement | null;
	private entries: HTMLAnchorElement[];
	private graph: TocGraph;
	private indicatorRaf = 0;
	private scrollRaf = 0;
	private finalizeTimer = 0;

	constructor(options: DesktopTocPresenterOptions) {
		this.host = options.host;
		this.scrollRoot = options.scrollRoot;
		this.indicator = options.indicator;
		this.entries = options.entries;
		this.graph = options.graph;
	}

	updateOptions(options: DesktopTocPresenterOptions) {
		this.dispose();
		this.host = options.host;
		this.scrollRoot = options.scrollRoot;
		this.indicator = options.indicator;
		this.entries = options.entries;
		this.graph = options.graph;
	}

	apply(state: DesktopTocViewportState) {
		this.host.dataset.tocViewportKey = [
			state.activeIndex,
			state.activeRootIndex,
			state.transitionType,
			...state.visibleIndexes,
		].join(":");
		this.host.dataset.tocTransition = state.transitionType;
		this.host.dataset.tocPhase = state.phase;
		this.host.classList.remove("toc-compact");

		for (let index = 0; index < this.entries.length; index++) {
			const entry = this.entries[index];
			const isActive = index === state.activeIndex;
			const isVisible = state.visibleIndexes.has(index);

			entry.classList.toggle(VISIBLE_CLASS, isActive);
			entry.classList.toggle(
				"is-current-branch",
				state.branchIndexes.has(index),
			);
			entry.classList.toggle("is-read", state.readIndexes.has(index));
			entry.classList.toggle("is-collapsed", !isVisible);
			entry.toggleAttribute("aria-current", isActive);
			entry.dataset.tocVisibility = isVisible ? "visible" : "hidden";
		}

		if (state.boundary) {
			this.hideIndicator();
			this.scrollRoot.scrollTo({ top: 0, left: 0, behavior: "auto" });
			return;
		}

		this.scheduleIndicator(state);
		this.scheduleScrollCorrection(state);
	}

	hideIndicator() {
		this.indicator?.setAttribute("style", "opacity: 0");
	}

	dispose() {
		if (this.indicatorRaf) cancelAnimationFrame(this.indicatorRaf);
		if (this.scrollRaf) cancelAnimationFrame(this.scrollRaf);
		if (this.finalizeTimer) window.clearTimeout(this.finalizeTimer);
		this.indicatorRaf = 0;
		this.scrollRaf = 0;
		this.finalizeTimer = 0;
	}

	private scheduleIndicator(state: DesktopTocViewportState) {
		if (this.indicatorRaf) cancelAnimationFrame(this.indicatorRaf);
		this.indicatorRaf = requestAnimationFrame(() => {
			this.indicatorRaf = 0;
			this.moveIndicator(state.activeIndex);
		});
	}

	private scheduleScrollCorrection(state: DesktopTocViewportState) {
		if (this.scrollRaf) cancelAnimationFrame(this.scrollRaf);
		if (this.finalizeTimer) window.clearTimeout(this.finalizeTimer);

		this.scrollRaf = requestAnimationFrame(() => {
			this.scrollRaf = 0;
			this.ensureActiveRangeVisible(state);
		});

		this.finalizeTimer = window.setTimeout(() => {
			this.finalizeTimer = 0;
			this.moveIndicator(state.activeIndex);
			this.ensureActiveRangeVisible(state);
		}, TRANSITION_FINALIZE_DELAY);
	}

	private moveIndicator(activeIndex: number) {
		if (!this.indicator) return;
		const activeEntry = this.entries[activeIndex];
		if (!activeEntry || activeEntry.classList.contains("is-collapsed")) {
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

	private ensureActiveRangeVisible(state: DesktopTocViewportState) {
		const activeEntry = this.entries[state.activeIndex];
		if (!activeEntry || activeEntry.classList.contains("is-collapsed"))
			return;

		const requiredIndexes = new Set([
			...getTocAncestorIndexes(this.graph, state.activeIndex),
			state.activeIndex,
		]);
		const requiredEntries = [...requiredIndexes]
			.map((index) => this.entries[index])
			.filter(
				(entry): entry is HTMLAnchorElement =>
					Boolean(entry) && !entry.classList.contains("is-collapsed"),
			);

		if (!requiredEntries.length) return;

		const currentScroll = this.scrollRoot.scrollTop;
		const viewportHeight = this.scrollRoot.clientHeight;
		const safeTop = currentScroll + VISIBILITY_PADDING;
		const safeBottom = currentScroll + viewportHeight - VISIBILITY_PADDING;
		const rangeTop = Math.min(
			...requiredEntries.map((entry) => entry.offsetTop),
		);
		const rangeBottom = Math.max(
			...requiredEntries.map(
				(entry) => entry.offsetTop + getEntryHeight(entry),
			),
		);

		let nextTop = currentScroll;
		if (rangeBottom - rangeTop <= viewportHeight - VISIBILITY_PADDING * 2) {
			if (rangeTop < safeTop) {
				nextTop = rangeTop - VISIBILITY_PADDING;
			} else if (rangeBottom > safeBottom) {
				nextTop = rangeBottom - viewportHeight + VISIBILITY_PADDING;
			}
		} else {
			const activeTop = activeEntry.offsetTop;
			const activeBottom = activeTop + getEntryHeight(activeEntry);
			if (activeTop < safeTop) {
				nextTop = activeTop - VISIBILITY_PADDING;
			} else if (activeBottom > safeBottom) {
				nextTop = activeBottom - viewportHeight + VISIBILITY_PADDING;
			}
		}

		if (Math.abs(nextTop - currentScroll) < 1) return;
		this.scrollRoot.scrollTo({
			top: Math.max(0, nextTop),
			left: 0,
			behavior: "auto",
		});
	}
}
