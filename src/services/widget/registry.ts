import Categories from "@components/widget/Categories.astro";
import Tags from "@components/widget/Tags.astro";
import Profile from "@components/widget/Profile.astro";
import Announcement from "@components/widget/Announcement.astro";
import SiteStats from "@components/widget/SiteStats.astro";
import TOC from "@components/widget/TOC.astro";
import Calendar from "@components/widget/Calendar.astro";

export const widgetComponentRegistry = {
	"site-stats": SiteStats,
	categories: Categories,
	tags: Tags,
	toc: TOC,
	profile: Profile,
	calendar: Calendar,
	announcement: Announcement,
};

export type WidgetType = keyof typeof widgetComponentRegistry;
