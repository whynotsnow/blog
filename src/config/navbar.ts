import { LinkPreset, type NavBarConfig } from "../types/config";

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		{
			name: "Diary",
			url: "/diary/",
			icon: "material-symbols:book",
		},
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
	],
};
