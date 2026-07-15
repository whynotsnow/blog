import type { PageLayoutPolicy, PageLayoutPolicyName } from "./types";

export const pageLayoutPolicies = {
	default: {
		shellStrategy: "viewport-legacy",
		desktop: {
			base: "content-right",
			allowed: ["content-right"],
		},
	},
	listing: {
		shellStrategy: "container-content",
		desktop: {
			base: "content-right",
			allowed: ["content-right"],
		},
	},
	post: {
		shellStrategy: "container-content",
		desktop: {
			base: "content-right",
			allowed: ["content-right"],
		},
	},
} satisfies Record<PageLayoutPolicyName, PageLayoutPolicy>;
