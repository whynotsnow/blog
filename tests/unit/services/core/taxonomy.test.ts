import { describe, expect, it } from "vitest";
import type { CategoryDefinition } from "@/config";
import {
	buildCategoryDefinitionIndex,
	resolveCategory,
} from "@/services/core/taxonomy";

describe("category taxonomy", () => {
	it.each(["技术", "Technology", " technology "])(
		"canonicalizes %j to the technology category",
		(input) => {
			expect(resolveCategory(input)).toEqual({
				name: "技术",
				slug: "tech",
			});
		},
	);

	it("normalizes unicode and preserves unknown category names", () => {
		expect(resolveCategory(" Cafe\u0301 Notes ")).toEqual({
			name: "Café Notes",
			slug: "café-notes",
		});
	});

	it("rejects duplicate canonical slugs", () => {
		const definitions: CategoryDefinition[] = [
			{ name: "One", slug: "shared" },
			{ name: "Two", slug: "shared" },
		];
		expect(() => buildCategoryDefinitionIndex(definitions)).toThrow(
			'Category slug "shared" is shared',
		);
	});

	it("rejects aliases owned by different categories", () => {
		const definitions: CategoryDefinition[] = [
			{ name: "One", slug: "one", aliases: ["Shared"] },
			{ name: "Two", slug: "two", aliases: ["shared"] },
		];
		expect(() => buildCategoryDefinitionIndex(definitions)).toThrow(
			'Category input "shared" is shared',
		);
	});
});
