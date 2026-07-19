import type {
	SiteNoticeConfig,
	SiteNoticeItemConfig,
	SiteNoticeStatus,
} from "@/types/config";
import { url } from "@/utils/url";

export type SiteNoticeItemViewModel = {
	id: string;
	title?: string;
	content: string;
	icon: string;
	status: SiteNoticeStatus;
	dismissible: boolean;
	action?: {
		label: string;
		href: string;
		external: boolean;
	};
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

export function buildSiteNoticeViewModel(
	config: SiteNoticeConfig,
	pathname: string,
): SiteNoticeViewModel | undefined {
	if (!config.enable) return;

	const notices = config.notices
		.filter((notice) => isVisible(notice, pathname))
		.map((notice) => ({
			id: notice.id,
			title: notice.title?.trim() || undefined,
			content: notice.content,
			icon: notice.icon || defaultIcons[notice.status],
			status: notice.status,
			dismissible: notice.dismissible,
			action: notice.action
				? {
						label: notice.action.label,
						href: notice.action.external
							? notice.action.href
							: url(notice.action.href),
						external: notice.action.external ?? false,
					}
				: undefined,
		}));

	if (!notices.length) return;

	return {
		autoRotate: config.autoRotate,
		rotationIntervalMs: Math.max(config.rotationIntervalMs, 3000),
		notices,
	};
}
