export type DesktopPageLayout = "three-column" | "content-right";
export type PageLayoutPolicyName = "default" | "listing" | "post";
export type NavbarBehavior = "banner-aware" | "fixed-visible";
export type EntryScrollBehavior = "top" | "content-start";
export type ResponsiveShellStrategy = "viewport-legacy" | "container-content";

export type PageLayoutPolicy = {
	shellStrategy: ResponsiveShellStrategy;
	desktop: {
		base: DesktopPageLayout;
		allowed: readonly DesktopPageLayout[];
	};
};

export type ResolvedPageLayout = PageLayoutPolicy & {
	name: PageLayoutPolicyName;
	allowedDesktopLayouts: string;
};

export type PageInteractionPolicy = {
	navbar: NavbarBehavior;
	entryScroll: EntryScrollBehavior;
};
