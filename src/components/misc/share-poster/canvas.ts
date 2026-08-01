import QRCode from "qrcode";
import { loadImage } from "./assets";
import type { DrawSharePosterInput, PosterDate } from "./types";

const SCALE = 2;
const WIDTH = 425 * SCALE;
const PADDING = 24 * SCALE;
const CONTENT_WIDTH = WIDTH - PADDING * 2;
const FONT_FAMILY = "'Roboto', sans-serif";

function getLines(
	ctx: CanvasRenderingContext2D,
	text: string,
	maxWidth: number,
): string[] {
	const lines: string[] = [];
	let currentLine = "";

	for (const char of text) {
		if (ctx.measureText(currentLine + char).width < maxWidth) {
			currentLine += char;
		} else {
			lines.push(currentLine);
			currentLine = char;
		}
	}

	if (currentLine) lines.push(currentLine);
	return lines;
}

function drawRoundedRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
): void {
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.lineTo(x + width - radius, y);
	ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
	ctx.lineTo(x + width, y + height - radius);
	ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
	ctx.lineTo(x + radius, y + height);
	ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
	ctx.lineTo(x, y + radius);
	ctx.quadraticCurveTo(x, y, x + radius, y);
	ctx.closePath();
}

function parseDate(dateStr: string): PosterDate | null {
	try {
		const date = new Date(dateStr);
		if (Number.isNaN(date.getTime())) return null;

		return {
			day: date.getDate().toString().padStart(2, "0"),
			month: (date.getMonth() + 1).toString().padStart(2, "0"),
			year: date.getFullYear().toString(),
		};
	} catch {
		return null;
	}
}

