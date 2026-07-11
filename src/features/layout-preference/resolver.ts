import type { DesktopLayoutConstraint, DesktopLayoutPreference } from "./types";

export function resolveDesktopLayout(
	constraint: DesktopLayoutConstraint,
	preference: DesktopLayoutPreference | null,
): DesktopLayoutPreference {
	return preference && constraint.allowed.includes(preference)
		? preference
		: constraint.base;
}
