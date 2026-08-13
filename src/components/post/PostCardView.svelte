<script lang="ts">
	import LocalIcon from "@/components/ui/LocalIcon.svelte";
	import type { ClientPostCard } from "@/services/category-page";
	import { siteConfig } from "@/config";
	import I18nKey from "@/i18n/i18nKey";
	import { i18n } from "@/i18n/translation";
	import ImageWrapper from "./ImageWrapper.svelte";
	import PostCardMeta from "./PostCardMeta.svelte";

	// ========= props =========
	export let post: ClientPostCard;
	export let className = "";
	export let style: string | undefined = undefined;

	// ========= 派生数据 =========
	const hasCover = Boolean(post.image?.src);
	const coverWidth = "28%";
	const useNewTagStyle = Boolean(siteConfig.tagStyle?.useNewStyle);

	const url = post.url;

	// data-tags
	const dataTags = post.tags?.map((t) => t.name).join(",") ?? "";
</script>

<div
	class={`post-card post-item post-list-card ds-surface-card ${className}`}
	style={`--coverWidth:${coverWidth}; ${style ?? ""}`}
	data-tags={dataTags}
	data-card-variant="adaptive"
	data-has-cover={hasCover}
	data-has-description={Boolean(post.summary)}
	data-tag-style={useNewTagStyle ? "new" : "legacy"}
	data-pinned={post.pinned}
>
	<!-- ================= 内容区域 ================= -->
	<div class="post-list-card__content">
		<!-- ================= 标题 ================= -->
		<a
			href={url}
			class="post-list-card__title transition"
			title={post.title}
		>
			{post.title}

			<!-- 移动端箭头 -->
			<LocalIcon
				name="material-symbols:chevron-right-rounded"
				class="post-list-card__title-chevron post-list-card__title-chevron--mobile"
			/>

			<!-- 桌面 hover 箭头 -->
			<LocalIcon
				name="material-symbols:chevron-right-rounded"
				class="post-list-card__title-chevron post-list-card__title-chevron--desktop transition"
			/>
		</a>

		<!-- ================= Meta ================= -->
		<PostCardMeta {post} />

		<!-- ================= 描述 ================= -->
		<div
			class="post-list-card__summary transition text-75"
			title={post.summary}
		>
			{post.summary}
		</div>

		<!-- ================= 标签 ================= -->
		<div class="post-list-card__tags">
			{#if post.tags && post.tags.length > 0}
				{#each post.tags.slice(0, 6) as tag (tag.slug)}
					<a
						href={tag.url}
						class={`post-list-card__tag transition ${useNewTagStyle ? "link-lg" : "btn-regular"}`}
						aria-label={`View all posts tagged with ${tag.name}`}
						title={tag.name}
					>
						<span
							class="post-list-card__tag-label transition-transform"
						>
							# {tag.name}
						</span>
					</a>
				{/each}
			{:else}
				<span class="post-list-card__tag-empty"
					>{i18n(I18nKey.noTags)}</span
				>
			{/if}
		</div>
	</div>

	<!-- ================= 封面区域 ================= -->
	<a href={url} aria-label={post.title} class="post-list-card__cover">
		{#if post.pinned}
			<span class="post-list-card__pinned-badge">
				{i18n(I18nKey.pinned)}
			</span>
		{/if}

		<!-- hover 蒙层 -->
		<div class="post-list-card__cover-overlay transition"></div>

		<!-- 中心箭头 -->
		<div class="post-list-card__cover-enter">
			<LocalIcon
				name="material-symbols:chevron-right-rounded"
				class="post-list-card__cover-enter-icon transition"
			/>
		</div>

		{#if hasCover}
			<ImageWrapper
				src={post.image}
				alt={post.title}
				className="post-list-card__image"
				loading="lazy"
			/>
		{:else}
			<div class="post-list-card__cover-placeholder" aria-hidden="true">
				<LocalIcon
					name="material-symbols:article-outline-rounded"
					class="post-list-card__cover-placeholder-icon"
				/>
			</div>
		{/if}
	</a>
</div>