export async function createSharePoster(
	input: DrawSharePosterInput,
): Promise<string> {
	const {
		author,
		avatar,
		coverImage,
		description,
		labels,
		pubDate,
		siteTitle,
		themeColor,
		title,
		url,
	} = input;
	const qrCodeUrl = await QRCode.toDataURL(url, {
		margin: 1,
		width: 100 * SCALE,
		color: { dark: "#000000", light: "#ffffff" },
	});

	const [qrImg, coverImg, avatarImg] = await Promise.all([
		loadImage(qrCodeUrl),
		coverImage ? loadImage(coverImage) : Promise.resolve(null),
		avatar ? loadImage(avatar) : Promise.resolve(null),
	]);

	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Canvas context not available");

	const coverHeight = (coverImage ? 200 : 120) * SCALE;
	const titleFontSize = 24 * SCALE;
	const descFontSize = 14 * SCALE;
	const qrSize = 80 * SCALE;
	const footerHeight = qrSize;

	ctx.font = `700 ${titleFontSize}px ${FONT_FAMILY}`;
	const titleLines = getLines(ctx, title, CONTENT_WIDTH);
	const titleLineHeight = 30 * SCALE;
	const titleHeight = titleLines.length * titleLineHeight;

	let descHeight = 0;
	if (description) {
		ctx.font = `${descFontSize}px ${FONT_FAMILY}`;
		const descLines = getLines(
			ctx,
			description,
			CONTENT_WIDTH - 16 * SCALE,
		);
		descHeight = Math.min(descLines.length, 6) * (25 * SCALE);
	}

	const canvasHeight =
		coverHeight +
		PADDING +
		titleHeight +
		16 * SCALE +
		descHeight +
		(description ? 24 * SCALE : 8 * SCALE) +
		24 * SCALE +
		footerHeight +
		PADDING;

	canvas.width = WIDTH;
	canvas.height = canvasHeight;

	ctx.fillStyle = "#ffffff";
	drawRoundedRect(ctx, 0, 0, canvas.width, canvas.height, 16 * SCALE);
	ctx.fill();

	ctx.save();
	ctx.globalAlpha = 0.1;
	ctx.fillStyle = themeColor;
	ctx.beginPath();
	ctx.arc(WIDTH - 25 * SCALE, 25 * SCALE, 75 * SCALE, 0, Math.PI * 2);
	ctx.fill();
	ctx.beginPath();
	ctx.arc(10 * SCALE, canvas.height - 10 * SCALE, 50 * SCALE, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();

	if (coverImg) {
		const imgRatio = coverImg.width / coverImg.height;
		const targetRatio = WIDTH / coverHeight;
		let sx: number;
		let sy: number;
		let sWidth: number;
		let sHeight: number;

		if (imgRatio > targetRatio) {
			sHeight = coverImg.height;
			sWidth = sHeight * targetRatio;
			sx = (coverImg.width - sWidth) / 2;
			sy = 0;
		} else {
			sWidth = coverImg.width;
			sHeight = sWidth / targetRatio;
			sx = 0;
			sy = (coverImg.height - sHeight) / 2;
		}
		ctx.drawImage(
			coverImg,
			sx,
			sy,
			sWidth,
			sHeight,
			0,
			0,
			WIDTH,
			coverHeight,
		);
	} else {
		ctx.save();
		ctx.fillStyle = themeColor;
		ctx.globalAlpha = 0.2;
		ctx.fillRect(0, 0, WIDTH, coverHeight);
		ctx.restore();
	}

	const dateObj = parseDate(pubDate);
	if (dateObj) {
		const dateBoxW = 60 * SCALE;
		const dateBoxH = 60 * SCALE;
		const dateBoxX = PADDING;
		const dateBoxY = coverHeight - dateBoxH;

		ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
		drawRoundedRect(ctx, dateBoxX, dateBoxY, dateBoxW, dateBoxH, 4 * SCALE);
		ctx.fill();

		ctx.fillStyle = "#ffffff";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `700 ${30 * SCALE}px ${FONT_FAMILY}`;
		ctx.fillText(
			dateObj.day,
			dateBoxX + dateBoxW / 2,
			dateBoxY + 24 * SCALE,
		);

		ctx.beginPath();
		ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
		ctx.lineWidth = 1 * SCALE;
		ctx.moveTo(dateBoxX + 10 * SCALE, dateBoxY + 42 * SCALE);
		ctx.lineTo(dateBoxX + dateBoxW - 10 * SCALE, dateBoxY + 42 * SCALE);
		ctx.stroke();

		ctx.font = `${10 * SCALE}px ${FONT_FAMILY}`;
		ctx.fillText(
			`${dateObj.year} ${dateObj.month}`,
			dateBoxX + dateBoxW / 2,
			dateBoxY + 51 * SCALE,
		);
	}

	let drawY = coverHeight + PADDING;
	ctx.textBaseline = "top";
	ctx.textAlign = "left";
	ctx.font = `700 ${titleFontSize}px ${FONT_FAMILY}`;
	ctx.fillStyle = "#111827";
	for (const line of titleLines) {
		ctx.fillText(line, PADDING, drawY);
		drawY += titleLineHeight;
	}
	drawY += 16 * SCALE - (titleLineHeight - titleFontSize);

	if (description) {
		ctx.fillStyle = "#e5e7eb";
		drawRoundedRect(
			ctx,
			PADDING,
			drawY - 8 * SCALE,
			4 * SCALE,
			descHeight + 8 * SCALE,
			2 * SCALE,
		);
		ctx.fill();

		ctx.font = `${descFontSize}px ${FONT_FAMILY}`;
		ctx.fillStyle = "#4b5563";
		const descLines = getLines(
			ctx,
			description,
			CONTENT_WIDTH - 16 * SCALE,
		);
		for (const line of descLines.slice(0, 6)) {
			ctx.fillText(line, PADDING + 16 * SCALE, drawY);
			drawY += 25 * SCALE;
		}
	} else {
		drawY += 8 * SCALE;
	}

	drawY += 24 * SCALE;
	ctx.beginPath();
	ctx.strokeStyle = "#f3f4f6";
	ctx.lineWidth = 1 * SCALE;
	ctx.moveTo(PADDING, drawY);
	ctx.lineTo(WIDTH - PADDING, drawY);
	ctx.stroke();
	drawY += 16 * SCALE;

	const footerY = drawY;
	const qrX = WIDTH - PADDING - qrSize;

	ctx.fillStyle = "#ffffff";
	ctx.shadowColor = "rgba(0, 0, 0, 0.05)";
	ctx.shadowBlur = 4 * SCALE;
	ctx.shadowOffsetY = 2 * SCALE;
	drawRoundedRect(ctx, qrX, footerY, qrSize, qrSize, 4 * SCALE);
	ctx.fill();
	ctx.shadowColor = "transparent";

	if (qrImg) {
		const qrInnerSize = 76 * SCALE;
		const qrPadding = (qrSize - qrInnerSize) / 2;
		ctx.drawImage(
			qrImg,
			qrX + qrPadding,
			footerY + qrPadding,
			qrInnerSize,
			qrInnerSize,
		);
	}

	if (avatarImg) {
		ctx.save();
		const avatarSize = 64 * SCALE;
		const avatarX = PADDING;
		ctx.beginPath();
		ctx.arc(
			avatarX + avatarSize / 2,
			footerY + avatarSize / 2,
			avatarSize / 2,
			0,
			Math.PI * 2,
		);
		ctx.closePath();
		ctx.clip();
		ctx.drawImage(avatarImg, avatarX, footerY, avatarSize, avatarSize);
		ctx.restore();

		ctx.beginPath();
		ctx.arc(
			avatarX + avatarSize / 2,
			footerY + avatarSize / 2,
			avatarSize / 2,
			0,
			Math.PI * 2,
		);
		ctx.strokeStyle = "#ffffff";
		ctx.lineWidth = 2 * SCALE;
		ctx.stroke();
	}

	const avatarOffset = avatar ? 64 * SCALE + 16 * SCALE : 0;
	const textX = PADDING + avatarOffset;

	ctx.fillStyle = "#9ca3af";
	ctx.font = `${12 * SCALE}px ${FONT_FAMILY}`;
	ctx.fillText(labels.author, textX, footerY + 4 * SCALE);

	ctx.fillStyle = "#1f2937";
	ctx.font = `700 ${20 * SCALE}px ${FONT_FAMILY}`;
	ctx.fillText(author, textX, footerY + 20 * SCALE);

	ctx.fillStyle = "#9ca3af";
	ctx.font = `${12 * SCALE}px ${FONT_FAMILY}`;
	ctx.fillText(labels.scanToRead, textX, footerY + 44 * SCALE);

	ctx.fillStyle = "#1f2937";
	ctx.font = `700 ${20 * SCALE}px ${FONT_FAMILY}`;
	ctx.fillText(siteTitle, textX, footerY + 60 * SCALE);

	return canvas.toDataURL("image/png");
}
