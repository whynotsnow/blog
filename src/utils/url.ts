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
