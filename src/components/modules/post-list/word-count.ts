export interface PostCardWordCount {
	display: string;
	exact: string;
}

function resolveLocale(lang: string): string {
	return lang.replace("_", "-");
}

function formatScaled(value: number, divisor: number, locale: string): string {
	const truncated = Math.floor((value / divisor) * 10) / 10;
	return new Intl.NumberFormat(locale, {
		maximumFractionDigits: 1,
	}).format(truncated);
}

export function formatPostCardWordCount(
	words: number,
	lang: string,
	wordUnit: string,
): PostCardWordCount {
	const safeWords = Math.max(0, Math.floor(words));
	const locale = resolveLocale(lang || "en");
	const normalizedLang = lang.toLowerCase();
	const usesCjkUnits =
		normalizedLang.startsWith("zh") || normalizedLang.startsWith("ja");
	const unitSpacing = usesCjkUnits ? "" : " ";
	const exact = `${new Intl.NumberFormat(locale).format(safeWords)}${unitSpacing}${wordUnit}`;

	if (usesCjkUnits && safeWords >= 10_000) {
		const tenThousandUnit = normalizedLang.startsWith("zh_tw")
			? "萬"
			: "万";
		return {
			display: `${formatScaled(safeWords, 10_000, locale)}${tenThousandUnit}${wordUnit}`,
			exact,
		};
	}

	if (safeWords >= 1_000) {
		const thousandUnit = usesCjkUnits ? "千" : "K";
		return {
			display: `${formatScaled(safeWords, 1_000, locale)}${thousandUnit}${unitSpacing}${wordUnit}`,
			exact,
		};
	}

	return {
		display: `${safeWords}${unitSpacing}${wordUnit}`,
		exact,
	};
}
