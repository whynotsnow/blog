import {
	getCurrentItems,
	getTimelineByType,
	getTimelineStats,
	getTotalWorkExperience,
	timelineData,
	type TimelineItem,
} from "@/data/timeline";
import I18nKey from "@/i18n/i18nKey";
import { i18n } from "@/i18n/translation";

export type TimelineType = TimelineItem["type"];

export interface TimelineDisplayItem extends TimelineItem {
	displayDate: string;
	duration: string;
	typeIcon: string;
	typeLabel: string;
	typeBadgeClass: string;
}

export interface TimelinePageModel {
	title: string;
	subtitle: string;
	preloadIcons: string[];
	stats: ReturnType<typeof getTimelineStats>;
	currentItems: TimelineDisplayItem[];
	workExperience: ReturnType<typeof getTotalWorkExperience>;
	historyItems: TimelineDisplayItem[];
	labels: {
		total: string;
		work: string;
		projects: string;
		experience: string;
		current: string;
		history: string;
		startDate: string;
		duration: string;
	};
}

export function getTimelineTypeIcon(type: string) {
	switch (type) {
		case "education":
			return "material-symbols:school";
		case "work":
			return "material-symbols:work";
		case "project":
			return "material-symbols:code";
		case "achievement":
			return "material-symbols:emoji-events";
		default:
			return "material-symbols:event";
	}
}

function getTimelineTypeLabel(type: TimelineType) {
	switch (type) {
		case "education":
			return i18n(I18nKey.timelineEducation);
		case "work":
			return i18n(I18nKey.timelineWork);
		case "project":
			return i18n(I18nKey.timelineProject);
		case "achievement":
			return i18n(I18nKey.timelineAchievement);
	}
}

function getTimelineTypeBadgeClass(type: TimelineType) {
	switch (type) {
		case "education":
			return "bg-blue-600/20 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
		case "work":
			return "bg-green-600/20 text-green-700 dark:bg-green-900/30 dark:text-green-400";
		case "project":
			return "bg-purple-600/20 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
		case "achievement":
			return "bg-orange-600/20 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
	}
}

export function formatTimelineDate(dateString: string) {
	const date = new Date(dateString);
	return date.toLocaleDateString("zh-CN", { year: "numeric", month: "long" });
}

export function getTimelineDuration(startDate: string, endDate?: string) {
	const start = new Date(startDate);
	const end = endDate ? new Date(endDate) : new Date();
	const diffTime = Math.abs(end.getTime() - start.getTime());
	const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));

	if (diffMonths < 12) {
		return `${diffMonths} ${i18n(I18nKey.timelineMonths)}`;
	}
	const years = Math.floor(diffMonths / 12);
	const months = diffMonths % 12;
	if (months === 0) {
		return `${years} ${i18n(I18nKey.timelineYears)}`;
	}
	return `${years} ${i18n(I18nKey.timelineYears)} ${months} ${i18n(I18nKey.timelineMonths)}`;
}

function toDisplayItem(item: TimelineItem): TimelineDisplayItem {
	return {
		...item,
		displayDate: formatTimelineDate(item.startDate),
		duration: getTimelineDuration(item.startDate, item.endDate),
		typeIcon: item.icon || getTimelineTypeIcon(item.type),
		typeLabel: getTimelineTypeLabel(item.type),
		typeBadgeClass: getTimelineTypeBadgeClass(item.type),
	};
}

export function buildTimelinePageModel(): TimelinePageModel {
	const preloadIcons = timelineData
		.map((item) => item.icon || getTimelineTypeIcon(item.type))
		.filter(Boolean);

	return {
		title: i18n(I18nKey.timeline),
		subtitle: i18n(I18nKey.timelineSubtitle),
		preloadIcons,
		stats: getTimelineStats(),
		currentItems: getCurrentItems().map(toDisplayItem),
		workExperience: getTotalWorkExperience(),
		historyItems: getTimelineByType().map(toDisplayItem),
		labels: {
			total: i18n(I18nKey.timelineTotal),
			work: i18n(I18nKey.timelineWork),
			projects: i18n(I18nKey.timelineProjects),
			experience: i18n(I18nKey.timelineExperience),
			current: i18n(I18nKey.timelineCurrent),
			history: i18n(I18nKey.timelineHistory),
			startDate: i18n(I18nKey.timelineStartDate),
			duration: i18n(I18nKey.timelineDuration),
		},
	};
}
