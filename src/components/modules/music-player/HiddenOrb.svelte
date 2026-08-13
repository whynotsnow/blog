<script lang="ts">
	import LocalIcon from "@/components/ui/LocalIcon.svelte";
	import type { MusicPlayerLabels } from "./types";

	export let cover = "";
	export let isHidden = false;
	export let isLoading = false;
	export let isPlaylistLoading = false;
	export let isPlaying = false;
	export let labels: MusicPlayerLabels;
	export let getAssetPath: (path: string) => string;
	export let onToggleHidden: () => void;

	let coverFailed = false;
	let previousCover = "";

	$: if (cover !== previousCover) {
		previousCover = cover;
		coverFailed = false;
	}
	$: coverSrc = cover ? getAssetPath(cover) : "";
	$: hasCover = !isPlaylistLoading && Boolean(coverSrc) && !coverFailed;
</script>

<div
	class="orb-player w-12 h-12 rounded-full cursor-pointer flex items-center justify-center"
	class:orb-player--fallback={!hasCover}
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
	aria-label={labels.expand}
>
	{#if hasCover}
		<img
			src={coverSrc}
			alt={labels.cover}
			class="orb-player__cover"
			class:spinning={isPlaying && !isLoading}
			on:error={() => (coverFailed = true)}
		/>
		{#if isLoading}
			<span class="orb-player__status" aria-hidden="true">
				<span class="local-loading-icon"></span>
			</span>
		{:else if isPlaying}
			<span
				class="orb-player__status orb-player__status--playing"
				aria-hidden="true"
			>
				<span></span><span></span><span></span>
			</span>
		{/if}
	{:else}
		<span
			class="orb-player__fallback-icon"
			class:orb-player__fallback-icon--loading={isPlaylistLoading}
			aria-hidden="true"
		>
			<LocalIcon name="material-symbols:music-note-rounded" />
		</span>
	{/if}
</div>

<style>
	.local-loading-icon {
		width: 1em;
		height: 1em;
		border: 2px solid currentcolor;
		border-right-color: transparent;
		border-radius: 999px;
		animation: local-icon-spin 0.75s linear infinite;
	}

	@keyframes local-icon-spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
