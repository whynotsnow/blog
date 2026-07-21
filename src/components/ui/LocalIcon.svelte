<script lang="ts">
	import { resolveLocalIcon, type LocalIconName } from "./local-icons";
	import "./local-icon.css";

	export let name: LocalIconName | string;
	let className = "";
	export { className as class };

	$: source = resolveLocalIcon(name);
</script>

<span
	class={`local-icon ${className}`.trim()}
	style:--local-icon-source={`url("${source}")`}
	data-local-icon={name}
	aria-hidden="true"
></span>
