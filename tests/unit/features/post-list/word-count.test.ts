import { describe, expect, it } from "vitest";

import { formatPostCardWordCount } from "@/components/modules/post-list/word-count";

describe("formatPostCardWordCount", () => {
	it("keeps short Chinese counts exact", () => {
		expect(formatPostCardWordCount(842, "zh_CN", "字")).toEqual({
			display: "842字",
			exact: "842字",
		});
	});

	it("uses truncated thousand and ten-thousand Chinese units", () => {
		expect(formatPostCardWordCount(1_250, "zh_CN", "字").display).toBe(
			"1.2千字",
		);
		expect(formatPostCardWordCount(9_999, "zh_CN", "字").display).toBe(
			"9.9千字",
		);
		expect(formatPostCardWordCount(99_999, "zh_CN", "字")).toEqual({
			display: "9.9万字",
			exact: "99,999字",
		});
	});

	it("uses localized compact units outside simplified Chinese", () => {
		expect(formatPostCardWordCount(20_000, "zh_TW", "字").display).toBe(
			"2萬字",
		);
		expect(formatPostCardWordCount(1_250, "en", "words").display).toBe(
			"1.2K words",
		);
	});
});
