export async function loadImage(src: string): Promise<HTMLImageElement | null> {
	return new Promise((resolve) => {
		const img = new Image();
		img.crossOrigin = "anonymous";

		img.onload = () => resolve(img);
		img.onerror = () => {
			if (src.includes("images.weserv.nl") || src.startsWith("data:")) {
				resolve(null);
				return;
			}

			const proxyImg = new Image();
			proxyImg.crossOrigin = "anonymous";
			proxyImg.onload = () => resolve(proxyImg);
			proxyImg.onerror = () => resolve(null);
			proxyImg.src = `https://images.weserv.nl/?url=${encodeURIComponent(src)}&output=png`;
		};

		img.src = src;
	});
}

export function readThemeColor(fallback = "#558e88"): string {
	const temp = document.createElement("div");
	temp.style.color = "var(--primary)";
	temp.style.display = "none";
	document.body.appendChild(temp);
	const computedColor = getComputedStyle(temp).color;
	document.body.removeChild(temp);

	return computedColor || fallback;
}
