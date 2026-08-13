<script lang="ts">
	import LocalIcon from "@/components/ui/LocalIcon.svelte";

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
	class="setting-toggle btn-regular relative flex w-full items-center gap-3 overflow-hidden rounded-md px-3 py-2 text-left transition-all active:scale-95"
	class:bg-[var(--btn-regular-bg-hover)]={enabled}
	aria-pressed={enabled}
	onclick={onToggle}
>
	{#if icon}
		<LocalIcon name={icon} class="shrink-0 text-[1.25rem] opacity-80" />
	{/if}
	<span class="setting-toggle__label min-w-0 flex-1 truncate">{label}</span>
	<div
		class="toggle-track relative h-5 w-10 shrink-0 rounded-full transition-all duration-200"
		class:bg-[var(--primary)]={enabled}
		class:bg-[var(--btn-regular-bg-active)]={!enabled}
	>
		<div
			class="toggle-thumb absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200"
			class:left-0.5={!enabled}
			class:left-5={enabled}
		></div>
	</div>
</button>

<style>
	.toggle-track {
		min-width: 40px;
	}

	.setting-toggle__label {
		font-size: var(--text-ui-size);
	}
</style>
