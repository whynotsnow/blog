import { onPageLifecycle } from "@/utils/page-lifecycle";

const STORAGE_PREFIX = "site-notice:dismissed:";
const TRANSITION_DURATION_MS = 250;

let rotationTimer: number | undefined;
let transitionTimer: number | undefined;

function getStorageKey(notice: HTMLElement) {
	return `${STORAGE_PREFIX}${notice.dataset.noticeId}`;
}

function getAvailableNotices(region: HTMLElement) {
	return Array.from(
		region.querySelectorAll<HTMLElement>("[data-site-notice-item]"),
	).filter((notice) => !notice.hidden);
}

function updateViewport(region: HTMLElement, notice: HTMLElement) {
	const viewport = region.querySelector<HTMLElement>(
		"[data-site-notice-viewport]",
	);
	if (viewport) viewport.style.height = `${notice.offsetHeight}px`;
}

function setInteractiveState(notice: HTMLElement, isActive: boolean) {
	notice.setAttribute("aria-hidden", String(!isActive));
	notice.inert = !isActive;
	notice.toggleAttribute("data-site-notice", isActive);
}

function showNotice(region: HTMLElement, nextIndex: number, direction: 1 | -1) {
	const notices = getAvailableNotices(region);
	if (!notices.length) {
		region.hidden = true;
		return;
	}

	const current = notices.find((notice) => notice.dataset.state === "active");
	const normalizedIndex = (nextIndex + notices.length) % notices.length;
	const next = notices[normalizedIndex];
	if (current === next) {
		updateViewport(region, next);
		return;
	}

	if (transitionTimer) window.clearTimeout(transitionTimer);
	if (current) {
		current.dataset.state = direction === 1 ? "leaving-up" : "leaving-down";
		setInteractiveState(current, false);
	}

	next.dataset.state = "inactive";
	next.dataset.entry = direction === 1 ? "from-bottom" : "from-top";
	setInteractiveState(next, true);
	updateViewport(region, next);

	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			delete next.dataset.entry;
			next.dataset.state = "active";
		});
	});

	const counter = region.querySelector<HTMLElement>(
		"[data-site-notice-index]",
	);
	if (counter) counter.textContent = String(normalizedIndex + 1);

	transitionTimer = window.setTimeout(() => {
		if (current) current.dataset.state = "inactive";
	}, TRANSITION_DURATION_MS);
}

function moveNotice(region: HTMLElement, direction: 1 | -1) {
	const notices = getAvailableNotices(region);
	const currentIndex = notices.findIndex(
		(notice) => notice.dataset.state === "active",
	);
	showNotice(region, Math.max(currentIndex, 0) + direction, direction);
}

function stopRotation() {
	if (rotationTimer) window.clearInterval(rotationTimer);
	rotationTimer = undefined;
}

function startRotation(region: HTMLElement) {
	stopRotation();
	const notices = getAvailableNotices(region);
	const reduceMotion = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches;
	if (
		region.dataset.autoRotate !== "true" ||
		reduceMotion ||
		notices.length < 2
	) {
		return;
	}

	const interval = Number.parseInt(
		region.dataset.rotationInterval || "6000",
		10,
	);
	rotationTimer = window.setInterval(() => moveNotice(region, 1), interval);
}

function initSiteNotice() {
	stopRotation();
	const region = document.querySelector<HTMLElement>(
		"[data-site-notice-region]",
	);
	if (!region) return;

	region.hidden = false;
	region
		.querySelectorAll<HTMLElement>("[data-site-notice-item]")
		.forEach((notice) => {
			notice.hidden =
				localStorage.getItem(getStorageKey(notice)) === "true";
			notice.dataset.state = "inactive";
			setInteractiveState(notice, false);
		});

	const firstNotice = getAvailableNotices(region)[0];
	if (!firstNotice) {
		region.hidden = true;
		return;
	}

	firstNotice.dataset.state = "active";
	setInteractiveState(firstNotice, true);
	updateViewport(region, firstNotice);
	startRotation(region);
}

document.addEventListener("click", (event) => {
	const target = event.target;
	if (!(target instanceof Element)) return;

	const region = target.closest<HTMLElement>("[data-site-notice-region]");
	if (!region) return;

	if (target.closest("[data-site-notice-next]")) {
		moveNotice(region, 1);
		startRotation(region);
		return;
	}

	if (target.closest("[data-site-notice-previous]")) {
		moveNotice(region, -1);
		startRotation(region);
		return;
	}

	const dismissButton = target.closest<HTMLElement>(
		"[data-site-notice-dismiss]",
	);
	const noticeItem = dismissButton?.closest<HTMLElement>(
		"[data-site-notice-item]",
	);
	if (!noticeItem) return;

	localStorage.setItem(getStorageKey(noticeItem), "true");
	noticeItem.hidden = true;
	noticeItem.dataset.state = "inactive";
	showNotice(region, 0, 1);
	startRotation(region);
});

document.addEventListener("pointerover", (event) => {
	if (
		(event.target as Element | null)?.closest("[data-site-notice-region]")
	) {
		stopRotation();
	}
});

document.addEventListener("pointerout", (event) => {
	const region = (event.target as Element | null)?.closest<HTMLElement>(
		"[data-site-notice-region]",
	);
	if (region && !region.contains(event.relatedTarget as Node | null)) {
		startRotation(region);
	}
});

document.addEventListener("focusin", (event) => {
	if (
		(event.target as Element | null)?.closest("[data-site-notice-region]")
	) {
		stopRotation();
	}
});

document.addEventListener("focusout", (event) => {
	const region = (event.target as Element | null)?.closest<HTMLElement>(
		"[data-site-notice-region]",
	);
	if (region && !region.contains(event.relatedTarget as Node | null)) {
		startRotation(region);
	}
});

onPageLifecycle("first-load", initSiteNotice);
onPageLifecycle("content-replace", initSiteNotice);
onPageLifecycle("page-view", initSiteNotice);
