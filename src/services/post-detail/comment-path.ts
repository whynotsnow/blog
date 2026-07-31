export function buildTwikooCommentPath(canonicalPath: string): string {
	return canonicalPath
		.split("/")
		.map((segment) => {
			if (!segment) return segment;
			return encodeURIComponent(decodeURIComponent(segment));
		})
		.join("/");
}
