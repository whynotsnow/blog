export function downloadPosterImage(
	posterImage: string | null,
	title: string,
): void {
	if (!posterImage) return;

	const anchor = document.createElement("a");
	anchor.href = posterImage;
	anchor.download = `poster-${title.replace(/\s+/g, "-")}.png`;
	anchor.click();
}

export async function copyShareLink(url: string): Promise<void> {
	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(url);
		return;
	}

	const textarea = document.createElement("textarea");
	textarea.value = url;
	textarea.style.position = "fixed";
	textarea.style.left = "-9999px";
	document.body.appendChild(textarea);
	textarea.select();
	const copy = (
		document as Document & { execCommand?: (command: string) => boolean }
	).execCommand;
	copy?.call(document, "copy");
	document.body.removeChild(textarea);
}
