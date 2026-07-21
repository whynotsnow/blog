<script lang="ts">
	import LocalIcon from "@/components/ui/LocalIcon.svelte";
	import type { Snippet } from "svelte";

	let {
		title = "",
		isOpen = true,
		showReset = false,
		onreset,
		children,
	}: {
		title?: string;
		isOpen?: boolean;
		showReset?: boolean;
		onreset?: (() => void) | undefined;
		children: Snippet;
	} = $props();

	function toggleSection() {
		isOpen = !isOpen;
	}

	function handleReset(event: MouseEvent) {
		event.stopPropagation();
		onreset?.();
	}
</script>

<div class="setting-section mb-2 mt-2">
	<div class="group flex items-center justify-between gap-2">
		<button
			type="button"
			class="relative ml-3 flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left font-bold text-lg text-neutral-900 transition before:absolute before:-left-3 before:top-1/2 before:h-4 before:w-1 before:-translate-y-1/2 before:rounded-md before:bg-(--primary) dark:text-neutral-100"
			onclick={toggleSection}
		>
			<span class="min-w-0 flex-1 truncate">{title}</span>
			<div
				class="chevron shrink-0 transition-transform duration-200"
				class:rotate-90={isOpen}
			>
				<LocalIcon
					name="material-symbols:chevron-right-rounded"
					class="text-[1rem] opacity-45"
				/>
			</div>
		</button>

		{#if showReset}
			<button
				type="button"
				class="btn-regular h-7 w-7 rounded-md opacity-0 transition-opacity active:scale-90 group-hover:opacity-70 hover:opacity-100!"
				onclick={handleReset}
				aria-label="Reset section"
			>
				<LocalIcon
					name="material-symbols:refresh"
					class="text-[0.875rem] text-(--btn-content)"
				/>
			</button>
		{/if}
	</div>

	<div
		class="section-content overflow-hidden px-1 transition-all duration-200"
		class:max-h-0={!isOpen}
		class:max-h-[500px]={isOpen}
		class:opacity-0={!isOpen}
		class:opacity-100={isOpen}
	>
		<div class="space-y-1.5 pb-1">
			{@render children()}
		</div>
	</div>
</div>
