type FilterListener = [Element, string, EventListener];

interface AnimePageState {
	animeFilterEventListeners?: FilterListener[];
	__animeLazyObserver?: IntersectionObserver;
}

const animePageState = window as Window & AnimePageState;

function getAnimeItems(): HTMLElement[] {
	return Array.from(
		document.querySelectorAll<HTMLElement>("[data-anime-status]"),
	);
}

function updateAnimeListLayout(layout: string, shouldAnimate = true) {
	const animeListContainer = document.getElementById("anime-list-container");
	if (!animeListContainer) return;
	animeListContainer.dataset.currentLayout = layout;

	const animeItems = getAnimeItems();
	const visibleItems = animeItems.filter(
		(item) => item.offsetParent !== null,
	);
	const firstPositions = new Map<
		HTMLElement,
		{ left: number; top: number; width: number; height: number }
	>();

	if (shouldAnimate) {
		visibleItems.forEach((item) => {
			const rect = item.getBoundingClientRect();
			firstPositions.set(item, {
				left: rect.left,
				top: rect.top,
				width: rect.width,
				height: rect.height,
			});
		});
	}

	const style = document.createElement("style");
	style.innerHTML = `.anime-grid-container .group { transition: none !important; }`;
	document.head.appendChild(style);
	animeListContainer.classList.remove("anime-list-mode", "anime-grid-mode");
	animeListContainer.classList.remove(
		"grid-cols-1",
		"md:grid-cols-2",
		"lg:grid-cols-3",
	);

	if (layout === "grid") {
		animeListContainer.classList.add("anime-grid-mode");
		const rightSidebar = document.querySelector<HTMLElement>(
			".right-sidebar-container",
		);
		if (rightSidebar) {
			rightSidebar.style.display = "none";
			rightSidebar.classList.add("hidden-in-grid-mode");
		}
		const mainGrid = document.getElementById("main-grid");
		if (mainGrid) {
			mainGrid.style.gridTemplateColumns = "17.5rem 1fr";
			mainGrid.classList.add("two-column-layout");
		}
	} else {
		animeListContainer.classList.add("anime-list-mode");
		animeListContainer.classList.add("grid-cols-1", "lg:grid-cols-2");
		const rightSidebar = document.querySelector<HTMLElement>(
			".right-sidebar-container",
		);
		if (rightSidebar) {
			rightSidebar.style.display = "";
			rightSidebar.classList.remove("hidden-in-grid-mode");
		}
		const mainGrid = document.getElementById("main-grid");
		if (mainGrid) {
			mainGrid.style.gridTemplateColumns = "";
			mainGrid.classList.remove("two-column-layout");
		}
	}

	void animeListContainer.offsetHeight;
	if (!shouldAnimate) {
		if (style.parentNode) style.parentNode.removeChild(style);
		return;
	}

	requestAnimationFrame(() => {
		if (style.parentNode) style.parentNode.removeChild(style);

		visibleItems.forEach((item) => {
			const first = firstPositions.get(item);
			if (!first) return;
			const last = item.getBoundingClientRect();

			const deltaX = Math.round(first.left - last.left);
			const deltaY = Math.round(first.top - last.top);
			const deltaW = first.width / last.width;
			const deltaH = first.height / last.height;

			if (
				Math.abs(deltaX) < 1 &&
				Math.abs(deltaY) < 1 &&
				Math.abs(deltaW - 1) < 0.01 &&
				Math.abs(deltaH - 1) < 0.01
			) {
				return;
			}

			item.style.willChange = "transform";
			item.style.transition = "none";
			item.style.transformOrigin = "top left";
			item.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${deltaW}, ${deltaH})`;
		});

		void animeListContainer.offsetHeight;
		requestAnimationFrame(() => {
			visibleItems.forEach((item) => {
				item.style.transition =
					"transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)";
				item.style.transform = "";
			});
			setTimeout(() => {
				visibleItems.forEach((item) => {
					item.style.transition = "";
					item.style.transformOrigin = "";
					item.style.transform = "";
					item.style.willChange = "";
				});
			}, 500);
		});
	});
}

function initAnimeLayout() {
	const animeListContainer = document.getElementById("anime-list-container");
	if (!animeListContainer) return false;
	updateAnimeListLayout("list", false);
	requestAnimationFrame(() => {
		animeListContainer.classList.remove("opacity-0");
	});
	return true;
}

function tryInitAnimeLayout() {
	let retryCount = 0;
	const maxRetries = 10;

	function tryInit() {
		if (initAnimeLayout()) return;
		if (retryCount < maxRetries) {
			retryCount++;
			const delay = Math.min(100 * Math.pow(1.5, retryCount), 1000);
			setTimeout(tryInit, delay);
			return;
		}

		setTimeout(() => {
			const animeListContainer = document.getElementById(
				"anime-list-container",
			);
			if (animeListContainer) {
				updateAnimeListLayout("list", false);
				animeListContainer.classList.remove("opacity-0");
			}
		}, 2000);
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", tryInit, { once: true });
	} else {
		tryInit();
	}
}

function moveLazyItemsToList(
	lazyStore: HTMLTemplateElement,
	listContainer: HTMLElement,
) {
	if (lazyStore.content.children.length === 0) return;

	const fragment = document.createDocumentFragment();
	while (lazyStore.content.firstChild) {
		const node = lazyStore.content.firstChild;
		fragment.appendChild(node);
	}
	listContainer.appendChild(fragment);
}

function clearFilterListeners() {
	animePageState.animeFilterEventListeners?.forEach((listener) => {
		const [element, type, handler] = listener;
		element.removeEventListener(type, handler);
	});
	animePageState.animeFilterEventListeners = [];
}

function initFilterButtons() {
	const filterTags = document.querySelectorAll(".anime-filter-tag");
	const sentinel = document.getElementById("infinite-scroll-sentinel");
	const listContainer = document.getElementById("anime-list-container");
	const lazyStore = document.getElementById(
		"anime-lazy-store",
	) as HTMLTemplateElement | null;

	clearFilterListeners();
	animePageState.__animeLazyObserver?.disconnect();
	animePageState.__animeLazyObserver = undefined;

	if (!listContainer) return;

	filterTags.forEach((tag) => {
		const clickHandler = (event: Event) => {
			const activeTag = event.currentTarget;
			if (!(activeTag instanceof HTMLElement)) return;
			if (activeTag.classList.contains("anime-active")) return;

			filterTags.forEach((filterTag) =>
				filterTag.classList.remove("anime-active"),
			);
			activeTag.classList.add("anime-active");

			if (lazyStore) {
				moveLazyItemsToList(lazyStore, listContainer);
			}

			if (sentinel) sentinel.style.display = "none";
			const initialHidden =
				listContainer.querySelectorAll(".initial-hidden");
			initialHidden.forEach((element) => {
				element.classList.remove("hidden", "initial-hidden");
			});

			const status = activeTag.getAttribute("data-status");
			const animeItems = Array.from(listContainer.children).filter(
				(item) => item.hasAttribute("data-anime-status"),
			) as HTMLElement[];
			const itemsToHide: HTMLElement[] = [];
			const itemsToShow: HTMLElement[] = [];
			const itemsToKeep: HTMLElement[] = [];

			animeItems.forEach((item) => {
				const itemStatus = item.getAttribute("data-anime-status");
				const shouldShow = status === "all" || itemStatus === status;
				const isCurrentlyVisible =
					!item.classList.contains("anime-hidden");

				if (shouldShow) {
					if (isCurrentlyVisible) {
						itemsToKeep.push(item);
					} else {
						itemsToShow.push(item);
					}
				} else if (isCurrentlyVisible) {
					itemsToHide.push(item);
				}
			});

			const firstPositions = new Map<
				HTMLElement,
				{ left: number; top: number }
			>();
			itemsToKeep.forEach((item) => {
				const rect = item.getBoundingClientRect();
				firstPositions.set(item, {
					left: rect.left,
					top: rect.top,
				});
			});

			const runAnimation = () => {
				itemsToHide.forEach((item) => {
					item.classList.add("anime-hidden");
					item.classList.remove("anime-fade-out");
				});
				itemsToShow.forEach((item) => {
					item.classList.remove("anime-hidden");
					item.classList.add("anime-fade-in");
					item.style.transition = "none";
				});
				itemsToKeep.forEach((item) => {
					const first = firstPositions.get(item);
					if (!first) return;

					const rect = item.getBoundingClientRect();
					const deltaX = Math.round(first.left - rect.left);
					const deltaY = Math.round(first.top - rect.top);

					if (deltaX !== 0 || deltaY !== 0) {
						item.style.willChange = "transform";
						item.style.transition = "none";
						item.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
					}
				});
				requestAnimationFrame(() => {
					itemsToKeep.forEach((item) => {
						item.style.transition =
							"transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)";
						item.style.transform = "";
					});

					const staggerLimit = 20;
					itemsToShow.forEach((item, index) => {
						item.style.transition = "";
						item.style.willChange = "opacity, transform";

						const delay = index < staggerLimit ? index * 30 : 0;
						item.style.transitionDelay = `${delay}ms`;

						requestAnimationFrame(() => {
							item.classList.remove("anime-fade-in");
							item.classList.add("anime-fade-in-active");
						});
					});

					setTimeout(
						() => {
							[...itemsToKeep, ...itemsToShow].forEach((item) => {
								item.classList.remove("anime-fade-in-active");
								item.style.transition = "";
								item.style.transform = "";
								item.style.opacity = "";
								item.style.willChange = "";
								item.style.transitionDelay = "";
							});
						},
						600 +
							(itemsToShow.length > 0
								? Math.min(itemsToShow.length, 20) * 30
								: 0),
					);
				});
			};

			if (itemsToHide.length > 0) {
				itemsToHide.forEach((item) =>
					item.classList.add("anime-fade-out"),
				);
				setTimeout(runAnimation, 200);
			} else {
				runAnimation();
			}
		};

		tag.addEventListener("click", clickHandler);
		animePageState.animeFilterEventListeners?.push([
			tag,
			"click",
			clickHandler,
		]);
	});

	if (sentinel && lazyStore && listContainer) {
		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries[0].isIntersecting) return;

				const batchSize = 24;
				if (lazyStore.content.children.length === 0) {
					sentinel.style.display = "none";
					observer.disconnect();
					return;
				}

				const fragment = document.createDocumentFragment();
				let movedCount = 0;
				while (lazyStore.content.firstChild && movedCount < batchSize) {
					const node = lazyStore.content.firstChild;
					if (node.nodeType === Node.ELEMENT_NODE) {
						(node as Element).classList.add("anime-fade-in-active");
					}
					fragment.appendChild(node);
					movedCount++;
				}

				requestAnimationFrame(() => {
					listContainer.appendChild(fragment);
					if (lazyStore.content.children.length === 0) {
						sentinel.style.display = "none";
						observer.disconnect();
					}
				});
			},
			{ rootMargin: "200px" },
		);
		observer.observe(sentinel);
		animePageState.__animeLazyObserver = observer;
	} else if (sentinel) {
		sentinel.style.display = "none";
	}
}

export function initAnimePage(): void {
	tryInitAnimeLayout();

	const initFilters = () => setTimeout(initFilterButtons, 150);
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", initFilterButtons, {
			once: true,
		});
	} else {
		initFilterButtons();
	}

	window.onPageLifecycle?.("content-replace", initFilters);
	window.onPageLifecycle?.("page-view", initFilters);
}
