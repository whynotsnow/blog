export type RepeatMode = 0 | 1 | 2;

export type Song = {
	id: number;
	title: string;
	artist: string;
	cover: string;
	url: string;
	duration: number;
};

export type MetingSong = {
	id?: number;
	name?: string;
	title?: string;
	artist?: string;
	author?: string;
	pic?: string;
	cover?: string;
	url?: string;
	lrc?: string;
	lyric?: string;
	duration?: number;
};

export type MusicPlayerLabels = {
	show: string;
	hide: string;
	expand: string;
	collapse: string;
	pause: string;
	play: string;
	playlist: string;
	cover: string;
	progress: string;
	volume: string;
	unknownSong: string;
	unknownArtist: string;
};
