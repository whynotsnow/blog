import type { SiteConfig } from "@/types/config";

type BannerSource = SiteConfig["banner"]["src"];

export type BannerImages = {
	desktop: string | string[];
	mobile: string | string[];
};

export async function getBannerImages(
	config: SiteConfig,
): Promise<BannerImages> {
	let bannerSrc: BannerSource = config.banner.src;

	if (config.banner.imageApi?.enable && config.banner.imageApi?.url) {
		try {
			const response = await fetch(config.banner.imageApi.url);
			const text = await response.text();
			const apiImages = text.split("\n").filter((line) => line.trim());

			if (apiImages.length > 0) {
				bannerSrc = apiImages;
			}
		} catch (error) {
			console.warn("Failed to fetch images from API:", error);
		}
	}

	if (
		typeof bannerSrc === "object" &&
		bannerSrc !== null &&
		!Array.isArray(bannerSrc) &&
		("desktop" in bannerSrc || "mobile" in bannerSrc)
	) {
		return {
			desktop: bannerSrc.desktop || bannerSrc.mobile || "",
			mobile: bannerSrc.mobile || bannerSrc.desktop || "",
		};
	}

	const sharedSrc = bannerSrc as string | string[];
	return {
		desktop: sharedSrc,
		mobile: sharedSrc,
	};
}
