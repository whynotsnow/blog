<script lang="ts">
	import { onMount } from "svelte";
	import { pioConfig } from "@/config";
	import PioModule from "./PioModule.svelte";
	import {
		getPioMounted,
		PIO_MOUNT_EVENT,
		type PioMountChangeDetail,
	} from "./preferences";

	let available = false;
	let mounted = pioConfig.enable;

	onMount(() => {
		const media = window.matchMedia("(max-width: 1280px)");
		const syncAvailability = () => {
			available = !(pioConfig.hiddenOnMobile && media.matches);
		};
		const syncMount = (event: Event) => {
			mounted = (event as CustomEvent<PioMountChangeDetail>).detail
				.mounted;
		};

		mounted = getPioMounted(pioConfig.enable);
		syncAvailability();
		media.addEventListener("change", syncAvailability);
		window.addEventListener(PIO_MOUNT_EVENT, syncMount);

		return () => {
			media.removeEventListener("change", syncAvailability);
			window.removeEventListener(PIO_MOUNT_EVENT, syncMount);
		};
	});
</script>

{#if available && mounted}
	<PioModule />
{/if}
