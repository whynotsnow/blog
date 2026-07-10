<script lang="ts">
	import {
		WALLPAPER_BANNER,
		WALLPAPER_FULLSCREEN,
		WALLPAPER_NONE,
		WALLPAPER_OVERLAY,
	} from "@constants/constants";
	import Icon from "@iconify/svelte";
	import I18nKey from "@i18n/i18nKey";
	import { i18n } from "@i18n/translation";
	import { onMount } from "svelte";
	import {
		fullscreenWallpaperConfig,
		sakuraConfig,
		siteConfig,
	} from "@/config";
	import {
		getDefaultBannerTitleEnabled,
		getDefaultHue,
		getDefaultOverlayBlur,
		getDefaultOverlayCardOpacity,
		getDefaultOverlayOpacity,
		getDefaultSakuraEnabled,
		getDefaultWavesEnabled,
		getHue,
		getStoredBannerTitleEnabled,
		getStoredOverlayBlur,
		getStoredOverlayCardOpacity,
		getStoredOverlayOpacity,
		getStoredSakuraEnabled,
		getStoredWallpaperMode,
		getStoredWavesEnabled,
		setBannerTitleEnabled,
		setHue,
		setOverlayBlur,
		setOverlayCardOpacity,
		setOverlayOpacity,
		setSakuraEnabled,
		setWallpaperMode,
		setWavesEnabled,
	} from "@/utils/setting-utils";
	import {
		getLayoutMode,
		setLayoutMode,
		type LayoutMode,
	} from "@/utils/layout-mode";
	import type { WALLPAPER_MODE } from "@/types/config";
	import SettingSection from "./SettingSection.svelte";
	import SettingSlider from "./SettingSlider.svelte";
	import SettingToggle from "./SettingToggle.svelte";

	let { className = "" }: { className?: string } = $props();

	const showThemeColor = !siteConfig.themeColor.fixed;
	const allowLayoutSwitch =
		(siteConfig.postListLayout.enable ?? true) &&
		siteConfig.postListLayout.allowSwitch;
	const defaultLayout: LayoutMode =
		siteConfig.postListLayout.defaultMode === "grid" ? "grid" : "list";
	const defaultWallpaperMode = siteConfig.wallpaperMode.defaultMode;

	const overlaySwitchable =
		fullscreenWallpaperConfig.overlay?.switchable ?? false;
	const isOverlayOpacitySwitchable =
		typeof overlaySwitchable === "object"
			? (overlaySwitchable.opacity ?? false)
			: overlaySwitchable;
	const isOverlayBlurSwitchable =
		typeof overlaySwitchable === "object"
			? (overlaySwitchable.blur ?? false)
			: overlaySwitchable;
	const isOverlayCardOpacitySwitchable =
		typeof overlaySwitchable === "object"
			? (overlaySwitchable.cardOpacity ?? false)
			: overlaySwitchable;
	const hasOverlaySettings =
		isOverlayOpacitySwitchable ||
		isOverlayBlurSwitchable ||
		isOverlayCardOpacitySwitchable;

	const isWavesSwitchable = siteConfig.banner?.waves?.switchable ?? false;
	const isBannerTitleSwitchable =
		siteConfig.banner?.homeText?.switchable ?? false;
	const isBannerCarouselSwitchable =
		siteConfig.banner?.carousel?.switchable ?? false;
	const hasBannerSettings =
		isWavesSwitchable ||
		isBannerTitleSwitchable ||
		isBannerCarouselSwitchable;
	const isSakuraSwitchable = sakuraConfig.switchable ?? false;
	const hasEffectsSettings = isSakuraSwitchable;

	const showModeValue = siteConfig.wallpaperMode.showModeSwitchOnMobile;
	let isMobile = $state(false);

	const isWallpaperModeSwitchable = $derived(
		(showModeValue === "both" ||
			(showModeValue === "mobile" && isMobile) ||
			(showModeValue === "desktop" && !isMobile)) &&
			(fullscreenWallpaperConfig.enable ?? false) &&
			(fullscreenWallpaperConfig.switchable ?? false),
	);

	const hasAnyContent = $derived(
		showThemeColor ||
			isWallpaperModeSwitchable ||
			allowLayoutSwitch ||
			hasOverlaySettings ||
			hasBannerSettings ||
			hasEffectsSettings,
	);

	let hue = $state(getDefaultHue());
	const defaultHue = getDefaultHue();
	let wallpaperMode = $state(defaultWallpaperMode as WALLPAPER_MODE);
	let currentLayout = $state(defaultLayout);

	let overlayOpacity = $state(getDefaultOverlayOpacity());
	const defaultOverlayOpacity = getDefaultOverlayOpacity();
	let overlayBlur = $state(getDefaultOverlayBlur());
	const defaultOverlayBlur = getDefaultOverlayBlur();
	let overlayCardOpacity = $state(getDefaultOverlayCardOpacity());
	const defaultOverlayCardOpacity = getDefaultOverlayCardOpacity();

	let wavesEnabled = $state(getDefaultWavesEnabled());
	const defaultWavesEnabled = getDefaultWavesEnabled();
	let bannerTitleEnabled = $state(getDefaultBannerTitleEnabled());
	const defaultBannerTitleEnabled = getDefaultBannerTitleEnabled();
	let bannerCarouselEnabled = $state(
		siteConfig.banner?.carousel?.enable ?? true,
	);
	const defaultBannerCarouselEnabled =
		siteConfig.banner?.carousel?.enable ?? true;
	let sakuraEnabled = $state(getDefaultSakuraEnabled());
	const defaultSakuraEnabled = getDefaultSakuraEnabled();

	const overlaySettingsIsDefault = $derived(
		(!isOverlayOpacitySwitchable ||
			overlayOpacity === defaultOverlayOpacity) &&
			(!isOverlayBlurSwitchable || overlayBlur === defaultOverlayBlur) &&
			(!isOverlayCardOpacitySwitchable ||
				overlayCardOpacity === defaultOverlayCardOpacity),
	);

	const bannerSettingsIsDefault = $derived(
		(!isBannerTitleSwitchable ||
			bannerTitleEnabled === defaultBannerTitleEnabled) &&
			(!isWavesSwitchable || wavesEnabled === defaultWavesEnabled) &&
			(!isBannerCarouselSwitchable ||
				bannerCarouselEnabled === defaultBannerCarouselEnabled),
	);

	const effectsSettingsIsDefault = $derived(
		!isSakuraSwitchable || sakuraEnabled === defaultSakuraEnabled,
	);

	function getPreviewSafeWallpaperMode(): WALLPAPER_MODE {
		return getStoredWallpaperMode();
	}

	function resetHue() {
		hue = defaultHue;
	}

	function resetWallpaperMode() {
		wallpaperMode =
			defaultWallpaperMode === WALLPAPER_OVERLAY
				? WALLPAPER_BANNER
				: (defaultWallpaperMode as WALLPAPER_MODE);
		setWallpaperMode(wallpaperMode);
	}

	function resetLayout() {
		currentLayout = defaultLayout;
		setLayoutMode(defaultLayout);
	}

	function resetOverlaySettings() {
		overlayOpacity = defaultOverlayOpacity;
		if (isOverlayOpacitySwitchable) {
			setOverlayOpacity(defaultOverlayOpacity);
		}
		overlayBlur = defaultOverlayBlur;
		if (isOverlayBlurSwitchable) {
			setOverlayBlur(defaultOverlayBlur);
		}
		overlayCardOpacity = defaultOverlayCardOpacity;
		if (isOverlayCardOpacitySwitchable) {
			setOverlayCardOpacity(defaultOverlayCardOpacity);
		}
	}

	function resetBannerSettings() {
		bannerTitleEnabled = defaultBannerTitleEnabled;
		if (isBannerTitleSwitchable) {
			setBannerTitleEnabled(defaultBannerTitleEnabled);
		}
		wavesEnabled = defaultWavesEnabled;
		if (isWavesSwitchable) {
			setWavesEnabled(defaultWavesEnabled);
		}
		bannerCarouselEnabled = defaultBannerCarouselEnabled;
	}

	function resetEffectsSettings() {
		sakuraEnabled = defaultSakuraEnabled;
		if (isSakuraSwitchable) {
			setSakuraEnabled(defaultSakuraEnabled);
		}
	}

	function toggleBannerTitleEnabled() {
		bannerTitleEnabled = !bannerTitleEnabled;
		setBannerTitleEnabled(bannerTitleEnabled);
	}

	function toggleWavesEnabled() {
		wavesEnabled = !wavesEnabled;
		setWavesEnabled(wavesEnabled);
	}

	function toggleSakuraEnabled() {
		sakuraEnabled = !sakuraEnabled;
		setSakuraEnabled(sakuraEnabled);
	}

	function switchWallpaperMode(newMode: WALLPAPER_MODE) {
		wallpaperMode = newMode;
		setWallpaperMode(newMode);
		if (newMode === WALLPAPER_OVERLAY) {
			if (isOverlayOpacitySwitchable) setOverlayOpacity(overlayOpacity);
			if (isOverlayBlurSwitchable) setOverlayBlur(overlayBlur);
			if (isOverlayCardOpacitySwitchable) {
				setOverlayCardOpacity(overlayCardOpacity);
			}
		}
	}

	function setLayout(newLayout: LayoutMode) {
		currentLayout = newLayout;
		setLayoutMode(newLayout);
	}

	function checkMobile() {
		isMobile = window.innerWidth <= 768;
	}

	onMount(() => {
		hue = getHue();
		wallpaperMode = getPreviewSafeWallpaperMode();
		currentLayout = getLayoutMode();
		overlayOpacity = getStoredOverlayOpacity();
		overlayBlur = getStoredOverlayBlur();
		overlayCardOpacity = getStoredOverlayCardOpacity();
		wavesEnabled = getStoredWavesEnabled();
		bannerTitleEnabled = getStoredBannerTitleEnabled();
		sakuraEnabled = getStoredSakuraEnabled();
		checkMobile();
		window.addEventListener("resize", checkMobile);

		const handleLayoutChange = (event: Event) => {
			const layout = (event as CustomEvent<{ layout?: LayoutMode }>)
				.detail?.layout;
			if (layout === "list" || layout === "grid") {
				currentLayout = layout;
			}
		};
		window.addEventListener("layoutChange", handleLayoutChange);

		return () => {
			window.removeEventListener("resize", checkMobile);
			window.removeEventListener("layoutChange", handleLayoutChange);
		};
	});

	$effect(() => {
		if (hue || hue === 0) {
			setHue(hue);
		}
	});
