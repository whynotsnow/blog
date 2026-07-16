<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { fade, fly } from "svelte/transition";

	import { musicPlayerConfig } from "@/config";
	import Key from "@i18n/i18nKey";
	import { i18n } from "@i18n/translation";
	import ExpandedPlayer from "./ExpandedPlayer.svelte";
	import {
		MUSIC_PLAYER_COMMAND_EVENT,
		MUSIC_PLAYER_STATE_EVENT,
		type MusicPlayerCommand,
		type MusicPlayerUiState,
	} from "./events";
	import HiddenOrb from "./HiddenOrb.svelte";
	import MiniPlayer from "./MiniPlayer.svelte";
	import PlayerErrorToast from "./PlayerErrorToast.svelte";
	import PlaylistPanel from "./PlaylistPanel.svelte";
	import {
		calculateVolumeFromPointer,
		formatTime,
		getNextIndex,
		getPreviousIndex,
	} from "./playback";
	import {
		buildMetingApiUrl,
		getAssetPath,
		localPlaylist,
		normalizeMetingPlaylist,
	} from "./playlist";
	import { loadStoredVolume, saveStoredVolume } from "./storage";
	import type {
		MetingSong,
		MusicPlayerLabels,
		RepeatMode,
		Song,
	} from "./types";
	import "./styles.css";

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
		previous: i18n(Key.musicPlayerPrevious),
		next: i18n(Key.musicPlayerNext),
		repeat: i18n(Key.musicPlayerRepeat),
		repeatOne: i18n(Key.musicPlayerRepeatOne),
		sequential: i18n(Key.musicPlayerSequential),
		shuffle: i18n(Key.musicPlayerShuffle),
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
	let hasStarted = false;
	let isExpanded = false;
	let isHidden = true;
	let showPlaylist = false;
	let currentTime = 0;
	let duration = 0;
	let volume = 0.7;
	let isMuted = false;
	let isLoading = false;
	let isPlaylistLoading = mode === "meting";
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
	let layoutRafId: number | null = null;
	let playerRoot: HTMLElement;
	let layoutResizeObserver: ResizeObserver | null = null;
	let prefersReducedMotion = false;
	let motionMediaQuery: MediaQueryList | null = null;
	let syncMotionPreference: (() => void) | null = null;

	const interactionEvents = ["click", "keydown", "touchstart"];
	$: showHiddenState = isHidden || (!isExpanded && !hasStarted);
	$: stateEnterDuration = prefersReducedMotion ? 0 : 250;
	$: stateExitDuration = prefersReducedMotion ? 0 : 180;

	async function fetchMetingPlaylist() {
		if (!metingApi || !metingId) {
			isPlaylistLoading = false;
			return;
		}

		isPlaylistLoading = true;
		isLoading = true;
		publishUiState();
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
			isPlaylistLoading = false;
			isLoading = false;
			publishUiState();
		} catch {
			showErrorMessage(i18n(Key.musicPlayerErrorPlaylist));
			isPlaylistLoading = false;
			isLoading = false;
			publishUiState();
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

	function expandPlayer() {
		isExpanded = true;
		isHidden = false;
		showPlaylist = false;
		publishLayoutState();
		publishUiState();
	}

	function collapseToDefault() {
		isExpanded = false;
		isHidden = !hasStarted;
		showPlaylist = false;
		publishLayoutState();
		publishUiState();
	}

	function toggleExpanded() {
		if (isExpanded) collapseToDefault();
		else expandPlayer();
	}

	function toggleHidden() {
		if (showHiddenState) {
			expandPlayer();
			return;
		}
		isHidden = true;
		isExpanded = false;
		showPlaylist = false;
		publishLayoutState();
		publishUiState();
	}

	function togglePlaylist() {
		showPlaylist = !showPlaylist;
		publishLayoutState();
	}

	function dispatchLayoutState() {
		if (typeof window === "undefined") return;
		const panels = playerRoot
			? Array.from(
					playerRoot.querySelectorAll<HTMLElement>(
						".expanded-player, .playlist-panel",
					),
				).filter(
					(panel) => getComputedStyle(panel).pointerEvents !== "none",
				)
			: [];
		const top = panels.length
			? Math.min(
					...panels.map((panel) => panel.getBoundingClientRect().top),
				)
			: window.innerHeight;
		window.dispatchEvent(
			new CustomEvent("music-player-layout-change", {
				detail: {
					expanded: isExpanded,
					occupiedHeight: isExpanded
						? Math.max(0, window.innerHeight - top)
						: 0,
				},
			}),
		);
	}

	function publishLayoutState() {
		if (typeof window === "undefined") return;
		if (layoutRafId) cancelAnimationFrame(layoutRafId);
		layoutRafId = requestAnimationFrame(() => {
			layoutRafId = null;
			dispatchLayoutState();
		});
	}

	function publishUiState() {
		if (typeof window === "undefined") return;
		const detail: MusicPlayerUiState = {
			hasStarted,
			isExpanded,
			isLoading,
			isPlaying,
		};
		window.dispatchEvent(
			new CustomEvent(MUSIC_PLAYER_STATE_EVENT, { detail }),
		);
	}

	function handlePlayerCommand(event: Event) {
		const { type } =
			(event as CustomEvent<MusicPlayerCommand>).detail ?? {};
		if (type !== "toggle-panel") return;
		if (isExpanded) collapseToDefault();
		else expandPlayer();
	}

	function handleOutsidePointerDown(event: PointerEvent) {
		if (!isExpanded || !(event.target instanceof Node)) return;
		const floatingTools = document.getElementById("floating-tools");
		if (
			playerRoot?.contains(event.target) ||
			floatingTools?.contains(event.target)
		) {
			return;
		}
		collapseToDefault();
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
			publishUiState();
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
		publishUiState();
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
		publishUiState();
	}

	function handleLoadStart() {
		isLoading = true;
		publishUiState();
	}

	function handleAudioPlay() {
		isPlaying = true;
		hasStarted = true;
		isHidden = false;
		publishUiState();
	}

	function handleAudioPause() {
		isPlaying = false;
		publishUiState();
	}

	function handleAudioEnded() {
		if (isRepeating === 1) {
			audio.currentTime = 0;
			audio.play().catch(() => {});
		} else if (isRepeating === 2 || isShuffled) {
			nextSong(true);
		} else {
			isPlaying = false;
			publishUiState();
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
		motionMediaQuery = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		);
		syncMotionPreference = () => {
			prefersReducedMotion = motionMediaQuery?.matches ?? false;
		};
		syncMotionPreference();
		motionMediaQuery.addEventListener("change", syncMotionPreference);
		layoutResizeObserver = new ResizeObserver(dispatchLayoutState);
		if (playerRoot) layoutResizeObserver.observe(playerRoot);
		window.addEventListener("resize", publishLayoutState);
		window.addEventListener(
			MUSIC_PLAYER_COMMAND_EVENT,
			handlePlayerCommand,
		);
		document.addEventListener("pointerdown", handleOutsidePointerDown);
		publishLayoutState();
		publishUiState();
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
			window.removeEventListener("resize", publishLayoutState);
			window.removeEventListener(
				MUSIC_PLAYER_COMMAND_EVENT,
				handlePlayerCommand,
			);
			document.removeEventListener(
				"pointerdown",
				handleOutsidePointerDown,
			);
			if (syncMotionPreference) {
				motionMediaQuery?.removeEventListener(
					"change",
					syncMotionPreference,
				);
			}
			layoutResizeObserver?.disconnect();
			if (layoutRafId) cancelAnimationFrame(layoutRafId);
		}
	});
