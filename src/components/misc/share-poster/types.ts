export interface SharePosterProps {
	title: string;
	author: string;
	description: string;
	pubDate: string;
	coverImage: string | null;
	url: string;
	siteTitle: string;
	avatar: string | null;
}

export interface SharePosterLabels {
	author: string;
	scanToRead: string;
	shareArticle: string;
	generatingPoster: string;
	copied: string;
	copyLink: string;
	savePoster: string;
}

export type PosterDate = {
	day: string;
	month: string;
	year: string;
};

export interface DrawSharePosterInput extends SharePosterProps {
	themeColor: string;
	labels: Pick<SharePosterLabels, "author" | "scanToRead">;
}
