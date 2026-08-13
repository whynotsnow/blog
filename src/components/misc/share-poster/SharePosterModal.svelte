<script lang="ts">
	import LocalIcon from "@/components/ui/LocalIcon.svelte";
	import type { SharePosterLabels } from "./types";

	export let posterImage: string | null;
	export let themeColor: string;
	export let copied: boolean;
	export let labels: SharePosterLabels;
	export let closeModal: () => void;
	export let copyLink: () => void;
	export let downloadPoster: () => void;

	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return {
			destroy() {
				if (node.parentNode) {
					node.parentNode.removeChild(node);
				}
			},
		};
	}
</script>

<div
	use:portal
	class="fixed inset-0 z-9999 flex items-center justify-center p-4 transition-opacity"
>
	<button
		type="button"
		class="absolute inset-0 bg-black/60 backdrop-blur-sm"
		aria-label="Close"
		on:click={closeModal}
	></button>
	<div
		class="relative bg-(--card-bg) rounded-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl transform transition-all"
	>
		<div
			class="p-6 flex justify-center bg-(--card-bg) min-h-[200px] items-center"
		>
			{#if posterImage}
				<img
					src={posterImage}
					alt="Poster"
					class="max-w-full h-auto shadow-lg rounded-lg"
				/>
			{:else}
				<div class="flex flex-col items-center gap-3">
					<div
						class="w-8 h-8 border-2 border-black/10 dark:border-white/10 rounded-full animate-spin"
						style="border-top-color: {themeColor}"
					></div>
					<span class="share-poster-modal__status text-60"
						>{labels.generatingPoster}</span
					>
				</div>
			{/if}
		</div>

		<div
			class="p-4 border-t border-black/5 dark:border-white/10 grid grid-cols-2 gap-3"
		>
			<button
				class="py-3 bg-(--btn-plain-bg-hover) text-75 rounded-xl font-medium hover:bg-(--btn-plain-bg-active) active:scale-[0.98] transition-all flex items-center justify-center gap-2"
				on:click={copyLink}
			>
				{#if copied}
					<LocalIcon
						name="material-symbols:check"
						class="text-[var(--text-card-title-size)]"
					/>
					<span>{labels.copied}</span>
				{:else}
					<LocalIcon
						name="material-symbols:link"
						class="text-[var(--text-card-title-size)]"
					/>
					<span>{labels.copyLink}</span>
				{/if}
			</button>
			<button
				class="py-3 text-white rounded-xl font-medium active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-90"
				style="background-color: {themeColor};"
				on:click={downloadPoster}
				disabled={!posterImage}
			>
				<LocalIcon
					name="material-symbols:download"
					class="text-[var(--text-card-title-size)]"
				/>
				{labels.savePoster}
			</button>
		</div>
	</div>
</div>

<style>
	.share-poster-modal__status {
		font-size: var(--text-ui-size);
	}
</style>
