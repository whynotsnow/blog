<script lang="ts">
	import {
		WALL_BANNER,
		WALL_FULL_BANNER,
		WALL_NONE,
		WALL_FULL,
	} from "@constants/constants";
	import LocalIcon from "@/components/ui/LocalIcon.svelte";
	import I18nKey from "@i18n/i18nKey";
	import { i18n } from "@i18n/translation";
	import { onMount } from "svelte";
	import { wallConfig, sakuraConfig, siteConfig } from "@/config";
	import {
		getDefaultBannerTitleEnabled,
		getDefaultHue,
		getDefaultWallBlur,
		getDefaultWallCardOpacity,
		getDefaultWallOpacity,
		getDefaultSakuraEnabled,
		getDefaultWavesEnabled,
		getHue,
		getStoredBannerTitleEnabled,
		getStoredWallBlur,
		getStoredWallCardOpacity,
		getStoredWallOpacity,
		getStoredSakuraEnabled,
		getStoredWallpaperMode,
		getStoredWavesEnabled,
		setBannerTitleEnabled,
		setHue,
		setWallBlur,
		setWallCardOpacity,
		setWallOpacity,
		setSakuraEnabled,
		setWallpaperMode,
		setWavesEnabled,
	} from "@/utils/setting-utils";
	import type { WALL_MODE } from "@/types/config";
	import SettingSection from "./SettingSection.svelte";
	import SettingSlider from "./SettingSlider.svelte";
	import SettingToggle from "./SettingToggle.svelte";

	let { className = "" }: { className?: string } = $props();

	const showThemeColor = !siteConfig.themeColor.fixed;
	const defaultWallpaperMode = siteConfig.wallpaperMode.defaultMode;

	const wallSwitchable = wallConfig.effects?.switchable ?? false;
	const isWallOpacitySwitchable =
		typeof wallSwitchable === "object"
			? (wallSwitchable.opacity ?? false)
			: wallSwitchable;
	const isWallBlurSwitchable =
		typeof wallSwitchable === "object"
			? (wallSwitchable.blur ?? false)
			: wallSwitchable;
	const isWallCardOpacitySwitchable =
		typeof wallSwitchable === "object"
			? (wallSwitchable.cardOpacity ?? false)
			: wallSwitchable;
	const hasWallSettings =
		isWallOpacitySwitchable ||
		isWallBlurSwitchable ||
		isWallCardOpacitySwitchable;

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
			(wallConfig.enable ?? false) &&
			(wallConfig.switchable ?? false),
	);

	const hasAnyContent = $derived(
		showThemeColor ||
			isWallpaperModeSwitchable ||
			hasWallSettings ||
			hasBannerSettings ||
			hasEffectsSettings,
	);

	let hue = $state(getDefaultHue());
	const defaultHue = getDefaultHue();
	let wallpaperMode = $state(defaultWallpaperMode as WALL_MODE);

	let wallOpacity = $state(getDefaultWallOpacity());
	const defaultWallOpacity = getDefaultWallOpacity();
	let wallBlur = $state(getDefaultWallBlur());
	const defaultWallBlur = getDefaultWallBlur();
	let wallCardOpacity = $state(getDefaultWallCardOpacity());
	const defaultWallCardOpacity = getDefaultWallCardOpacity();

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

	const wallSettingsIsDefault = $derived(
		(!isWallOpacitySwitchable || wallOpacity === defaultWallOpacity) &&
			(!isWallBlurSwitchable || wallBlur === defaultWallBlur) &&
			(!isWallCardOpacitySwitchable ||
				wallCardOpacity === defaultWallCardOpacity),
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

	function getPreviewSafeWallpaperMode(): WALL_MODE {
		return getStoredWallpaperMode();
	}

	function resetHue() {
		hue = defaultHue;
		setHue(hue);
	}

	function resetWallpaperMode() {
		wallpaperMode = defaultWallpaperMode as WALL_MODE;
		setWallpaperMode(wallpaperMode);
	}

	function resetWallSettings() {
		wallOpacity = defaultWallOpacity;
		if (isWallOpacitySwitchable) {
			setWallOpacity(defaultWallOpacity);
		}
		wallBlur = defaultWallBlur;
		if (isWallBlurSwitchable) {
			setWallBlur(defaultWallBlur);
		}
		wallCardOpacity = defaultWallCardOpacity;
		if (isWallCardOpacitySwitchable) {
			setWallCardOpacity(defaultWallCardOpacity);
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

	function switchWallpaperMode(newMode: WALL_MODE) {
		wallpaperMode = newMode;
		setWallpaperMode(newMode);
		if (newMode === WALL_FULL) {
			if (isWallOpacitySwitchable) setWallOpacity(wallOpacity);
			if (isWallBlurSwitchable) setWallBlur(wallBlur);
			if (isWallCardOpacitySwitchable) {
				setWallCardOpacity(wallCardOpacity);
			}
		}
	}

	function checkMobile() {
		isMobile = window.innerWidth <= 768;
	}

	onMount(() => {
		hue = getHue();
		wallpaperMode = getPreviewSafeWallpaperMode();
		wallOpacity = getStoredWallOpacity();
		wallBlur = getStoredWallBlur();
		wallCardOpacity = getStoredWallCardOpacity();
		wavesEnabled = getStoredWavesEnabled();
		bannerTitleEnabled = getStoredBannerTitleEnabled();
		sakuraEnabled = getStoredSakuraEnabled();
		checkMobile();
		window.addEventListener("resize", checkMobile);

		return () => {
			window.removeEventListener("resize", checkMobile);
		};
	});
</script>

{#if hasAnyContent}
	<div
		id="display-setting"
		class={`float-panel float-panel-closed ds-surface-raised absolute right-4 w-80 max-w-[calc(100vw-2rem)] px-4 py-2 transition-all ${className}`}
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
							oninput={() => setHue(hue)}
							class="color-slider h-full w-full"
							id="colorSlider"
							step="5"
						/>
					</div>
					<div
						class="settings-panel__hue-value flex h-7 w-10 shrink-0 items-center justify-center bg-(--btn-regular-bg) font-bold text-(--btn-content) transition"
					>
						{hue}
					</div>
				</div>
			</SettingSection>
		{/if}

		{#if isWallpaperModeSwitchable}
			<SettingSection
				title={i18n(I18nKey.settingsWall)}
				showReset={wallpaperMode !== defaultWallpaperMode}
				onreset={resetWallpaperMode}
			>
				<div class="space-y-1">
					<button
						type="button"
						class="btn-regular relative flex w-full items-center gap-3 overflow-hidden rounded-md px-3 py-2 text-left transition-all active:scale-95"
						class:opacity-60={wallpaperMode !== WALL_BANNER}
						class:bg-[var(--btn-regular-bg-hover)]={wallpaperMode ===
							WALL_BANNER}
						onclick={() => switchWallpaperMode(WALL_BANNER)}
					>
						<LocalIcon
							name="material-symbols:image-outline"
							class="shrink-0 text-[1.25rem]"
						/>
						<span
							class="settings-panel__option-label min-w-0 flex-1 truncate"
						>
							{i18n(I18nKey.wallBanner)}
						</span>
						{#if wallpaperMode === WALL_BANNER}
							<LocalIcon
								name="material-symbols:check-circle"
								class="shrink-0 text-[1rem] text-(--primary)"
							/>
						{/if}
					</button>
					<button
						type="button"
						class="btn-regular relative flex w-full items-center gap-3 overflow-hidden rounded-md px-3 py-2 text-left transition-all active:scale-95"
						class:opacity-60={wallpaperMode !== WALL_FULL_BANNER}
						class:bg-[var(--btn-regular-bg-hover)]={wallpaperMode ===
							WALL_FULL_BANNER}
						onclick={() => switchWallpaperMode(WALL_FULL_BANNER)}
					>
						<LocalIcon
							name="material-symbols:wallpaper"
							class="shrink-0 text-[1.25rem]"
						/>
						<span
							class="settings-panel__option-label min-w-0 flex-1 truncate"
						>
							{i18n(I18nKey.wallFullBanner)}
						</span>
						{#if wallpaperMode === WALL_FULL_BANNER}
							<LocalIcon
								name="material-symbols:check-circle"
								class="shrink-0 text-[1rem] text-(--primary)"
							/>
						{/if}
					</button>
					<button
						type="button"
						class="btn-regular relative flex w-full items-center gap-3 overflow-hidden rounded-md px-3 py-2 text-left transition-all active:scale-95"
						class:opacity-60={wallpaperMode !== WALL_FULL}
						class:bg-[var(--btn-regular-bg-hover)]={wallpaperMode ===
							WALL_FULL}
						onclick={() => switchWallpaperMode(WALL_FULL)}
					>
						<LocalIcon
							name="material-symbols:full-coverage-outline-rounded"
							class="shrink-0 text-[1.25rem]"
						/>
						<span
							class="settings-panel__option-label min-w-0 flex-1 truncate"
						>
							{i18n(I18nKey.wallFull)}
						</span>
						{#if wallpaperMode === WALL_FULL}
							<LocalIcon
								name="material-symbols:check-circle"
								class="shrink-0 text-[1rem] text-(--primary)"
							/>
						{/if}
					</button>
					<button
						type="button"
						class="btn-regular relative flex w-full items-center gap-3 overflow-hidden rounded-md px-3 py-2 text-left transition-all active:scale-95"
						class:opacity-60={wallpaperMode !== WALL_NONE}
						class:bg-[var(--btn-regular-bg-hover)]={wallpaperMode ===
							WALL_NONE}
						onclick={() => switchWallpaperMode(WALL_NONE)}
					>
						<LocalIcon
							name="material-symbols:hide-image-outline"
							class="shrink-0 text-[1.25rem]"
						/>
						<span
							class="settings-panel__option-label min-w-0 flex-1 truncate"
						>
							{i18n(I18nKey.wallNone)}
						</span>
						{#if wallpaperMode === WALL_NONE}
							<LocalIcon
								name="material-symbols:check-circle"
								class="shrink-0 text-[1rem] text-(--primary)"
							/>
						{/if}
					</button>
				</div>
			</SettingSection>
		{/if}

		{#if wallpaperMode === WALL_FULL && hasWallSettings}
			<SettingSection
				title={i18n(I18nKey.settingsWallFx)}
				showReset={!wallSettingsIsDefault}
				onreset={resetWallSettings}
			>
				{#if isWallOpacitySwitchable}
					<SettingSlider
						label={i18n(I18nKey.wallOpacity)}
						displayValue={`${Math.round(wallOpacity * 100)}%`}
						min={20}
						max={100}
						step={1}
						value={Math.round(wallOpacity * 100)}
						oninput={(value) => {
							wallOpacity = value / 100;
							setWallOpacity(wallOpacity);
						}}
					/>
				{/if}
				{#if isWallBlurSwitchable}
					<SettingSlider
						label={i18n(I18nKey.wallBlur)}
						displayValue={`${wallBlur.toFixed(1)}px`}
						min={0}
						max={12}
						step={0.5}
						value={wallBlur}
						oninput={(value) => {
							wallBlur = value;
							setWallBlur(wallBlur);
						}}
					/>
				{/if}
				{#if isWallCardOpacitySwitchable}
					<SettingSlider
						label={i18n(I18nKey.wallCardOpacity)}
						displayValue={`${Math.round(wallCardOpacity * 100)}%`}
						min={20}
						max={100}
						step={1}
						value={Math.round(wallCardOpacity * 100)}
						oninput={(value) => {
							wallCardOpacity = value / 100;
							setWallCardOpacity(wallCardOpacity);
						}}
					/>
				{/if}
			</SettingSection>
		{/if}

		{#if (wallpaperMode === WALL_BANNER || wallpaperMode === WALL_FULL_BANNER) && hasBannerSettings}
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
	</div>
{/if}

<style>
	.settings-panel__hue-value,
	.settings-panel__option-label {
		font-size: var(--text-ui-size);
	}

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
