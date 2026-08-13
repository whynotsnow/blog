<script lang="ts">
	import LocalIcon from "@/components/ui/LocalIcon.svelte";

	export let message = "";
	export let onClose: () => void;
</script>

<div class="fixed bottom-20 right-4 z-60 max-w-sm">
	<div
		class="bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up"
	>
		<LocalIcon
			name="material-symbols:error"
			class="shrink-0 text-[var(--text-card-title-size)]"
		/>
		<span class="player-error-toast__message flex-1">{message}</span>
		<button
			on:click={onClose}
			class="text-white/80 hover:text-white transition-colors"
		>
			<LocalIcon
				name="material-symbols:close"
				class="text-[var(--text-section-title-size)]"
			/>
		</button>
	</div>
</div>

<style>
	.player-error-toast__message {
		font-size: var(--text-ui-size);
	}
</style>
