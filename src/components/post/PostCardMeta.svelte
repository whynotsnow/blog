<script lang="ts">
	import Icon from "@iconify/svelte";
	import type { UIPost } from "@/services/core/types";
	import I18nKey from "@/i18n/i18nKey";
	import { i18n } from "@/i18n/translation";
	import { formatDateToYYYYMMDD } from "@/utils/date-utils";
	import { siteConfig } from "@/config";
	import { formatPostCardWordCount } from "@/features/post-list/word-count";

	export let post: Pick<UIPost, "published" | "category" | "meta">;

	$: wordCount =
		post.meta.words > 0
			? formatPostCardWordCount(
					post.meta.words,
					siteConfig.lang,
					i18n(
						post.meta.words > 1
							? I18nKey.wordsCount
							: I18nKey.wordCount,
					),
				)
			: null;
</script>

<div class="home-post-card__meta ds-cluster">
	<div class="home-post-card__meta-item home-post-card__meta-item--date">
		<Icon
			icon="material-symbols:calendar-today-outline-rounded"
			class="home-post-card__meta-icon"
		/>
		<time datetime={post.published.toISOString()}>
			{formatDateToYYYYMMDD(post.published)}
		</time>
	</div>

	<div class="home-post-card__meta-item home-post-card__meta-item--category">
		<Icon
			icon="material-symbols:book-2-outline-rounded"
			class="home-post-card__meta-icon"
		/>
		<a
			href={post.category.url}
			class="home-post-card__meta-link link-lg transition"
			aria-label={`View all posts in the ${post.category.name} category`}
			title={post.category.name || i18n(I18nKey.uncategorized)}
		>
			{post.category.name || i18n(I18nKey.uncategorized)}
		</a>
	</div>

	{#if wordCount}
		<div class="home-post-card__meta-item home-post-card__meta-item--words">
			<Icon
				icon="material-symbols:article-outline-rounded"
				class="home-post-card__meta-icon"
			/>
			<span title={wordCount.exact}>{wordCount.display}</span>
		</div>
	{/if}
</div>
