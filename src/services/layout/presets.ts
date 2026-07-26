import type { PageLayoutPolicy, PageLayoutPolicyName } from "./types";

export const pageLayoutPolicies = {
	default: {
		shellStrategy: "viewport-legacy",
		desktop: {
			layout: "content-right",
		},
	},
	listing: {
		shellStrategy: "container-content",
		desktop: {
			layout: "content-right",
		},
	},
	post: {
		shellStrategy: "container-content",
		desktop: {
			layout: "content-right",
		},
	},
} satisfies Record<PageLayoutPolicyName, PageLayoutPolicy>;
