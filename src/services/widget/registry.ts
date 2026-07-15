import Categories from "@components/taxonomy/CategoriesPanel.astro";
import Tags from "@components/taxonomy/TagsPanel.astro";
import Profile from "@components/profile/ProfileCard.astro";

export const widgetComponentRegistry = {
	categories: Categories,
	tags: Tags,
	profile: Profile,
};

export type WidgetType = keyof typeof widgetComponentRegistry;
