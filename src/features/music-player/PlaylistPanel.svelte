<script lang="ts">
	import Icon from "@iconify/svelte";
	import { slide } from "svelte/transition";
	import type { MusicPlayerLabels, Song } from "./types";

	export let playlist: Song[] = [];
	export let currentIndex = 0;
	export let isPlaying = false;
	export let labels: MusicPlayerLabels;
	export let getAssetPath: (path: string) => string;
	export let onTogglePlaylist: () => void;
	export let onPlaySong: (index: number) => void;
</script>

<div
	class="playlist-panel float-panel fixed bottom-20 right-4 w-80 max-h-96 overflow-hidden z-50"
	transition:slide={{ duration: 300, axis: "y" }}
>
	<div
		class="playlist-header flex items-center justify-between p-4 border-b border-(--border-subtle)"
	>
		<h3 class="text-lg font-semibold text-90">{labels.playlist}</h3>
		<button
			class="btn-plain w-8 h-8 rounded-lg"
			on:click={onTogglePlaylist}
		>
			<Icon icon="material-symbols:close" class="text-lg" />
		</button>
	</div>
	<div class="playlist-content overflow-y-auto max-h-80 hide-scrollbar">
		{#each playlist as song, index (song.id)}
			<div
				class="playlist-item flex items-center gap-3 p-3 hover:bg-(--btn-plain-bg-hover) cursor-pointer transition-colors"
				class:bg-[var(--btn-plain-bg)]={index === currentIndex}
				class:text-[var(--accent)]={index === currentIndex}
				on:click={() => onPlaySong(index)}
				on:keydown={(event) => {
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						onPlaySong(index);
					}
				}}
				role="button"
				tabindex="0"
				aria-label="播放 {song.title} - {song.artist}"
			>
				<div class="w-6 h-6 flex items-center justify-center">
					{#if index === currentIndex && isPlaying}
						<Icon
							icon="material-symbols:graphic-eq"
							class="text-(--accent) animate-pulse"
						/>
					{:else if index === currentIndex}
						<Icon
							icon="material-symbols:pause"
							class="text-(--accent)"
						/>
					{:else}
						<span class="text-sm text-(--text-muted)"
							>{index + 1}</span
						>
					{/if}
				</div>
				<div
					class="w-10 h-10 rounded-lg overflow-hidden bg-(--btn-regular-bg) shrink-0"
				>
					<img
						src={getAssetPath(song.cover)}
						alt={song.title}
						loading="lazy"
						class="w-full h-full object-cover"
					/>
				</div>
				<div class="flex-1 min-w-0">
					<div
						class="font-medium truncate"
						class:text-[var(--accent)]={index === currentIndex}
						class:text-90={index !== currentIndex}
					>
						{song.title}
					</div>
					<div
						class="text-sm text-(--text-muted) truncate"
						class:text-[var(--accent)]={index === currentIndex}
					>
						{song.artist}
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>
