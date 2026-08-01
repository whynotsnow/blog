const STORAGE_KEY_VOLUME = "music-player-volume";
const STORAGE_KEY_MOUNTED = "music-player-mounted";

export function loadStoredMusicPlayerMounted(defaultMounted = true): boolean {
	try {
		if (typeof localStorage === "undefined") return defaultMounted;

		const savedMounted = localStorage.getItem(STORAGE_KEY_MOUNTED);
		return savedMounted === null ? defaultMounted : savedMounted === "1";
	} catch (error) {
		console.warn(
			"Failed to load music player mount preference from localStorage:",
			error,
		);
	}

	return defaultMounted;
}

export function saveStoredMusicPlayerMounted(mounted: boolean): void {
	try {
		if (typeof localStorage !== "undefined") {
			localStorage.setItem(STORAGE_KEY_MOUNTED, mounted ? "1" : "0");
		}
	} catch (error) {
		console.warn(
			"Failed to save music player mount preference to localStorage:",
			error,
		);
	}
}

export function loadStoredVolume(defaultVolume = 0.7): number {
	try {
		if (typeof localStorage === "undefined") return defaultVolume;

		const savedVolume = localStorage.getItem(STORAGE_KEY_VOLUME);
		if (
			savedVolume !== null &&
			!Number.isNaN(Number.parseFloat(savedVolume))
		) {
			return Number.parseFloat(savedVolume);
		}
	} catch (error) {
		console.warn(
			"Failed to load volume settings from localStorage:",
			error,
		);
	}

	return defaultVolume;
}

export function saveStoredVolume(volume: number): void {
	try {
		if (typeof localStorage !== "undefined") {
			localStorage.setItem(STORAGE_KEY_VOLUME, volume.toString());
		}
	} catch (error) {
		console.warn("Failed to save volume settings to localStorage:", error);
	}
}
