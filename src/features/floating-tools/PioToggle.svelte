<script lang="ts">
	import LocalIcon from "@/components/ui/LocalIcon.svelte";
	import { onMount } from "svelte";
	import { pioConfig } from "@/config";
	import I18nKey from "@i18n/i18nKey";
	import { i18n } from "@i18n/translation";
	import {
		getPioVisible,
		PIO_VISIBILITY_EVENT,
		setPioVisible,
		type PioVisibilityChangeDetail,
	} from "@/features/pio/preferences";

	let visible = $state(true);
	let available = $state(false);

	const label = $derived(
		visible ? i18n(I18nKey.pioHide) : i18n(I18nKey.pioShow),
	);

	onMount(() => {
		const media = window.matchMedia("(max-width: 1280px)");
		const syncAvailability = () => {
			available =
				pioConfig.enable &&
				!(pioConfig.hiddenOnMobile && media.matches);
		};
		const syncVisibility = (event: Event) => {
			visible = (event as CustomEvent<PioVisibilityChangeDetail>).detail
				.visible;
		};

		visible = getPioVisible();
		syncAvailability();
		media.addEventListener("change", syncAvailability);
		window.addEventListener(PIO_VISIBILITY_EVENT, syncVisibility);

		return () => {
			media.removeEventListener("change", syncAvailability);
			window.removeEventListener(PIO_VISIBILITY_EVENT, syncVisibility);
		};
	});

	function toggle() {
		setPioVisible(!visible);
	}
</script>

{#if available}
	<button
		type="button"
		class="floating-tool-button"
		class:is-active={!visible}
		aria-label={label}
		aria-pressed={!visible}
		title={label}
		onclick={toggle}
	>
		<LocalIcon
			name={visible
				? "material-symbols:smart-toy-outline-rounded"
				: "material-symbols:hide-source-rounded"}
		/>
	</button>
{/if}
