export const umamiConfig = {
	enabled: true, // 是否显示Umami统计
	apiKey: import.meta.env.UMAMI_API_KEY || "api_xxxxxxxx", // API密钥优先从环境变量读取，否则使用配置文件中的值
	baseUrl: "https://api.umami.is", // Umami Cloud API地址
	scripts: `
<script defer src="https://cloud.umami.is/script.js" data-website-id="7c6f4640-13c0-426d-a138-4f9d2c857ec4"></script>
  `.trim(), // 上面填你要插入的Script,不用再去Layout中插入
} as const;

export const GTM_ID = import.meta.env.GTM_ID || "GTM-KRX3XGVH";
export const CLARITY_PROJECT_ID =
	import.meta.env.CLARITY_PROJECT_ID || "tjr3vkhj8i";
