export const SITE_NOTICE_STATE_EVENT = "site-notice-state-change";

const READ_PREFIX = "site-notice:read:";
const DISMISSED_PREFIX = "site-notice:dismissed:";

export type SiteNoticeStateChangeDetail = {
	id: string;
	read: boolean;
	dismissed: boolean;
};

function readStorage(key: string) {
	if (typeof window === "undefined") return false;
	return window.localStorage.getItem(key) === "true";
}

function publish(id: string) {
	window.dispatchEvent(
		new CustomEvent<SiteNoticeStateChangeDetail>(SITE_NOTICE_STATE_EVENT, {
			detail: {
				id,
				read: isSiteNoticeRead(id),
				dismissed: isSiteNoticeDismissed(id),
			},
		}),
	);
}

export function isSiteNoticeRead(id: string) {
	return readStorage(`${READ_PREFIX}${id}`);
}

export function isSiteNoticeDismissed(id: string) {
	return readStorage(`${DISMISSED_PREFIX}${id}`);
}

export function markSiteNoticeRead(id: string) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(`${READ_PREFIX}${id}`, "true");
	publish(id);
}

export function dismissSiteNotice(id: string) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(`${DISMISSED_PREFIX}${id}`, "true");
	publish(id);
}

export function getUnreadSiteNoticeIds(ids: string[]) {
	return ids.filter(
		(id) => !isSiteNoticeRead(id) && !isSiteNoticeDismissed(id),
	);
}
