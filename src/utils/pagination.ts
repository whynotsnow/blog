export const HIDDEN = -1;
export const ADJ_DIST = 2;

export function generatePages(
	currentPage: number,
	lastPage: number,
	adjDist: number = ADJ_DIST,
): (number | typeof HIDDEN)[] {
	const visible = adjDist * 2 + 1;
	let count = 1;
	let left = currentPage;
	let right = currentPage;

	while (0 < left - 1 && right + 1 <= lastPage && count + 2 <= visible) {
		count += 2;
		left--;
		right++;
	}
	while (0 < left - 1 && count < visible) {
		count++;
		left--;
	}
	while (right + 1 <= lastPage && count < visible) {
		count++;
		right++;
	}

	const pages: (number | typeof HIDDEN)[] = [];
	if (left > 1) pages.push(1);
	if (left === 3) pages.push(2);
	if (left > 3) pages.push(HIDDEN);
	for (let page = left; page <= right; page++) pages.push(page);
	if (right < lastPage - 2) pages.push(HIDDEN);
	if (right === lastPage - 2) pages.push(lastPage - 1);
	if (right < lastPage) pages.push(lastPage);

	return pages;
}
