import { describe, expect, it } from "vitest";
import { buildLayoutPageShellModel } from "@/services/layout/page-shell";

describe("layout page shell canonical URL", () => {
	it("uses the build-time canonical URL when provided", () => {
		const model = buildLayoutPageShellModel({
			canonicalUrl: "/posts/canonical-name/",
			pathname: "/posts/legacy-name/",
			site: new URL("https://example.com/"),
		});

		expect(model.canonicalUrl).toBe(
			"https://example.com/posts/canonical-name/",
		);
	});

	it("uses the current pathname for pages without an explicit canonical URL", () => {
		const model = buildLayoutPageShellModel({
			pathname: "/archive/",
			site: new URL("https://example.com/"),
		});

		expect(model.canonicalUrl).toBe("https://example.com/archive/");
	});
});
