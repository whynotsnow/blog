<script lang="ts">
	import { onMount } from "svelte";
	import type { ClientPostCard } from "@/services/category-page";
	import { siteConfig } from "@/config";
	import PostCardView from "./PostCardView.svelte";
	import { initializePostList } from "@/features/post-list/controller";
	import "@/features/post-list/post-list.css";

	export let posts: ClientPostCard[];

	let container: HTMLDivElement | null = null;

	const defaultLayout: "grid" | "list" =
		siteConfig.postListLayout.defaultMode === "grid" ? "grid" : "list";

	onMount(() => {
		if (container) initializePostList(container);
	});
</script>

<div
	bind:this={container}
	id="post-list-container"
	class="post-list home-post-list"
	class:grid-mode={defaultLayout === "grid"}
	class:list-mode={defaultLayout !== "grid"}
	data-default-layout={defaultLayout}
	data-post-list-renderer="svelte"
>
	{#each posts as post (post.id)}
		<PostCardView {post} className="post-list__item" />
	{/each}
</div>
