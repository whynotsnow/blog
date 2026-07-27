import type { PasswordProtectionClientConfig } from "./types";

const CONFIG_ID = "password-protection-config";
const VERIFY_PREFIX = "MIZUKI-VERIFY:";

type TocElement = HTMLElement & {
	regenerateTOC?: () => void;
	refreshRuntimeHeadings?: (root?: Element) => void;
	init?: () => void;
};

function readConfig(): PasswordProtectionClientConfig | null {
	const configElement = document.getElementById(CONFIG_ID);
	if (!configElement?.textContent) return null;

	try {
		return JSON.parse(
			configElement.textContent,
		) as PasswordProtectionClientConfig;
	} catch (error) {
		console.error("Failed to parse password protection config:", error);
		return null;
	}
}

async function loadCryptoLibraries() {
	if (window.CryptoJS) return;

	await new Promise<void>((resolve, reject) => {
		const script = document.createElement("script");
		script.src = "/assets/js/crypto-js.min.js";
		script.onload = () => resolve();
		script.onerror = reject;
		document.head.appendChild(script);
	});
}

function resetAutoUnlockState(
	protectionDiv: HTMLElement,
	passwordInput: HTMLInputElement,
) {
	sessionStorage.removeItem(`page-password-${window.location.pathname}`);

	const inputGroup = protectionDiv.querySelector<HTMLElement>(
		".password-input-group",
	);
	if (inputGroup) {
		inputGroup.style.visibility = "visible";
	}

	const hint = protectionDiv.querySelector<HTMLElement>(
		".password-container p",
	);
	if (hint?.hasAttribute("data-original-text")) {
		hint.textContent = hint.getAttribute("data-original-text");
	}

	passwordInput.value = "";
	protectionDiv.classList.remove("auto-unlocking");
}

async function runPostDecryptHooks(contentDiv: HTMLElement) {
	if (window.hljs) {
		contentDiv.querySelectorAll("pre code").forEach((block) => {
			window.hljs?.highlightElement(block);
		});
	}

	const tocElement = document.querySelector<TocElement>("table-of-contents");
	if (tocElement?.refreshRuntimeHeadings) {
		tocElement.refreshRuntimeHeadings(contentDiv);
	} else if (tocElement?.regenerateTOC && tocElement.init) {
		tocElement.regenerateTOC();
		tocElement.init();
	}

	if (window.mobileTOCInit) {
		window.mobileTOCInit();
	}

	if (window.Fancybox?.bind) {
		window.Fancybox.unbind?.("[data-fancybox]");
		window.Fancybox.bind("[data-fancybox]", {});
	}

	if (window.location.hash) {
		const targetId = window.location.hash.substring(1);
		const targetElement = document.getElementById(targetId);
		if (targetElement) {
			targetElement.scrollIntoView({ behavior: "smooth" });
		}
	}

	const images = contentDiv.querySelectorAll("img");
	images.forEach((img) => {
		if (!img.complete) {
			img.addEventListener("load", () => {
				window.dispatchEvent(new Event("scroll"));
				window.dispatchEvent(new Event("resize"));
			});
		}
	});

	[0, 100, 300, 500, 1000, 2000].forEach((delay) => {
		setTimeout(() => {
			window.dispatchEvent(new Event("scroll"));
			window.dispatchEvent(new Event("resize"));
		}, delay);
	});

	if (window.renderMermaidDiagrams) {
		await new Promise((resolve) => setTimeout(resolve, 100));
		window.renderMermaidDiagrams();
	}
}

async function replayScripts(contentDiv: HTMLElement) {
	const scripts = contentDiv.querySelectorAll("script");
	const scriptPromises = Array.from(scripts).map((script) => {
		return new Promise<void>((resolve) => {
			const newScript = document.createElement("script");
			if (script.type) {
				newScript.type = script.type;
			}
			newScript.textContent = script.textContent;
			newScript.onload = () => resolve();
			newScript.onerror = () => resolve();
			script.parentNode?.replaceChild(newScript, script);
			if (!newScript.src) {
				resolve();
			}
		});
	});

	await Promise.all(scriptPromises);
}

