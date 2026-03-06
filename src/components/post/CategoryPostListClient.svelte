<script lang="ts">
	import { PAGE_SIZE } from "@/constants/constants";
	import PaginationClient from "./PaginationClient.svelte";
	import { useCategoryPagination } from "./useCategoryPagination";
	import type { UIPost } from "./types";
	import PostListView from "./PostListView.svelte";
	import type { PostNavigatorCategory } from "@utils/client-utils";

	export let posts: UIPost[];
	export let categories: PostNavigatorCategory[];
	export let categorySlug: string;
	// 从 URL 推导分页状态
	const { page, state } = useCategoryPagination({
		posts,
		pageSize: PAGE_SIZE,
	});
</script>

<!-- isTagMode判断路由是否为tag如果是会使用 Client渲染 列表和分页 -->
{#if $state.isTagMode}
	<PostListView
		posts={$page.data}
		{categories}
		{categorySlug}
		tag={$state.tag}
	/>
	<PaginationClient
		currentPage={$page.currentPage}
		lastPage={$page.lastPage}
		tag={$state.tag}
	/>
{:else}
	<!-- 否则 为 SSG 快照 -->
	<slot />
{/if}
