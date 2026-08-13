import {
	getTocAncestorIndexes,
	getTocBranchIndexes,
	getTocNode,
	type TocGraph,
} from "./toc-graph";
import { renderDesktopTocItem } from "./toc-render";
import type { DesktopTocViewState } from "./toc-desktop-state";
import {
	TOC_SLOT_TRANSITION_MS,
	TocSlotTransitionController,
} from "./toc-slot-transition";
import {
	resolveTocTransitionPlan,
	type TocTransitionPlan,
} from "./toc-transition-plan";

const VISIBLE_CLASS = "visible";
const TRANSITION_FINALIZE_DELAY = TOC_SLOT_TRANSITION_MS + 80;
const HIGHLIGHT_EXIT_FALLBACK_DELAY = 180;
const VISIBILITY_PADDING = 12;
const INDICATOR_GEOMETRY_EPSILON = 0.5;
const CONTEXT_ENTRY_GAP = 4;

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
	private highlightExitTimer = 0;
	private highlightExitListener: ((event: TransitionEvent) => void) | null =
		null;
	private renderedRootIndex = -1;
	private slotTransitions = new TocSlotTransitionController();
	private previousState: DesktopTocViewState | null = null;
	private planSequence = 0;
	private pendingSettledRootIndex: number | null = null;
	private pendingSettledPlan: TocTransitionPlan | null = null;
	private lastCommittedHighlight: {
		index: number;
		top: number;
		height: number;
	} | null = null;

	constructor(options: DesktopTocPresenterOptions) {
		this.host = options.host;
		this.scrollRoot = options.scrollRoot;
		this.indicator = options.indicator;
		this.graph = options.graph;
	}

	apply(state: DesktopTocViewState): void {
		const planId = ++this.planSequence;
		const plan = this.resolveEffectivePlan(
			resolveTocTransitionPlan(this.previousState, state),
			state,
		);
		this.previousState = state;
		// Presenter 只负责把状态渲染到 DOM；active 计算和视口状态机由上游模块维护。
		this.host.dataset.tocViewportKey = [
			state.mode,
			state.activeIndex,
			state.activeRootIndex,
			state.expandedRootIndex,
			state.transitionType,
			state.rootsOnlyReason ?? "none",
			state.scrollAnchor,
		].join(":");
		this.host.dataset.tocTransition = state.transitionType;
		this.host.dataset.tocMode = state.mode;
		this.host.dataset.tocRootsOnlyReason = state.rootsOnlyReason ?? "none";
		this.host.dataset.tocScrollAnchor = state.scrollAnchor;
		this.host.dataset.tocHighlightMode = plan.highlightMode;
		this.host.dataset.tocSlotAction = plan.slotAction;
		this.host.classList.toggle(
			"toc-roots-only",
			state.mode === "roots-only",
		);

		if (this.shouldSequenceRootsOnlyCollapse(plan)) {
			this.cancelIndicatorMotion();
			this.pendingSettledPlan = null;
			this.applyEntryState(state);
			this.hideIndicator();
			// roots-only 收起时先等高亮淡出，再折叠子项，避免 TOC indicator 滑向即将消失的节点。
			this.afterHighlightExit(planId, () => {
				this.renderExpandedRegion(state.expandedRootIndex);
				this.scrollRoot.scrollTo({
					top: 0,
					left: 0,
					behavior: "auto",
				});
			});
			return;
		}

		if (plan.deferIndicatorUntilSlotSettled) {
			this.cancelIndicatorMotion();
			this.pendingSettledPlan = plan;
			// 展开槽高度还在过渡时先隐藏 indicator，等 slot settled 后再按最终几何定位。
			this.hideIndicator({ immediate: true });
		} else {
			this.pendingSettledPlan = null;
		}

		this.renderExpandedRegion(state.expandedRootIndex, () => {
			if (this.pendingSettledRootIndex === state.expandedRootIndex) {
				this.pendingSettledRootIndex = null;
			}
			this.applyPendingSettledHighlight();
		});
		if (
			plan.deferIndicatorUntilSlotSettled &&
			plan.slotAction === "none" &&
			this.pendingSettledRootIndex !== state.expandedRootIndex
		) {
			requestAnimationFrame(() => {
				if (planId !== this.planSequence) return;
				this.applyPendingSettledHighlight();
			});
		}
		this.applyEntryState(state);
		if (this.shouldAnchorScrollBottom(state, plan)) {
			this.anchorScrollBottom();
		}

		if (state.highlightIndex < 0) {
			this.hideIndicator();
			if (state.mode === "roots-only" || state.scrollAnchor === "top") {
				this.scrollRoot.scrollTo({
					top: 0,
					left: 0,
					behavior: "auto",
				});
			}
			return;
		}

		if (plan.deferIndicatorUntilSlotSettled) {
			this.scheduleScrollCorrection(state.highlightIndex, {
				moveIndicator: false,
				planId,
			});
			return;
		}
		if (
			plan.highlightMode === "fade-in" ||
			plan.highlightMode === "fade-in-place"
		) {
			this.cancelIndicatorMotion();
			this.rebindIndicatorInPlace(state.highlightIndex, planId);
			this.scheduleScrollCorrection(state.highlightIndex, {
				moveIndicator: false,
				planId,
			});
			return;
		}
		this.scheduleIndicator(state.highlightIndex, planId);
		this.scheduleScrollCorrection(state.highlightIndex, { planId });
	}

	dispose(): void {
		if (this.indicatorRaf) cancelAnimationFrame(this.indicatorRaf);
		if (this.scrollRaf) cancelAnimationFrame(this.scrollRaf);
		if (this.finalizeTimer) window.clearTimeout(this.finalizeTimer);
		if (this.highlightExitTimer)
			window.clearTimeout(this.highlightExitTimer);
		if (this.highlightExitListener) {
			this.indicator?.removeEventListener(
				"transitionend",
				this.highlightExitListener,
			);
		}
		this.indicatorRaf = 0;
		this.scrollRaf = 0;
		this.finalizeTimer = 0;
		this.highlightExitTimer = 0;
		this.highlightExitListener = null;
		this.slotTransitions.dispose();
		this.previousState = null;
		this.pendingSettledRootIndex = null;
		this.pendingSettledPlan = null;
		this.lastCommittedHighlight = null;
	}

	private renderExpandedRegion(
		rootIndex: number,
		onSettled?: () => void,
	): void {
		if (this.renderedRootIndex === rootIndex) {
			return;
		}

		// 一个根分支可能同时有旧 slot 收起和新 slot 展开；全部 settled 后才能恢复高亮定位。
		let pendingTransitions = 1;
		const waitForTransition = (): (() => void) => {
			pendingTransitions += 1;
			let settled = false;
			return () => {
				if (settled) return;
				settled = true;
				pendingTransitions -= 1;
				if (pendingTransitions === 0) onSettled?.();
			};
		};

		for (const slot of this.host.querySelectorAll<HTMLElement>(
			".toc-expanded-region",
		)) {
			if (Number(slot.dataset.rootIndex) !== rootIndex) {
				this.slotTransitions.collapse(slot, waitForTransition());
			}
		}

		this.renderedRootIndex = rootIndex;
		this.pendingSettledRootIndex = rootIndex;
		if (rootIndex < 0) {
			pendingTransitions -= 1;
			if (pendingTransitions === 0) onSettled?.();
			return;
		}

		const slot = this.host.querySelector<HTMLElement>(
			`.toc-expanded-region[data-root-index="${rootIndex}"]`,
		);
		if (!slot) {
			pendingTransitions -= 1;
			if (pendingTransitions === 0) onSettled?.();
			return;
		}

		const childItems = getTocBranchIndexes(this.graph, rootIndex)
			.filter((index) => index !== rootIndex)
			.map((index) => ({
				item: this.graph.items[index],
				index,
			}));
		if (!childItems.length) {
			pendingTransitions -= 1;
			if (pendingTransitions === 0) onSettled?.();
			return;
		}

		const nextHTML = childItems
			.map(({ item, index }) => renderDesktopTocItem(item, index))
			.join("");
		this.slotTransitions.expand(slot, nextHTML, waitForTransition());
		pendingTransitions -= 1;
		if (pendingTransitions === 0) onSettled?.();
	}

	private shouldSequenceRootsOnlyCollapse(plan: TocTransitionPlan): boolean {
		return (
			plan.state.mode === "roots-only" &&
			plan.state.rootsOnlyReason !== "empty" &&
			plan.slotAction === "collapse"
		);
	}

	private resolveEffectivePlan(
		plan: TocTransitionPlan,
		state: DesktopTocViewState,
	): TocTransitionPlan {
		if (
			this.pendingSettledRootIndex !== state.expandedRootIndex ||
			!this.pendingSettledPlan ||
			!this.pendingSettledPlan.deferIndicatorUntilSlotSettled ||
			state.highlightIndex < 0
		) {
			return plan;
		}

		return {
			...plan,
			state,
			highlightMode: this.pendingSettledPlan.highlightMode,
			deferHighlightUntilSlotSettled: false,
			deferIndicatorUntilSlotSettled: true,
		};
	}

	private applyEntryState(
		state: DesktopTocViewState,
		options: { suppressActive?: boolean } = {},
	): void {
		for (const entry of this.host.querySelectorAll<HTMLAnchorElement>(
			"a[data-toc-index]",
		)) {
			const index = Number(entry.dataset.tocIndex ?? -1);
			const node = getTocNode(this.graph, index);
			const isActive =
				!options.suppressActive && index === state.highlightIndex;
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

	private hideIndicator(options: { immediate?: boolean } = {}): void {
		if (this.indicator) {
			if (options.immediate) {
				this.indicator.setAttribute(
					"style",
					"opacity: 0; transition: none;",
				);
			} else {
				this.indicator.style.opacity = "0";
			}
		}
		this.lastCommittedHighlight = null;
	}

	private afterHighlightExit(planId: number, callback: () => void): void {
		if (!this.indicator) {
			callback();
			return;
		}
		if (this.highlightExitTimer)
			window.clearTimeout(this.highlightExitTimer);
		if (this.highlightExitListener) {
			this.indicator.removeEventListener(
				"transitionend",
				this.highlightExitListener,
			);
			this.highlightExitListener = null;
		}

		let settled = false;
		const finish = (): void => {
			if (settled) return;
			settled = true;
			this.highlightExitTimer = 0;
			if (this.highlightExitListener) {
				this.indicator?.removeEventListener(
					"transitionend",
					this.highlightExitListener,
				);
				this.highlightExitListener = null;
			}
			if (planId !== this.planSequence) return;
			callback();
		};
		const listener = (event: TransitionEvent): void => {
			if (
				event.target !== this.indicator ||
				event.propertyName !== "opacity"
			) {
				return;
			}
			finish();
		};

		this.highlightExitListener = listener;
		this.indicator.addEventListener("transitionend", listener);
		this.highlightExitTimer = window.setTimeout(
			finish,
			HIGHLIGHT_EXIT_FALLBACK_DELAY,
		);
	}

	private cancelIndicatorMotion(): void {
		if (this.indicatorRaf) cancelAnimationFrame(this.indicatorRaf);
		if (this.scrollRaf) cancelAnimationFrame(this.scrollRaf);
		if (this.finalizeTimer) window.clearTimeout(this.finalizeTimer);
		this.indicatorRaf = 0;
		this.scrollRaf = 0;
		this.finalizeTimer = 0;
	}

	private anchorScrollBottom(): void {
		const maxScrollTop =
			this.scrollRoot.scrollHeight - this.scrollRoot.clientHeight;
		if (maxScrollTop <= 0) return;
		this.scrollRoot.scrollTo({
			top: maxScrollTop,
			left: 0,
			behavior: "auto",
		});
	}

	private shouldAnchorScrollBottom(
		state: DesktopTocViewState,
		plan: TocTransitionPlan,
	): boolean {
		return (
			state.highlightIndex >= 0 &&
			state.scrollAnchor === "bottom" &&
			plan.highlightMode !== "fade-in-place"
		);
	}

	private scheduleIndicator(
		activeIndex: number,
		planId = this.planSequence,
	): void {
		if (this.indicatorRaf) cancelAnimationFrame(this.indicatorRaf);
		this.indicatorRaf = requestAnimationFrame(() => {
			this.indicatorRaf = 0;
			if (planId !== this.planSequence) return;
			this.moveIndicator(activeIndex);
		});
	}

	private rebindIndicatorInPlace(activeIndex: number, planId: number): void {
		this.placeIndicatorWithoutMotion(activeIndex);
		requestAnimationFrame(() => {
			if (planId !== this.planSequence) return;
			this.moveIndicator(activeIndex);
		});
	}

	private scheduleScrollCorrection(
		activeIndex: number,
		options: { moveIndicator?: boolean; planId?: number } = {},
	): void {
		const shouldMoveIndicator = options.moveIndicator ?? true;
		const planId = options.planId ?? this.planSequence;
		if (this.scrollRaf) cancelAnimationFrame(this.scrollRaf);
		if (this.finalizeTimer) window.clearTimeout(this.finalizeTimer);

		// 先在下一帧修正可见区，再用 timer 兜底过渡后的最终高度。
		this.scrollRaf = requestAnimationFrame(() => {
			this.scrollRaf = 0;
			if (planId !== this.planSequence) return;
			this.ensureActiveContextVisible(activeIndex);
		});

		this.finalizeTimer = window.setTimeout(() => {
			this.finalizeTimer = 0;
			if (planId !== this.planSequence) return;
			if (shouldMoveIndicator) this.moveIndicator(activeIndex);
			this.ensureActiveContextVisible(activeIndex);
		}, TRANSITION_FINALIZE_DELAY);
	}

	private applySettledHighlight(plan: TocTransitionPlan): void {
		const { state } = plan;
		if (state.scrollAnchor === "bottom") {
			this.anchorScrollBottom();
		}
		if (state.highlightIndex < 0) return;
		this.applyEntryState(state);
		this.ensureActiveContextVisible(state.highlightIndex);
		if (this.isHighlightCommitted(state.highlightIndex)) {
			return;
		}
		if (plan.highlightMode === "fade-in") {
			this.placeIndicatorWithoutMotion(state.highlightIndex);
			requestAnimationFrame(() => {
				this.moveIndicator(state.highlightIndex);
			});
			return;
		}
		this.moveIndicator(state.highlightIndex);
	}

	private applyPendingSettledHighlight(): void {
		const plan = this.pendingSettledPlan;
		if (!plan) return;
		this.pendingSettledPlan = null;
		this.applySettledHighlight(plan);
	}

	private getEntry(index: number): HTMLAnchorElement | null {
		return this.host.querySelector<HTMLAnchorElement>(
			`a[data-toc-index="${index}"]`,
		);
	}

	private moveIndicator(activeIndex: number): void {
		if (!this.indicator) return;
		const geometry = this.resolveIndicatorGeometry(activeIndex);
		if (!geometry) {
			this.hideIndicator();
			return;
		}

		this.indicator.setAttribute(
			"style",
			`top: 0; bottom: auto; height: ${geometry.height}px; opacity: 1; transform: translateY(${geometry.top}px);`,
		);
		this.lastCommittedHighlight = {
			index: activeIndex,
			top: geometry.top,
			height: geometry.height,
		};
	}

	private placeIndicatorWithoutMotion(activeIndex: number): void {
		if (!this.indicator) return;
		const geometry = this.resolveIndicatorGeometry(activeIndex);
		if (!geometry) {
			this.hideIndicator();
			return;
		}

		this.indicator.setAttribute(
			"style",
			`top: 0; bottom: auto; height: ${geometry.height}px; opacity: 0; transform: translateY(${geometry.top}px); transition: none;`,
		);
	}

	private resolveIndicatorGeometry(
		activeIndex: number,
	): { top: number; height: number } | null {
		const activeEntry = this.getEntry(activeIndex);
		if (!activeEntry) return null;

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
		if (height <= 0) return null;
		return { top, height };
	}

	private isHighlightCommitted(activeIndex: number): boolean {
		const geometry = this.resolveIndicatorGeometry(activeIndex);
		if (!geometry || !this.lastCommittedHighlight) return false;
		return (
			this.lastCommittedHighlight.index === activeIndex &&
			Math.abs(this.lastCommittedHighlight.top - geometry.top) <=
				INDICATOR_GEOMETRY_EPSILON &&
			Math.abs(this.lastCommittedHighlight.height - geometry.height) <=
				INDICATOR_GEOMETRY_EPSILON
		);
	}

	private ensureActiveContextVisible(activeIndex: number): void {
		const currentScroll = this.scrollRoot.scrollTop;
		const viewportHeight = this.scrollRoot.clientHeight;
		const safeTop = currentScroll + VISIBILITY_PADDING;
		const safeBottom = currentScroll + viewportHeight - VISIBILITY_PADDING;
		const scrollRootRect = this.scrollRoot.getBoundingClientRect();
		const context = this.resolveVisibleContextRange(
			activeIndex,
			scrollRootRect,
			viewportHeight,
		);
		if (!context) return;

		let nextTop = currentScroll;
		if (context.top < safeTop) {
			nextTop = context.top - VISIBILITY_PADDING;
		} else if (context.bottom > safeBottom) {
			nextTop = context.bottom - viewportHeight + VISIBILITY_PADDING;
		}

		if (Math.abs(nextTop - currentScroll) < 1) return;
		this.scrollRoot.scrollTo({
			top: Math.max(0, nextTop),
			left: 0,
			behavior: "auto",
		});
	}

	private resolveVisibleContextRange(
		activeIndex: number,
		scrollRootRect: DOMRect,
		viewportHeight: number,
	): { top: number; bottom: number } | null {
		const activeEntry = this.getEntry(activeIndex);
		if (!activeEntry) return null;

		const activeRange = this.resolveEntryRange(activeEntry, scrollRootRect);
		if (!activeRange) return null;

		const ancestorEntries = getTocAncestorIndexes(this.graph, activeIndex)
			.map((index) => this.getEntry(index))
			.filter((entry): entry is HTMLAnchorElement => Boolean(entry));
		const candidateEntries = [...ancestorEntries, activeEntry];
		const maxRangeHeight = Math.max(
			activeRange.bottom - activeRange.top,
			viewportHeight - VISIBILITY_PADDING * 2,
		);

		// 优先保留当前标题和祖先上下文；如果整段放不下，再逐步缩小到 active entry。
		for (let start = 0; start < candidateEntries.length; start += 1) {
			const ranges = candidateEntries
				.slice(start)
				.map((entry) => this.resolveEntryRange(entry, scrollRootRect))
				.filter((range): range is { top: number; bottom: number } =>
					Boolean(range),
				);
			if (ranges.length === 0) continue;

			const top = Math.min(...ranges.map((range) => range.top));
			const bottom = Math.max(...ranges.map((range) => range.bottom));
			if (bottom - top <= maxRangeHeight) {
				return { top, bottom };
			}
		}

		return activeRange;
	}

	private resolveEntryRange(
		entry: HTMLElement,
		scrollRootRect: DOMRect,
	): { top: number; bottom: number } | null {
		const rect = entry.getBoundingClientRect();
		const top = this.scrollRoot.scrollTop + rect.top - scrollRootRect.top;
		const height = Math.max(rect.height, entry.scrollHeight);
		if (height <= 0) return null;
		return {
			top: top - CONTEXT_ENTRY_GAP,
			bottom: top + height + CONTEXT_ENTRY_GAP,
		};
	}
}
