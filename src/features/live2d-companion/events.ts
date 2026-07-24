export const LIVE2D_COMPANION_COMMAND_EVENT = "live2d-companion-command";

export type Live2DCompanionCommand =
	| { type: "show" }
	| { type: "collapse" }
	| { type: "toggle" }
	| { type: "message"; text: string };

export type Live2DCompanionCommandDetail = {
	command: Live2DCompanionCommand;
};

export function dispatchLive2DCompanionCommand(
	command: Live2DCompanionCommand,
) {
	window.dispatchEvent(
		new CustomEvent<Live2DCompanionCommandDetail>(
			LIVE2D_COMPANION_COMMAND_EVENT,
			{
				detail: { command },
			},
		),
	);
}

export function showLive2DCompanion() {
	dispatchLive2DCompanionCommand({ type: "show" });
}

export function collapseLive2DCompanion() {
	dispatchLive2DCompanionCommand({ type: "collapse" });
}

export function toggleLive2DCompanion() {
	dispatchLive2DCompanionCommand({ type: "toggle" });
}

export function sendLive2DCompanionMessage(text: string) {
	dispatchLive2DCompanionCommand({ type: "message", text });
}
