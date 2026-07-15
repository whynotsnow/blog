import type { MetingSong, Song } from "./types";

export const localPlaylist: Song[] = [
	{
		id: 1,
		title: "ひとり上手",
		artist: "Kaya",
		cover: "assets/music/cover/hitori.jpg",
		url: "assets/music/url/hitori.mp3",
		duration: 240,
	},
	{
		id: 2,
		title: "眩耀夜行",
		artist: "スリーズブーケ",
		cover: "assets/music/cover/xryx.jpg",
		url: "assets/music/url/xryx.mp3",
		duration: 180,
	},
	{
		id: 3,
		title: "春雷の頃",
		artist: "22/7",
		cover: "assets/music/cover/cl.jpg",
		url: "assets/music/url/cl.mp3",
		duration: 200,
	},
];

export function buildMetingApiUrl({
	api,
	server,
	type,
	id,
}: {
	api: string;
	server: string;
	type: string;
	id: string;
}) {
	return api
		.replace(":server", server)
		.replace(":type", type)
		.replace(":id", id)
		.replace(":auth", "")
		.replace(":r", Date.now().toString());
}

export function normalizeMetingPlaylist(
	list: MetingSong[],
	labels: { unknownSong: string; unknownArtist: string },
): Song[] {
	return list.map((song, index) => {
		const title = song.name ?? song.title ?? labels.unknownSong;
		const artist = song.artist ?? song.author ?? labels.unknownArtist;
		let duration = song.duration ?? 0;

		if (duration > 10000) duration = Math.floor(duration / 1000);
		if (!Number.isFinite(duration) || duration <= 0) duration = 0;

		return {
			id: song.id ?? index + 1,
			title,
			artist,
			cover: song.pic ?? song.cover ?? "",
			url: song.url ?? "",
			duration,
		};
	});
}

export function getAssetPath(path: string): string {
	if (path.startsWith("http://") || path.startsWith("https://")) return path;
	if (path.startsWith("/")) return path;
	return `/${path}`;
}
