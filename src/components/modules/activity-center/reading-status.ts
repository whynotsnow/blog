export const READING_POSITION_PREFIX = "reading-position:";

export type ReadingStatus = {
	active: boolean;
	title: string;
	progress: number;
	currentHeading: string;
	remainingMinutes: number;
	resumeScrollY?: number;
};

type SavedReadingPosition = {
	scrollY: number;
	progress: number;
};

const emptyStatus: ReadingStatus = {
	active: false,
	title: "",
	progress: 0,
	currentHeading: "",
	remainingMinutes: 0,
};

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

function getSavedPosition(pathname: string): SavedReadingPosition | undefined {
	try {
		const raw = localStorage.getItem(
			`${READING_POSITION_PREFIX}${pathname}`,
		);
		if (!raw) return;
		return JSON.parse(raw) as SavedReadingPosition;
	} catch {
		return;
	}
}

export function collectReadingStatus(): ReadingStatus {
	const article = document.getElementById("post-container");
	if (!article) return emptyStatus;

	const rect = article.getBoundingClientRect();
	const articleTop = window.scrollY + rect.top;
	const readableDistance = Math.max(
		article.offsetHeight - window.innerHeight,
		1,
	);
	const progress = clamp(
		(window.scrollY - articleTop) / readableDistance,
		0,
		1,
	);
	const totalMinutes = Number.parseInt(
		article.dataset.readingMinutes || "0",
		10,
	);
	const headings = Array.from(
		article.querySelectorAll<HTMLElement>(
			".post-detail__content :is(h1, h2, h3, h4, h5, h6)[id]",
		),
	);
	const currentHeading = [...headings]
		.reverse()
		.find((heading) => heading.getBoundingClientRect().top <= 144);
	const saved = getSavedPosition(window.location.pathname);
	const resumeScrollY =
		saved &&
		Math.abs(saved.scrollY - window.scrollY) > 240 &&
		saved.progress > 0.02
			? saved.scrollY
			: undefined;

	return {
		active: true,
		title: article.dataset.readingTitle || document.title,
		progress,
		currentHeading: currentHeading?.textContent?.trim() || "",
		remainingMinutes: Math.max(Math.ceil(totalMinutes * (1 - progress)), 1),
		resumeScrollY,
	};
}

export function saveReadingPosition(status: ReadingStatus): void {
	if (!status.active || status.progress <= 0.01 || status.progress >= 0.99)
		return;
	const value: SavedReadingPosition = {
		scrollY: window.scrollY,
		progress: status.progress,
	};
	localStorage.setItem(
		`${READING_POSITION_PREFIX}${window.location.pathname}`,
		JSON.stringify(value),
	);
}
