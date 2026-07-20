<script lang="ts">
	import Icon from "@iconify/svelte";
	import type { MusicPlayerLabels, Song } from "./types";

	export let currentSong: Song;
	export let isExpanded = false;
	export let isHidden = false;
	export let isLoading = false;
	export let isPlaying = false;
	export let labels: MusicPlayerLabels;
	export let getAssetPath: (path: string) => string;
	export let onTogglePlay: () => void;
	export let onToggleExpanded: () => void;
	export let onToggleHidden: () => void;
</script>

<div
	class="mini-player card-base bg-(--surface-overlay) shadow-xl rounded-2xl p-3"
	class:opacity-0={isExpanded || isHidden}
	class:scale-95={isExpanded || isHidden}
	class:pointer-events-none={isExpanded || isHidden}
>
	<div class="flex items-center gap-3">
		<div
			class="mini-player__cover cover-container relative w-12 h-12 rounded-full overflow-hidden cursor-pointer"
			on:click={onTogglePlay}
			on:keydown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					onTogglePlay();
				}
			}}
			role="button"
			tabindex="0"
			aria-label={isPlaying ? labels.pause : labels.play}
		>
			<img
				src={getAssetPath(currentSong.cover)}
				alt={labels.cover}
				class="w-full h-full object-cover transition-transform duration-300"
				class:spinning={isPlaying && !isLoading}
				class:animate-pulse={isLoading}
			/>
			<div
				class="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
			>
				{#if isLoading}
					<Icon icon="eos-icons:loading" class="text-white text-xl" />
				{:else if isPlaying}
					<Icon
						icon="material-symbols:pause"
						class="text-white text-xl"
					/>
				{:else}
					<Icon
						icon="material-symbols:play-arrow"
						class="text-white text-xl"
					/>
				{/if}
			</div>
		</div>

		<div
			class="mini-player__meta flex-1 min-w-0 cursor-pointer"
			on:click={onToggleExpanded}
			on:keydown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					onToggleExpanded();
				}
			}}
			role="button"
			tabindex="0"
			aria-label={labels.expand}
		>
			<div class="text-sm font-medium text-90 truncate">
				{currentSong.title}
			</div>
			<div class="text-xs text-50 truncate">{currentSong.artist}</div>
		</div>

		<div class="mini-player__actions flex items-center gap-1">
			<button
				class="btn-plain w-8 h-8 rounded-lg flex items-center justify-center"
				on:click|stopPropagation={onToggleHidden}
				title={labels.collapse}
			>
				<Icon icon="material-symbols:visibility-off" class="text-lg" />
			</button>
			<button
				class="btn-plain w-8 h-8 rounded-lg flex items-center justify-center"
				on:click|stopPropagation={onToggleExpanded}
			>
				<Icon icon="material-symbols:expand-less" class="text-lg" />
			</button>
		</div>
	</div>
</div>
