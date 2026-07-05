<script lang="ts">
	import Icon from "@iconify/svelte";
	import type { MusicPlayerLabels } from "./types";

	export let isHidden = false;
	export let isLoading = false;
	export let isPlaying = false;
	export let labels: MusicPlayerLabels;
	export let onToggleHidden: () => void;
</script>

<div
	class="orb-player w-12 h-12 bg-(--primary) rounded-full shadow-lg cursor-pointer transition-all duration-500 ease-in-out flex items-center justify-center hover:scale-110 active:scale-95"
	class:opacity-0={!isHidden}
	class:scale-0={!isHidden}
	class:pointer-events-none={!isHidden}
	on:click={onToggleHidden}
	on:keydown={(event) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			onToggleHidden();
		}
	}}
	role="button"
	tabindex="0"
	aria-label={labels.show}
>
	{#if isLoading}
		<Icon icon="eos-icons:loading" class="text-white text-lg" />
	{:else if isPlaying}
		<div class="flex space-x-0.5">
			<div class="w-0.5 h-3 bg-white rounded-full animate-pulse"></div>
			<div
				class="w-0.5 h-4 bg-white rounded-full animate-pulse"
				style="animation-delay: 150ms;"
			></div>
			<div
				class="w-0.5 h-2 bg-white rounded-full animate-pulse"
				style="animation-delay: 300ms;"
			></div>
		</div>
	{:else}
		<Icon icon="material-symbols:music-note" class="text-white text-lg" />
	{/if}
</div>
