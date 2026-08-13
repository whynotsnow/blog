import { UNCATEGORIZED } from "@/constants/constants";
import {
	getAllTechStack,
	getFeaturedProjects,
	getProjectStats,
	getProjectsByCategory,
	projectsData,
	type Project,
} from "@/data/projects";
import I18nKey from "@/i18n/i18nKey";
import { i18n } from "@/i18n/translation";

export interface ProjectCategoryGroup {
	category: Project["category"] | typeof UNCATEGORIZED;
	label: string;
	projects: Project[];
}

export interface ProjectsPageModel {
	title: string;
	subtitle: string;
	stats: ReturnType<typeof getProjectStats>;
	featuredProjects: Project[];
	allTechStack: string[];
	categories: ProjectCategoryGroup[];
}

function getCategoryText(category: string): string {
	switch (category) {
		case "web":
			return i18n(I18nKey.projectsWeb);
		case "mobile":
			return i18n(I18nKey.projectsMobile);
		case "desktop":
			return i18n(I18nKey.projectsDesktop);
		case "other":
			return i18n(I18nKey.projectsOther);
		case UNCATEGORIZED:
			return i18n(I18nKey.uncategorized);
		default:
			return category;
	}
}

export function buildProjectsPageModel(): ProjectsPageModel {
	const categories = [
		...new Set(projectsData.map((project) => project.category)),
	];

	return {
		title: i18n(I18nKey.projects),
		subtitle: i18n(I18nKey.projectsSubtitle),
		stats: getProjectStats(),
		featuredProjects: getFeaturedProjects(),
		allTechStack: getAllTechStack(),
		categories: categories.map((category) => ({
			category,
			label: getCategoryText(category),
			projects: getProjectsByCategory(category),
		})),
	};
}
