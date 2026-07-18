<script lang="ts">
	import type { UIPost } from "./types";

	export let posts: UIPost[];
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
