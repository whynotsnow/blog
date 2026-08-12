export const HOME_FEATURED_SECTION_SIZE: number = 3;
export const HOME_CATEGORY_SECTION_SIZE: number = 6;
export const CATEGORY_PAGE_SIZE: number = 12;

export const LIGHT_MODE = "light" as const,
	DARK_MODE = "dark" as const;
export const DEFAULT_THEME: typeof LIGHT_MODE = LIGHT_MODE;

// Banner height unit: vh
export const BANNER_HEIGHT: number = 35;
export const BANNER_HEIGHT_FULLSCREEN: number = 100;
export const BANNER_HEIGHT_EXTEND: number = 30;
export const BANNER_HEIGHT_HOME: number = BANNER_HEIGHT + BANNER_HEIGHT_EXTEND;

// The height the main panel overlaps the banner, unit: rem
export const MAIN_PANEL_OVERLAPS_BANNER_HEIGHT: number = 3.5;

// Category constants
export const UNCATEGORIZED = "uncategorized" as const;

// Wallpaper mode constants
export const WALL_BANNER = "banner" as const;
export const WALL_FULL_BANNER = "full-banner" as const;
export const WALL_FULL = "full-wall" as const;
export const WALL_NONE = "none" as const;
