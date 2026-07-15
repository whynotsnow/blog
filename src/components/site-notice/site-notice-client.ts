import { onPageLifecycle } from "@/utils/page-lifecycle";
import {
	dismissSiteNotice,
	isSiteNoticeDismissed,
	isSiteNoticeRead,
	SITE_NOTICE_STATE_EVENT,
} from "@/features/activity-center/notice-state";

const TRANSITION_DURATION_MS = 250;
const PREVIEW_DURATION_MS = 8000;
const PREVIEWED_PREFIX = "site-notice:previewed:";

let rotationTimer: number | undefined;
let transitionTimer: number | undefined;
let previewTimer: number | undefined;

function getNoticeId(notice: HTMLElement) {
	return notice.dataset.noticeId || "";
}

function getPreviewKey(notice: HTMLElement) {
	return `${PREVIEWED_PREFIX}${getNoticeId(notice)}`;
}

function isPersistentNotice(notice: HTMLElement) {
	return (
		notice.dataset.status === "warning" ||
		notice.dataset.status === "danger"
	);
}

function getAvailableNotices(region: HTMLElement) {
	return Array.from(
		region.querySelectorAll<HTMLElement>("[data-site-notice-item]"),
	).filter((notice) => !notice.hidden);
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

function stopPreview() {
	if (previewTimer) window.clearTimeout(previewTimer);
	previewTimer = undefined;
}

function completePreview(region: HTMLElement) {
	getAvailableNotices(region).forEach((notice) => {
		if (isPersistentNotice(notice)) return;
		sessionStorage.setItem(getPreviewKey(notice), "true");
		notice.hidden = true;
		notice.dataset.state = "inactive";
		setInteractiveState(notice, false);
	});
	showNotice(region, 0, 1);
	startRotation(region);
}

function startPreview(region: HTMLElement) {
	stopPreview();
	if (
		!getAvailableNotices(region).some(
			(notice) => !isPersistentNotice(notice),
		)
	) {
		return;
	}
	previewTimer = window.setTimeout(
		() => completePreview(region),
		PREVIEW_DURATION_MS,
	);
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
	stopPreview();
	const region = document.querySelector<HTMLElement>(
		"[data-site-notice-region]",
	);
	if (!region) return;

	region.hidden = false;
	region
		.querySelectorAll<HTMLElement>("[data-site-notice-item]")
		.forEach((notice) => {
			const id = getNoticeId(notice);
			const wasPreviewed =
				!isPersistentNotice(notice) &&
				sessionStorage.getItem(getPreviewKey(notice)) === "true";
			notice.hidden =
				isSiteNoticeDismissed(id) ||
				isSiteNoticeRead(id) ||
				wasPreviewed;
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
	startRotation(region);
	startPreview(region);
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

	dismissSiteNotice(getNoticeId(noticeItem));
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
		stopPreview();
	}
});

document.addEventListener("pointerout", (event) => {
	const region = (event.target as Element | null)?.closest<HTMLElement>(
		"[data-site-notice-region]",
	);
	if (region && !region.contains(event.relatedTarget as Node | null)) {
		startRotation(region);
		startPreview(region);
	}
});

document.addEventListener("focusin", (event) => {
	if (
		(event.target as Element | null)?.closest("[data-site-notice-region]")
	) {
		stopRotation();
		stopPreview();
	}
});

document.addEventListener("focusout", (event) => {
	const region = (event.target as Element | null)?.closest<HTMLElement>(
		"[data-site-notice-region]",
	);
	if (region && !region.contains(event.relatedTarget as Node | null)) {
		startRotation(region);
		startPreview(region);
	}
});

window.addEventListener(SITE_NOTICE_STATE_EVENT, initSiteNotice);

onPageLifecycle("first-load", initSiteNotice);
onPageLifecycle("content-replace", initSiteNotice);
