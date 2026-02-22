<script lang="ts">
  import { PAGE_SIZE } from "@/constants/constants";
  import PaginationClient from "./PaginationClient.svelte";
  import { useCategoryPagination } from "./useCategoryPagination";
  import type { UIPost } from "./useCategoryPagination";
	import { onMount } from "svelte";
	import PostListView from "./PostListView.svelte";
	import type { PostNavigatorCategory } from "@utils/client-utils";

  export let posts: UIPost[];
  export let categories: PostNavigatorCategory[];

  // 从 URL 推导分页状态
  const { page, state } = useCategoryPagination({
    posts,
    pageSize: PAGE_SIZE,
  });


  onMount(() => {
    // console.log('onMount categories', categories)
  });

</script>
<!-- isTagMode会使用 Client渲染 列表和分页 -->
{#if $state.isTagMode}
  <PostListView  posts={$page.data} categories={categories} />
  <PaginationClient
    currentPage={$page.currentPage}
    lastPage={$page.lastPage}
    tag={$state.tag}
  />
{:else}
    <!-- SSG 快照 -->
    <slot />
{/if}



