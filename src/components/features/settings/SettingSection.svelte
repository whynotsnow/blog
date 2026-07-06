<script lang="ts">
	import Icon from "@iconify/svelte";
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

<div class="setting-section mb-1.5">
	<div class="group flex items-center gap-2 px-1 py-2">
		<button
			type="button"
			class="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
			onclick={toggleSection}
		>
			<div
				class="chevron shrink-0 transition-transform duration-200"
				class:rotate-90={isOpen}
			>
				<Icon
					icon="material-symbols:chevron-right-rounded"
					class="text-[1rem] opacity-50"
				/>
			</div>
			<span
				class="min-w-0 flex-1 truncate text-sm font-bold text-(--deep-text) dark:text-neutral-100"
			>
				{title}
			</span>
		</button>

		{#if showReset}
			<button
				type="button"
				class="btn-regular h-6 w-6 rounded-md opacity-0 transition-opacity active:scale-90 group-hover:opacity-70 hover:opacity-100!"
				onclick={handleReset}
				aria-label="Reset section"
			>
				<Icon
					icon="fa7-solid:arrow-rotate-left"
					class="text-[0.7rem] text-(--btn-content)"
				/>
			</button>
		{/if}
	</div>

	<div
		class="section-content overflow-hidden px-1 transition-all duration-200"
		class:max-h-0={!isOpen}
		class:max-h-[520px]={isOpen}
		class:opacity-0={!isOpen}
		class:opacity-100={isOpen}
	>
		<div class="space-y-1.5 pb-1">
			{@render children()}
		</div>
	</div>
</div>
