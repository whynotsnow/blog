import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { CATEGORY_SLUG_MAP } from "@/config";
import { toSlug, url } from "@/utils/url";

export function generateCategorySlug(name: string): string {
	const trimmed = name.trim();
	return CATEGORY_SLUG_MAP[trimmed] ?? toSlug(trimmed);
}

export function generateTagSlug(name: string): string {
	return toSlug(name);
}

export function getCategoryUrl(category: string | null): string {
	if (
		!category ||
		category.trim() === "" ||
		category.trim().toLocaleLowerCase("en-US") ===
			i18n(I18nKey.uncategorized).toLocaleLowerCase("en-US")
	) {
		return url("/archive/?uncategorized=true");
	}

	return url(`/archive/?category=${encodeURIComponent(category.trim())}`);
}
