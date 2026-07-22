import type {
	SiteNoticeConfig,
	SiteNoticeItemConfig,
	SiteNoticeLevel,
	SiteNoticeStatus,
} from "@/types/config";
import { url } from "@/utils/url";
import type { CollectionEntry } from "astro:content";

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

export type SiteNoticeViewModel = {
	autoRotate: boolean;
	rotationIntervalMs: number;
	notices: SiteNoticeItemViewModel[];
};

const defaultIcons: Record<SiteNoticeStatus, string> = {
	info: "material-symbols:info-outline-rounded",
	success: "material-symbols:check-circle-outline-rounded",
	warning: "material-symbols:warning-outline-rounded",
	danger: "material-symbols:error-outline-rounded",
};

function normalizePathname(pathname: string) {
	const normalized = pathname.replace(/\/+$/, "");
	return normalized || "/";
}

function matchesRoute(pathname: string, routes: string[] | undefined) {
	if (!routes?.length) return false;
	return routes.some((route) => {
		const normalizedRoute = normalizePathname(route.replace(/\*$/, ""));
		return route.endsWith("*")
			? pathname === normalizedRoute ||
					pathname.startsWith(`${normalizedRoute}/`)
			: pathname === normalizedRoute;
	});
}

function isVisible(config: SiteNoticeItemConfig, pathname: string) {
	const normalizedPathname = normalizePathname(pathname);
	const visibility = config.visibility;
	if (!visibility) return true;
	if (matchesRoute(normalizedPathname, visibility.exclude)) return false;
	if (visibility.include?.length) {
		return matchesRoute(normalizedPathname, visibility.include);
	}

	if (visibility.scope === "home") return normalizedPathname === "/";
	if (visibility.scope === "content") return normalizedPathname !== "/";
	return true;
}

function normalizeAction(action: SiteNoticeItemConfig["action"]) {
	return action
		? {
				label: action.label,
				href: action.external ? action.href : url(action.href),
				external: action.external ?? false,
			}
		: undefined;
}

function normalizeLevel(level: SiteNoticeItemConfig["level"]) {
	return level ?? "normal";
}

function normalizeDismissible(
	level: SiteNoticeLevel,
	dismissible: boolean | undefined,
) {
	return dismissible ?? level !== "critical";
}

function normalizeRequiresAck(
	level: SiteNoticeLevel,
	requiresAck: boolean | undefined,
) {
	return requiresAck ?? level === "critical";
}

function buildConfigNotice(
	notice: SiteNoticeItemConfig,
): SiteNoticeItemViewModel {
	const level = normalizeLevel(notice.level);
	return {
		id: notice.id,
		title: notice.title,
		summary: notice.summary || notice.content,
		content: notice.content,
		icon: notice.icon || defaultIcons[notice.status],
		status: notice.status,
		level,
		pinned: notice.pinned ?? false,
		dismissible: normalizeDismissible(level, notice.dismissible),
		requiresAck: normalizeRequiresAck(level, notice.requiresAck),
		action: normalizeAction(notice.action),
	};
}

async function getMarkdownNotices(pathname: string) {
	const { getCollection } = await import("astro:content");
	const entries = await getCollection("notifications", ({ data }) => {
		if (data.expires && data.expires.getTime() < Date.now()) return false;
		return isVisible(
			{
				id: "",
				title: data.title,
				content: data.summary,
				status: data.status,
				dismissible: data.dismissible,
				visibility: data.visibility,
			},
			pathname,
		);
	});

	return entries.map<SiteNoticeItemViewModel>((entry) => {
		const { data } = entry;
		const summary = data.summary || data.title;
		const level = normalizeLevel(data.level);
		return {
			id: entry.id,
			title: data.title,
			summary,
			content: summary,
			icon: data.icon || defaultIcons[data.status],
			status: data.status,
			level,
			pinned: data.pinned,
			dismissible: normalizeDismissible(level, data.dismissible),
			requiresAck: normalizeRequiresAck(level, data.requiresAck),
			published: data.published?.toISOString(),
			expires: data.expires?.toISOString(),
			action: normalizeAction(data.action),
			entry,
		};
	});
}

export async function buildSiteNoticeViewModel(
	config: SiteNoticeConfig,
	pathname: string,
): Promise<SiteNoticeViewModel | undefined> {
	if (!config.enable) return;

	const configNotices = (config.notices ?? [])
		.filter((notice) => isVisible(notice, pathname))
		.map(buildConfigNotice);
	const markdownNotices = config.notices?.length
		? []
		: await getMarkdownNotices(pathname);
	const notices = [...markdownNotices, ...configNotices];

	if (!notices.length) return;

	return {
		autoRotate: config.autoRotate ?? true,
		rotationIntervalMs: Math.max(config.rotationIntervalMs ?? 6000, 3000),
		notices,
	};
}
