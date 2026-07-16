<script lang="ts">
	import { CATEGORY_PAGE_SIZE } from "@/constants/constants";
	import type { PostNavigatorCategory } from "@/services/core/types";
	import PaginationClient from "@components/post/PaginationClient.svelte";
	import PostListView from "@components/post/PostListView.svelte";
	import type { UIPost } from "@components/post/types";
	import CategoryFilter from "./CategoryFilter.svelte";
	import { useCategoryPagination } from "./category-page-client";

	export let posts: UIPost[];
	export let categories: PostNavigatorCategory[];
	export let categorySlug: string;
	export let resultCount: number;

	const { page, state: paginationState } = useCategoryPagination({
		posts,
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
		<PostListView posts={$page.data} />
		<PaginationClient
			currentPage={$page.currentPage}
			lastPage={$page.lastPage}
			tag={$paginationState.tag}
		/>
	{:else}
		<slot />
	{/if}
</div>
