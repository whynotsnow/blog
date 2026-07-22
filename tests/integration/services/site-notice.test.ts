import { describe, expect, it } from "vitest";

import {
	buildSiteNoticeItemViewModel,
	isSiteNoticeVisible,
} from "@/services/site-notice";

describe("buildSiteNoticeItemViewModel", () => {
	it("normalizes markdown notice defaults", () => {
		const notice = buildSiteNoticeItemViewModel("home", {
			title: "Home notice",
			summary: "Short summary",
			status: "info",
			action: { label: "Read", href: "/about/" },
		});

		expect(notice).toMatchObject({
			id: "home",
			title: "Home notice",
			summary: "Short summary",
			content: "Short summary",
			icon: "material-symbols:info-outline-rounded",
			level: "normal",
			pinned: false,
			dismissible: true,
			requiresAck: false,
			action: { label: "Read", href: "/about/", external: false },
		});
	});

	it("uses critical level defaults for acknowledgement notices", () => {
		const notice = buildSiteNoticeItemViewModel("post", {
			title: "Post notice",
			status: "warning",
			level: "critical",
		});

		expect(notice).toMatchObject({
			id: "post",
			status: "warning",
			level: "critical",
			dismissible: false,
			requiresAck: true,
		});
	});
});

describe("isSiteNoticeVisible", () => {
	it("matches wildcard content routes", () => {
		expect(
			isSiteNoticeVisible(
				{ scope: "content", include: ["/posts/*"] },
				"/posts/example/",
			),
		).toBe(true);
	});

	it("applies explicit exclusions before scope rules", () => {
		expect(
			isSiteNoticeVisible(
				{ scope: "all", exclude: ["/archive/"] },
				"/archive/",
			),
		).toBe(false);
	});

	it("keeps home notices scoped to the home page", () => {
		expect(isSiteNoticeVisible({ scope: "home" }, "/")).toBe(true);
		expect(isSiteNoticeVisible({ scope: "home" }, "/posts/example/")).toBe(
			false,
		);
	});
});
