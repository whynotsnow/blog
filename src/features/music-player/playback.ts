export function getPreviousIndex(currentIndex: number, playlistLength: number) {
	return currentIndex > 0 ? currentIndex - 1 : playlistLength - 1;
}

export function getNextIndex({
	currentIndex,
	playlistLength,
	isShuffled,
}: {
	currentIndex: number;
	playlistLength: number;
	isShuffled: boolean;
}) {
	if (!isShuffled) {
		return currentIndex < playlistLength - 1 ? currentIndex + 1 : 0;
	}

	let nextIndex = currentIndex;
	do {
		nextIndex = Math.floor(Math.random() * playlistLength);
	} while (nextIndex === currentIndex && playlistLength > 1);

	return nextIndex;
}

export function calculateVolumeFromPointer(clientX: number, rect: DOMRect) {
	return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
}

export function formatTime(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}
