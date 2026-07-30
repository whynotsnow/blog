import type { ImageMetadata, MarkdownHeading } from "astro";
import { AstroComponentFactory } from "astro/runtime/server/index.js";
import type { PostNavigationLink, UIMeta } from "../core/types";
import type { SupportPostLink } from "../support";

export type Person = {
	"@type": "Person";
	name: string;
	url?: string;
	image?: string;
	sameAs?: string[];
};

export type ImageObject = {
	"@type": "ImageObject";
	url: string;
	width?: number;
	height?: number;
	caption?: string;
};

export type BlogPostingJsonLd = {
	"@context": "https://schema.org";
	"@type": "BlogPosting";
	headline: string;
	description: string;
	keywords?: string | string[];
	author: Person | Person[];
	datePublished: string;
	dateModified?: string;
	inLanguage: string;
	image?: string | ImageObject;
	url?: string;
	mainEntityOfPage?: {
		"@type": "WebPage";
		"@id": string;
	};
	publisher?:
		| Person
		| {
				"@type": "Organization";
				name: string;
				logo?: ImageObject;
		  };
	articleSection?: string | string[];
	wordCount?: number;
	timeRequired?: string;
	thumbnailUrl?: string;
};

export type PostDetailHeaderViewModel = {
	id: string;
	title: string;
	published: Date;
	updated?: Date;
	category: UIMeta;
	tags: UIMeta[];
	words: number;
	minutes: number;
	hasCover: boolean;
};

export type PostDetailPageProps = {
	id: string;
	title: string;
	description: string;
	author: string;
	lang: string;
	banner?: string;
	header: PostDetailHeaderViewModel;
	cover?: {
		src: string | ImageMetadata;
		basePath?: string;
	};
	encryption: {
		enabled: boolean;
		password: string;
	};
	comment: {
		enabled: boolean;
		path: string;
	};
	license: {
		sourceLink: string;
		licenseName: string;
		licenseUrl: string;
	};
	navigation: {
		prev?: PostNavigationLink;
		next?: PostNavigationLink;
	};
	support: {
		continueReading: SupportPostLink[];
		recommendedPosts: SupportPostLink[];
		randomPosts: SupportPostLink[];
	};
	canonicalUrl: string;
	canonicalOgSlug: string;
	Content: AstroComponentFactory;
	headings: MarkdownHeading[];
	lastModified: string;
	jsonLd: BlogPostingJsonLd;
	posterCoverUrl?: string;
	posterAvatarUrl?: string;
};
