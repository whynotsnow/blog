import type { CommentConfig } from "../types/config";
import { SITE_LANG } from "./site";

export const commentConfig: CommentConfig = {
	enable: true, // 启用评论功能。当设置为 false 时，评论组件将不会显示在文章区域。
	twikoo: {
		envId: "https://comments.whynotsnow.com",
		lang: SITE_LANG,
	},
};
