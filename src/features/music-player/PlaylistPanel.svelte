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

<section
	class="playlist-panel"
	aria-label={labels.playlist}
	transition:slide={{ duration: 240, axis: "y" }}
>
	<header class="playlist-header">
		<div>
			<h3>{labels.playlist}</h3>
			<span>{playlist.length}</span>
		</div>
		<button
			type="button"
			class="playlist-close"
			on:click={onTogglePlaylist}
			aria-label={`${labels.collapse} ${labels.playlist}`}
			title={`${labels.collapse} ${labels.playlist}`}
		>
			<Icon icon="material-symbols:close-rounded" />
		</button>
	</header>

	<div class="playlist-content">
		{#each playlist as song, index (song.id)}
			<button
				type="button"
				class="playlist-item"
				class:is-current={index === currentIndex}
				on:click={() => onPlaySong(index)}
				aria-current={index === currentIndex ? "true" : undefined}
				aria-label={`${labels.play} ${song.title} - ${song.artist}`}
			>
				<span class="playlist-cover">
					<img
						src={getAssetPath(song.cover)}
						alt=""
						loading={index === 0 ? "eager" : "lazy"}
						decoding="async"
					/>
				</span>
				<span class="playlist-copy">
					<strong>{song.title}</strong>
					<small>{song.artist}</small>
				</span>
				{#if index === currentIndex}
					<span
						class="playlist-status"
						class:is-playing={isPlaying}
						aria-hidden="true"
					>
						{#if isPlaying}
							<Icon icon="material-symbols:graphic-eq-rounded" />
						{:else}
							<span></span>
						{/if}
					</span>
				{/if}
			</button>
		{/each}
	</div>
</section>

<style>
	.playlist-panel {
		padding: 0.7rem 0.7rem 0.5rem;
		background: color-mix(in oklch, var(--accent) 3%, transparent);
		border-bottom: 1px solid var(--border-subtle);
	}

	.playlist-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 0.25rem 0.45rem;
	}

	.playlist-header > div {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
	}

	.playlist-header h3 {
		margin: 0;
		color: var(--text-primary);
		font-size: 0.78rem;
		font-weight: 650;
	}

	.playlist-header span {
		color: var(--text-muted);
		font-size: 0.65rem;
	}

	.playlist-close {
		display: inline-flex;
		width: 1.75rem;
		height: 1.75rem;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
		border-radius: var(--radius-sm);
		transition:
			color var(--motion-fast) var(--motion-ease-standard),
			background-color var(--motion-fast) var(--motion-ease-standard),
			transform var(--motion-fast) var(--motion-ease-standard);
	}

	.playlist-close:hover {
		color: var(--accent);
		background: var(--surface-raised);
	}

	.playlist-close:active {
		transform: scale(0.94);
	}

	.playlist-content {
		display: flex;
		max-height: min(12rem, 34dvh);
		flex-direction: column;
		gap: 0.2rem;
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: none;
	}

	.playlist-content::-webkit-scrollbar {
		display: none;
	}

	.playlist-item {
		display: flex;
		width: 100%;
		min-height: 2.75rem;
		align-items: center;
		gap: 0.65rem;
		padding: 0.35rem 0.45rem;
		color: var(--text-primary);
		text-align: left;
		border: 1px solid transparent;
		border-radius: var(--radius-md);
		transition:
			color var(--motion-fast) var(--motion-ease-standard),
			background-color var(--motion-fast) var(--motion-ease-standard),
			border-color var(--motion-fast) var(--motion-ease-standard),
			transform var(--motion-fast) var(--motion-ease-standard);
	}

	.playlist-item:hover {
		background: color-mix(in oklch, var(--surface-raised) 82%, transparent);
		transform: translateX(0.125rem);
	}

	.playlist-item.is-current {
		color: var(--accent);
		background: color-mix(in oklch, var(--accent) 9%, transparent);
		border-color: color-mix(in oklch, var(--accent) 18%, transparent);
	}

	.playlist-cover {
		width: 2rem;
		height: 2rem;
		flex: 0 0 2rem;
		overflow: hidden;
		background: var(--surface-raised);
		border-radius: var(--radius-sm);
	}

	.playlist-cover img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.playlist-copy {
		display: flex;
		min-width: 0;
		flex: 1;
		flex-direction: column;
		line-height: 1.25;
	}

	.playlist-copy strong,
	.playlist-copy small {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.playlist-copy strong {
		font-size: 0.75rem;
		font-weight: 650;
	}

	.playlist-copy small {
		color: var(--text-muted);
		font-size: 0.625rem;
	}

	.playlist-status {
		display: inline-flex;
		width: 1.5rem;
		height: 1.5rem;
		flex: 0 0 1.5rem;
		align-items: center;
		justify-content: center;
		color: var(--accent);
	}

	.playlist-status span {
		width: 0.35rem;
		height: 0.35rem;
		background: currentColor;
		border-radius: 999px;
	}

	.playlist-status.is-playing {
		animation: playlist-status-pulse 1.4s ease-in-out infinite;
	}

	@keyframes playlist-status-pulse {
		50% {
			transform: scale(1.14);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.playlist-item,
		.playlist-status.is-playing {
			animation: none;
			transition-duration: 0ms;
		}
	}
</style>