</script>

<audio
	bind:this={audio}
	src={getAssetPath(currentSong.url)}
	bind:volume
	bind:muted={isMuted}
	on:play={handleAudioPlay}
	on:pause={handleAudioPause}
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
		bind:this={playerRoot}
		class="music-player z-50"
		class:expanded={isExpanded}
		class:has-started={hasStarted}
		class:hidden-mode={showHiddenState}
	>
		{#if showHiddenState}
			<div
				class="music-player__state music-player__state--hidden"
				in:fade={{ duration: stateEnterDuration }}
				out:fade={{ duration: stateExitDuration }}
			>
				<HiddenOrb
					cover={playlist[0]?.cover ?? ""}
					isHidden={true}
					{isLoading}
					{isPlaylistLoading}
					{isPlaying}
					{labels}
					{getAssetPath}
					onToggleHidden={toggleHidden}
				/>
			</div>
		{:else if isExpanded}
			<div
				class="music-player__state music-player__state--expanded"
				in:fly={{ y: 10, duration: stateEnterDuration }}
				out:fade={{ duration: stateExitDuration }}
			>
				<div
					class="music-player__panel-stack"
					class:music-player__panel-stack--playlist={showPlaylist}
				>
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
				</div>
			</div>
		{:else if hasStarted}
			<div
				class="music-player__state music-player__state--mini"
				in:fade={{ duration: stateEnterDuration }}
				out:fade={{ duration: stateExitDuration }}
			>
				<MiniPlayer
					{currentSong}
					isExpanded={false}
					isHidden={false}
					{isLoading}
					{isPlaying}
					{labels}
					{getAssetPath}
					onTogglePlay={togglePlay}
					onToggleExpanded={toggleExpanded}
					onToggleHidden={toggleHidden}
				/>
			</div>
		{/if}
	</div>
{/if}
