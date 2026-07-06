<script lang="ts">
	import Icon from "@iconify/svelte";

	let {
		icon = "",
		label = "",
		enabled = false,
		onToggle,
	}: {
		icon?: string;
		label?: string;
		enabled?: boolean;
		onToggle?: (() => void) | undefined;
	} = $props();
</script>

<button
	type="button"
	class="setting-toggle btn-regular relative flex w-full items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-left transition-all active:scale-[0.98]"
	class:bg-[var(--btn-regular-bg-hover)]={enabled}
	aria-pressed={enabled}
	onclick={onToggle}
>
	{#if icon}
		<Icon {icon} class="shrink-0 text-[1.125rem] opacity-80" />
	{/if}
	<span class="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
	<div
		class="toggle-track relative h-[22px] w-10 shrink-0 rounded-full transition-all duration-200"
		class:bg-[var(--primary)]={enabled}
		class:bg-[var(--btn-regular-bg-active)]={!enabled}
	>
		<div
			class="toggle-thumb absolute top-[3px] h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200"
			class:left-[3px]={!enabled}
			class:left-[21px]={enabled}
		></div>
	</div>
</button>

<style>
	.toggle-track {
		min-width: 40px;
	}
</style>
