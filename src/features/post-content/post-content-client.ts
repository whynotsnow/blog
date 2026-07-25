let copyHandlerBound = false;

function extractCode(button: Element): string {
	const code = button.parentElement?.querySelector("code");
	if (!code) return "";

	const lines = code.querySelectorAll<HTMLElement>("span.line");
	if (lines.length > 0) {
		return Array.from(lines, (line) => line.textContent ?? "").join("\n");
	}

	const codeParts = code.querySelectorAll<HTMLElement>(
		".code:not(summary *)",
	);
	if (codeParts.length > 0) {
		return Array.from(codeParts, (part) => part.textContent ?? "").join(
			"\n",
		);
	}

	return code.textContent ?? "";
}

function normalizeBlankLines(code: string): string {
	return code.replace(/\n{3,}/g, (match) => {
		const emptyLines = match.length - 1;
		return "\n".repeat(Math.max(1, Math.ceil(emptyLines / 2)) + 1);
	});
}

async function copyWithTextarea(text: string): Promise<void> {
	const textArea = document.createElement("textarea");
	textArea.value = text;
	textArea.style.position = "fixed";
	textArea.style.left = "-999999px";
	textArea.style.top = "-999999px";
	document.body.appendChild(textArea);
	textArea.focus();
	textArea.select();

	try {
		const copy = (
			document as Document & {
				execCommand?: (command: string) => boolean;
			}
		).execCommand;
		if (!copy?.call(document, "copy")) {
			throw new Error("document.execCommand returned false");
		}
	} finally {
		textArea.remove();
	}
}

async function copyText(text: string): Promise<void> {
	try {
		await navigator.clipboard.writeText(text);
	} catch {
		await copyWithTextarea(text);
	}
}

function showCopySuccess(button: Element): void {
	const previousTimeout = Number(button.getAttribute("data-timeout-id"));
	if (previousTimeout) window.clearTimeout(previousTimeout);

	button.classList.add("success");
	const timeout = window.setTimeout(() => {
		button.classList.remove("success");
	}, 1000);
	button.setAttribute("data-timeout-id", String(timeout));
}

export function initializePostContent(): void {
	if (copyHandlerBound) return;
	copyHandlerBound = true;

	document.addEventListener("click", async (event) => {
		const target = event.target;
		if (!(target instanceof Element)) return;
		const button = target.closest(".copy-btn");
		if (!button) return;

		const code = normalizeBlankLines(extractCode(button));
		try {
			await copyText(code);
			showCopySuccess(button);
		} catch (error) {
			console.error("Failed to copy code block:", error);
		}
	});
}
