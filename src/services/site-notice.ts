import type { SiteNoticeConfig, SiteNoticeStatus } from "@/types/config";
import { url } from "@/utils/url-utils";

export type SiteNoticeViewModel = {
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

function isVisible(config: SiteNoticeConfig, pathname: string) {
	if (!config.enable) return false;

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
	if (!isVisible(config, pathname)) return;

	return {
		id: config.id,
		title: config.title?.trim() || undefined,
		content: config.content,
		icon: config.icon || defaultIcons[config.status],
		status: config.status,
		dismissible: config.dismissible,
		action: config.action
			? {
					label: config.action.label,
					href: config.action.external
						? config.action.href
						: url(config.action.href),
					external: config.action.external ?? false,
				}
			: undefined,
	};
}
