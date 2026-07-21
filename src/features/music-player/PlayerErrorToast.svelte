<script lang="ts">
	import LocalIcon from "@/components/ui/LocalIcon.svelte";

	export let message = "";
	export let onClose: () => void;
</script>

<div class="fixed bottom-20 right-4 z-60 max-w-sm">
	<div
		class="bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up"
	>
		<LocalIcon name="material-symbols:error" class="text-xl shrink-0" />
		<span class="text-sm flex-1">{message}</span>
		<button
			on:click={onClose}
			class="text-white/80 hover:text-white transition-colors"
		>
			<LocalIcon name="material-symbols:close" class="text-lg" />
		</button>
	</div>
</div>
