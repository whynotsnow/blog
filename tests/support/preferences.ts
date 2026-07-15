import type { Page } from "@playwright/test";

export async function useStoredPreference(
	page: Page,
	key: string,
	value: string,
): Promise<void> {
	await page.addInitScript(
		({ preferenceKey, preferenceValue }) => {
			localStorage.setItem(preferenceKey, preferenceValue);
		},
		{ preferenceKey: key, preferenceValue: value },
	);
}
