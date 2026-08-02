import type { BannerImages } from "@/services/banner";
import type { SiteConfig } from "@/types/config";

type BannerSingleOptions = {
	desktopImages: BannerImages["desktop"];
	mobileImages: BannerImages["mobile"];
	position: SiteConfig["banner"]["position"];
};

function getRandomImage(
	images: string | string[],
	storageKey: string,
): string | null {
	if (Array.isArray(images)) {
		if (images.length === 0) return null;
		if (images.length === 1) return images[0];

		const lastIndex = sessionStorage.getItem(storageKey);
		let newIndex: number;

		do {
			newIndex = Math.floor(Math.random() * images.length);
		} while (newIndex === Number.parseInt(lastIndex || "-1"));

		sessionStorage.setItem(storageKey, newIndex.toString());
		return images[newIndex];
	}

	return images || null;
}

function appendBannerImage(
	container: HTMLElement,
	src: string | null,
	options: {
		alt: string;
		className: string;
		id?: string;
		position: SiteConfig["banner"]["position"];
	},
) {
	if (!src) return;

	const image = document.createElement("img");
	if (options.id) image.id = options.id;
	image.alt = options.alt;
	image.className = options.className;
	image.draggable = false;
	image.src = src;
	image.loading = "eager";
	if (options.position) {
		image.dataset.position = options.position;
	}
	container.appendChild(image);
}

export function initBannerSingle(options: BannerSingleOptions): void {
	const container = document.getElementById("banner-single-container");
	if (!container || container.querySelector("img")) return;

	appendBannerImage(
		container,
		getRandomImage(options.mobileImages, "banner_mobile_index"),
		{
			alt: "Mobile banner image of the blog",
			className:
				"banner-enter-animation block md:hidden object-cover h-full w-full transition duration-700 opacity-100",
			position: options.position,
		},
	);

	appendBannerImage(
		container,
		getRandomImage(options.desktopImages, "banner_desktop_index"),
		{
			id: "banner",
			alt: "Desktop banner image of the blog",
			className:
				"banner-enter-animation hidden md:block object-cover h-full w-full transition duration-700 opacity-100",
			position: options.position,
		},
	);
}

export function initBannerSingleFromDocument(): void {
	const config = document.getElementById("banner-single-options");
	if (!config?.textContent) return;

	initBannerSingle(JSON.parse(config.textContent) as BannerSingleOptions);
}
