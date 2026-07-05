<script lang="ts">
	import Icon from "@iconify/svelte";
	import type { MusicPlayerLabels, RepeatMode, Song } from "./types";

	export let currentSong: Song;
	export let currentTime = 0;
	export let duration = 0;
	export let isExpanded = false;
	export let isLoading = false;
	export let isPlaying = false;
	export let isShuffled = false;
	export let isRepeating: RepeatMode = 0;
	export let isMuted = false;
	export let isVolumeDragging = false;
	export let playlistLength = 0;
	export let showPlaylist = false;
	export let volume = 0.7;
	export let progressBar: HTMLElement;
	export let volumeBar: HTMLElement;
	export let labels: MusicPlayerLabels;
	export let getAssetPath: (path: string) => string;
	export let formatTime: (seconds: number) => string;
	export let onToggleHidden: () => void;
	export let onTogglePlaylist: () => void;
	export let onSetProgress: (event: MouseEvent) => void;
	export let onToggleShuffle: () => void;
	export let onPreviousSong: () => void;
	export let onTogglePlay: () => void;
	export let onNextSong: () => void;
	export let onToggleRepeat: () => void;
	export let onToggleMute: () => void;
	export let onStartVolumeDrag: (event: PointerEvent) => void;
	export let onToggleExpanded: () => void;
	export let onProgressKeyboardSeek: () => void;
</script>

<div
	class="expanded-player card-base bg-(--float-panel-bg) shadow-xl rounded-2xl p-4 transition-all duration-500 ease-in-out"
	class:opacity-0={!isExpanded}
	class:scale-95={!isExpanded}
	class:pointer-events-none={!isExpanded}
>
	<div class="flex items-center gap-4 mb-4">
		<div
			class="cover-container relative w-16 h-16 rounded-full overflow-hidden shrink-0"
		>
			<img
				src={getAssetPath(currentSong.cover)}
				alt={labels.cover}
				class="w-full h-full object-cover transition-transform duration-300"
				class:spinning={isPlaying && !isLoading}
				class:animate-pulse={isLoading}
			/>
		</div>
		<div class="flex-1 min-w-0">
			<div class="song-title text-lg font-bold text-90 truncate mb-1">
				{currentSong.title}
			</div>
			<div class="song-artist text-sm text-50 truncate">
				{currentSong.artist}
			</div>
			<div class="text-xs text-30 mt-1">
				{formatTime(currentTime)} / {formatTime(duration)}
			</div>
		</div>
		<div class="flex items-center gap-1">
			<button
				class="btn-plain w-8 h-8 rounded-lg flex items-center justify-center"
				on:click={onToggleHidden}
				title={labels.hide}
			>
				<Icon icon="material-symbols:visibility-off" class="text-lg" />
			</button>
			<button
				class="btn-plain w-8 h-8 rounded-lg flex items-center justify-center"
				class:text-[var(--primary)]={showPlaylist}
				on:click={onTogglePlaylist}
				title={labels.playlist}
			>
				<Icon icon="material-symbols:queue-music" class="text-lg" />
			</button>
		</div>
	</div>

	<div class="progress-section mb-4">
		<div
			class="progress-bar flex-1 h-2 bg-(--btn-regular-bg) rounded-full cursor-pointer"
			bind:this={progressBar}
			on:click={onSetProgress}
			on:keydown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					onProgressKeyboardSeek();
				}
			}}
			role="slider"
			tabindex="0"
			aria-label={labels.progress}
			aria-valuemin="0"
			aria-valuemax="100"
			aria-valuenow={duration > 0 ? (currentTime / duration) * 100 : 0}
		>
			<div
				class="h-full bg-(--primary) rounded-full transition-all duration-100"
				style="width: {duration > 0
					? (currentTime / duration) * 100
					: 0}%"
			></div>
		</div>
	</div>

	<div class="controls flex items-center justify-center gap-2 mb-4">
		<button
			class="w-10 h-10 rounded-lg"
			class:btn-regular={isShuffled}
			class:btn-plain={!isShuffled}
			on:click={onToggleShuffle}
			disabled={playlistLength <= 1}
		>
			<Icon icon="material-symbols:shuffle" class="text-lg" />
		</button>
		<button
			class="btn-plain w-10 h-10 rounded-lg"
			on:click={onPreviousSong}
			disabled={playlistLength <= 1}
		>
			<Icon icon="material-symbols:skip-previous" class="text-xl" />
		</button>
		<button
			class="btn-regular w-12 h-12 rounded-full"
			class:opacity-50={isLoading}
			disabled={isLoading}
			on:click={onTogglePlay}
		>
			{#if isLoading}
				<Icon icon="eos-icons:loading" class="text-xl" />
			{:else if isPlaying}
				<Icon icon="material-symbols:pause" class="text-xl" />
			{:else}
				<Icon icon="material-symbols:play-arrow" class="text-xl" />
			{/if}
		</button>
		<button
			class="btn-plain w-10 h-10 rounded-lg"
			on:click={onNextSong}
			disabled={playlistLength <= 1}
		>
			<Icon icon="material-symbols:skip-next" class="text-xl" />
		</button>
		<button
			class="w-10 h-10 rounded-lg"
			class:btn-regular={isRepeating > 0}
			class:btn-plain={isRepeating === 0}
			on:click={onToggleRepeat}
		>
			{#if isRepeating === 1}
				<Icon icon="material-symbols:repeat-one" class="text-lg" />
			{:else if isRepeating === 2}
				<Icon icon="material-symbols:repeat" class="text-lg" />
			{:else}
				<Icon
					icon="material-symbols:repeat"
					class="text-lg opacity-50"
				/>
			{/if}
		</button>
	</div>

	<div class="bottom-controls flex items-center gap-2">
		<button class="btn-plain w-8 h-8 rounded-lg" on:click={onToggleMute}>
			{#if isMuted || volume === 0}
				<Icon icon="material-symbols:volume-off" class="text-lg" />
			{:else if volume < 0.5}
				<Icon icon="material-symbols:volume-down" class="text-lg" />
			{:else}
				<Icon icon="material-symbols:volume-up" class="text-lg" />
			{/if}
		</button>
		<div
			class="flex-1 h-2 bg-(--btn-regular-bg) rounded-full cursor-pointer touch-none"
			bind:this={volumeBar}
			on:pointerdown={onStartVolumeDrag}
			on:keydown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					if (event.key === "Enter") onToggleMute();
				}
			}}
			role="slider"
			tabindex="0"
			aria-label={labels.volume}
			aria-valuemin="0"
			aria-valuemax="100"
			aria-valuenow={volume * 100}
		>
			<div
				class="h-full bg-(--primary) rounded-full transition-all"
				class:duration-100={!isVolumeDragging}
				class:duration-0={isVolumeDragging}
				style="width: {volume * 100}%"
			></div>
		</div>
		<button
			class="btn-plain w-8 h-8 rounded-lg flex items-center justify-center"
			on:click={onToggleExpanded}
			title={labels.collapse}
		>
			<Icon icon="material-symbols:expand-more" class="text-lg" />
		</button>
	</div>
</div>
