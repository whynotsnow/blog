<script>
	import { onDestroy, onMount } from "svelte";
	import { pioConfig } from "@/config";

	const pioOptions = {
		mode: pioConfig.mode,
		hidden: false,
		content: pioConfig.dialog || {},
		model: pioConfig.models || ["/pio/models/pio/model.json"],
	};

	let _pioInstance = null;
	let pioInitialized = false;
	let pioContainer;
	let pioCanvas;
	let retryTimer;
	let disposed = false;

	function scheduleInit() {
		clearTimeout(retryTimer);
		retryTimer = setTimeout(initPio, 100);
	}

	function initPio() {
		if (disposed || pioInitialized) return;
		if (
			typeof window === "undefined" ||
			typeof Paul_Pio === "undefined" ||
			!pioContainer ||
			!pioCanvas
		) {
			scheduleInit();
			return;
		}

		try {
			_pioInstance = new Paul_Pio(pioOptions);
			pioInitialized = true;
		} catch (error) {
			console.error("Pio initialization error:", error);
		}
	}

	function loadScript(src, id) {
		return new Promise((resolve, reject) => {
			const existing = document.getElementById(id);
			if (existing) {
				resolve();
				return;
			}

			const script = document.createElement("script");
			script.id = id;
			script.src = src;
			script.onload = resolve;
			script.onerror = reject;
			document.head.appendChild(script);
		});
	}

	function loadPioAssets() {
		loadScript("/pio/static/l2d.js", "pio-l2d-script")
			.then(() => loadScript("/pio/static/pio.js", "pio-main-script"))
			.then(scheduleInit)
			.catch((error) => {
				console.error("Failed to load Pio scripts:", error);
			});
	}

	function releaseCanvas() {
		if (!pioCanvas) return;
		const context =
			pioCanvas.getContext("webgl") ||
			pioCanvas.getContext("experimental-webgl");
		context?.getExtension("WEBGL_lose_context")?.loseContext();
	}

	onMount(() => {
		loadPioAssets();
	});

	onDestroy(() => {
		disposed = true;
		clearTimeout(retryTimer);
		releaseCanvas();
		_pioInstance = null;
		pioInitialized = false;
	});
</script>

<div
	class={`pio-container ${pioConfig.position || "right"}`}
	data-pio-mounted="true"
	bind:this={pioContainer}
>
	<div class="pio-action"></div>
	<canvas
		id="pio"
		bind:this={pioCanvas}
		width={pioConfig.width || 280}
		height={pioConfig.height || 250}
	></canvas>
</div>
