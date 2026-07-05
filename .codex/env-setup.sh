#!/usr/bin/env bash

abort() {
	echo "env-setup: $1" >&2
	return 1 2>/dev/null || exit 1
}

if [ -n "${NVM_DIR:-}" ] && [ -s "$NVM_DIR/nvm.sh" ]; then
	# shellcheck source=/dev/null
	. "$NVM_DIR/nvm.sh"
elif [ -s "$HOME/.nvm/nvm.sh" ]; then
	export NVM_DIR="$HOME/.nvm"
	# shellcheck source=/dev/null
	. "$NVM_DIR/nvm.sh"
fi

if command -v nvm >/dev/null 2>&1 && [ -f ".nvmrc" ]; then
	nvm use
fi

corepack enable || abort "failed to enable Corepack"
corepack install || abort "failed to install the project package manager"

pnpm() {
	corepack pnpm "$@"
}

echo "Node: $(node -v) | pnpm: $(corepack pnpm --version)"
