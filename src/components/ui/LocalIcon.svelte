<script lang="ts">
	import { resolveLocalIcon, type LocalIconName } from "./local-icons";
	import "./local-icon.css";

	let {
		name,
		class: className = "",
	}: { name: LocalIconName | string; class?: string } = $props();

	const source = $derived(resolveLocalIcon(name));
</script>

<span
	class={`local-icon ${className}`.trim()}
	style:--local-icon-source={`url("${source}")`}
	data-local-icon={name}
	aria-hidden="true"
></span>
