export const SITE_NOTICE_STATE_EVENT = "site-notice-state-change";

const READ_PREFIX = "site-notice:read:";
const DISMISSED_PREFIX = "site-notice:dismissed:";
const ACKNOWLEDGED_PREFIX = "site-notice:acknowledged:";
const SESSION_AUTO_OPEN_PREFIX = "site-notice:auto-opened:";
const SESSION_AUTO_EXPAND_KEY = "site-notice:auto-expanded";
const SESSION_PANEL_SUPPRESSED_KEY = "site-notice:panel-suppressed";

export type SiteNoticeStateChangeDetail = {
	id: string;
	read: boolean;
	dismissed: boolean;
	acknowledged: boolean;
};

function readStorage(key: string) {
	if (typeof window === "undefined") return false;
	return window.localStorage.getItem(key) === "true";
}

function readSessionStorage(key: string) {
	if (typeof window === "undefined") return false;
	return window.sessionStorage.getItem(key) === "true";
}

function publish(id: string) {
	window.dispatchEvent(
		new CustomEvent<SiteNoticeStateChangeDetail>(SITE_NOTICE_STATE_EVENT, {
			detail: {
				id,
				read: isSiteNoticeRead(id),
				dismissed: isSiteNoticeDismissed(id),
				acknowledged: isSiteNoticeAcknowledged(id),
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

export function isSiteNoticeAcknowledged(id: string) {
	return readStorage(`${ACKNOWLEDGED_PREFIX}${id}`);
}

export function wasSiteNoticeAutoOpenedInSession(id: string) {
	return readSessionStorage(`${SESSION_AUTO_OPEN_PREFIX}${id}`);
}

export function markSiteNoticeAutoOpenedInSession(id: string) {
	if (typeof window === "undefined") return;
	window.sessionStorage.setItem(`${SESSION_AUTO_OPEN_PREFIX}${id}`, "true");
}

export function wasSiteNoticePanelAutoExpandedInSession() {
	return readSessionStorage(SESSION_AUTO_EXPAND_KEY);
}

export function markSiteNoticePanelAutoExpandedInSession() {
	if (typeof window === "undefined") return;
	window.sessionStorage.setItem(SESSION_AUTO_EXPAND_KEY, "true");
}

export function isSiteNoticePanelSuppressedInSession() {
	return readSessionStorage(SESSION_PANEL_SUPPRESSED_KEY);
}

export function suppressSiteNoticePanelInSession() {
	if (typeof window === "undefined") return;
	window.sessionStorage.setItem(SESSION_PANEL_SUPPRESSED_KEY, "true");
}

export function markSiteNoticeRead(id: string) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(`${READ_PREFIX}${id}`, "true");
	publish(id);
}

export function acknowledgeSiteNotice(id: string) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(`${ACKNOWLEDGED_PREFIX}${id}`, "true");
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
