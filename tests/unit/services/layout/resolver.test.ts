import { describe, expect, it } from "vitest";

import { resolvePageLayout } from "@/services/layout/resolver";

describe("resolvePageLayout", () => {
	it("normalizes the default policy", () => {
		expect(resolvePageLayout()).toMatchObject({
			name: "default",
			shellStrategy: "viewport-legacy",
			allowedDesktopLayouts: "content-right",
		});
	});

	it("keeps listing pages on the container shell", () => {
		expect(resolvePageLayout("listing")).toMatchObject({
			name: "listing",
			shellStrategy: "container-content",
		});
	});
});
