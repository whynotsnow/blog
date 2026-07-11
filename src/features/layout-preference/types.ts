export type DesktopLayoutPreference = "three-column" | "content-right";

export type DesktopLayoutConstraint = {
	base: DesktopLayoutPreference;
	allowed: DesktopLayoutPreference[];
};
