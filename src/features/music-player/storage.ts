const STORAGE_KEY_VOLUME = "music-player-volume";

export function loadStoredVolume(defaultVolume = 0.7) {
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

export function saveStoredVolume(volume: number) {
	try {
		if (typeof localStorage !== "undefined") {
			localStorage.setItem(STORAGE_KEY_VOLUME, volume.toString());
		}
	} catch (error) {
		console.warn("Failed to save volume settings to localStorage:", error);
	}
}
