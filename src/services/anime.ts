import fs from "node:fs";
import path from "node:path";

import { siteConfig } from "../config";
import localAnimeList from "../data/anime";
import I18nKey from "../i18n/i18nKey";
import { i18n } from "../i18n/translation";

export interface RawAnimeItem {
	title?: string;
	cover?: string;
	link?: string;
	status?: string;
	rating?: number | string;
	progress?: number | string;
	totalEpisodes?: number | string;
	description?: string;
	year?: string;
	studio?: string;
	genre?: string[];
}

export interface AnimeItem {
	title: string;
	cover: string;
	link: string;
	status: string;
	rating: number;
	progress: number;
	totalEpisodes: number;
	description: string;
	year: string;
	studio: string;
	genre: string[];
}

export interface AnimeStatusInfo {
	text: string;
	class: string;
	icon: string;
}

export interface AnimeFilterOption {
	status: string;
	text: string;
}

export interface AnimeLabels {
	year: string;
	studio: string;
}

export interface AnimePageModel {
	title: string;
	subtitle: string;
	mode: string;
	items: AnimeItem[];
	visibleItems: AnimeItem[];
	hiddenItems: AnimeItem[];
	initialDisplayCount: number;
	showEmptyState: boolean;
	emptyMessage: string;
	emptyDescription: string;
	statusMap: Record<string, AnimeStatusInfo>;
	filterOptions: AnimeFilterOption[];
	labels: AnimeLabels;
}

type AnimeSourceConfig =
	| { type: "local"; data: AnimeItem[] }
	| {
			type: "json";
			filename: string;
			fetchOnDev?: boolean;
			emptyDescription?: string;
	  };

const INITIAL_DISPLAY_COUNT = 24;

function loadAnimeData(filename: string): AnimeItem[] {
	const dataPath = path.join(process.cwd(), `src/data/${filename}`);

	if (!fs.existsSync(dataPath)) {
		console.warn(`[Anime] Data file not found: ${dataPath}`);
		return [];
	}

	try {
		const fileContent = fs.readFileSync(dataPath, "utf-8");
		const rawData = JSON.parse(fileContent) as RawAnimeItem[];

		return rawData.map((item) => ({
			title: item.title || "Unknown",
			cover: item.cover || "",
			link: item.link || "",
			status: item.status || "planned",
			rating: Number(item.rating) || 0,
			progress: Number(item.progress) || 0,
			totalEpisodes: Number(item.totalEpisodes) || 12,
			description: item.description || "",
			year: item.year || "",
			studio: item.studio || "",
			genre: Array.isArray(item.genre) ? item.genre : [],
		}));
	} catch (error) {
		console.error(`[Anime] Failed to parse ${filename}:`, error);
		return [];
	}
}

function buildStatusMap(): Record<string, AnimeStatusInfo> {
	return {
		watching: {
			text: i18n(I18nKey.animeStatusWatching),
			class: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
			icon: "▶",
		},
		completed: {
			text: i18n(I18nKey.animeStatusCompleted),
			class: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
			icon: "✓",
		},
		planned: {
			text: i18n(I18nKey.animeStatusPlanned),
			class: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
			icon: "❤",
		},
		onhold: {
			text: i18n(I18nKey.animeStatusOnHold),
			class: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
			icon: "⏸",
		},
		dropped: {
			text: i18n(I18nKey.animeStatusDropped),
			class: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
			icon: "✗",
		},
	};
}

function getSourceConfigs(): Record<string, AnimeSourceConfig> {
	return {
		local: {
			type: "local",
			data: localAnimeList,
		},
		bilibili: {
			type: "json",
			filename: "bilibili-data.json",
			fetchOnDev: siteConfig.bilibili?.fetchOnDev,
			emptyDescription: i18n(I18nKey.animeEmptyBilibili),
		},
		bangumi: {
			type: "json",
			filename: "bangumi-data.json",
			fetchOnDev: siteConfig.bangumi?.fetchOnDev,
			emptyDescription: i18n(I18nKey.animeEmptyBangumi),
		},
	};
}

