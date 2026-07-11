export type DesktopPageLayout = "three-column" | "content-right";
export type PageLayoutPolicyName = "default" | "post";

export type PageLayoutPolicy = {
	desktop: {
		base: DesktopPageLayout;
		allowed: readonly DesktopPageLayout[];
	};
	tablet: { base: "content-sidebar" };
	mobile: { base: "content" };
};

export type ResolvedPageLayout = PageLayoutPolicy & {
	name: PageLayoutPolicyName;
	allowedDesktopLayouts: string;
};
