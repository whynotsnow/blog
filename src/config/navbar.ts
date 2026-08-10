import {
	LinkPreset,
	type NavBarConfig,
	type NavBarLink,
} from "../types/config";
import { siteConfig } from "./site";

type FeaturePageKey = keyof typeof siteConfig.featurePages;
type NavBarItem = NavBarLink | LinkPreset;

type AutoNavBarConfig = {
	baseLinks: NavBarItem[];
	featureOrder: FeaturePageKey[];
	featureItems: Record<FeaturePageKey, NavBarItem>;
	extraLinks?: NavBarItem[];
};

const featurePageNavItems: Record<FeaturePageKey, NavBarItem> = {
	anime: LinkPreset.Anime,
	diary: LinkPreset.Diary,
	friends: LinkPreset.Friends,
	projects: LinkPreset.Projects,
	skills: LinkPreset.Skills,
	timeline: LinkPreset.Timeline,
	albums: {
		name: "Gallery",
		url: "/albums/",
		icon: "material-symbols:photo-library",
	},
	devices: LinkPreset.Devices,
};

const navBarAutoConfig: AutoNavBarConfig = {
	baseLinks: [LinkPreset.Home, LinkPreset.Archive],
	featureOrder: [
		"diary",
		"albums",
		"friends",
		"timeline",
		"anime",
		"projects",
		"skills",
		"devices",
	],
	featureItems: featurePageNavItems,
	extraLinks: [
		{
			name: "About",
			url: "/about/",
			icon: "material-symbols:info",
		},
	],
};

const createNavBarConfig = (config: AutoNavBarConfig): NavBarConfig => {
	const featureLinks = config.featureOrder
		.filter((featureKey) => siteConfig.featurePages[featureKey])
		.map((featureKey) => config.featureItems[featureKey]);

	return {
		links: [
			...config.baseLinks,
			...featureLinks,
			...(config.extraLinks ?? []),
		],
	};
};

export const navBarConfig: NavBarConfig = createNavBarConfig(navBarAutoConfig);
