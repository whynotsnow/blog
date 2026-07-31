<script lang="ts">
	import { live2dCompanionConfig } from "@/config";
	import {
		live2dCompanionModuleConstants,
		useLive2DCompanionModule,
	} from "./use-live2d-companion-module";

	let iframeEl: HTMLIFrameElement | undefined;
	let rootEl: HTMLDivElement | undefined;
	let expressionPanelEl: HTMLDivElement | undefined;

	const companion = useLive2DCompanionModule();
	const { view } = companion;
	const { widgetWidth, frameHeight, expandLabel } =
		live2dCompanionModuleConstants;

	$: companion.setIframeEl(iframeEl);
	$: companion.setRootEl(rootEl);
	$: companion.setExpressionPanelEl(expressionPanelEl);
</script>

<div
	bind:this={rootEl}
	class={`live2d-companion ${live2dCompanionConfig.position || "right"}`}
	class:live2d-companion--collapsed={$view.collapsed}
	class:live2d-companion--collapsing={$view.collapsing}
	class:live2d-companion--drag-ready={$view.dragReady}
	class:live2d-companion--dragging={$view.dragging}
	class:live2d-companion--collapsed-avatar-dragging={$view.collapsedAvatarDragging}
	class:live2d-companion--loaded={$view.loaded}
	class:live2d-companion--loading={!$view.loaded}
	data-live2d-companion-mounted="true"
	style={$view.rootPositionStyle}
