import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { CATEGORY_DEFINITIONS, type CategoryDefinition } from "@/config";
import { toSlug, url } from "@/utils/url";

export type CanonicalCategory = {
	name: string;
	slug: string;
};

function normalizeCategoryKey(value: string): string {
	return value.trim().normalize("NFC").toLocaleLowerCase("en-US");
}

export function buildCategoryDefinitionIndex(
	definitions: readonly CategoryDefinition[],
): ReadonlyMap<string, CategoryDefinition> {
	const byInput = new Map<string, CategoryDefinition>();
	const slugOwners = new Map<string, CategoryDefinition>();

	for (const definition of definitions) {
		const name = definition.name.trim().normalize("NFC");
		const slug = toSlug(definition.slug);
		if (!name || !slug) {
			throw new Error(
				"Category definitions require a non-empty name and slug",
			);
		}

		const existingSlugOwner = slugOwners.get(slug);
		if (existingSlugOwner) {
			throw new Error(
				`Category slug "${slug}" is shared by "${existingSlugOwner.name}" and "${definition.name}"`,
			);
		}
		slugOwners.set(slug, definition);

		for (const input of [definition.name, ...(definition.aliases ?? [])]) {
			const key = normalizeCategoryKey(input);
			if (!key) throw new Error("Category aliases must not be empty");
			const existingInputOwner = byInput.get(key);
			if (existingInputOwner) {
				throw new Error(
					`Category input "${input}" is shared by "${existingInputOwner.name}" and "${definition.name}"`,
				);
			}
			byInput.set(key, definition);
		}
	}

	return byInput;
}

const categoryDefinitionsByInput =
	buildCategoryDefinitionIndex(CATEGORY_DEFINITIONS);

export function resolveCategory(name: string): CanonicalCategory {
	const normalizedName = name.trim().normalize("NFC");
	const definition = categoryDefinitionsByInput.get(
		normalizeCategoryKey(normalizedName),
	);
	if (definition) {
		return { name: definition.name, slug: definition.slug };
	}

	return { name: normalizedName, slug: toSlug(normalizedName) };
}

export function generateCategorySlug(name: string): string {
	return resolveCategory(name).slug;
}

export function generateTagSlug(name: string): string {
	return toSlug(name.normalize("NFC"));
}

export function getCategoryUrl(category: string | null): string {
	if (
		!category ||
		category.trim() === "" ||
		normalizeCategoryKey(category) ===
			normalizeCategoryKey(i18n(I18nKey.uncategorized))
	) {
		return url("/archive/?uncategorized=true");
	}

	return url(`/archive/?category=${encodeURIComponent(category.trim())}`);
}
