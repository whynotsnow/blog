<script lang="ts">
	import LocalIcon from "@/components/ui/LocalIcon.svelte";
	import type { ClientPostCard } from "@/services/category-page";
	import I18nKey from "@/i18n/i18nKey";
	import { i18n } from "@/i18n/translation";
	import { formatDateToYYYYMMDD } from "@/utils/date-utils";
	import { siteConfig } from "@/config";
	import { formatPostCardWordCount } from "@/components/modules/post-list/word-count";

	export let post: Pick<ClientPostCard, "published" | "category" | "words">;

	$: wordCount =
		post.words > 0
			? formatPostCardWordCount(
					post.words,
					siteConfig.lang,
					i18n(
						post.words > 1 ? I18nKey.wordsCount : I18nKey.wordCount,
					),
				)
			: null;
</script>

<div class="post-list-card__meta ds-cluster">
	<div class="post-list-card__meta-item post-list-card__meta-item--date">
		<LocalIcon
			name="material-symbols:calendar-today-outline-rounded"
			class="post-list-card__meta-icon"
		/>
		<time datetime={post.published}>
			{formatDateToYYYYMMDD(post.published)}
		</time>
	</div>

	<div class="post-list-card__meta-item post-list-card__meta-item--category">
		<LocalIcon
			name="material-symbols:book-2-outline-rounded"
			class="post-list-card__meta-icon"
		/>
		<a
			href={post.category.url}
			class="post-list-card__meta-link link-lg transition"
			aria-label={`View all posts in the ${post.category.name} category`}
			title={post.category.name || i18n(I18nKey.uncategorized)}
		>
			{post.category.name || i18n(I18nKey.uncategorized)}
		</a>
	</div>

	{#if wordCount}
		<div class="post-list-card__meta-item post-list-card__meta-item--words">
			<LocalIcon
				name="material-symbols:article-outline-rounded"
				class="post-list-card__meta-icon"
			/>
			<span title={wordCount.exact}>{wordCount.display}</span>
		</div>
	{/if}
</div>
