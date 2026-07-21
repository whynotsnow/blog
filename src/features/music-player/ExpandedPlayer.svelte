<script lang="ts">
	import LocalIcon from "@/components/ui/LocalIcon.svelte";
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

<section id="music-player-panel" hidden={!isExpanded} class="expanded-player">
	<header class="player-summary">
		<div class="cover-container player-cover">
			<img
				src={getAssetPath(currentSong.cover)}
				alt={labels.cover}
				class:spinning={isPlaying && !isLoading}
				class:animate-pulse={isLoading}
			/>
		</div>

		<div class="player-copy">
			<h2 class="song-title">{currentSong.title}</h2>
			<p class="song-artist">{currentSong.artist}</p>
			<span>{formatTime(currentTime)} / {formatTime(duration)}</span>
		</div>

		<div class="player-actions">
			<button
				type="button"
				class="player-icon-button"
				on:click={onToggleHidden}
				aria-label={labels.hide}
				title={labels.hide}
			>
				<LocalIcon name="material-symbols:visibility-off-rounded" />
			</button>
			<button
				type="button"
				class="player-icon-button"
				class:is-active={showPlaylist}
				on:click={onTogglePlaylist}
				aria-label={labels.playlist}
				aria-pressed={showPlaylist}
				title={labels.playlist}
			>
				<LocalIcon name="material-symbols:queue-music-rounded" />
			</button>
		</div>
	</header>

	<div class="player-progress">
		<div
			class="player-progress__track"
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
			<span
				style={`width: ${duration > 0 ? (currentTime / duration) * 100 : 0}%`}
			></span>
		</div>
	</div>

	<div class="player-controls">
		<button
			type="button"
			class="player-control player-control--quiet"
			class:is-active={isShuffled}
			aria-label={isShuffled ? labels.shuffle : labels.sequential}
			aria-pressed={isShuffled}
			data-play-order={isShuffled ? "shuffle" : "sequential"}
			on:click={onToggleShuffle}
			title={isShuffled ? labels.shuffle : labels.sequential}
		>
			<LocalIcon
				name={isShuffled
					? "material-symbols:shuffle-rounded"
					: "material-symbols:format-list-numbered-rounded"}
			/>
		</button>
		<button
			type="button"
			class="player-control"
			on:click={onPreviousSong}
			disabled={playlistLength <= 1}
			aria-label={labels.previous}
			title={labels.previous}
		>
			<LocalIcon name="material-symbols:skip-previous-rounded" />
		</button>
		<button
			type="button"
			class="player-control player-control--accent"
			class:is-loading={isLoading}
			aria-label={isPlaying ? labels.pause : labels.play}
			disabled={isLoading}
			on:click={onTogglePlay}
		>
			{#if isLoading}
				<span class="local-loading-icon" aria-hidden="true"></span>
			{:else if isPlaying}
				<LocalIcon name="material-symbols:pause-rounded" />
			{:else}
				<LocalIcon name="material-symbols:play-arrow-rounded" />
			{/if}
		</button>
		<button
			type="button"
			class="player-control"
			on:click={onNextSong}
			disabled={playlistLength <= 1}
			aria-label={labels.next}
			title={labels.next}
		>
			<LocalIcon name="material-symbols:skip-next-rounded" />
		</button>
		<button
			type="button"
			class="player-control player-control--quiet"
			class:is-active={isRepeating > 0}
			on:click={onToggleRepeat}
			aria-label={isRepeating === 1 ? labels.repeatOne : labels.repeat}
			aria-pressed={isRepeating > 0}
			title={isRepeating === 1 ? labels.repeatOne : labels.repeat}
		>
			<LocalIcon
				name={isRepeating === 1
					? "material-symbols:repeat-one-rounded"
					: "material-symbols:repeat-rounded"}
			/>
		</button>
	</div>

	<footer class="player-footer">
		<button
			type="button"
			class="player-icon-button"
			on:click={onToggleMute}
			aria-label={labels.volume}
		>
			<LocalIcon
				name={isMuted || volume === 0
					? "material-symbols:volume-off-rounded"
					: volume < 0.5
						? "material-symbols:volume-down-rounded"
						: "material-symbols:volume-up-rounded"}
			/>
		</button>
		<div
			class="player-volume"
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
			<span
				class:is-dragging={isVolumeDragging}
				style={`width: ${volume * 100}%`}
			></span>
		</div>
		<button
			type="button"
			class="player-icon-button player-collapse"
			on:click={onToggleExpanded}
			aria-label={labels.collapse}
			title={labels.collapse}
		>
			<LocalIcon name="material-symbols:keyboard-arrow-down-rounded" />
		</button>
	</footer>
</section>

<style>
	.expanded-player {
		width: 100%;
		padding: 0.9rem;
	}

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

	.player-summary {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.player-cover {
		position: relative;
		width: 3.25rem;
		height: 3.25rem;
		flex: 0 0 3.25rem;
		overflow: hidden;
		background: var(--surface-raised);
		border-radius: 50%;
	}

	.player-cover img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.player-copy {
		min-width: 0;
		flex: 1;
		line-height: 1.2;
	}

	.player-copy h2,
	.player-copy p {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.player-copy h2 {
		margin: 0 0 0.1rem;
		color: var(--text-primary);
		font-size: 0.95rem;
		font-weight: 680;
	}

	.player-copy p {
		margin: 0 0 0.25rem;
		color: var(--text-muted);
		font-size: 0.72rem;
	}

	.player-copy span {
		color: var(--text-muted);
		font-size: 0.64rem;
		font-variant-numeric: tabular-nums;
	}

	.player-actions {
		display: flex;
		align-self: flex-start;
		gap: 0.1rem;
	}

	.player-icon-button,
	.player-control {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: var(--text-secondary);
		border-radius: var(--radius-sm);
		transition:
			color var(--motion-fast) var(--motion-ease-standard),
			background-color var(--motion-fast) var(--motion-ease-standard),
			box-shadow var(--motion-fast) var(--motion-ease-standard),
			transform var(--motion-fast) var(--motion-ease-standard);
	}

	.player-icon-button {
		width: 1.9rem;
		height: 1.9rem;
	}

	.player-icon-button:hover,
	.player-control:hover:not(:disabled),
	.player-icon-button.is-active,
	.player-control.is-active {
		color: var(--accent);
		background: color-mix(in oklch, var(--accent) 9%, transparent);
	}

	.player-icon-button:active,
	.player-control:active:not(:disabled) {
		transform: scale(0.94);
	}

	.player-progress {
		padding-block: 0.8rem 0.55rem;
	}

	.player-progress__track,
	.player-volume {
		position: relative;
		overflow: hidden;
		background: color-mix(in oklch, var(--text-muted) 16%, transparent);
		border-radius: 999px;
		cursor: pointer;
	}

	.player-progress__track {
		height: 0.28rem;
	}

	.player-progress__track span,
	.player-volume span {
		display: block;
		height: 100%;
		background: var(--accent);
		border-radius: inherit;
		transition: width 100ms linear;
	}

	.player-controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.2rem;
		padding-inline: 0.1rem;
	}

	.player-control {
		width: 2.3rem;
		height: 2.3rem;
		flex: 0 0 2.3rem;
	}

	.player-control--quiet {
		color: var(--text-muted);
	}

	.player-control--accent {
		width: 2.8rem;
		height: 2.8rem;
		flex-basis: 2.8rem;
		color: var(--text-on-accent);
		background: var(--accent);
		border-radius: 50%;
		box-shadow: 0 0.4rem 1rem
			color-mix(in oklch, var(--accent) 24%, transparent);
	}

	.player-control--accent:hover:not(:disabled) {
		color: var(--text-on-accent);
		background: color-mix(in oklch, var(--accent) 88%, var(--text-primary));
		transform: translateY(-0.08rem);
	}

	.player-control:disabled,
	.player-control.is-loading {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.player-footer {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		padding-top: 0.65rem;
	}

	.player-volume {
		width: 4.25rem;
		height: 0.25rem;
	}

	.player-volume span.is-dragging {
		transition: none;
	}

	.player-collapse {
		margin-left: auto;
	}

	.player-icon-button :global(svg),
	.player-control :global(svg) {
		width: 1.2rem;
		height: 1.2rem;
	}

	.player-control--accent :global(svg) {
		width: 1.45rem;
		height: 1.45rem;
	}

	@media (max-width: 480px) {
		.expanded-player {
			padding: 0.8rem;
		}

		.player-summary {
			gap: 0.6rem;
		}

		.player-cover {
			width: 3rem;
			height: 3rem;
			flex-basis: 3rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.player-icon-button,
		.player-control,
		.player-progress__track span,
		.player-volume span {
			transition-duration: 0ms;
		}
	}
</style>
