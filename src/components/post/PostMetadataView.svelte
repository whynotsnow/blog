<script lang="ts">
	import { onMount } from "svelte";
	import Icon from "@iconify/svelte";

	import type { PostMeta } from "./types";

	import { umamiConfig } from "@/config";
	import I18nKey from "@/i18n/i18nKey";
	import { i18n } from "@/i18n/translation";
	import { formatDateToYYYYMMDD } from "@/utils/date-utils";
	import { getCategoryUrl, getTagUrl } from "@/utils/url-utils";

	// ================== props ==================
	export let meta: PostMeta;

	export let hideUpdateDate = false;
	export let hideTagsForMobile = false;
	export let showOnlyBasicMeta = false;
	export let showWordCount = false;
	export let isHome = false;
	export let className = "";

	// ================== umami 解析 ==================
	const umamiEnabled = umamiConfig.enabled || false;
	const umamiWebsiteId =
		umamiConfig.scripts?.match(/data-website-id="([^"]+)"/)?.[1] || "";
	const umamiApiKey = umamiConfig.apiKey || "";
	const umamiBaseUrl = umamiConfig.baseUrl || "";

	// ================== 访问统计 ==================
	let pageViewsText = "统计加载中...";

	onMount(async () => {
		if (!umamiEnabled || !umamiWebsiteId || !meta.id || isHome) return;

		try {
			const pageUrl = `/posts/${meta.id}/`;

			// 假设 getUmamiPageStats 是全局函数 如果不是，需要显式 import
			const stats = await (window as any).getUmamiPageStats?.(
				umamiBaseUrl,
				umamiApiKey,
				umamiWebsiteId,
				pageUrl,
			);

			if (stats) {
				const pageViews = stats.pageviews || 0;
				const visitors = stats.visitors || 0;
				pageViewsText = `浏览量 ${pageViews} · 访客 ${visitors}`;
			} else {
				pageViewsText = "统计不可用";
			}
		} catch (e) {
			console.error("Error fetching page views:", e);
			pageViewsText = "统计不可用";
		}
	});
</script>

<div
	class={`flex flex-wrap text-neutral-500 dark:text-neutral-400
    items-center gap-4 gap-x-4 gap-y-2 text-sm ${className}`}
>
	<!-- publish date -->
	<div class="flex items-center">
		<div class="meta-icon">
			<Icon
				icon="material-symbols:calendar-today-outline-rounded"
				class="text-xl"
			/>
		</div>
		<span class="text-50 text-sm font-medium">
			{formatDateToYYYYMMDD(new Date(meta.published))}
		</span>
	</div>

	<!-- update date -->
	{#if !hideUpdateDate && meta.updated && new Date(meta.updated).getTime() !== new Date(meta.published).getTime()}
		<div class="flex items-center">
			<div class="meta-icon">
				<Icon
					icon="material-symbols:edit-calendar-outline-rounded"
					class="text-xl"
				/>
			</div>
			<span class="text-50 text-sm font-medium">
				{formatDateToYYYYMMDD(new Date(meta.updated))}
			</span>
		</div>
	{/if}

	<!-- category -->
	<div class="flex items-center">
		<div class="meta-icon">
			<Icon
				icon="material-symbols:book-2-outline-rounded"
				class="text-xl"
			/>
		</div>

		<div class="flex flex-row flex-nowrap items-center">
			{#if meta.category}
				<a
					href={getCategoryUrl(meta.category.name)}
					class="link-lg transition text-50 text-sm font-medium
                 hover:text-[var(--primary)] whitespace-nowrap"
				>
					{meta.category.name}
				</a>
			{:else}
				<span class="text-50 text-sm font-medium">
					{i18n(I18nKey.uncategorized)}
				</span>
			{/if}
		</div>
	</div>

	<!-- word count -->
	{#if showWordCount && meta.words}
		<div class="flex items-center">
			<div class="meta-icon">
				<Icon
					icon="material-symbols:article-outline-rounded"
					class="text-xl"
				/>
			</div>
			<span class="text-50 text-sm font-medium">
				{meta.words}
				{meta.words > 1
					? i18n(I18nKey.wordsCount)
					: i18n(I18nKey.wordCount)}
			</span>
		</div>
	{/if}

	<!-- tags -->
	{#if !showOnlyBasicMeta}
		<div
			class={`items-center ${
				hideTagsForMobile ? "hidden md:flex" : "flex"
			}`}
		>
			<div class="meta-icon">
				<Icon icon="material-symbols:tag-rounded" class="text-xl" />
			</div>

			<div class="flex flex-row flex-nowrap items-center">
				{#if meta.tags && meta.tags.length > 0}
					{#each meta.tags as tag, i}
						{#if i > 0}
							<div
								class="mx-1.5 text-[var(--meta-divider)] text-sm"
							>
								/
							</div>
						{/if}
						<a
							href={tag.url}
							class="link-lg transition text-50 text-sm font-medium
                     hover:text-[var(--primary)] whitespace-nowrap"
						>
							{tag.name}
						</a>
					{/each}
				{:else}
					<div class="transition text-50 text-sm font-medium">
						{i18n(I18nKey.noTags)}
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- page views -->
	{#if !isHome && umamiEnabled && meta.id}
		<div class="flex items-center">
			<div class="meta-icon">
				<Icon
					icon="material-symbols:visibility-outline-rounded"
					class="text-xl"
				/>
			</div>
			<span class="text-50 text-sm font-medium">
				{pageViewsText}
			</span>
		</div>
	{/if}
</div>
