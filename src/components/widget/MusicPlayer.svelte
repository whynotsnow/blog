<script lang="ts">
	import { onDestroy, onMount } from "svelte";

	import { musicPlayerConfig } from "../../config";
	import Key from "../../i18n/i18nKey";
	import { i18n } from "../../i18n/translation";
	import ExpandedPlayer from "./music-player/ExpandedPlayer.svelte";
	import HiddenOrb from "./music-player/HiddenOrb.svelte";
	import MiniPlayer from "./music-player/MiniPlayer.svelte";
	import PlayerErrorToast from "./music-player/PlayerErrorToast.svelte";
	import PlaylistPanel from "./music-player/PlaylistPanel.svelte";
	import {
		calculateVolumeFromPointer,
		formatTime,
		getNextIndex,
		getPreviousIndex,
	} from "./music-player/playback";
	import {
		buildMetingApiUrl,
		getAssetPath,
		localPlaylist,
		normalizeMetingPlaylist,
	} from "./music-player/playlist";
	import { loadStoredVolume, saveStoredVolume } from "./music-player/storage";
	import type {
		MetingSong,
		MusicPlayerLabels,
		RepeatMode,
		Song,
	} from "./music-player/types";
	import "./music-player/styles.css";

	const mode = musicPlayerConfig.mode ?? "meting";
	const metingApi =
		musicPlayerConfig.meting_api ??
		"https://www.bilibili.uno/api?server=:server&type=:type&id=:id&auth=:auth&r=:r";
	const metingId = musicPlayerConfig.id ?? "14164869977";
	const metingServer = musicPlayerConfig.server ?? "netease";
	const metingType = musicPlayerConfig.type ?? "playlist";

	const labels: MusicPlayerLabels = {
		show: i18n(Key.musicPlayerShow),
		hide: i18n(Key.musicPlayerHide),
		expand: i18n(Key.musicPlayerExpand),
		collapse: i18n(Key.musicPlayerCollapse),
		pause: i18n(Key.musicPlayerPause),
		play: i18n(Key.musicPlayerPlay),
		playlist: i18n(Key.musicPlayerPlaylist),
		cover: i18n(Key.musicPlayerCover),
		progress: i18n(Key.musicPlayerProgress),
		volume: i18n(Key.musicPlayerVolume),
		unknownSong: i18n(Key.unknownSong),
		unknownArtist: i18n(Key.unknownArtist),
	};

	const emptySong: Song = {
		id: 0,
		title: "Sample Song",
		artist: "Sample Artist",
		cover: "/favicon/favicon.ico",
		url: "",
		duration: 0,
	};

	let isPlaying = false;
	let isExpanded = false;
	let isHidden = false;
	let showPlaylist = false;
	let currentTime = 0;
	let duration = 0;
	let volume = 0.7;
	let isMuted = false;
	let isLoading = false;
	let isShuffled = false;
	let isRepeating: RepeatMode = 0;
	let errorMessage = "";
	let showError = false;
	let currentSong = { ...emptySong };
	let playlist: Song[] = [];
	let currentIndex = 0;
	let audio: HTMLAudioElement;
	let progressBar: HTMLElement;
	let volumeBar: HTMLElement;
	let willAutoPlay = false;
	let autoplayFailed = false;
	let isVolumeDragging = false;
	let isPointerDown = false;
	let volumeBarRect: DOMRect | null = null;
	let rafId: number | null = null;

	const interactionEvents = ["click", "keydown", "touchstart"];

	async function fetchMetingPlaylist() {
		if (!metingApi || !metingId) return;

		isLoading = true;
		const apiUrl = buildMetingApiUrl({
			api: metingApi,
			server: metingServer,
			type: metingType,
			id: metingId,
		});

		try {
			const response = await fetch(apiUrl);
			if (!response.ok) throw new Error("meting api error");

			const list = (await response.json()) as MetingSong[];
			playlist = normalizeMetingPlaylist(list, labels);
			if (playlist.length > 0) {
				loadSong(playlist[0]);
			}
			isLoading = false;
		} catch {
			showErrorMessage(i18n(Key.musicPlayerErrorPlaylist));
			isLoading = false;
		}
	}

	function togglePlay() {
		if (!audio || !currentSong.url) return;
		if (isPlaying) {
			audio.pause();
		} else {
			audio.play().catch(() => {});
		}
	}

	function toggleExpanded() {
		isExpanded = !isExpanded;
		if (isExpanded) {
			showPlaylist = false;
			isHidden = false;
		}
	}

	function toggleHidden() {
		isHidden = !isHidden;
		if (isHidden) {
			isExpanded = false;
			showPlaylist = false;
		}
	}

	function togglePlaylist() {
		showPlaylist = !showPlaylist;
	}

	function toggleShuffle() {
		isShuffled = !isShuffled;
		if (isShuffled) {
			isRepeating = 0;
		}
	}

	function toggleRepeat() {
		isRepeating = ((isRepeating + 1) % 3) as RepeatMode;
		if (isRepeating !== 0) {
			isShuffled = false;
		}
	}

	function previousSong() {
		if (playlist.length <= 1) return;
		playSong(getPreviousIndex(currentIndex, playlist.length));
	}

	function nextSong(autoPlay = true) {
		if (playlist.length <= 1) return;

		playSong(
			getNextIndex({
				currentIndex,
				playlistLength: playlist.length,
				isShuffled,
			}),
			autoPlay,
		);
	}

	function playSong(index: number, autoPlay = true) {
		if (index < 0 || index >= playlist.length) return;

		willAutoPlay = autoPlay;
		currentIndex = index;
		loadSong(playlist[currentIndex]);
	}

	function loadSong(song: Song) {
		if (!song) return;
		if (song.url !== currentSong.url) {
			currentSong = { ...song };
			isLoading = Boolean(song.url);
		}
	}

	function handleLoadSuccess() {
		isLoading = false;
		if (audio?.duration && audio.duration > 1) {
			duration = Math.floor(audio.duration);
			if (playlist[currentIndex])
				playlist[currentIndex].duration = duration;
			currentSong.duration = duration;
		}

		if (willAutoPlay || isPlaying) {
			const playPromise = audio.play();
			if (playPromise !== undefined) {
				playPromise.catch((error) => {
					console.warn("自动播放被拦截，等待用户交互:", error);
					autoplayFailed = true;
					isPlaying = false;
				});
			}
		}
	}

	function handleUserInteraction() {
		if (autoplayFailed && audio) {
			const playPromise = audio.play();
			if (playPromise !== undefined) {
				playPromise
					.then(() => {
						autoplayFailed = false;
					})
					.catch(() => {});
			}
		}
	}

	function handleLoadError(_event: Event) {
		if (!currentSong.url) return;
		isLoading = false;
		showErrorMessage(i18n(Key.musicPlayerErrorSong));

		const shouldContinue = isPlaying || willAutoPlay;
		if (playlist.length > 1) {
			setTimeout(() => nextSong(shouldContinue), 1000);
		} else {
			showErrorMessage(i18n(Key.musicPlayerErrorEmpty));
		}
	}

	function handleLoadStart() {}

	function handleAudioEnded() {
		if (isRepeating === 1) {
			audio.currentTime = 0;
			audio.play().catch(() => {});
		} else if (isRepeating === 2 || isShuffled) {
			nextSong(true);
		} else {
			isPlaying = false;
		}
	}

	function showErrorMessage(message: string) {
		errorMessage = message;
		showError = true;
		setTimeout(() => {
			showError = false;
		}, 3000);
	}

	function hideError() {
		showError = false;
	}

	function setProgress(event: MouseEvent) {
		if (!audio || !progressBar) return;
		const rect = progressBar.getBoundingClientRect();
		const percent = (event.clientX - rect.left) / rect.width;
		const newTime = percent * duration;
		audio.currentTime = newTime;
		currentTime = newTime;
	}

	function setProgressToMiddle() {
		const newTime = 0.5 * duration;
		if (audio) {
			audio.currentTime = newTime;
			currentTime = newTime;
		}
	}

	function startVolumeDrag(event: PointerEvent) {
		if (!volumeBar) return;
		event.preventDefault();

		isPointerDown = true;
		volumeBar.setPointerCapture(event.pointerId);

		volumeBarRect = volumeBar.getBoundingClientRect();
		updateVolumeLogic(event.clientX);
	}

	function handleVolumeMove(event: PointerEvent) {
		if (!isPointerDown) return;
		event.preventDefault();

		isVolumeDragging = true;
		if (rafId) return;

		rafId = requestAnimationFrame(() => {
			updateVolumeLogic(event.clientX);
			rafId = null;
		});
	}

	function stopVolumeDrag(event: PointerEvent) {
		if (!isPointerDown) return;
		isPointerDown = false;
		isVolumeDragging = false;
		volumeBarRect = null;
		if (volumeBar) {
			volumeBar.releasePointerCapture(event.pointerId);
		}

		if (rafId) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
		saveStoredVolume(volume);
	}

	function updateVolumeLogic(clientX: number) {
		if (!audio || !volumeBar) return;

		const rect = volumeBarRect || volumeBar.getBoundingClientRect();
		volume = calculateVolumeFromPointer(clientX, rect);
	}

	function toggleMute() {
		isMuted = !isMuted;
	}

	onMount(() => {
		volume = loadStoredVolume();
		interactionEvents.forEach((event) => {
			document.addEventListener(event, handleUserInteraction, {
				capture: true,
			});
		});

		if (!musicPlayerConfig.enable) {
			return;
		}

		if (mode === "meting") {
			fetchMetingPlaylist();
		} else {
			playlist = [...localPlaylist];
			if (playlist.length > 0) {
				loadSong(playlist[0]);
			} else {
				showErrorMessage("本地播放列表为空");
			}
		}
	});

	onDestroy(() => {
		if (typeof document !== "undefined") {
			interactionEvents.forEach((event) => {
				document.removeEventListener(event, handleUserInteraction, {
					capture: true,
				});
			});
		}
	});
