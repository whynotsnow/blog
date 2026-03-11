<script lang="ts">
	import type { UIPost } from "./types";

	export let posts: UIPost[];
</script>

<ul>
	{#each posts as post}
		<li>
			<a href={`/posts/${post.id}/`}>
				{post.title}
			</a>
		</li>
	{/each}
</ul>
