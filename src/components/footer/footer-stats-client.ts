import { onPageLifecycle } from "@/utils/page-lifecycle";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function getDaysSince(value: string, round: "ceil" | "floor"): number {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return 0;

	const difference = Math.max(0, Date.now() - date.getTime());
	return Math[round](difference / DAY_IN_MS);
}

function updateDateStats(root: HTMLElement) {
	const startDate = root.dataset.siteStartDate;
	const lastActivityDate = root.dataset.lastActivityDate;

	if (startDate) {
		const runningDays = root.querySelector<HTMLElement>(
			'[data-footer-stat="running-days"]',
		);
		if (runningDays)
			runningDays.textContent = String(getDaysSince(startDate, "ceil"));
	}

	if (lastActivityDate) {
		const lastUpdate = root.querySelector<HTMLElement>(
			'[data-footer-stat="last-update"]',
		);
		if (lastUpdate) {
			lastUpdate.textContent = String(
				getDaysSince(lastActivityDate, "floor"),
			);
		}
	}
}

async function updateTrafficStats(root: HTMLElement) {
	const traffic = root.querySelector<HTMLElement>("[data-footer-traffic]");
	if (!traffic || !window.oddmisc) return;

	try {
		const stats = await window.oddmisc.getSiteStats();
		const pageViewsLabel = traffic.dataset.pageViewsLabel ?? "";
		const visitsLabel = traffic.dataset.visitsLabel ?? "";
		traffic.textContent = `${pageViewsLabel} ${stats.pageviews ?? 0} · ${visitsLabel} ${stats.visits ?? 0}`;
		traffic.hidden = false;
	} catch {
		traffic.hidden = true;
	}
}

function initFooterStats() {
	const root = document.querySelector<HTMLElement>(".footer-stats");
	if (!root) return;

	updateDateStats(root);
	void updateTrafficStats(root);
}

onPageLifecycle("first-load", initFooterStats);
onPageLifecycle("page-view", initFooterStats);
