import { describe, expect, it } from "vitest";

import { resolveDesktopLayout } from "@/features/layout-preference/resolver";

describe("resolveDesktopLayout", () => {
	const constraint = {
		base: "content-right" as const,
		allowed: ["content-right", "three-column"] as const,
	};

	it("keeps an allowed preference", () => {
		expect(
			resolveDesktopLayout(
				{ ...constraint, allowed: [...constraint.allowed] },
				"three-column",
			),
		).toBe("three-column");
	});

	it("falls back to the policy base for a missing preference", () => {
		expect(
			resolveDesktopLayout(
				{ ...constraint, allowed: [...constraint.allowed] },
				null,
			),
		).toBe("content-right");
	});
});
