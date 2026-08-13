<script lang="ts">
	import {
		WALL_BANNER,
		WALL_FULL,
		WALL_FULL_BANNER,
		WALL_NONE,
	} from "@constants/constants";
	import I18nKey from "@i18n/i18nKey";
	import { i18n } from "@i18n/translation";
	import LocalIcon from "@/components/ui/LocalIcon.svelte";
	import {
		getStoredWallpaperMode,
		setWallpaperMode,
	} from "@utils/setting-utils";
	import type { WALL_MODE } from "@/types/config";
	import { panelManager } from "@/components/modules/shell-panels/panel-manager";
	import { onMount } from "svelte";

	const wallpaperOptions: {
		mode: WALL_MODE;
		icon: string;
		label: I18nKey;
	}[] = [
		{
			mode: WALL_BANNER,
			icon: "material-symbols:image-outline",
			label: I18nKey.wallBanner,
		},
		{
			mode: WALL_FULL_BANNER,
			icon: "material-symbols:wallpaper",
			label: I18nKey.wallFullBanner,
		},
		{
			mode: WALL_FULL,
			icon: "material-symbols:full-coverage-outline-rounded",
			label: I18nKey.wallFull,
		},
		{
			mode: WALL_NONE,
			icon: "material-symbols:hide-image-outline",
			label: I18nKey.wallNone,
		},
	];

	let mode: WALL_MODE = $state(WALL_BANNER);

	onMount(() => {
		mode = getStoredWallpaperMode();
	});

	const currentIcon = $derived(
		wallpaperOptions.find((opt) => opt.mode === mode)?.icon ||
			wallpaperOptions[0].icon,
	);

	function switchWallpaperMode(newMode: WALL_MODE) {
		mode = newMode;
		setWallpaperMode(newMode);
	}

	async function togglePanel() {
		await panelManager.closeAllPanelsExcept("wallpaper-mode-panel");
		await panelManager.togglePanel("wallpaper-mode-panel");
	}
</script>

<div class="relative z-50" role="menu" tabindex="-1">
	<button
		aria-label="Wallpaper Mode"
		role="menuitem"
		class="relative btn-plain scale-animation rounded-lg h-11 w-11 active:scale-90 theme-switch-btn"
		id="wallpaper-mode-switch"
		onclick={togglePanel}
	>
		<LocalIcon name={currentIcon} class="text-[1.25rem]" />
	</button>

	<div
		id="wallpaper-mode-panel"
		class="absolute transition float-panel-closed top-11 -right-2 pt-5"
	>
		<div class="card-base float-panel p-2">
			{#each wallpaperOptions as option (option.mode)}
				<button
					class="flex transition whitespace-nowrap items-center justify-start! w-full btn-plain rounded-lg h-11 px-3 font-medium active:scale-95 theme-switch-btn mb-0.5 last:mb-0"
					data-active={mode === option.mode}
					class:scale-animation={mode !== option.mode}
					onclick={() => switchWallpaperMode(option.mode)}
				>
					<LocalIcon name={option.icon} class="mr-3 text-[1.25rem]" />
					{i18n(option.label)}
				</button>
			{/each}
		</div>
	</div>
</div>

<style>
	button[data-active="true"] {
		background-color: var(--primary) !important;
		color: white !important;
	}

	button[data-active="true"]:hover {
		background-color: var(--primary) !important;
		color: white !important;
	}

	:global(button[data-active="true"])::before {
		display: none !important;
	}

	:global(.theme-switch-btn)::before {
		transition:
			transform 75ms ease-out,
			background-color 0ms !important;
	}
</style>
