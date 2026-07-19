<script lang="ts">
	import type { PostCardViewModel } from "./types";

	export let posts: PostCardViewModel[];
</script>

<ul>
	{#each posts as post (post.id)}
		<li>
			<a href={post.url}>
				{post.title}
			</a>
		</li>
	{/each}
</ul>
