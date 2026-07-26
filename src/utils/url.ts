function normalizeBase(base: string): string {
	if (!base || base === "/") return "";
	return `/${base.replace(/^\/+|\/+$/g, "")}`;
}

export function url(
	path: string,
	base: string = import.meta.env.BASE_URL ?? "/",
): string {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `${normalizeBase(base)}${normalizedPath}`;
}

export function pathsEqual(path1: string, path2: string): boolean {
	const normalize = (path: string) =>
		path.replace(/^\/+|\/+$/g, "").toLocaleLowerCase("en-US");
	return normalize(path1) === normalize(path2);
}

export function toSlug(value: string): string {
	return value.toLocaleLowerCase("en-US").trim().replace(/\s+/g, "-");
}

export function getTagUrl(tag: string): string {
	const normalized = tag.trim();
	if (!normalized) return url("/archive/");
	return url(`/archive/?tag=${encodeURIComponent(normalized)}`);
}

export function getCategoryPageUrl(slug: string): string {
	return url(`/category/${encodeURIComponent(slug.trim())}/`);
}

export function getCategoryHubUrl(): string {
	return url("/category/");
}

export function getCategoryTagUrl(
	categorySlug: string,
	tagSlug: string,
): string {
	const normalizedCategory = categorySlug.trim();
	const normalizedTag = tagSlug.trim();
	if (!normalizedCategory) return getTagUrl(normalizedTag);
	if (!normalizedTag) return getCategoryPageUrl(normalizedCategory);
	return url(
		`/category/${encodeURIComponent(normalizedCategory)}/?tag=${encodeURIComponent(normalizedTag)}`,
	);
}
