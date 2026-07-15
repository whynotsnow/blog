import type { PageLayoutPolicy, PageLayoutPolicyName } from "./types";

export const pageLayoutPolicies = {
	default: {
		shellStrategy: "viewport-legacy",
		supporting: { flowLayout: "stack" },
		desktop: {
			base: "three-column",
			allowed: ["three-column", "content-right"],
		},
	},
	listing: {
		shellStrategy: "container-content",
		supporting: { flowLayout: "stack" },
		desktop: {
			base: "content-right",
			allowed: ["content-right"],
		},
	},
	post: {
		shellStrategy: "container-content",
		supporting: { flowLayout: "stack" },
		desktop: {
			base: "content-right",
			allowed: ["content-right"],
		},
	},
} satisfies Record<PageLayoutPolicyName, PageLayoutPolicy>;
