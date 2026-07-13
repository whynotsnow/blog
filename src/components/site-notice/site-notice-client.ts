import { onPageLifecycle } from "@/utils/page-lifecycle";

const STORAGE_PREFIX = "site-notice:dismissed:";

function getStorageKey(notice: HTMLElement) {
	return `${STORAGE_PREFIX}${notice.dataset.noticeId}`;
}

function syncSiteNotice() {
	document
		.querySelectorAll<HTMLElement>("[data-site-notice]")
		.forEach((notice) => {
			notice.hidden =
				localStorage.getItem(getStorageKey(notice)) === "true";
		});
}

document.addEventListener("click", (event) => {
	const target = event.target;
	if (!(target instanceof Element)) return;

	const dismissButton = target.closest<HTMLElement>(
		"[data-site-notice-dismiss]",
	);
	const notice = dismissButton?.closest<HTMLElement>("[data-site-notice]");
	if (!notice) return;

	localStorage.setItem(getStorageKey(notice), "true");
	notice.hidden = true;
});

onPageLifecycle("first-load", syncSiteNotice);
onPageLifecycle("content-replace", syncSiteNotice);
onPageLifecycle("page-view", syncSiteNotice);
