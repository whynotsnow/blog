<script lang="ts">
	import type { UIPost } from "./types";

	export let posts: UIPost[];
</script>

<ul>
	{#each posts as post (post.id)}
		<li>
			<a href={`/posts/${post.id}/`}>
				{post.title}
			</a>
		</li>
	{/each}
</ul>
