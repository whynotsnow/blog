<script lang="ts">
	import LocalIcon from "@/components/ui/LocalIcon.svelte";
	import { onMount } from "svelte";
	import { live2dCompanionConfig } from "@/config";
	import I18nKey from "@i18n/i18nKey";
	import { i18n } from "@i18n/translation";
	import {
		getLive2DCompanionMounted,
		LIVE2D_COMPANION_MOUNT_EVENT,
		setLive2DCompanionMounted,
		type Live2DCompanionMountChangeDetail,
	} from "@/components/modules/live2d-companion/preferences";

	let mounted = $state(live2dCompanionConfig.enable);
	let available = $state(false);

	const label = $derived(
		mounted ? i18n(I18nKey.companionHide) : i18n(I18nKey.companionShow),
	);

	onMount(() => {
		const media = window.matchMedia("(max-width: 1280px)");
		const syncAvailability = () => {
			available = !(
				live2dCompanionConfig.hiddenOnMobile && media.matches
			);
		};
		const syncMount = (event: Event) => {
			mounted = (event as CustomEvent<Live2DCompanionMountChangeDetail>)
				.detail.mounted;
		};

		mounted = getLive2DCompanionMounted(live2dCompanionConfig.enable);
		syncAvailability();
		media.addEventListener("change", syncAvailability);
		window.addEventListener(LIVE2D_COMPANION_MOUNT_EVENT, syncMount);

		return () => {
			media.removeEventListener("change", syncAvailability);
			window.removeEventListener(LIVE2D_COMPANION_MOUNT_EVENT, syncMount);
		};
	});

	function toggle() {
		setLive2DCompanionMounted(!mounted);
	}
</script>

{#if available}
	<button
		type="button"
		class="floating-tool-button"
		class:is-active={mounted}
		aria-label={label}
		aria-pressed={mounted}
		title={label}
		onclick={toggle}
	>
		<LocalIcon
			name={mounted
				? "material-symbols:face-retouching-natural-rounded"
				: "material-symbols:face-retouching-off-rounded"}
		/>
	</button>
{/if}
