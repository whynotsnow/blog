import type { SiteNoticeConfig } from "../types/config";

export const siteNoticeConfig: SiteNoticeConfig = {
	enable: true,
	autoRotate: true,
	rotationIntervalMs: 6000,
	notices: [
		{
			id: "site-building-2026-07",
			content: "网站建设中，更多功能敬请期待！",
			status: "info",
			dismissible: false,
			visibility: {
				scope: "all",
			},
		},
		{
			id: "site-content-updates-2026-07",
			content: "本站内容持续更新，感谢你的关注。",
			status: "success",
			dismissible: false,
			visibility: {
				scope: "all",
			},
		},
	],
};
