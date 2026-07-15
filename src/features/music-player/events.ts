export const MUSIC_PLAYER_COMMAND_EVENT = "music-player-command";
export const MUSIC_PLAYER_STATE_EVENT = "music-player-state-change";

export type MusicPlayerCommand = {
	type: "toggle-panel";
};

export type MusicPlayerUiState = {
	hasStarted: boolean;
	isExpanded: boolean;
	isLoading: boolean;
	isPlaying: boolean;
};
