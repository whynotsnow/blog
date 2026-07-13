<script lang="ts">
	import { onMount } from "svelte";
	import type { UIPost } from "./types";
	import { siteConfig } from "@/config";
	import PostCardView from "./PostCardView.svelte";
	import type { PostNavigatorCategory } from "@utils/client-utils";
	import PostTaxonomyNav from "./PostTaxonomyNav.svelte";
	import { initializePostList } from "@/features/post-list/controller";
	import "@/features/post-list/post-list.css";

	export let posts: UIPost[];
	export let categories: PostNavigatorCategory[];
	export let categorySlug: string;
	export let tag: string | undefined = undefined;
	export let resultCount: number = posts.length;

	let container: HTMLDivElement | null = null;

	const defaultLayout: "grid" | "list" =
		siteConfig.postListLayout.defaultMode === "grid" ? "grid" : "list";

	onMount(() => {
		if (container) initializePostList(container);
	});
</script>

<div
	id="page-content"
	class="listing-page category-page home-post-feed ds-stack mx-auto w-full"
	style="--stack-space: var(--size-4);"
>
	<PostTaxonomyNav
		{categories}
		currentCategory={categorySlug}
		currentTag={tag}
	/>
	<p class="text-sm text-(--text-secondary)">{resultCount} 篇文章</p>

	<div
		bind:this={container}
		id="post-list-container"
		class="post-list home-post-list rounded-[var(--radius-large)] bg-[var(--surface-card)] md:bg-transparent mb-4"
		class:grid-mode={defaultLayout === "grid"}
		class:list-mode={defaultLayout !== "grid"}
		data-default-layout={defaultLayout}
		data-post-list-renderer="svelte"
	>
		{#each posts as post (post.id)}
			<PostCardView {post} className="post-list__item" />
		{/each}
	</div>
</div>