export async function initPasswordProtection() {
	const config = readConfig();
	if (!config) return;

	const { encryptedContent, labels } = config;
	const savedPassword = sessionStorage.getItem(
		`page-password-${window.location.pathname}`,
	);
	const protectionDiv = document.getElementById("password-protection");
	if (!protectionDiv) return;
	const protectionElement = protectionDiv;

	if (savedPassword) {
		const inputGroup = protectionElement.querySelector<HTMLElement>(
			".password-input-group",
		);
		if (inputGroup) {
			inputGroup.style.visibility = "hidden";
		}
		const hint = protectionElement.querySelector<HTMLElement>(
			".password-container p",
		);
		if (hint) {
			hint.setAttribute("data-original-text", hint.textContent || "");
			hint.textContent = labels.unlocking;
		}
		protectionElement.classList.add("auto-unlocking");
	}

	await loadCryptoLibraries();

	const passwordInput =
		document.querySelector<HTMLInputElement>("#password-input");
	const unlockBtn = document.querySelector<HTMLButtonElement>("#unlock-btn");
	const errorMessage = document.getElementById("error-message");
	const contentDiv = document.getElementById("decrypted-content");
	if (!passwordInput || !unlockBtn || !errorMessage || !contentDiv) return;
	const passwordInputElement = passwordInput;
	const unlockButton = unlockBtn;
	const errorElement = errorMessage;
	const contentElement = contentDiv;

	function showError(message: string) {
		errorElement.textContent = message;
		errorElement.style.display = "block";
		if (!protectionElement.classList.contains("auto-unlocking")) {
			passwordInputElement.focus();
		}
	}

	async function attemptUnlock() {
		const inputPassword =
			passwordInputElement.value.trim() || savedPassword;

		if (!inputPassword) {
			showError(labels.passwordRequired);
			return;
		}

		unlockButton.disabled = true;
		unlockButton.textContent = labels.unlocking;
		errorElement.style.display = "none";

		try {
			if (!window.CryptoJS) throw new Error("CryptoJS is not loaded");

			const decryptedBytes = window.CryptoJS.AES.decrypt(
				encryptedContent,
				inputPassword,
			);
			const decryptedString = decryptedBytes.toString(
				window.CryptoJS.enc.Utf8,
			);

			if (
				!decryptedString ||
				!decryptedString.startsWith(VERIFY_PREFIX)
			) {
				showError(labels.incorrect);
				if (savedPassword) {
					resetAutoUnlockState(
						protectionElement,
						passwordInputElement,
					);
				}
				return;
			}

			const realContent = decryptedString.replace(VERIFY_PREFIX, "");
			contentElement.innerHTML = realContent;
			await replayScripts(contentElement);

			if (protectionElement.parentNode) {
				protectionElement.remove();
			}
			contentElement.style.display = "block";

			document
				.getElementById("share-component")
				?.classList.remove("encrypted-hidden");
			document
				.getElementById("license-component")
				?.classList.remove("encrypted-hidden");

			sessionStorage.setItem(
				`page-password-${window.location.pathname}`,
				inputPassword,
			);

			setTimeout(() => {
				void runPostDecryptHooks(contentElement);
			}, 50);
		} catch (error) {
			console.error(labels.decryptionError, error);
			showError(labels.passwordDecryptRetry);
		} finally {
			unlockButton.disabled = false;
			unlockButton.textContent = labels.unlock;
		}
	}

	unlockButton.addEventListener("click", () => void attemptUnlock());
	passwordInputElement.addEventListener("keypress", (event) => {
		if (event.key === "Enter") void attemptUnlock();
	});

	if (savedPassword) {
		void attemptUnlock();
	} else {
		passwordInputElement.focus();
	}
}

async function copyToClipboard(text: string) {
	try {
		await navigator.clipboard.writeText(text);
	} catch (clipboardErr) {
		console.warn(
			"Clipboard API failed. Try the alternative plan:",
			clipboardErr,
		);
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
			copy?.call(document, "copy");
		} catch (execErr) {
			console.error("execCommand failed:", execErr);
		} finally {
			document.body.removeChild(textArea);
		}
	}
}

function getCodeText(codeElement: Element) {
	const lineElements = codeElement.querySelectorAll("span.line");
	if (lineElements.length > 0) {
		return Array.from(lineElements)
			.map((line) => line.textContent || "")
			.join("\n");
	}

	const codeElements = codeElement.querySelectorAll(".code:not(summary *)");
	if (codeElements.length > 0) {
		return Array.from(codeElements)
			.map((line) => line.textContent || "")
			.join("\n");
	}

	return codeElement.textContent || "";
}

export function initPasswordProtectionCopyButtons() {
	document.addEventListener("click", (event) => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;

		const btn = target.closest<HTMLElement>(".copy-btn");
		if (!btn) return;

		const codeElement = btn.parentElement?.querySelector("code");
		if (!codeElement) return;

		const code = getCodeText(codeElement).replace(/\n{3,}/g, (match) => {
			const emptyLineCount = match.length - 1;
			const resultEmptyLines = Math.ceil(emptyLineCount / 2);
			return "\n".repeat(resultEmptyLines + 1);
		});

		copyToClipboard(code)
			.then(() => {
				const timeoutId = btn.getAttribute("data-timeout-id");
				if (timeoutId) {
					clearTimeout(Number.parseInt(timeoutId, 10));
				}

				btn.classList.add("success");

				const newTimeoutId = setTimeout(() => {
					btn.classList.remove("success");
				}, 1000);

				btn.setAttribute("data-timeout-id", newTimeoutId.toString());
			})
			.catch((error) => {
				console.error("copy failed:", error);
			});
	});
}
