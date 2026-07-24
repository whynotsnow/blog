<script lang="ts">
	import { onMount } from "svelte";
	import { live2dCompanionConfig } from "@/config";
	import Live2DCompanionModule from "./Live2DCompanionModule.svelte";
	import {
		getLive2DCompanionMounted,
		LIVE2D_COMPANION_MOUNT_EVENT,
		type Live2DCompanionMountChangeDetail,
	} from "./preferences";

	let available = false;
	let mounted = live2dCompanionConfig.enable;

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
</script>

{#if available && mounted}
	<Live2DCompanionModule />
{/if}
