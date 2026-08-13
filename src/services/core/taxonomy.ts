import { CATEGORY_DEFINITIONS, type CategoryDefinition } from "@/config";
import { getCategoryPageUrl, toSlug } from "@/utils/url";

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

		// name 和 aliases 都映射到同一个 canonical definition，避免 Technology/技术 分裂成两个分类。
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
		// 命中配置定义时返回 canonical 名称和 slug，不保留输入别名。
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
	return getCategoryPageUrl(category?.trim() || "uncategorized");
}
