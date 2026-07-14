import type { PageLayoutPolicy, PageLayoutPolicyName } from "./types";

export const pageLayoutPolicies = {
	default: {
		responsiveStrategy: "viewport-legacy",
		desktop: {
			base: "three-column",
			allowed: ["three-column", "content-right"],
		},
		tablet: { base: "content-sidebar" },
		mobile: { base: "content" },
	},
	listing: {
		responsiveStrategy: "container-content",
		desktop: {
			base: "content-right",
			allowed: ["content-right"],
		},
		tablet: { base: "content-sidebar" },
		mobile: { base: "content" },
	},
	post: {
		responsiveStrategy: "container-content",
		desktop: {
			base: "content-right",
			allowed: ["content-right"],
		},
		tablet: { base: "content-sidebar" },
		mobile: { base: "content" },
	},
} satisfies Record<PageLayoutPolicyName, PageLayoutPolicy>;
