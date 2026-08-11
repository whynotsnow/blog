import { describe, expect, it } from "vitest";

import { resolvePageLayout } from "@/services/layout/resolver";

describe("resolvePageLayout", () => {
	it("normalizes the default policy", () => {
		expect(resolvePageLayout()).toMatchObject({
			name: "default",
			shellStrategy: "container-content",
			desktop: {
				layout: "content-right",
			},
		});
	});

	it("keeps ordinary content pages on the container shell", () => {
		expect(resolvePageLayout("content")).toMatchObject({
			name: "content",
			shellStrategy: "container-content",
		});
	});

	it("keeps listing pages on the container shell", () => {
		expect(resolvePageLayout("listing")).toMatchObject({
			name: "listing",
			shellStrategy: "container-content",
		});
	});
});
