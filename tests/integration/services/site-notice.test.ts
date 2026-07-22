import { describe, expect, it } from "vitest";

import { buildSiteNoticeViewModel } from "@/services/site-notice";
import type { SiteNoticeConfig } from "@/types/config";

const config: SiteNoticeConfig = {
	enable: true,
	autoRotate: true,
	rotationIntervalMs: 1000,
	notices: [
		{
			id: "home",
			title: "Home notice",
			content: "Home notice",
			status: "info",
			dismissible: true,
			visibility: { scope: "home" },
			action: { label: "Read", href: "/about/" },
		},
		{
			id: "post",
			title: "Post notice",
			content: "Post notice",
			status: "warning",
			level: "critical",
			visibility: { scope: "content", include: ["/posts/*"] },
		},
	],
};

describe("buildSiteNoticeViewModel", () => {
	it("filters route-owned notices and normalizes defaults", async () => {
		const viewModel = await buildSiteNoticeViewModel(config, "/");

		expect(viewModel).toMatchObject({
			autoRotate: true,
			rotationIntervalMs: 3000,
			notices: expect.arrayContaining([
				expect.objectContaining({
					id: "home",
					icon: "material-symbols:info-outline-rounded",
					level: "normal",
					pinned: false,
					dismissible: true,
					requiresAck: false,
					action: { label: "Read", href: "/about/", external: false },
				}),
			]),
		});
	});

	it("matches wildcard content routes", async () => {
		expect(
			(await buildSiteNoticeViewModel(config, "/posts/example/"))
				?.notices,
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: "post",
					status: "warning",
					level: "critical",
					dismissible: false,
					requiresAck: true,
				}),
			]),
		);
	});

	it("returns no model when disabled", async () => {
		expect(
			await buildSiteNoticeViewModel({ ...config, enable: false }, "/"),
		).toBeUndefined();
	});
});