</script>

{#if hasAnyContent}
	<div
		id="display-setting"
		class="float-panel float-panel-closed absolute right-4 w-80 max-w-[calc(100vw-2rem)] px-4 py-2 transition-all"
		class:list={[className]}
	>
		{#if showThemeColor}
			<SettingSection
				title={i18n(I18nKey.settingsThemeColor)}
				showReset={hue !== defaultHue}
				onreset={resetHue}
			>
				<div class="flex items-center justify-between gap-2 px-1">
					<div
						class="h-6 min-w-0 flex-1 select-none rounded bg-[oklch(0.80_0.10_0)] px-1 dark:bg-[oklch(0.70_0.10_0)]"
					>
						<input
							aria-label={i18n(I18nKey.settingsThemeColor)}
							type="range"
							min="0"
							max="360"
							bind:value={hue}
							class="color-slider h-full w-full"
							id="colorSlider"
							step="5"
						/>
					</div>
					<div
						class="flex h-7 w-10 shrink-0 items-center justify-center bg-(--btn-regular-bg) text-sm font-bold text-(--btn-content) transition"
					>
						{hue}
					</div>
				</div>
			</SettingSection>
		{/if}

		{#if isWallpaperModeSwitchable}
			<SettingSection
				title={i18n(I18nKey.settingsWallpaper)}
				showReset={wallpaperMode !== defaultWallpaperMode}
				onreset={resetWallpaperMode}
			>
				<div class="space-y-1">
					<button
						type="button"
						class="btn-regular relative flex w-full items-center gap-3 overflow-hidden rounded-md px-3 py-2 text-left transition-all active:scale-95"
						class:opacity-60={wallpaperMode !== WALLPAPER_BANNER}
						class:bg-[var(--btn-regular-bg-hover)]={wallpaperMode ===
							WALLPAPER_BANNER}
						onclick={() => switchWallpaperMode(WALLPAPER_BANNER)}
					>
						<Icon
							icon="material-symbols:image-outline"
							class="shrink-0 text-[1.25rem]"
						/>
						<span class="min-w-0 flex-1 truncate text-sm">
							{i18n(I18nKey.wallpaperBanner)}
						</span>
						{#if wallpaperMode === WALLPAPER_BANNER}
							<Icon
								icon="material-symbols:check-circle"
								class="shrink-0 text-[1rem] text-(--primary)"
							/>
						{/if}
					</button>
					<button
						type="button"
						class="btn-regular relative flex w-full items-center gap-3 overflow-hidden rounded-md px-3 py-2 text-left transition-all active:scale-95"
						class:opacity-60={wallpaperMode !==
							WALLPAPER_FULLSCREEN}
						class:bg-[var(--btn-regular-bg-hover)]={wallpaperMode ===
							WALLPAPER_FULLSCREEN}
						onclick={() =>
							switchWallpaperMode(WALLPAPER_FULLSCREEN)}
					>
						<Icon
							icon="material-symbols:wallpaper"
							class="shrink-0 text-[1.25rem]"
						/>
						<span class="min-w-0 flex-1 truncate text-sm">
							{i18n(I18nKey.wallpaperFullscreen)}
						</span>
						{#if wallpaperMode === WALLPAPER_FULLSCREEN}
							<Icon
								icon="material-symbols:check-circle"
								class="shrink-0 text-[1rem] text-(--primary)"
							/>
						{/if}
					</button>
					<button
						type="button"
						class="btn-regular relative flex w-full items-center gap-3 overflow-hidden rounded-md px-3 py-2 text-left transition-all active:scale-95"
						class:opacity-60={wallpaperMode !== WALLPAPER_OVERLAY}
						class:bg-[var(--btn-regular-bg-hover)]={wallpaperMode ===
							WALLPAPER_OVERLAY}
						onclick={() => switchWallpaperMode(WALLPAPER_OVERLAY)}
					>
						<Icon
							icon="material-symbols:full-coverage-outline-rounded"
							class="shrink-0 text-[1.25rem]"
						/>
						<span class="min-w-0 flex-1 truncate text-sm">
							{i18n(I18nKey.wallpaperOverlay)}
						</span>
						{#if wallpaperMode === WALLPAPER_OVERLAY}
							<Icon
								icon="material-symbols:check-circle"
								class="shrink-0 text-[1rem] text-(--primary)"
							/>
						{/if}
					</button>
					<button
						type="button"
						class="btn-regular relative flex w-full items-center gap-3 overflow-hidden rounded-md px-3 py-2 text-left transition-all active:scale-95"
						class:opacity-60={wallpaperMode !== WALLPAPER_NONE}
						class:bg-[var(--btn-regular-bg-hover)]={wallpaperMode ===
							WALLPAPER_NONE}
						onclick={() => switchWallpaperMode(WALLPAPER_NONE)}
					>
						<Icon
							icon="material-symbols:hide-image-outline"
							class="shrink-0 text-[1.25rem]"
						/>
						<span class="min-w-0 flex-1 truncate text-sm">
							{i18n(I18nKey.wallpaperNone)}
						</span>
						{#if wallpaperMode === WALLPAPER_NONE}
							<Icon
								icon="material-symbols:check-circle"
								class="shrink-0 text-[1rem] text-(--primary)"
							/>
						{/if}
					</button>
				</div>
			</SettingSection>
		{/if}

		{#if wallpaperMode === WALLPAPER_OVERLAY && hasOverlaySettings}
			<SettingSection
				title={i18n(I18nKey.settingsWallpaperEffects)}
				showReset={!overlaySettingsIsDefault}
				onreset={resetOverlaySettings}
			>
				{#if isOverlayOpacitySwitchable}
					<SettingSlider
						label={i18n(I18nKey.overlayOpacity)}
						displayValue={`${Math.round(overlayOpacity * 100)}%`}
						min={20}
						max={100}
						step={1}
						value={Math.round(overlayOpacity * 100)}
						oninput={(value) => {
							overlayOpacity = value / 100;
							setOverlayOpacity(overlayOpacity);
						}}
					/>
				{/if}
				{#if isOverlayBlurSwitchable}
					<SettingSlider
						label={i18n(I18nKey.overlayBlur)}
						displayValue={`${overlayBlur.toFixed(1)}px`}
						min={0}
						max={12}
						step={0.5}
						value={overlayBlur}
						oninput={(value) => {
							overlayBlur = value;
							setOverlayBlur(overlayBlur);
						}}
					/>
				{/if}
				{#if isOverlayCardOpacitySwitchable}
					<SettingSlider
						label={i18n(I18nKey.overlayCardOpacity)}
						displayValue={`${Math.round(overlayCardOpacity * 100)}%`}
						min={20}
						max={100}
						step={1}
						value={Math.round(overlayCardOpacity * 100)}
						oninput={(value) => {
							overlayCardOpacity = value / 100;
							setOverlayCardOpacity(overlayCardOpacity);
						}}
					/>
				{/if}
			</SettingSection>
		{/if}

		{#if (wallpaperMode === WALLPAPER_BANNER || wallpaperMode === WALLPAPER_FULLSCREEN) && hasBannerSettings}
			<SettingSection
				title={i18n(I18nKey.settingsBanner)}
				showReset={!bannerSettingsIsDefault}
				onreset={resetBannerSettings}
			>
				{#if isBannerTitleSwitchable}
					<SettingToggle
						icon="material-symbols:titlecase-rounded"
						label={i18n(I18nKey.bannerTitle)}
						enabled={bannerTitleEnabled}
						onToggle={toggleBannerTitleEnabled}
					/>
				{/if}
				{#if isWavesSwitchable}
					<SettingToggle
						icon="material-symbols:airwave-rounded"
						label={i18n(I18nKey.wavesAnimation)}
						enabled={wavesEnabled}
						onToggle={toggleWavesEnabled}
					/>
				{/if}
				{#if isBannerCarouselSwitchable}
					<SettingToggle
						icon="material-symbols:view-carousel-outline-rounded"
						label={i18n(I18nKey.bannerCarousel)}
						enabled={bannerCarouselEnabled}
						onToggle={() =>
							(bannerCarouselEnabled = !bannerCarouselEnabled)}
					/>
				{/if}
			</SettingSection>
		{/if}

		{#if hasEffectsSettings}
			<SettingSection
				title={i18n(I18nKey.effectsSettings)}
				showReset={!effectsSettingsIsDefault}
				onreset={resetEffectsSettings}
			>
				{#if isSakuraSwitchable}
					<SettingToggle
						icon="material-symbols:spa-outline-rounded"
						label={i18n(I18nKey.sakuraEffect)}
						enabled={sakuraEnabled}
						onToggle={toggleSakuraEnabled}
					/>
				{/if}
			</SettingSection>
		{/if}

		{#if allowLayoutSwitch}
			<SettingSection
				title={i18n(I18nKey.settingsLayout)}
				showReset={currentLayout !== defaultLayout}
				onreset={resetLayout}
			>
				<div class="grid grid-cols-2 gap-2">
					<button
						type="button"
						aria-label={i18n(I18nKey.postListLayoutList)}
						class="btn-regular relative flex min-w-0 items-center justify-center gap-2 overflow-hidden rounded-md px-3 py-2 transition-all active:scale-95"
						class:opacity-60={currentLayout !== "list"}
						class:bg-[var(--btn-regular-bg-hover)]={currentLayout ===
							"list"}
						onclick={() => setLayout("list")}
					>
						<Icon
							icon="material-symbols:format-list-bulleted-rounded"
							class="shrink-0 text-[1rem]"
						/>
						<span class="truncate text-xs font-medium">
							{i18n(I18nKey.postListLayoutList)}
						</span>
						{#if currentLayout === "list"}
							<Icon
								icon="material-symbols:check-circle"
								class="shrink-0 text-[1rem] text-(--primary)"
							/>
						{/if}
					</button>
					<button
						type="button"
						aria-label={i18n(I18nKey.postListLayoutGrid)}
						class="btn-regular relative flex min-w-0 items-center justify-center gap-2 overflow-hidden rounded-md px-3 py-2 transition-all active:scale-95"
						class:opacity-60={currentLayout !== "grid"}
						class:bg-[var(--btn-regular-bg-hover)]={currentLayout ===
							"grid"}
						onclick={() => setLayout("grid")}
					>
						<Icon
							icon="material-symbols:grid-view-rounded"
							class="shrink-0 text-[1rem]"
						/>
						<span class="truncate text-xs font-medium">
							{i18n(I18nKey.postListLayoutGrid)}
						</span>
						{#if currentLayout === "grid"}
							<Icon
								icon="material-symbols:check-circle"
								class="shrink-0 text-[1rem] text-(--primary)"
							/>
						{/if}
					</button>
				</div>
			</SettingSection>
		{/if}
	</div>
{/if}

<style>
	#display-setting {
		max-height: calc(100vh - 6rem);
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: none;
		-webkit-overflow-scrolling: touch;
	}

	#display-setting::-webkit-scrollbar {
		width: 0;
		height: 0;
	}

	.color-slider {
		-webkit-appearance: none;
		appearance: none;
		border-radius: 0;
		background-image: var(--color-selection-bar);
		cursor: pointer;
		transition: background-image 0.15s ease-in-out;
	}

	.color-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		height: 1rem;
		width: 0.5rem;
		border-radius: 0.125rem;
		background: rgba(255, 255, 255, 0.7);
		box-shadow: none;
	}

	.color-slider::-webkit-slider-thumb:hover {
		background: rgba(255, 255, 255, 0.8);
	}

	.color-slider::-webkit-slider-thumb:active {
		background: rgba(255, 255, 255, 0.6);
	}

	.color-slider::-moz-range-thumb {
		height: 1rem;
		width: 0.5rem;
		border: 0;
		border-radius: 0.125rem;
		background: rgba(255, 255, 255, 0.7);
		box-shadow: none;
	}

	@media (max-width: 640px) {
		#display-setting {
			left: max(0.5rem, env(safe-area-inset-left));
			right: max(0.5rem, env(safe-area-inset-right));
			width: auto;
			max-width: none;
			max-height: calc(100vh - 5rem);
			max-height: calc(100dvh - 5rem);
		}
	}
</style>
