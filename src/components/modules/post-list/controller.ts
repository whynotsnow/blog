const observedTagContainers = new WeakSet<Element>();
const tagResizeObserver =
	typeof ResizeObserver === "undefined"
		? null
		: new ResizeObserver((entries) => {
				for (const entry of entries) {
					fitPostCardTagRows(entry.target as HTMLElement);
				}
			});

function fitPostCardTagRows(container: HTMLElement): void {
	const postList = container.closest<HTMLElement>(".post-list");
	const tags = Array.from(
		container.querySelectorAll<HTMLElement>(
			":scope > .post-list-card__tag",
		),
	);

	for (const tag of tags) tag.hidden = false;
	if (!postList?.classList.contains("grid-mode") || tags.length < 2) return;

	const rowTops: number[] = [];
	let overflowIndex = tags.length;

	for (const [index, tag] of tags.entries()) {
		const existingRow = rowTops.some(
			(rowTop) => Math.abs(rowTop - tag.offsetTop) <= 1,
		);
		if (!existingRow) rowTops.push(tag.offsetTop);
		if (rowTops.length > 2) {
			overflowIndex = index;
			break;
		}
	}

	for (const tag of tags.slice(overflowIndex)) tag.hidden = true;
}

export function initializePostCardTagFitting(
	root: ParentNode = document,
): void {
	const containers = root.querySelectorAll<HTMLElement>(
		".post-list-card__tags",
	);

	for (const container of containers) {
		fitPostCardTagRows(container);
		if (!tagResizeObserver || observedTagContainers.has(container))
			continue;
		tagResizeObserver.observe(container);
		observedTagContainers.add(container);
	}

	document.fonts?.ready.then(() => {
		for (const container of containers) fitPostCardTagRows(container);
	});
}

export function initializePostList(container: HTMLElement): void {
	requestAnimationFrame(() => {
		if (!container.isConnected) return;
		container.classList.add("grid-mode", "js-initialized");
		container.classList.remove("list-mode");
		initializePostCardTagFitting(container);
	});
}
