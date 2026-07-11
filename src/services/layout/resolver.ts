import { pageLayoutPolicies } from "./presets";
import type { PageLayoutPolicyName, ResolvedPageLayout } from "./types";

export function resolvePageLayout(
	name: PageLayoutPolicyName = "default",
): ResolvedPageLayout {
	const policy = pageLayoutPolicies[name];
	return {
		name,
		...policy,
		allowedDesktopLayouts: policy.desktop.allowed.join(" "),
	};
}
