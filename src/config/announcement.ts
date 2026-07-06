import type { AnnouncementConfig } from "../types/config";

export const announcementConfig: AnnouncementConfig = {
	title: "", // 公告标题，
	content: "网站建设中，更多功能敬请期待！", // 公告内容
	closable: false, // 允许用户关闭公告
	link: {
		enable: false, // 启用链接
		text: "Learn More", // 链接文本
		url: "/about/", // 链接 URL
		external: false, // 内部链接
	},
};
