import { url } from "@/utils/url";
import type { CollectionEntry } from "astro:content";

export type SiteNoticeStatus = "info" | "success" | "warning" | "danger";
export type SiteNoticeLevel = "normal" | "important" | "urgent" | "critical";

export type SiteNoticeVisibility = {
	scope: "all" | "home" | "content";
	include?: string[];
	exclude?: string[];
};

export type SiteNoticeSourceData = {
	title: string;
	summary?: string;
	status: SiteNoticeStatus;
	level?: SiteNoticeLevel;
	icon?: string;
	pinned?: boolean;
	dismissible?: boolean;
	requiresAck?: boolean;
	published?: Date;
	expires?: Date;
	action?: {
		label: string;
		href: string;
		external?: boolean;
	};
	visibility?: SiteNoticeVisibility;
};

export type SiteNoticeItemViewModel = {
	id: string;
	title: string;
	summary: string;
	content: string;
	icon: string;
	status: SiteNoticeStatus;
	level: SiteNoticeLevel;
	pinned: boolean;
	dismissible: boolean;
	requiresAck: boolean;
	published?: string;
	expires?: string;
	action?: {
		label: string;
		href: string;
		external: boolean;
	};
	entry?: CollectionEntry<"notifications">;
};

const defaultIcons: Record<SiteNoticeStatus, string> = {
	info: "material-symbols:info-outline-rounded",
	success: "material-symbols:check-circle-outline-rounded",
	warning: "material-symbols:warning-outline-rounded",
	danger: "material-symbols:error-outline-rounded",
};

function normalizePathname(pathname: string): string {
	const normalized = pathname.replace(/\/+$/, "");
	return normalized || "/";
}

function matchesRoute(pathname: string, routes: string[] | undefined): boolean {
	if (!routes?.length) return false;
	return routes.some((route) => {
		const normalizedRoute = normalizePathname(route.replace(/\*$/, ""));
		return route.endsWith("*")
			? pathname === normalizedRoute ||
					pathname.startsWith(`${normalizedRoute}/`)
			: pathname === normalizedRoute;
	});
}

export function isSiteNoticeVisible(
	visibility: SiteNoticeVisibility | undefined,
	pathname: string,
): boolean {
	const normalizedPathname = normalizePathname(pathname);
	if (!visibility) return true;
	if (matchesRoute(normalizedPathname, visibility.exclude)) return false;
	if (visibility.include?.length) {
		return matchesRoute(normalizedPathname, visibility.include);
	}

	if (visibility.scope === "home") return normalizedPathname === "/";
	if (visibility.scope === "content") return normalizedPathname !== "/";
	return true;
}

function normalizeAction(
	action: SiteNoticeSourceData["action"],
): SiteNoticeItemViewModel["action"] {
	return action
		? {
				label: action.label,
				href: action.external ? action.href : url(action.href),
				external: action.external ?? false,
			}
		: undefined;
}

function normalizeLevel(level: SiteNoticeSourceData["level"]): SiteNoticeLevel {
	return level ?? "normal";
}

function normalizeDismissible(
	level: SiteNoticeLevel,
	dismissible: boolean | undefined,
): boolean {
	return dismissible ?? level !== "critical";
}

function normalizeRequiresAck(
	level: SiteNoticeLevel,
	requiresAck: boolean | undefined,
): boolean {
	return requiresAck ?? level === "critical";
}

export function buildSiteNoticeItemViewModel(
	id: string,
	data: SiteNoticeSourceData,
	entry?: CollectionEntry<"notifications">,
): SiteNoticeItemViewModel {
	const summary = data.summary || data.title;
	const level = normalizeLevel(data.level);
	return {
		id,
		title: data.title,
		summary,
		content: summary,
		icon: data.icon || defaultIcons[data.status],
		status: data.status,
		level,
		pinned: data.pinned ?? false,
		dismissible: normalizeDismissible(level, data.dismissible),
		requiresAck: normalizeRequiresAck(level, data.requiresAck),
		published: data.published?.toISOString(),
		expires: data.expires?.toISOString(),
		action: normalizeAction(data.action),
		entry,
	};
}

export async function getSiteNotices(
	pathname: string,
): Promise<SiteNoticeItemViewModel[]> {
	const { getCollection } = await import("astro:content");
	const entries = await getCollection("notifications", ({ data }) => {
		if (data.expires && data.expires.getTime() < Date.now()) return false;
		return isSiteNoticeVisible(data.visibility, pathname);
	});

	return entries.map((entry) =>
		buildSiteNoticeItemViewModel(entry.id, entry.data, entry),
	);
}
