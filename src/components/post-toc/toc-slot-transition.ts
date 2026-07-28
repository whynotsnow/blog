export const TOC_SLOT_TRANSITION_MS = 260;

type SlotCleanup = {
	slot: HTMLElement;
	timer: number;
	listener: (event: TransitionEvent) => void;
};

export class TocSlotTransitionController {
	private slotCleanups = new WeakMap<HTMLElement, SlotCleanup>();
	private activeCleanups = new Set<SlotCleanup>();

	dispose() {
		for (const cleanup of this.activeCleanups) {
			window.clearTimeout(cleanup.timer);
			cleanup.slot.removeEventListener("transitionend", cleanup.listener);
		}
		this.slotCleanups = new WeakMap();
		this.activeCleanups.clear();
	}

	expand(slot: HTMLElement, nextHTML: string, onSettled?: () => void) {
		this.clearTimer(slot);
		const previousHeight = slot.childElementCount ? slot.scrollHeight : 0;
		slot.style.height = `${previousHeight}px`;
		slot.style.opacity = previousHeight > 0 ? "1" : "0";
		slot.style.transform =
			previousHeight > 0 ? "translateY(0)" : "translateY(-4px)";
		slot.innerHTML = nextHTML;
		slot.dataset.expanded = "true";

		const nextHeight = slot.scrollHeight;
		void slot.offsetHeight;
		slot.style.height = `${nextHeight}px`;
		slot.style.opacity = "1";
		slot.style.transform = "translateY(0)";

		this.setCleanupTimer(slot, () => {
			slot.style.height = "auto";
			slot.style.removeProperty("opacity");
			slot.style.removeProperty("transform");
			onSettled?.();
		});
	}

	collapse(slot: HTMLElement, onSettled?: () => void) {
		this.clearTimer(slot);
		if (!slot.childElementCount) {
			slot.dataset.expanded = "false";
			slot.style.removeProperty("height");
			slot.style.removeProperty("opacity");
			slot.style.removeProperty("transform");
			onSettled?.();
			return;
		}

		slot.dataset.expanded = "false";
		slot.style.height = `${slot.scrollHeight}px`;
		slot.style.opacity = "1";
		slot.style.transform = "translateY(0)";
		void slot.offsetHeight;
		slot.style.height = "0px";
		slot.style.opacity = "0";
		slot.style.transform = "translateY(-4px)";

		this.setCleanupTimer(slot, () => {
			slot.replaceChildren();
			slot.style.removeProperty("height");
			slot.style.removeProperty("opacity");
			slot.style.removeProperty("transform");
			onSettled?.();
		});
	}

	private clearTimer(slot: HTMLElement) {
		const active = this.slotCleanups.get(slot);
		if (!active) return;
		window.clearTimeout(active.timer);
		slot.removeEventListener("transitionend", active.listener);
		this.slotCleanups.delete(slot);
		this.activeCleanups.delete(active);
	}

	private setCleanupTimer(slot: HTMLElement, cleanup: () => void) {
		const finish = () => {
			cleanup();
			this.clearTimer(slot);
		};
		const listener = (event: TransitionEvent) => {
			if (event.target !== slot || event.propertyName !== "height")
				return;
			finish();
		};
		const active: SlotCleanup = {
			slot,
			timer: window.setTimeout(finish, TOC_SLOT_TRANSITION_MS + 60),
			listener,
		};
		slot.addEventListener("transitionend", listener);
		this.slotCleanups.set(slot, active);
		this.activeCleanups.add(active);
	}
}
