<script lang="ts">
	import { onMount } from "svelte";

	let {
		label = "",
		displayValue = "",
		min = 0,
		max = 100,
		step = 1,
		value = $bindable(50),
		oninput,
	}: {
		label?: string;
		displayValue?: string;
		min?: number;
		max?: number;
		step?: number;
		value?: number;
		oninput?: ((value: number) => void) | undefined;
	} = $props();

	let slider: HTMLInputElement | undefined;
	const sliderId = `slider-${Math.random().toString(36).slice(2, 9)}`;

	function updateProgress(input: HTMLInputElement) {
		const minVal = Number(input.min || 0);
		const maxVal = Number(input.max || 100);
		const val = Number(input.value || 0);
		const progress = ((val - minVal) * 100) / (maxVal - minVal || 1);
		input.style.setProperty(
			"--range-progress",
			`${Math.min(100, Math.max(0, progress))}%`,
		);
	}

	function handleInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		updateProgress(input);
		oninput?.(Number(input.value));
	}

	onMount(() => {
		if (slider) updateProgress(slider);
	});
</script>

<div class="rounded-md bg-[var(--btn-regular-bg)] p-2 transition-colors">
	<div class="mb-1.5 flex items-center justify-between gap-2">
		<span
			class="setting-slider__label min-w-0 truncate font-medium text-[var(--btn-content)] opacity-85"
		>
			{label}
		</span>
		<span
			class="setting-slider__value shrink-0 font-mono text-[var(--btn-content)]"
		>
			{displayValue}
		</span>
	</div>
	<input
		bind:this={slider}
		id={sliderId}
		type="range"
		{min}
		{max}
		{step}
		bind:value
		oninput={handleInput}
		class="slider range-slider w-full"
		aria-label={label}
	/>
</div>

<style>
	.slider {
		-webkit-appearance: none;
		appearance: none;
		height: 1.5rem;
		border-radius: 0.375rem;
		cursor: pointer;
		outline: none;
	}

	.setting-slider__label {
		font-size: var(--text-ui-size);
	}

	.setting-slider__value {
		font-size: var(--text-caption-size);
	}

	.range-slider {
		background-image: linear-gradient(
			90deg,
			var(--primary) 0 var(--range-progress, 50%),
			var(--btn-regular-bg-active) var(--range-progress, 50%) 100%
		);
		transition: background-image 0.1s ease;
	}

	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		height: 0;
		width: 0;
		border: 0;
		border-radius: 0;
		background: transparent;
		box-shadow: none;
		cursor: pointer;
	}

	.slider::-moz-range-thumb {
		height: 0;
		width: 0;
		border: none;
		border-radius: 0;
		background: transparent;
		box-shadow: none;
		cursor: pointer;
	}
</style>
