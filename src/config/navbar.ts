import { LinkPreset, type NavBarConfig } from "../types/config";

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		// 支持自定义导航栏链接，支持多级菜单
		// {
		// 	name: "Links",
		// 	url: "/links/",
		// 	icon: "material-symbols:link",
		// 	children: [
		// 		{
		// 			name: "GitHub",
		// 			url: "https://github.com/matsuzaka-yuki/Mizuki",
		// 			external: true,
		// 			icon: "fa7-brands:github",
		// 		},
		// 		{
		// 			name: "Bilibili",
		// 			url: "https://space.bilibili.com/701864046",
		// 			external: true,
		// 			icon: "fa7-brands:bilibili",
		// 		},
		// 		{
		// 			name: "Gitee",
		// 			url: "https://gitee.com/matsuzakayuki/Mizuki",
		// 			external: true,
		// 			icon: "mdi:git",
		// 		},
		// 	],
		// },
		{
			name: "Diary",
			url: "/diary/",
			icon: "material-symbols:book",
		},
		// {
		// 	name: "My",
		// 	url: "/content/",
		// 	icon: "material-symbols:person",
		// 	children: [
		// 		{
		// 			name: "Anime",
		// 			url: "/anime/",
		// 			icon: "material-symbols:movie",
		// 		},
		// 		{
		// 			name: "Diary",
		// 			url: "/diary/",
		// 			icon: "material-symbols:book",
		// 		},
		// 		{
		// 			name: "Gallery",
		// 			url: "/albums/",
		// 			icon: "material-symbols:photo-library",
		// 		},
		// 		{
		// 			name: "Devices",
		// 			url: "devices/",
		// 			icon: "material-symbols:devices",
		// 			external: false,
		// 		},
		// 	],
		// },
		{
			name: "About",
			url: "/about/",
			icon: "material-symbols:info",
		},
		{
			name: "Friends",
			url: "/friends/",
			icon: "material-symbols:group",
		},
		{
			name: "Timeline",
			url: "/timeline/",
			icon: "material-symbols:timeline",
		},
		// {
		// 	name: "Others",
		// 	url: "#",
		// 	icon: "material-symbols:more-horiz",
		// 	children: [
		// 		{
		// 			name: "Projects",
		// 			url: "/projects/",
		// 			icon: "material-symbols:work",
		// 		},
		// 		{
		// 			name: "Skills",
		// 			url: "/skills/",
		// 			icon: "material-symbols:psychology",
		// 		},
		// 		{
		// 			name: "Timeline",
		// 			url: "/timeline/",
		// 			icon: "material-symbols:timeline",
		// 		},
		// 	],
		// },
	],
};
