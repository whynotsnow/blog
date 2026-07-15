import Categories from "@components/widget/Categories.astro";
import Tags from "@components/widget/Tags.astro";
import Profile from "@components/widget/Profile.astro";
import TOC from "@components/widget/TOC.astro";
import Calendar from "@components/widget/Calendar.astro";

export const widgetComponentRegistry = {
	categories: Categories,
	tags: Tags,
	toc: TOC,
	profile: Profile,
	calendar: Calendar,
};

export type WidgetType = keyof typeof widgetComponentRegistry;