function loadConfiguredAnimeList(
	mode: string,
	currentConfig: AnimeSourceConfig | undefined,
): AnimeItem[] {
	if (!currentConfig) {
		console.warn(`[Anime] Unknown or unconfigured mode: ${mode}`);
		return [];
	}

	if (currentConfig.type === "local") {
		return currentConfig.data;
	}

	const isDev = import.meta.env.DEV;
	const shouldFetchOnDev = currentConfig.fetchOnDev ?? false;
	const skipLoad = isDev && !shouldFetchOnDev;

	if (skipLoad) {
		console.log(`[Dev] Skipping ${mode} data load (fetchOnDev is off).`);
		return [];
	}

	return loadAnimeData(currentConfig.filename);
}

function resolveEmptyState(
	mode: string,
	items: AnimeItem[],
	currentConfig: AnimeSourceConfig | undefined,
) {
	const bangumiUserId = siteConfig.bangumi?.userId || "your-user-id";
	const bilibiliVmid = siteConfig.bilibili?.vmid || "";
	let emptyDescription = "";
	let showEmptyState = false;

	if (mode === "bilibili" && (!bilibiliVmid || bilibiliVmid === "")) {
		showEmptyState = true;
		emptyDescription = i18n(I18nKey.animeConfigBilibili);
	} else if (mode === "bangumi" && bangumiUserId === "your-user-id") {
		showEmptyState = true;
		emptyDescription = i18n(I18nKey.animeConfigBangumi);
	} else if (items.length === 0) {
		showEmptyState = true;
		if (
			currentConfig &&
			currentConfig.type === "json" &&
			currentConfig.emptyDescription
		) {
			emptyDescription = currentConfig.emptyDescription;
		} else if (mode === "local") {
			emptyDescription = i18n(I18nKey.animeEmptyLocal);
		} else {
			emptyDescription = "No anime data found.";
		}
	}

	return {
		showEmptyState,
		emptyMessage: i18n(I18nKey.animeEmpty),
		emptyDescription,
	};
}

function buildFilterOptions(mode: string): AnimeFilterOption[] {
	const options = [
		{ status: "all", text: i18n(I18nKey.animeFilterAll) },
		{ status: "watching", text: i18n(I18nKey.animeStatusWatching) },
		{ status: "planned", text: i18n(I18nKey.animeStatusPlanned) },
		{ status: "completed", text: i18n(I18nKey.animeStatusCompleted) },
	];

	if (mode === "bangumi") {
		options.push(
			{ status: "onhold", text: i18n(I18nKey.animeStatusOnHold) },
			{ status: "dropped", text: i18n(I18nKey.animeStatusDropped) },
		);
	}

	return options;
}

export function getAnimeStatusInfo(
	statusMap: Record<string, AnimeStatusInfo>,
	status: string,
): AnimeStatusInfo {
	return (
		statusMap[status] || {
			text: status,
			class: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
			icon: "?",
		}
	);
}

export function buildAnimePageModel(): AnimePageModel {
	const mode = siteConfig.anime?.mode || "bangumi";
	const sourceConfigs = getSourceConfigs();
	const currentConfig = sourceConfigs[mode];
	const items = loadConfiguredAnimeList(mode, currentConfig);
	const emptyState = resolveEmptyState(mode, items, currentConfig);

	return {
		title: i18n(I18nKey.anime),
		subtitle: i18n(I18nKey.animeSubtitle),
		mode,
		items,
		visibleItems: items.slice(0, INITIAL_DISPLAY_COUNT),
		hiddenItems: items.slice(INITIAL_DISPLAY_COUNT),
		initialDisplayCount: INITIAL_DISPLAY_COUNT,
		statusMap: buildStatusMap(),
		filterOptions: buildFilterOptions(mode),
		labels: {
			year: i18n(I18nKey.animeYear),
			studio: i18n(I18nKey.animeStudio),
		},
		...emptyState,
	};
}