>
	{#if $view.frameMounted}
		<iframe
			id="l2d-iframe"
			title="Live2D companion"
			role="application"
			src="/live2d-companion/live2d-host.html"
			allowtransparency={true}
			data-width={widgetWidth}
			style={`height: ${frameHeight}px;`}
			bind:this={iframeEl}
			onmouseleave={companion.handleExpressionControlMouseLeave}
		></iframe>
	{/if}
	<button
		type="button"
		class="live2d-companion__avatar"
		class:is-loading={!$view.loaded}
		aria-label={expandLabel}
		title={expandLabel}
		onpointerdown={companion.beginCollapsedAvatarPointer}
		onpointermove={companion.updateCollapsedAvatarDrag}
		onpointerup={companion.endCollapsedAvatarPointer}
		onpointercancel={companion.cancelCollapsedAvatarPointer}
		onclick={companion.handleCollapsedAvatarClick}
	>
		<img
			src={$view.activeAvatarSrc}
			alt=""
			decoding="async"
			loading="eager"
		/>
	</button>
	{#if $view.expressionPanelOpen && $view.availableExpressions.length > 0}
		<div
			class="live2d-companion__expression-panel"
			role="group"
			aria-label="全部表情"
			style={`--expression-panel-anchor-x: ${$view.expressionPanelAnchor?.x ?? widgetWidth}px; --expression-panel-anchor-y: ${$view.expressionPanelAnchor?.y ?? frameHeight}px;`}
			bind:this={expressionPanelEl}
			onmouseleave={companion.handleExpressionControlMouseLeave}
		>
			{#each $view.availableExpressions as expression (expression)}
				<button
					type="button"
					class="live2d-companion__expression-option"
					title={companion.getExpressionLabel(expression)}
					aria-label={companion.getExpressionLabel(expression)}
					onclick={() => companion.selectExpression(expression)}
				>
					{companion.getExpressionLabel(expression)}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.live2d-companion {
		position: fixed;
		z-index: 999;
		bottom: 0;
		width: var(--live2d-companion-width, 280px);
		height: var(--live2d-companion-height, 392px);
		pointer-events: none;
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	.live2d-companion.left {
		left: 0;
	}

	.live2d-companion.right {
		right: 0;
	}

	.live2d-companion--loaded {
		opacity: 1;
	}

	.live2d-companion--dragging {
		cursor: grabbing;
		user-select: none;
	}

	.live2d-companion--collapsed-avatar-dragging {
		cursor: grabbing;
		user-select: none;
	}

	.live2d-companion--loading,
	.live2d-companion--collapsed {
		width: 3rem;
		height: 3rem;
		opacity: 1;
	}

	.live2d-companion.left.live2d-companion--loading,
	.live2d-companion.left.live2d-companion--collapsed {
		left: 1rem;
		bottom: 0.75rem;
	}

	.live2d-companion.right.live2d-companion--loading,
	.live2d-companion.right.live2d-companion--collapsed {
		right: 1rem;
		bottom: 0.75rem;
	}

	.live2d-companion.live2d-companion--collapsed {
		left: var(--live2d-companion-collapsed-left, auto);
		right: var(--live2d-companion-collapsed-right, auto);
		top: var(--live2d-companion-collapsed-top, auto);
		bottom: auto;
	}

	.live2d-companion[style*="--live2d-companion-left"] {
		left: var(--live2d-companion-left);
		right: auto;
		top: var(--live2d-companion-top);
		bottom: auto;
	}

	#l2d-iframe {
		position: absolute;
		inset-inline-start: 0;
		bottom: 0;
		width: 100%;
		height: var(--live2d-companion-height, 392px);
		border: 0;
		background: transparent;
		pointer-events: auto;
		opacity: 1;
		transition: opacity 0.2s ease;
	}

	.live2d-companion__avatar {
		display: none;
		position: absolute;
		inset: 0;
		width: 3rem;
		height: 3rem;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: var(--surface-overlay);
		box-shadow: var(--shadow-raised);
		cursor: pointer;
		pointer-events: auto;
		overflow: hidden;
		transition:
			box-shadow 0.2s ease,
			transform 0.2s ease;
	}

	.live2d-companion__avatar:hover {
		transform: translateY(-2px);
		box-shadow:
			var(--shadow-raised),
			0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent);
	}

	.live2d-companion__avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.live2d-companion__expression-panel {
		position: absolute;
		z-index: 3;
		left: calc(var(--expression-panel-anchor-x, 0px) + 0.5rem);
		top: var(--expression-panel-anchor-y, 0px);
		display: grid;
		grid-template-columns: repeat(4, 2.15rem);
		gap: 0.25rem;
		width: max-content;
		max-width: calc(100vw - 2rem);
		padding: 0.35rem;
		border: 1px solid var(--border-default);
		border-radius: 8px;
		background: var(--surface-overlay);
		box-shadow: var(--shadow-raised);
		backdrop-filter: blur(12px);
		pointer-events: auto;
	}

	.live2d-companion.left .live2d-companion__expression-panel {
		left: calc(var(--expression-panel-anchor-x, 0px) + 0.5rem);
	}

	.live2d-companion.right .live2d-companion__expression-panel {
		right: calc(
			var(--live2d-companion-width, 280px) -
				var(--expression-panel-anchor-x, 0px) + 0.5rem
		);
		left: auto;
	}

	.live2d-companion__expression-option {
		box-sizing: border-box;
		width: 2.15rem;
		height: 1.65rem;
		min-width: 0;
		padding: 0 0.2rem;
		border: 1px solid var(--border-default);
		border-radius: 6px;
		background: color-mix(in srgb, var(--surface-overlay) 88%, transparent);
		color: var(--text-primary);
		font:
			600 0.68rem/1 system-ui,
			-apple-system,
			BlinkMacSystemFont,
			"Segoe UI",
			sans-serif;
		letter-spacing: 0;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease,
			transform 0.15s ease;
	}

	.live2d-companion__expression-option:hover {
		background: var(--surface-raised);
		color: var(--accent);
		transform: translateY(-1px);
	}

	.live2d-companion__avatar.is-loading::after {
		content: "";
		position: absolute;
		inset: 0.25rem;
		border: 2px solid
			color-mix(in srgb, var(--text-primary) 20%, transparent);
		border-top-color: var(--accent);
		border-radius: 999px;
		animation: live2d-companion-spin 0.8s linear infinite;
	}

	.live2d-companion--loading #l2d-iframe,
	.live2d-companion--collapsing #l2d-iframe,
	.live2d-companion--collapsed #l2d-iframe {
		opacity: 0;
		pointer-events: none;
	}

	.live2d-companion--collapsing #l2d-iframe {
		transition: none;
	}

	.live2d-companion--collapsed #l2d-iframe {
		display: none;
	}

	.live2d-companion--loading .live2d-companion__avatar,
	.live2d-companion--collapsed .live2d-companion__avatar {
		display: block;
	}

	@keyframes live2d-companion-spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
