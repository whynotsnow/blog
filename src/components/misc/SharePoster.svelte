<script lang="ts">
	import { onMount } from "svelte";
	import I18nKey from "../../i18n/i18nKey";
	import { i18n } from "../../i18n/translation";
	import { readThemeColor } from "./share-poster/assets";
	import {
		copyShareLink,
		downloadPosterImage,
	} from "./share-poster/download";
	import SharePosterModal from "./share-poster/SharePosterModal.svelte";
	import type {
		SharePosterLabels,
		SharePosterProps,
	} from "./share-poster/types";

	export let title: string;
	export let author: string;
	export let description = "";
	export let pubDate: string;
	export let coverImage: string | null = null;
	export let url: string;
	export let siteTitle: string;
	export let avatar: string | null = null;

	let showModal = false;
	let posterImage: string | null = null;
	let themeColor = "#558e88";
	let copied = false;

	const COPY_FEEDBACK_DURATION = 2000;
	const labels: SharePosterLabels = {
		author: i18n(I18nKey.author),
		scanToRead: i18n(I18nKey.scanToRead),
		shareArticle: i18n(I18nKey.shareArticle),
		generatingPoster: i18n(I18nKey.generatingPoster),
		copied: i18n(I18nKey.copied),
		copyLink: i18n(I18nKey.copyLink),
		savePoster: i18n(I18nKey.savePoster),
	};

	onMount(() => {
		themeColor = readThemeColor();
	});

	function getPosterProps(): SharePosterProps {
		return {
			title,
			author,
			description,
			pubDate,
			coverImage,
			url,
			siteTitle,
			avatar,
		};
	}

	async function generatePoster() {
		showModal = true;
		if (posterImage) return;

		try {
			const { createSharePoster } = await import("./share-poster/canvas");
			posterImage = await createSharePoster({
				...getPosterProps(),
				themeColor,
				labels,
			});
		} catch (error) {
			console.error("Failed to generate poster:", error);
		}
	}

	function downloadPoster() {
		downloadPosterImage(posterImage, title);
	}

	function closeModal() {
		showModal = false;
	}

	async function copyLink() {
		try {
			await copyShareLink(url);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, COPY_FEEDBACK_DURATION);
		} catch (error) {
			console.error("Failed to copy link:", error);
		}
	}
</script>

<button
	class="btn-regular px-6 py-3 rounded-lg inline-flex items-center gap-2"
	on:click={generatePoster}
	aria-label="Generate Share Poster"
>
	<span>{labels.shareArticle}</span>
</button>

{#if showModal}
	<SharePosterModal
		{posterImage}
		{themeColor}
		{copied}
		{labels}
		{closeModal}
		{copyLink}
		{downloadPoster}
	/>
{/if}

<style lang="css">
	button.btn-regular {
		transition:
			background-color 150ms,
			color 150ms;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background-color: var(--btn-regular-bg);
	}

	button.btn-regular:hover {
		background-color: var(--btn-regular-bg-hover);
	}

	button.btn-regular:active {
		background-color: var(--btn-regular-bg-active);
	}
</style>
