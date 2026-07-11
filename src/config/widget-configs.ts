import { announcementConfig } from "./announcement";
import { sakuraConfig } from "./effects";
import { musicPlayerConfig } from "./music";
import { pioConfig } from "./pio";
import { profileConfig } from "./profile";
import { shareConfig } from "./share";
import { fullscreenWallpaperConfig } from "./wallpaper";

export const widgetConfigs = {
	profile: profileConfig,
	announcement: announcementConfig,
	music: musicPlayerConfig,
	sakura: sakuraConfig,
	fullscreenWallpaper: fullscreenWallpaperConfig,
	pio: pioConfig,
	share: shareConfig,
} as const;
