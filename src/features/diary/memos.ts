import type { DiaryItem } from "../../data/diary";
import type { RelativeTimeLabels } from "../../utils/timeFormat";
import { formatRelativeTime } from "../../utils/timeFormat";

export interface MemoAttachment {
	name: string;
	filename: string;
	type: string;
}

export interface MemoLocation {
	placeholder: string;
}

export interface Memo {
	state: string;
	createTime: string;
	content: string;
	visibility: string;
	pinned?: boolean;
	tags?: string[];
	attachments?: MemoAttachment[];
	location?: MemoLocation;
}

export interface MemosResponse {
	memos: Memo[];
	nextPageToken?: string;
}

export function getMemosBaseUrl(apiUrl: string): string {
	return apiUrl.replace(/\/api\/.*$/, "");
}

export function transformMemosToDiary(
	memos: Memo[],
	baseUrl: string,
): DiaryItem[] {
	return memos
		.filter(
			(memo) => memo.visibility === "PUBLIC" && memo.state === "NORMAL",
		)
		.map((memo, index) => ({
			id: index,
			content: memo.content,
			date: memo.createTime,
			tags: memo.tags && memo.tags.length > 0 ? memo.tags : undefined,
			images: getMemoImages(memo, baseUrl),
			location: memo.location?.placeholder,
		}))
		.sort((a, b) => {
			const sourceA = memos.find((memo) => memo.createTime === a.date);
			const sourceB = memos.find((memo) => memo.createTime === b.date);

			if (sourceA?.pinned && !sourceB?.pinned) return -1;
			if (!sourceA?.pinned && sourceB?.pinned) return 1;

			return new Date(b.date).getTime() - new Date(a.date).getTime();
		});
}

function getMemoImages(memo: Memo, baseUrl: string): string[] | undefined {
	const images = (memo.attachments || [])
		.filter((attachment) => attachment.type.startsWith("image/"))
		.map(
			(attachment) =>
				`${baseUrl}/file/${attachment.name}/${attachment.filename}`,
		);

	return images.length > 0 ? images : undefined;
}

export function renderDiaryMoments(
	moments: DiaryItem[],
	options: {
		labels: RelativeTimeLabels;
		timeZone: number;
	},
): string {
	return moments
		.map((moment, index) => renderDiaryMoment(moment, index, options))
		.join("");
}

function renderDiaryMoment(
	moment: DiaryItem,
	index: number,
	options: {
		labels: RelativeTimeLabels;
		timeZone: number;
	},
): string {
	const relativeTime = formatRelativeTime(
		moment.date,
		options.labels,
		options.timeZone,
	);
	const tagsAttr = escapeHtml((moment.tags || []).join(","));
	const imagesHtml = renderDiaryImages(moment, index);
	const tagsHtml = renderDiaryTags(moment);
	const locationHtml = moment.location
		? `<span class="flex items-center gap-1">${escapeHtml(moment.location)}</span>`
		: "";

	return `
		<article class="moment-card group relative rounded-xl border border-black/10 dark:border-white/10 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl" data-tags="${tagsAttr}">
			<div class="moment-card__body p-5">
				<p class="moment-card__content text-black/90 dark:text-white/90 leading-relaxed mb-3">${escapeHtml(moment.content)}</p>
				${imagesHtml}
				${tagsHtml}
				<hr class="border-t border-black/5 dark:border-white/5 my-3" />
				<div class="moment-card__meta flex items-center justify-between text-black/50 dark:text-white/50 flex-wrap gap-2">
					<div class="flex items-center gap-1.5">
						<time datetime="${escapeHtml(moment.date)}">${relativeTime}</time>
					</div>
					<div class="flex items-center gap-3">${locationHtml}</div>
				</div>
			</div>
			<div class="moment-card__hover-layer absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl"></div>
		</article>`;
}

function renderDiaryImages(moment: DiaryItem, index: number): string {
	if (!moment.images || moment.images.length === 0) return "";

	const layoutClass = getImageLayoutClass(moment.images.length);
	const group = `diary-${index}`;
	const images = moment.images
		.map((image) => {
			const safeImage = escapeHtml(image);

			return `
				<div class="relative rounded-lg overflow-hidden aspect-square cursor-pointer">
					<a href="${safeImage}" data-src="${safeImage}" data-fancybox="${group}" class="block w-full h-full">
						<img src="${safeImage}" alt="diary moment image" class="w-full h-full object-cover transition-transform duration-300 hover:scale-105" loading="lazy" decoding="async" />
					</a>
				</div>`;
		})
		.join("");

	return `<div class="diary-images grid gap-2 mb-3 ${layoutClass}">${images}</div>`;
}

function renderDiaryTags(moment: DiaryItem): string {
	if (!moment.tags || moment.tags.length === 0) return "";

	const tags = moment.tags
		.map(
			(tag) =>
				`<span class="moment-card__tag btn-regular h-6 px-2 rounded-lg">${escapeHtml(tag)}</span>`,
		)
		.join("");

	return `<div class="flex flex-wrap gap-1.5 mb-3">${tags}</div>`;
}

function getImageLayoutClass(count: number): string {
	if (count === 1) return "diary-images-single";
	if (count === 2) return "diary-images-double";
	if (count === 3) return "diary-images-triple";
	return "diary-images-grid";
}

function escapeHtml(text: string): string {
	const replacements: Record<string, string> = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#039;",
	};

	return text.replace(/[&<>"']/g, (character) => replacements[character]);
}
