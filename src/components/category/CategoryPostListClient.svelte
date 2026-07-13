<script lang="ts">
	import { CATEGORY_PAGE_SIZE } from "@/constants/constants";
	import type { PostNavigatorCategory } from "@/services/core/types";
	import PaginationClient from "@components/post/PaginationClient.svelte";
	import PostListView from "@components/post/PostListView.svelte";
	import type { UIPost } from "@components/post/types";
	import { useCategoryPagination } from "./category-page-client";

	export let posts: UIPost[];
	export let categories: PostNavigatorCategory[];
	export let categorySlug: string;

	const { page, state: paginationState } = useCategoryPagination({
		posts,
		pageSize: CATEGORY_PAGE_SIZE,
	});
</script>

{#if $paginationState.isTagMode}
	<PostListView
		posts={$page.data}
		{categories}
		{categorySlug}
		tag={$paginationState.tag}
		resultCount={$page.total}
	/>
	<PaginationClient
		currentPage={$page.currentPage}
		lastPage={$page.lastPage}
		tag={$paginationState.tag}
	/>
{:else}
	<slot />
{/if}
