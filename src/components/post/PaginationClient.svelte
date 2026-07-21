<script lang="ts">
	import LocalIcon from "@/components/ui/LocalIcon.svelte";
	import { generatePages, HIDDEN } from "@utils/pagination";

	export let currentPage: number;
	export let lastPage: number;
	export let tag: string | undefined = undefined;

	$: pages = generatePages(currentPage, lastPage);

	function buildUrl(p: number): string {
		const url = new URL(window.location.href);

		if (tag) {
			url.searchParams.set("tag", tag);
			url.searchParams.set("tagPage", String(p));
		}

		return url.toString();
	}
</script>

<div id="category-pagination" class="flex flex-row gap-3 justify-center">
	<!-- Prev -->
	<a
		href={currentPage > 1 ? buildUrl(currentPage - 1) : "#"}
		aria-label="Previous Page"
		class="btn-card overflow-hidden rounded-lg text-[var(--primary)] w-11 h-11"
		class:disabled={currentPage <= 1}
		aria-disabled={currentPage <= 1}
		tabindex={currentPage <= 1 ? -1 : 0}
	>
		<LocalIcon
			name="material-symbols:chevron-left-rounded"
			class="text-[1.75rem]"
		/>
	</a>

	<!-- Page numbers -->
	<div
		class="bg-[var(--card-bg)] flex flex-row rounded-lg items-center
		       text-neutral-700 dark:text-neutral-300 font-bold"
	>
		{#each pages as p, index (`${p}-${index}`)}
			{#if p === HIDDEN}
				<LocalIcon name="material-symbols:more-horiz" class="mx-1" />
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
					href={buildUrl(p)}
					aria-label={`Page ${p}`}
					class="btn-card w-11 h-11 rounded-lg overflow-hidden active:scale-[0.85]"
				>
					{p}
				</a>
			{/if}
		{/each}
	</div>

	<!-- Next -->
	<a
		href={currentPage < lastPage ? buildUrl(currentPage + 1) : "#"}
		aria-label="Next Page"
		class="btn-card overflow-hidden rounded-lg text-[var(--primary)] w-11 h-11"
		class:disabled={currentPage >= lastPage}
		aria-disabled={currentPage >= lastPage}
		tabindex={currentPage >= lastPage ? -1 : 0}
	>
		<LocalIcon
			name="material-symbols:chevron-right-rounded"
			class="text-[1.75rem]"
		/>
	</a>
</div>
