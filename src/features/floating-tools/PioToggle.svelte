<script lang="ts">
	import LocalIcon from "@/components/ui/LocalIcon.svelte";
	import { onMount } from "svelte";
	import { pioConfig } from "@/config";
	import I18nKey from "@i18n/i18nKey";
	import { i18n } from "@i18n/translation";
	import {
		getPioMounted,
		PIO_MOUNT_EVENT,
		setPioMounted,
		type PioMountChangeDetail,
	} from "@/features/pio/preferences";

	let mounted = $state(pioConfig.enable);
	let available = $state(false);

	const label = $derived(
		mounted ? i18n(I18nKey.pioHide) : i18n(I18nKey.pioShow),
	);

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

	function toggle() {
		setPioMounted(!mounted);
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
