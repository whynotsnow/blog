export const MUSIC_PLAYER_COMMAND_EVENT = "music-player-command";
export const MUSIC_PLAYER_STATE_EVENT = "music-player-state-change";
export const MUSIC_PLAYER_PANEL_TRANSITION_MS = 420;

export function musicPlayerPanelEasing(t: number) {
	return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export type MusicPlayerCommand = {
	type: "toggle-visibility";
};

export type MusicPlayerUiState = {
	isExpanded: boolean;
	isLoading: boolean;
	isPlaying: boolean;
	isVisible: boolean;
};
