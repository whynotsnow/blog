<script lang="ts">
	import { onMount } from "svelte";
	import type { ClientPostCard } from "@/services/category-page";
	import PostCardView from "./PostCardView.svelte";
	import { initializePostList } from "@/components/modules/post-list/controller";
	import "@/components/modules/post-list/post-list.css";

	export let posts: ClientPostCard[];

	let container: HTMLDivElement | null = null;

	onMount(() => {
		if (container) initializePostList(container);
	});
</script>

<div
	bind:this={container}
	id="post-list-container"
	class="post-list post-list-grid grid-mode"
	data-default-layout="grid"
	data-post-list-renderer="svelte"
>
	{#each posts as post (post.id)}
		<PostCardView {post} className="post-list__item" />
	{/each}
</div>