</script>

<audio
	bind:this={audio}
	src={getAssetPath(currentSong.url)}
	bind:volume
	bind:muted={isMuted}
	on:play={() => (isPlaying = true)}
	on:pause={() => (isPlaying = false)}
	on:timeupdate={() => (currentTime = audio.currentTime)}
	on:ended={handleAudioEnded}
	on:error={handleLoadError}
	on:loadeddata={handleLoadSuccess}
	on:loadstart={handleLoadStart}
	preload="auto"
></audio>

<svelte:window
	on:pointermove={handleVolumeMove}
	on:pointerup={stopVolumeDrag}
/>

{#if musicPlayerConfig.enable}
	{#if showError}
		<PlayerErrorToast message={errorMessage} onClose={hideError} />
	{/if}

	<div
		class="music-player fixed bottom-4 right-4 z-50 transition-all duration-300 ease-in-out"
		class:expanded={isExpanded}
		class:hidden-mode={isHidden}
	>
		<HiddenOrb
			{isHidden}
			{isLoading}
			{isPlaying}
			{labels}
			onToggleHidden={toggleHidden}
		/>

		<MiniPlayer
			{currentSong}
			{isExpanded}
			{isHidden}
			{isLoading}
			{isPlaying}
			{labels}
			{getAssetPath}
			onTogglePlay={togglePlay}
			onToggleExpanded={toggleExpanded}
			onToggleHidden={toggleHidden}
		/>

		<ExpandedPlayer
			{currentSong}
			{currentTime}
			{duration}
			{isExpanded}
			{isLoading}
			{isPlaying}
			{isShuffled}
			{isRepeating}
			{isMuted}
			{isVolumeDragging}
			playlistLength={playlist.length}
			{showPlaylist}
			{volume}
			bind:progressBar
			bind:volumeBar
			{labels}
			{getAssetPath}
			{formatTime}
			onToggleHidden={toggleHidden}
			onTogglePlaylist={togglePlaylist}
			onSetProgress={setProgress}
			onToggleShuffle={toggleShuffle}
			onPreviousSong={previousSong}
			onTogglePlay={togglePlay}
			onNextSong={() => nextSong()}
			onToggleRepeat={toggleRepeat}
			onToggleMute={toggleMute}
			onStartVolumeDrag={startVolumeDrag}
			onToggleExpanded={toggleExpanded}
			onProgressKeyboardSeek={setProgressToMiddle}
		/>

		{#if showPlaylist}
			<PlaylistPanel
				{playlist}
				{currentIndex}
				{isPlaying}
				{labels}
				{getAssetPath}
				onTogglePlaylist={togglePlaylist}
				onPlaySong={playSong}
			/>
		{/if}
	</div>
{/if}
