<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { cubicOut } from "svelte/easing";

	import { musicPlayerConfig } from "@/config";
	import Key from "@i18n/i18nKey";
	import { i18n } from "@i18n/translation";
	import ExpandedPlayer from "./ExpandedPlayer.svelte";
	import {
		MUSIC_PLAYER_COMMAND_EVENT,
		MUSIC_PLAYER_PANEL_TRANSITION_MS,
		MUSIC_PLAYER_STATE_EVENT,
		musicPlayerPanelEasing,
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
	import {
		loadStoredMusicPlayerMounted,
		loadStoredVolume,
		saveStoredMusicPlayerMounted,
		saveStoredVolume,
	} from "./storage";
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
	let isExpanded = false;
	let isHidden = true;
	let isVisible = musicPlayerConfig.enable;
	let transitionEdge: "default-mini" | "mini-expanded" | "expanded-default" =
		"default-mini";
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
	let playlistInitialized = false;
	let panelTransitionStartedAt = 0;

	const interactionEvents = ["click", "keydown", "touchstart"];
	$: showHiddenState = isHidden;
	$: panelTransitionDuration = prefersReducedMotion
		? 0
		: MUSIC_PLAYER_PANEL_TRANSITION_MS;
	$: compactTransitionDuration = prefersReducedMotion ? 0 : 460;

	function morphMiniPlayer(
		_node: Element,
		{ duration }: { duration: number },
	) {
		return {
			duration,
			css: (t: number) => {
				const surfaceProgress = cubicOut(t);
				const actionsProgress = Math.min(
					1,
					Math.max(0, (t - 0.18) / 0.72),
				);
				const metaProgress = Math.min(1, Math.max(0, (t - 0.1) / 0.78));
				const coverProgress = Math.min(
					1,
					Math.max(0, (t - 0.16) / 0.68),
				);
				const radiusX = 9 + surfaceProgress * 106;
				const radiusY = 30 + surfaceProgress * 90;

				return `
					--mini-player-actions-opacity: ${actionsProgress};
					--mini-player-actions-translate: ${(1 - actionsProgress) * 4}px;
					--mini-player-meta-opacity: ${metaProgress};
					--mini-player-meta-translate: ${(1 - metaProgress) * 7}px;
					--mini-player-cover-opacity: ${coverProgress};
					--mini-player-cover-rotation: ${(1 - coverProgress) * -110}deg;
					--mini-player-cover-scale: ${0.62 + coverProgress * 0.38};
					opacity: ${Math.min(1, t * 2.8)};
					clip-path: ellipse(${radiusX}% ${radiusY}% at 92% 50%);
					filter: blur(${(1 - surfaceProgress) * 1.8}px) saturate(${0.82 + surfaceProgress * 0.18});
					transform: scale(${0.92 + surfaceProgress * 0.08});
				`;
			},
		};
	}

	function morphPanelSurface(
		_node: Element,
		{ duration }: { duration: number },
	) {
		return {
			duration,
			css: (t: number) => {
				const progress = musicPlayerPanelEasing(t);
				return `
					--mini-player-actions-opacity: ${progress};
					--mini-player-actions-translate: ${(1 - progress) * 3}px;
					--mini-player-meta-opacity: ${progress};
					--mini-player-meta-translate: ${(1 - progress) * 5}px;
					--mini-player-cover-opacity: ${progress};
					--mini-player-cover-rotation: ${(1 - progress) * -24}deg;
					--mini-player-cover-scale: ${0.84 + progress * 0.16};
					opacity: ${progress};
					clip-path: inset(${(1 - progress) * 24}% ${(1 - progress) * 3}% 0 ${(1 - progress) * 8}% round ${16 + (1 - progress) * 6}px);
					filter: blur(${(1 - progress) * 2.5}px) saturate(${0.88 + progress * 0.12});
					transform: translate3d(0, ${(1 - progress) * 8}px, 0) scale(${0.93 + progress * 0.07});
				`;
			},
		};
	}

	function transitionMiniPlayer(node: Element, params: { duration: number }) {
		return transitionEdge === "mini-expanded"
			? morphPanelSurface(node, params)
			: morphMiniPlayer(node, params);
	}

	function morphDefaultCover(
		_node: Element,
		{ duration }: { duration: number },
	) {
		return {
			duration,
			css: (t: number) => {
				const visibility = Math.max(0, (t - 0.12) / 0.88);
				const progress = cubicOut(visibility);

				return `
					opacity: ${visibility};
					filter: blur(${(1 - progress) * 3}px) saturate(${0.82 + progress * 0.18});
					transform: scale(${0.76 + progress * 0.24}) rotate(${(1 - progress) * -145}deg);
				`;
			},
		};
	}

	function initializePlaylist() {
		if (playlistInitialized) return;
		playlistInitialized = true;

		if (mode === "meting") {
			fetchMetingPlaylist();
			return;
		}

		playlist = [...localPlaylist];
		if (playlist.length > 0) {
			loadSong(playlist[0]);
		} else {
			showErrorMessage("本地播放列表为空");
		}
	}

	function waitForUiMount() {
		return new Promise<void>((resolve) =>
			requestAnimationFrame(() => resolve()),
		);
	}

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
		panelTransitionStartedAt = performance.now();
		transitionEdge = "mini-expanded";
		isExpanded = true;
		isHidden = false;
		showPlaylist = false;
		publishLayoutState();
		publishUiState();
	}

	function collapseToDefault() {
		panelTransitionStartedAt = performance.now();
		transitionEdge = "mini-expanded";
		isExpanded = false;
		isHidden = false;
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
			transitionEdge = "default-mini";
			isHidden = false;
			isExpanded = false;
			showPlaylist = false;
			publishLayoutState();
			publishUiState();
			return;
		}
		transitionEdge = isExpanded ? "expanded-default" : "default-mini";
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
		const layoutExpanded = isVisible && isExpanded;
		const panels =
			layoutExpanded && playerRoot
				? Array.from(
						playerRoot.querySelectorAll<HTMLElement>(
							".expanded-player, .playlist-panel",
						),
					).filter(
						(panel) =>
							getComputedStyle(panel).pointerEvents !== "none",
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
					expanded: layoutExpanded,
					occupiedHeight: layoutExpanded
						? Math.max(0, window.innerHeight - top)
						: 0,
					transitionStartedAt: panelTransitionStartedAt,
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
			isExpanded,
			isLoading,
			isPlaying,
			isVisible,
		};
		window.dispatchEvent(
			new CustomEvent(MUSIC_PLAYER_STATE_EVENT, { detail }),
		);
	}

	async function handlePlayerCommand(event: Event) {
		const { type } =
			(event as CustomEvent<MusicPlayerCommand>).detail ?? {};
		if (type !== "toggle-visibility") return;
		isVisible = !isVisible;
		saveStoredMusicPlayerMounted(isVisible);
		if (isVisible) {
			await waitForUiMount();
			if (playerRoot) layoutResizeObserver?.observe(playerRoot);
			initializePlaylist();
		}
		publishLayoutState();
		publishUiState();
	}

	function handleOutsidePointerDown(event: PointerEvent) {
		if (!isVisible || !isExpanded || !(event.target instanceof Node))
			return;
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
		isVisible = loadStoredMusicPlayerMounted(musicPlayerConfig.enable);
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
		void waitForUiMount().then(() => {
			if (playerRoot) layoutResizeObserver?.observe(playerRoot);
			publishLayoutState();
			publishUiState();
		});
		interactionEvents.forEach((event) => {
			document.addEventListener(event, handleUserInteraction, {
				capture: true,
			});
		});

		if (isVisible) initializePlaylist();
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

{#if isVisible}
	{#if showError}
		<PlayerErrorToast message={errorMessage} onClose={hideError} />
	{/if}

	<div
		bind:this={playerRoot}
		class="music-player z-50"
		class:expanded={isExpanded}
		class:hidden-mode={showHiddenState}
	>
		{#if showHiddenState}
			<div
				class="music-player__state music-player__state--hidden"
				in:morphDefaultCover={{ duration: compactTransitionDuration }}
				out:morphDefaultCover={{ duration: compactTransitionDuration }}
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
				in:morphPanelSurface={{
					duration: panelTransitionDuration,
				}}
				out:morphPanelSurface={{
					duration: panelTransitionDuration,
				}}
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
		{:else}
			<div
				class="music-player__state music-player__state--mini"
				in:transitionMiniPlayer={{
					duration:
						transitionEdge === "mini-expanded"
							? panelTransitionDuration
							: compactTransitionDuration,
				}}
				out:transitionMiniPlayer={{
					duration:
						transitionEdge === "mini-expanded"
							? panelTransitionDuration
							: compactTransitionDuration,
				}}
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
