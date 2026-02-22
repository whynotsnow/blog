<script lang="ts">
	import Icon from "@iconify/svelte";
	import { generatePages, HIDDEN } from "@utils/client-utils";

	export let currentPage: number;
	export let lastPage: number;
	export let tag: string | undefined = undefined;

	$: pages = generatePages(currentPage, lastPage);

	function go(p: number, e: MouseEvent) {
		e.preventDefault();
		if (p === currentPage) return;

		const url = new URL(window.location.href);

		if (tag) {
			url.searchParams.set("tag", tag);
			url.searchParams.set("tagPage", String(p));
		}

		window.location.assign(url.toString());
	}

</script>

<div
	id="category-pagination"
	class="flex flex-row gap-3 justify-center"
>
	<!-- Prev -->
	<a
		href="#"
		aria-label="Previous Page"
		class="btn-card overflow-hidden rounded-lg text-[var(--primary)] w-11 h-11"
		class:disabled={currentPage <= 1}
		on:click={(e) => currentPage > 1 && go(currentPage - 1, e)}
	>
		<Icon icon="material-symbols:chevron-left-rounded" class="text-[1.75rem]" />
	</a>

	<!-- Page numbers -->
	<div
		class="bg-[var(--card-bg)] flex flex-row rounded-lg items-center
		       text-neutral-700 dark:text-neutral-300 font-bold"
	>
		{#each pages as p}
			{#if p === HIDDEN}
				<Icon icon="material-symbols:more-horiz" class="mx-1" />

			{:else if p === currentPage}
				<div
					class="h-11 w-11 rounded-lg bg-[var(--primary)]
					       flex items-center justify-center
					       font-bold text-white dark:text-black/70"
				>
					{p}
				</div>

			{:else}
				<a
					href="#"
					aria-label={`Page ${p}`}
					class="btn-card w-11 h-11 rounded-lg overflow-hidden active:scale-[0.85]"
					on:click={(e) => go(p, e)}
				>
					{p}
				</a>
			{/if}
		{/each}
	</div>

	<!-- Next -->
	<a
		href="#"
		aria-label="Next Page"
		class="btn-card overflow-hidden rounded-lg text-[var(--primary)] w-11 h-11"
		class:disabled={currentPage >= lastPage}
		on:click={(e) =>{
			if(currentPage < lastPage) go(currentPage + 1, e)
		}}
	>
		<Icon icon="material-symbols:chevron-right-rounded" class="text-[1.75rem]" />
	</a>
</div>
