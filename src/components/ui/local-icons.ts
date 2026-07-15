import autoStoriesOutlineRounded from "@/assets/icons/material-symbols/auto-stories-outline-rounded.svg?url";
import checkCircleOutlineRounded from "@/assets/icons/material-symbols/check-circle-outline-rounded.svg?url";
import constructionRounded from "@/assets/icons/material-symbols/construction-rounded.svg?url";
import errorOutlineRounded from "@/assets/icons/material-symbols/error-outline-rounded.svg?url";
import hideSourceRounded from "@/assets/icons/material-symbols/hide-source-rounded.svg?url";
import historyRounded from "@/assets/icons/material-symbols/history-rounded.svg?url";
import infoOutlineRounded from "@/assets/icons/material-symbols/info-outline-rounded.svg?url";
import keyboardArrowUpRounded from "@/assets/icons/material-symbols/keyboard-arrow-up-rounded.svg?url";
import notificationsOutlineRounded from "@/assets/icons/material-symbols/notifications-outline-rounded.svg?url";
import smartToyOutlineRounded from "@/assets/icons/material-symbols/smart-toy-outline-rounded.svg?url";
import tuneRounded from "@/assets/icons/material-symbols/tune-rounded.svg?url";
import warningOutlineRounded from "@/assets/icons/material-symbols/warning-outline-rounded.svg?url";

export const localIconSources = {
	"material-symbols:auto-stories-outline-rounded": autoStoriesOutlineRounded,
	"material-symbols:check-circle-outline-rounded": checkCircleOutlineRounded,
	"material-symbols:construction-rounded": constructionRounded,
	"material-symbols:error-outline-rounded": errorOutlineRounded,
	"material-symbols:hide-source-rounded": hideSourceRounded,
	"material-symbols:history-rounded": historyRounded,
	"material-symbols:info-outline-rounded": infoOutlineRounded,
	"material-symbols:keyboard-arrow-up-rounded": keyboardArrowUpRounded,
	"material-symbols:notifications-outline-rounded":
		notificationsOutlineRounded,
	"material-symbols:smart-toy-outline-rounded": smartToyOutlineRounded,
	"material-symbols:tune-rounded": tuneRounded,
	"material-symbols:warning-outline-rounded": warningOutlineRounded,
} as const;

export type LocalIconName = keyof typeof localIconSources;

const fallbackIcon = localIconSources["material-symbols:info-outline-rounded"];

export function resolveLocalIcon(name: string) {
	return localIconSources[name as LocalIconName] ?? fallbackIcon;
}
