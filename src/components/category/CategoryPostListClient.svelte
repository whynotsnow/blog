<script lang="ts">
	import { CATEGORY_PAGE_SIZE } from "@/constants/constants";
	import type { PostNavigatorCategory } from "@/services/core/types";
	import PaginationClient from "@components/post/PaginationClient.svelte";
	import PostListView from "@components/post/PostListView.svelte";
	import CategoryFilter from "./CategoryFilter.svelte";
	import { useCategoryPagination } from "./category-page-client";

	export let categories: PostNavigatorCategory[];
	export let categorySlug: string;
	export let tagIndexUrl: string;
	export let resultCount: number;

	const activeCategory = categories.find(
		(category) => category.slug === categorySlug,
	);
	const {
		page,
		state: paginationState,
		loadState,
		retry,
	} = useCategoryPagination({
		tagIndexUrl,
		validTagSlugs: activeCategory?.tags.map((tag) => tag.slug) ?? [],
		pageSize: CATEGORY_PAGE_SIZE,
	});
</script>

<div
	id="page-content"
	class="listing-page category-page ds-stack w-full"
	style="--stack-space: var(--space-content);"
>
	<CategoryFilter
		{categories}
		{categorySlug}
		currentTag={$paginationState.isTagMode
			? $paginationState.tag
			: undefined}
		resultCount={$paginationState.isTagMode ? $page.total : resultCount}
	/>

	{#if $paginationState.isTagMode}
		{#if $loadState === "loading"}
			<div
				class="category-page__state ds-surface-card p-6 text-center text-(--text-secondary)"
				aria-live="polite"
				data-category-index-state="loading"
			>
				正在加载标签文章…
			</div>
		{:else if $loadState === "error"}
			<div
				class="category-page__state ds-surface-card p-6 text-center text-(--text-secondary)"
				aria-live="assertive"
				data-category-index-state="error"
			>
				<p>标签文章加载失败。</p>
				<button
					type="button"
					class="mt-3 rounded-(--radius-md) bg-(--accent) px-4 py-2 font-semibold text-(--text-on-accent)"
					on:click={() => void retry()}
				>
					重试
				</button>
			</div>
		{:else}
			<PostListView posts={$page.data} />
			<PaginationClient
				currentPage={$page.currentPage}
				lastPage={$page.lastPage}
				tag={$paginationState.tag}
			/>
		{/if}
	{:else}
		<slot />
	{/if}
</div>

<style>
	.category-page__state {
		font-size: 0.875rem;
	}
</style>
