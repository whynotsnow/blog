import type { TocItem } from "./toc-data";

export function escapeHtml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

export function renderDesktopTocItem(item: TocItem, index = -1) {
	const rootBadgeClass =
		item.badgeKind === "text"
			? "bg-(--toc-badge-bg) text-(--btn-content)"
			: "";
	const badgeContent =
		item.badgeKind === "text"
			? escapeHtml(item.badge)
			: item.badgeKind === "square"
				? '<div class="transition w-2 h-2 rounded-[0.1875rem] bg-(--toc-badge-bg)"></div>'
				: '<div class="transition w-1.5 h-1.5 rounded-sm bg-black/5 dark:bg-white/10"></div>';
	const textClass = item.level <= 1 ? "text-50" : "text-30";

	return `<a href="#${escapeHtml(item.id)}" data-depth="${item.depth}" data-toc-level="${item.level}" data-toc-index="${index}" style="--toc-level: ${item.level};" class="px-2 flex gap-2 relative transition w-full min-h-9 rounded-xl hover:bg-(--toc-btn-hover) active:bg-(--toc-btn-active) py-2">
		<div class="toc-entry-badge transition w-5 h-5 shrink-0 rounded-lg text-xs flex items-center justify-center font-bold ${rootBadgeClass}">
			${badgeContent}
		</div>
		<div class="toc-entry-label transition text-sm ${textClass}">${escapeHtml(item.text)}</div>
	</a>`;
}

export function renderDesktopTocShell(items: TocItem[]) {
	return items
		.map((item, index) => ({ item, index }))
		.filter(({ item }) => item.level === 0)
		.map(
			({ item, index }) =>
				`${renderDesktopTocItem(item, index)}<div class="toc-expanded-region" data-root-index="${index}" data-expanded="false"></div>`,
		)
		.join("");
}

export function renderFloatingTocItem(item: TocItem, index = -1) {
	const badge =
		item.badgeKind === "text"
			? `<span class="floating-toc-badge">${escapeHtml(item.badge)}</span>`
			: item.badgeKind === "square"
				? '<span class="floating-toc-dot"></span>'
				: '<span class="floating-toc-dot-small"></span>';

	return `<a href="#${escapeHtml(item.id)}" class="floating-toc-item" style="padding-left: ${0.5 + item.level}rem" data-level="${item.level}" data-toc-index="${index}">${badge}<span class="floating-toc-text">${escapeHtml(item.text)}</span></a>`;
}

export function renderFloatingTocShell(items: TocItem[]) {
	return items
		.map((item, index) => ({ item, index }))
		.filter(({ item }) => item.level === 0)
		.map(
			({ item, index }) =>
				`${renderFloatingTocItem(item, index)}<div class="floating-toc-expanded-region" data-root-index="${index}" data-expanded="false"></div>`,
		)
		.join("");
}
