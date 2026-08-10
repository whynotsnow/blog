function bindFilterContainer(container: HTMLElement, reset: boolean): void {
	if (!reset && container.dataset.initialized === "true") return;

	const originalTabs = Array.from(
		container.querySelectorAll<HTMLButtonElement>(".filter-tabs__item"),
	);
	if (originalTabs.length === 0) return;

	const activeValue =
		originalTabs.find((tab) => tab.classList.contains("is-active"))?.dataset
			.filterValue || "all";

	const tabs = reset
		? originalTabs.map((tab) => {
				const clone = tab.cloneNode(true) as HTMLButtonElement;
				tab.replaceWith(clone);
				return clone;
			})
		: originalTabs;

	const filterAttr = tabs[0]?.dataset.filterAttr;
	if (!filterAttr) return;
	const filterKey = filterAttr;

	const dataSelector = `[data-${filterKey}]`;
	const parent = container.closest(".card-base") || document;
	const items = Array.from(
		parent.querySelectorAll<HTMLElement>(dataSelector),
	).filter((item) => !item.classList.contains("filter-tabs__item"));
	const noResults = parent.querySelector<HTMLElement>("#no-results");
	if (items.length === 0) return;

	container.dataset.initialized = "true";

	function applyFilter(nextValue: string): void {
		let visibleCount = 0;

		for (const tab of tabs) {
			tab.classList.toggle(
				"is-active",
				tab.dataset.filterValue === nextValue,
			);
		}

		for (const item of items) {
			const itemValue = item.dataset[filterKey] || "";
			const matches =
				nextValue === "all" || itemValue.split(",").includes(nextValue);

			item.classList.toggle("filtered-out", !matches);
			if (matches) visibleCount += 1;
		}

		noResults?.classList.toggle("hidden", visibleCount > 0);
	}

	for (const tab of tabs) {
		tab.addEventListener("click", () => {
			applyFilter(tab.dataset.filterValue || "all");
		});
	}

	applyFilter(activeValue);
}

export function initFilterTabs(reset = false): void {
	const containers = document.querySelectorAll<HTMLElement>(".filter-tabs");

	for (const container of containers) {
		bindFilterContainer(container, reset);
	}
}

declare global {
	interface Window {
		__initFilterTabs?: () => void;
	}
}

window.__initFilterTabs = () => initFilterTabs(true);
