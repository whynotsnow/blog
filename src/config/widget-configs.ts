import { announcementConfig } from "./announcement";
import { sakuraConfig } from "./effects";
import { musicPlayerConfig } from "./music";
import { pioConfig } from "./pio";
import { profileConfig } from "./profile";
import { shareConfig } from "./share";
import { sidebarLayoutConfig } from "./sidebar";
import { fullscreenWallpaperConfig } from "./wallpaper";

export const widgetConfigs = {
	profile: profileConfig,
	announcement: announcementConfig,
	music: musicPlayerConfig,
	layout: sidebarLayoutConfig,
	sakura: sakuraConfig,
	fullscreenWallpaper: fullscreenWallpaperConfig,
	pio: pioConfig,
	share: shareConfig,
} as const;
