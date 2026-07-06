import type { ProfileConfig } from "../types/config";

export const profileConfig: ProfileConfig = {
	avatar: "assets/images/avatar.webp", // 相对于 /src 目录。如果以 '/' 开头，则相对于 /public 目录
	name: "怎么不下雪",
	bio: "雪虽未下，但时间值得认真对待。",
	typewriter: {
		enable: false, // 启用个人简介打字机效果
		speed: 80, // 打字速度（毫秒）
	},
	links: [
		// {
		// 	name: "Bilibili",
		// 	icon: "fa7-brands:bilibili",
		// 	url: "https://space.bilibili.com/701864046",
		// },
		// {
		// 	name: "Gitee",
		// 	icon: "mdi:git",
		// 	url: "https://gitee.com/matsuzakayuki",
		// },
		{
			name: "GitHub",
			icon: "fa7-brands:github",
			url: "https://github.com/whynotsnow",
		},
		// {
		// 	name: "Codeberg",
		// 	icon: "simple-icons:codeberg",
		// 	url: "https://codeberg.org",
		// },
		// {
		// 	name: "Discord",
		// 	icon: "fa7-brands:discord",
		// 	url: "https://discord.gg/MqW6TcQtVM",
		// },
	],
};
