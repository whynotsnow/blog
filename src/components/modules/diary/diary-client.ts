import {
	getMemosBaseUrl,
	renderDiaryMoments,
	transformMemosToDiary,
	type MemosResponse,
} from "./memos";

declare global {
	interface Window {
		__initFilterTabs?: () => void;
		__refreshFancybox?: () => void | Promise<void>;
	}
}

function readTimeZone(container: HTMLElement): number {
	const parsed = Number.parseInt(container.dataset.timezone || "8", 10);
	return Number.isFinite(parsed) ? parsed : 8;
}

function normalizeMemosResponse(
	payload: MemosResponse | MemosResponse["memos"],
) {
	return Array.isArray(payload) ? payload : payload.memos || [];
}

async function initDiaryMemos(): Promise<void> {
	const container = document.getElementById("diary-list");
	if (!container || container.dataset.memosLoaded === "true") return;

	const apiUrl = container.dataset.memosApi;
	if (!apiUrl) return;

	container.dataset.memosLoaded = "true";

	try {
		const response = await fetch(apiUrl);
		if (!response.ok) {
			throw new Error(`Memos request failed: ${response.status}`);
		}

		const payload = (await response.json()) as
			| MemosResponse
			| MemosResponse["memos"];
		const memos = normalizeMemosResponse(payload);
		const moments = transformMemosToDiary(memos, getMemosBaseUrl(apiUrl));

		container.innerHTML = renderDiaryMoments(moments, {
			labels: {
				minutesAgo: container.dataset.minutesAgo || "minutes ago",
				hoursAgo: container.dataset.hoursAgo || "hours ago",
				daysAgo: container.dataset.daysAgo || "days ago",
			},
			timeZone: readTimeZone(container),
		});

		window.__initFilterTabs?.();
		await window.__refreshFancybox?.();
	} catch (error) {
		console.error("Failed to load Memos diary entries:", error);
	}
}

function scheduleInit(): void {
	void initDiaryMemos();
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", scheduleInit);
} else {
	scheduleInit();
}

document.addEventListener("astro:page-load", scheduleInit);
